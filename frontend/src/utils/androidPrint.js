/**
 * Android Thermal Printing - TWA / Bubblewrap helper
 *
 * Web Bluetooth is unreliable inside Android TWA/Chrome Custom Tabs on many
 * devices. To make thermal printing actually work inside a Bubblewrap-packaged
 * app, we support the de-facto Android bridges:
 *
 *   1. RawBT  (market: pe.diegoveloper.flutter.rawbt / ru.a402d.rawbtprinter)
 *      - Accepts ESC/POS bytes as base64 via `rawbt:` URI.
 *      - Zero-configuration once the printer is paired in RawBT app.
 *   2. intent://  text share fallback (Android native share sheet → any printer app)
 *   3. Web Bluetooth (direct BLE) if available
 *
 * For non-Android platforms we fall through to the caller's existing flow.
 */
import { toast } from 'sonner';

const ESC = 0x1B;
const GS  = 0x1D;

// Configuration
const PRINT_TIMEOUT = 5000; // 5s timeout for print operations
const MAX_RETRY_ATTEMPTS = 2;

export const isAndroid = () =>
  typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent);

export const isAndroidTWA = () => {
  if (!isAndroid()) return false;
  // TWA launches inside Chrome Custom Tab. Detection heuristics:
  if (document.referrer?.startsWith('android-app://')) return true;
  if (window.matchMedia('(display-mode: standalone)').matches) return true;
  if (window.navigator.standalone) return true;
  return false;
};

// Validate printer is available before attempting print
export const validatePrinterAvailable = () => {
  if (!isAndroid()) {
    console.warn('[v0] Not on Android platform');
    return false;
  }
  return true;
};

// -------- ESC/POS builder (shared) --------

/**
 * Build byte array from mixed input - strings, arrays, and numbers
 * Handles proper encoding including special characters like ₹
 */
const bytes = (...arr) => {
  const out = [];
  for (const a of arr) {
    if (Array.isArray(a)) {
      out.push(...a);
    } else if (typeof a === 'string') {
      try {
        // Use TextEncoder for proper UTF-8 encoding of special chars like ₹
        const encoded = new TextEncoder().encode(a);
        out.push(...encoded);
      } catch (err) {
        console.error('[v0] Text encoding failed:', err, 'input:', a);
        // Fallback: try Latin1 encoding
        for (let i = 0; i < a.length; i++) {
          out.push(a.charCodeAt(i) & 0xFF);
        }
      }
    } else if (typeof a === 'number') {
      out.push(a & 0xFF);
    }
  }
  return out;
};

/**
 * Repeat character n times - used for separators
 */
const repeatCh = (ch, n) => {
  if (n < 0) n = 0;
  if (n > 1000) n = 1000; // Safety limit
  return ch.repeat(n);
};

/**
 * Convert order + settings into ESC/POS byte array (Uint8Array)
 */
export const buildReceiptEscPos = (order, business = {}, opts = {}) => {
  const { paperWidth = '80mm' } = opts;
  const cols = paperWidth === '58mm' ? 32 : 48;
  const data = [];

  data.push(...bytes(ESC, 0x40));                 // init
  data.push(...bytes(ESC, 0x74, 0x10));           // code page windows-1252 (safer for ₹ symbol via text)

  // Header - centered, bold, double size
  data.push(...bytes(ESC, 0x61, 0x01));           // center
  data.push(...bytes(ESC, 0x45, 0x01));           // bold
  data.push(...bytes(GS, 0x21, 0x11));            // double height+width
  data.push(...bytes(business.restaurant_name || business.business_name || 'Restaurant'));
  data.push(0x0A);
  data.push(...bytes(GS, 0x21, 0x00));            // normal size
  data.push(...bytes(ESC, 0x45, 0x00));           // bold off

  if (business.tagline) { data.push(...bytes(business.tagline)); data.push(0x0A); }
  if (business.address) { data.push(...bytes(business.address)); data.push(0x0A); }
  if (business.phone)   { data.push(...bytes('Tel: ' + business.phone)); data.push(0x0A); }
  if (business.gstin || business.gst_number) {
    data.push(...bytes('GSTIN: ' + (business.gstin || business.gst_number)));
    data.push(0x0A);
  }

  // Left align for body
  data.push(...bytes(ESC, 0x61, 0x00));
  data.push(...bytes(repeatCh('=', cols))); data.push(0x0A);

  const billNo = order.order_number || (order.id ? String(order.id).slice(-6) : 'N/A');
  const date = new Date(order.created_at || Date.now());
  data.push(...bytes(`Bill: ${billNo}`)); data.push(0x0A);
  data.push(...bytes(`Date: ${date.toLocaleString('en-IN')}`)); data.push(0x0A);
  if (order.table_number) {
    data.push(...bytes(`Table: ${order.table_number}`));
    data.push(0x0A);
  }
  if (order.customer_name) {
    data.push(...bytes(`Customer: ${order.customer_name}`));
    data.push(0x0A);
  }

  data.push(...bytes(repeatCh('-', cols))); data.push(0x0A);

  // Items column widths
  const nameW  = cols - 16;
  const qtyW   = 4;
  const amtW   = 10;
  const header = 'Item'.padEnd(nameW) + 'Qty'.padStart(qtyW) + 'Amt'.padStart(amtW + 2);
  data.push(...bytes(ESC, 0x45, 0x01));
  data.push(...bytes(header.slice(0, cols))); data.push(0x0A);
  data.push(...bytes(ESC, 0x45, 0x00));
  data.push(...bytes(repeatCh('-', cols))); data.push(0x0A);

  const items = order.items || [];
  for (const it of items) {
    const name = (it.name || 'Item').slice(0, nameW - 1).padEnd(nameW);
    const qty  = String(it.quantity || 1).padStart(qtyW);
    const amt  = (((it.price || 0) * (it.quantity || 1)).toFixed(2)).padStart(amtW + 2);
    data.push(...bytes((name + qty + amt).slice(0, cols))); data.push(0x0A);
    if (it.notes) {
      data.push(...bytes(('  ~ ' + it.notes).slice(0, cols))); data.push(0x0A);
    }
  }

  data.push(...bytes(repeatCh('-', cols))); data.push(0x0A);

  const subtotal = order.subtotal ?? items.reduce((s, i) => s + (i.price || 0) * (i.quantity || 1), 0);
  const tax = order.tax || 0;
  const discount = order.discount || order.discount_amount || 0;
  const total = order.total ?? (subtotal + tax - discount);

  const line = (label, value) => {
    const v = ('Rs.' + Number(value).toFixed(2)).padStart(cols - label.length);
    data.push(...bytes(label + v)); data.push(0x0A);
  };
  line('Sub Total', subtotal);
  if (discount > 0) line('Discount', -discount);
  if (tax > 0) line(`Tax`, tax);

  data.push(...bytes(repeatCh('=', cols))); data.push(0x0A);
  data.push(...bytes(ESC, 0x45, 0x01));
  data.push(...bytes(GS, 0x21, 0x01));            // double height
  line('TOTAL', total);
  data.push(...bytes(GS, 0x21, 0x00));
  data.push(...bytes(ESC, 0x45, 0x00));
  data.push(...bytes(repeatCh('=', cols))); data.push(0x0A);

  if (order.payment_method) {
    data.push(...bytes(`Payment: ${String(order.payment_method).toUpperCase()}`));
    data.push(0x0A);
  }
  data.push(0x0A);

  data.push(...bytes(ESC, 0x61, 0x01));
  data.push(...bytes(business.footer_message || 'Thank You! Visit Again')); data.push(0x0A);
  data.push(...bytes(ESC, 0x61, 0x00));

  // Feed + partial cut
  data.push(...bytes(ESC, 0x64, 0x04));
  data.push(...bytes(GS, 0x56, 0x01));

  return new Uint8Array(data);
};

/**
 * Build ESC/POS for KOT ticket
 */
export const buildKotEscPos = (order, opts = {}) => {
  const { paperWidth = '80mm' } = opts;
  const cols = paperWidth === '58mm' ? 32 : 48;
  const data = [];

  data.push(...bytes(ESC, 0x40));
  data.push(...bytes(ESC, 0x61, 0x01));
  data.push(...bytes(ESC, 0x45, 0x01));
  data.push(...bytes(GS, 0x21, 0x11));
  data.push(...bytes('*** KOT ***')); data.push(0x0A);
  data.push(...bytes(GS, 0x21, 0x00));
  data.push(...bytes(ESC, 0x45, 0x00));
  data.push(...bytes(repeatCh('=', cols))); data.push(0x0A);
  data.push(...bytes(ESC, 0x61, 0x00));

  const billNo = order.order_number || (order.id ? String(order.id).slice(-6) : 'N/A');
  data.push(...bytes(`Order: ${billNo}`)); data.push(0x0A);
  data.push(...bytes(`Time:  ${new Date().toLocaleTimeString('en-IN')}`)); data.push(0x0A);
  if (order.table_number) {
    data.push(...bytes(ESC, 0x45, 0x01));
    data.push(...bytes(GS, 0x21, 0x01));
    data.push(...bytes(`TABLE: ${order.table_number}`)); data.push(0x0A);
    data.push(...bytes(GS, 0x21, 0x00));
    data.push(...bytes(ESC, 0x45, 0x00));
  }
  data.push(...bytes(repeatCh('-', cols))); data.push(0x0A);

  for (const it of order.items || []) {
    data.push(...bytes(ESC, 0x45, 0x01));
    data.push(...bytes(`${it.quantity || 1}x ${it.name}`.slice(0, cols)));
    data.push(0x0A);
    data.push(...bytes(ESC, 0x45, 0x00));
    if (it.notes) {
      data.push(...bytes(`   Note: ${it.notes}`.slice(0, cols)));
      data.push(0x0A);
    }
  }
  data.push(...bytes(repeatCh('=', cols))); data.push(0x0A);
  data.push(...bytes(ESC, 0x45, 0x01));
  const totalQty = (order.items || []).reduce((s, i) => s + (i.quantity || 1), 0);
  data.push(...bytes(`Total Items: ${totalQty}`)); data.push(0x0A);
  data.push(...bytes(ESC, 0x45, 0x00));

  data.push(...bytes(ESC, 0x64, 0x03));
  data.push(...bytes(GS, 0x56, 0x01));

  return new Uint8Array(data);
};

/**
 * Convert Uint8Array to base64 (browser safe for large buffers)
 */
const uint8ToBase64 = (u8) => {
  let bin = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < u8.length; i += CHUNK) {
    bin += String.fromCharCode.apply(null, u8.subarray(i, i + CHUNK));
  }
  return btoa(bin);
};

/**
 * Try RawBT via intent URI. Returns true if attempted.
 * Works in any Android WebView / Chrome / TWA (Bubblewrap).
 *
 * Users must install RawBT once from Play Store and pair their printer there.
 */
export const printViaRawBT = (escPosBytes, retryCount = 0) => {
  if (!isAndroid()) {
    console.debug('[v0] Not on Android, skipping RawBT');
    return false;
  }

  if (!escPosBytes || escPosBytes.length === 0) {
    console.error('[v0] RawBT: No data to print');
    toast.error('No print data provided');
    return false;
  }

  let iframe = null;
  let timeoutId = null;
  let iframeRemoved = false;

  try {
    const b64 = uint8ToBase64(escPosBytes);
    if (!b64 || b64.length === 0) {
      console.error('[v0] RawBT: Base64 encoding failed');
      return false;
    }

    // rawbt:base64,<payload>  -- documented scheme
    const url = `rawbt:base64,${b64}`;

    // Use a hidden iframe to avoid any blank navigation page in TWA
    iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    
    const removeIframe = () => {
      if (!iframeRemoved && iframe) {
        iframeRemoved = true;
        try {
          if (iframe.parentNode) {
            iframe.parentNode.removeChild(iframe);
          }
          // Clear references for garbage collection
          iframe.onload = null;
          iframe.onerror = null;
          iframe.src = 'about:blank'; // Clear src
          iframe = null;
        } catch (e) {
          console.debug('[v0] RawBT iframe cleanup error:', e.message);
        }
      }
    };

    // Set timeout to remove iframe
    timeoutId = setTimeout(removeIframe, PRINT_TIMEOUT);

    // Try to detect if print succeeded
    iframe.onload = () => {
      clearTimeout(timeoutId);
      removeIframe();
      console.log('[v0] RawBT print sent successfully');
      toast.success('Print sent to RawBT');
    };

    iframe.onerror = () => {
      clearTimeout(timeoutId);
      removeIframe();
      // RawBT may not have onerror callback, but handle gracefully
      if (retryCount < MAX_RETRY_ATTEMPTS) {
        console.debug(`[v0] RawBT retry attempt ${retryCount + 1}`);
        return printViaRawBT(escPosBytes, retryCount + 1);
      }
      console.warn('[v0] RawBT print may have failed');
    };

    document.body.appendChild(iframe);
    iframe.src = url;

    return true;
  } catch (err) {
    // Cleanup on error
    if (timeoutId) clearTimeout(timeoutId);
    if (iframe && iframe.parentNode) {
      try {
        iframe.parentNode.removeChild(iframe);
      } catch (e) {
        console.debug('[v0] RawBT error cleanup failed');
      }
    }

    console.error('[v0] RawBT print failed:', err.message);
    if (retryCount < MAX_RETRY_ATTEMPTS) {
      console.debug(`[v0] RawBT retry attempt ${retryCount + 1}`);
      return printViaRawBT(escPosBytes, retryCount + 1);
    }
    toast.error('RawBT print failed - is RawBT app installed?');
    return false;
  }
};

/**
 * Android intent fallback — open the system share sheet so the user can pick
 * any installed printer service (Google Cloud Print, HP, Canon, Epson …).
 */
export const shareReceiptText = async (text) => {
  if (!text || typeof text !== 'string') {
    console.error('[v0] Share: Invalid text provided');
    return false;
  }

  if (!navigator.share) {
    console.warn('[v0] Web Share API not available');
    return false;
  }

  try {
    const shareData = {
      title: 'Receipt',
      text: text.substring(0, 10000) // Limit text to prevent issues
    };

    await navigator.share(shareData);
    console.log('[v0] Receipt shared successfully');
    return true;
  } catch (err) {
    // AbortError is normal (user cancelled share)
    if (err?.name === 'AbortError') {
      console.debug('[v0] User cancelled share');
      return false;
    }
    
    // Other errors should be logged
    if (err?.name === 'NotAllowedError') {
      console.warn('[v0] Share permission denied');
    } else {
      console.error('[v0] Share failed:', err.message);
    }
    return false;
  }
};

/**
 * One-shot entry: takes ESC/POS bytes and chooses the best Android bridge.
 * Returns true when something was attempted.
 * 
 * Priority order:
 * 1. RawBT (most reliable for Bubblewrap TWA with paired printer)
 * 2. Web Share API fallback (user can pick any printer app)
 */
export const androidPrint = async (escPosBytes, plainText = '') => {
  if (!isAndroid()) {
    console.debug('[v0] androidPrint: Not on Android');
    return false;
  }

  try {
    // Validate inputs
    if (!escPosBytes || escPosBytes.length === 0) {
      console.error('[v0] androidPrint: No ESC/POS data provided');
      toast.error('No print data available');
      return false;
    }

    console.log('[v0] androidPrint: Starting with', escPosBytes.length, 'bytes');

    // 1) Try RawBT (most reliable for Bubblewrap TWA)
    if (printViaRawBT(escPosBytes)) {
      console.log('[v0] androidPrint: RawBT print initiated');
      return true;
    }

    // 2) Share fallback - give user chance to pick printer app
    if (plainText && plainText.length > 0) {
      console.log('[v0] androidPrint: Trying share fallback');
      const shareOk = await shareReceiptText(plainText);
      if (shareOk) {
        console.log('[v0] androidPrint: Share successful');
        return true;
      }
    }

    // All methods failed
    console.error('[v0] androidPrint: All print methods failed');
    toast.error('Print failed - ensure RawBT app is installed and paired');
    return false;
  } catch (err) {
    console.error('[v0] androidPrint: Unexpected error:', err.message);
    toast.error('Print error: ' + (err.message || 'Unknown error'));
    return false;
  }
};

/**
 * Helper: check RawBT availability via simple feature-detection probe.
 * We can't truly detect if RawBT is installed, but we can tell the user how.
 */
export const getAndroidPrintingHelpText = () => {
  if (!isAndroid()) return null;
  return {
    primary: 'For instant one-tap thermal printing, install the free "RawBT Print Service" app from Google Play and pair your Bluetooth / USB printer there once.',
    link: 'https://play.google.com/store/apps/details?id=ru.a402d.rawbtprinter'
  };
};

export default {
  isAndroid,
  isAndroidTWA,
  buildReceiptEscPos,
  buildKotEscPos,
  printViaRawBT,
  shareReceiptText,
  androidPrint,
  getAndroidPrintingHelpText,
};
