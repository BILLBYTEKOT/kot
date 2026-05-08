/**
 * Unified Print Handler
 * 
 * Intelligently routes print jobs to the best available method
 * Supports: Electron, Android TWA (RawBT), Web Bluetooth, Browser
 * 
 * Priority order:
 * 1. Electron (desktop native)
 * 2. Context-managed Bluetooth (persistent across pages)
 * 3. Android RawBT (TWA app)
 * 4. Web Bluetooth (direct)
 * 5. Browser print dialog (fallback)
 */

import { toast } from 'sonner';
import { isElectronApp, printHTMLOnElectron, printEscPosOnElectron } from './electronPrint';
import { isAndroid, androidPrint } from './androidPrint';
import { isBluetoothPrinterConnected, printViaBluetooth } from './printUtils';
import { buildReceipt, buildKOT } from './escposBuilder';

// Platform detection helpers
const isAndroidTWA = () => {
  if (!isAndroid()) return false;
  if (document.referrer?.startsWith('android-app://')) return true;
  if (window.matchMedia('(display-mode: standalone)').matches) return true;
  if (window.navigator.standalone) return true;
  return false;
};

const getCtxPrinter = () => (typeof window !== 'undefined' ? window.__btPrinter : null);
const ctxPrinterConnected = () => !!getCtxPrinter()?.isConnected;

/**
 * Main print function - intelligently routes based on platform
 * 
 * @param {Object} order - Order data to print
 * @param {Object} businessSettings - Business info for receipt
 * @param {Object} options - Print options
 *   - type: 'receipt' | 'kot' (default: 'receipt')
 *   - paperWidth: '58mm' | '80mm' (default: '80mm')
 *   - forceDialog: boolean (force browser print dialog)
 *   - copies: number (default: 1)
 * 
 * @returns {Promise<boolean>} true if print succeeded or was initiated
 */
export const printOrder = async (order, businessSettings = {}, options = {}) => {
  const {
    type = 'receipt',
    paperWidth = '80mm',
    forceDialog = false,
    copies = 1
  } = options;

  if (!order) {
    console.error('[v0] UnifiedPrintHandler: No order data provided');
    toast.error('No order data to print');
    return false;
  }

  console.log('[v0] UnifiedPrintHandler: Starting print job, type:', type);

  try {
    // Build ESC/POS data
    let escPosData;
    try {
      escPosData = type === 'kot' 
        ? buildKOT(order, { paperWidth })
        : buildReceipt(order, businessSettings, { paperWidth, copies });
    } catch (buildErr) {
      console.error('[v0] UnifiedPrintHandler: ESC/POS build failed:', buildErr.message);
      toast.error('Failed to prepare print data');
      return false;
    }

    // If force dialog, skip all other methods
    if (forceDialog) {
      console.log('[v0] UnifiedPrintHandler: Force dialog requested');
      return printWithBrowserDialog(order, businessSettings, { paperWidth, type });
    }

    // Try each method in priority order
    console.log('[v0] UnifiedPrintHandler: Trying methods in priority order');

    // 1. Electron (desktop)
    if (isElectronApp()) {
      console.log('[v0] UnifiedPrintHandler: Trying Electron...');
      try {
        const result = await printEscPosOnElectron(escPosData, null);
        if (result) {
          console.log('[v0] UnifiedPrintHandler: Electron print succeeded');
          return true;
        }
      } catch (err) {
        console.warn('[v0] UnifiedPrintHandler: Electron print failed:', err.message);
      }
    }

    // 2. Context-managed Bluetooth
    if (ctxPrinterConnected()) {
      console.log('[v0] UnifiedPrintHandler: Trying context Bluetooth...');
      try {
        const ctx = getCtxPrinter();
        if (ctx && ctx.printReceipt) {
          await ctx.printReceipt(order, businessSettings);
          console.log('[v0] UnifiedPrintHandler: Context print succeeded');
          toast.success('Receipt printed');
          return true;
        }
      } catch (err) {
        console.warn('[v0] UnifiedPrintHandler: Context print failed:', err.message);
      }
    }

    // 3. Android RawBT/Share
    if (isAndroidTWA()) {
      console.log('[v0] UnifiedPrintHandler: Trying Android RawBT...');
      try {
        // Generate plain text for share fallback
        const plainText = escPosToPlainText(order);
        const result = await androidPrint(escPosData, plainText);
        if (result) {
          console.log('[v0] UnifiedPrintHandler: Android print initiated');
          return true;
        }
      } catch (err) {
        console.warn('[v0] UnifiedPrintHandler: Android print failed:', err.message);
      }
    }

    // 4. Web Bluetooth
    if (isBluetoothPrinterConnected()) {
      console.log('[v0] UnifiedPrintHandler: Trying Web Bluetooth...');
      try {
        const plainText = escPosToPlainText(order);
        const result = await printViaBluetooth(plainText);
        if (result) {
          console.log('[v0] UnifiedPrintHandler: Bluetooth print succeeded');
          return true;
        }
      } catch (err) {
        console.warn('[v0] UnifiedPrintHandler: Bluetooth print failed:', err.message);
      }
    }

    // 5. Fallback: Browser print dialog
    console.log('[v0] UnifiedPrintHandler: All direct methods failed, falling back to browser dialog');
    return printWithBrowserDialog(order, businessSettings, { paperWidth, type });

  } catch (err) {
    console.error('[v0] UnifiedPrintHandler: Unexpected error:', err.message);
    toast.error('Print failed: ' + err.message);
    return false;
  }
};

/**
 * Print using browser print dialog
 */
const printWithBrowserDialog = async (order, businessSettings, options) => {
  try {
    console.log('[v0] UnifiedPrintHandler: Using browser print dialog');

    // Generate HTML
    const html = generateReceiptHTML(order, businessSettings);

    // Open print dialog
    const printWindow = window.open('', '', 'height=600,width=800');
    if (!printWindow) {
      toast.error('Pop-up blocked - please allow pop-ups for printing');
      return false;
    }

    printWindow.document.write(html);
    printWindow.document.close();

    // Wait for content to load
    await new Promise(resolve => {
      printWindow.onload = resolve;
      setTimeout(resolve, 1000); // Timeout fallback
    });

    // Trigger print
    printWindow.print();

    // Close window after print (with delay to allow print dialog)
    setTimeout(() => {
      try {
        printWindow.close();
      } catch (e) {
        console.debug('[v0] Could not auto-close print window');
      }
    }, 500);

    toast.success('Print dialog opened');
    return true;
  } catch (err) {
    console.error('[v0] UnifiedPrintHandler: Browser print failed:', err.message);
    toast.error('Print dialog failed');
    return false;
  }
};

/**
 * Convert ESC/POS order to plain text for share fallback
 */
const escPosToPlainText = (order) => {
  try {
    const lines = [];
    lines.push('RECEIPT');
    lines.push('='.repeat(40));
    
    if (order.order_number) {
      lines.push(`Bill: ${order.order_number}`);
    }
    
    if (order.table_number) {
      lines.push(`Table: ${order.table_number}`);
    }

    lines.push('-'.repeat(40));
    lines.push('ITEMS');

    const items = order.items || [];
    for (const item of items) {
      const qty = item.quantity || 1;
      const price = item.price || 0;
      const total = qty * price;
      lines.push(`${qty}x ${item.name} = ₹${total.toFixed(2)}`);
    }

    lines.push('-'.repeat(40));
    
    const total = order.total || 0;
    lines.push(`TOTAL: ₹${total.toFixed(2)}`);
    
    if (order.payment_method) {
      lines.push(`Payment: ${order.payment_method}`);
    }

    return lines.join('\n');
  } catch (err) {
    console.error('[v0] UnifiedPrintHandler: Plain text conversion failed:', err);
    return '';
  }
};

/**
 * Generate receipt HTML (placeholder - import from printUtils)
 */
const generateReceiptHTML = (order, businessSettings) => {
  // This is a simplified version - import from printUtils for full implementation
  const total = order.total || 0;
  const items = order.items || [];

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: 'Courier New', monospace; font-size: 12px; width: 80mm; }
        .center { text-align: center; }
        .bold { font-weight: bold; }
        .separator { border-top: 1px dashed #000; margin: 5px 0; }
        table { width: 100%; border-collapse: collapse; }
        td { padding: 2px 0; }
      </style>
    </head>
    <body>
      <div class="center bold">${businessSettings.restaurant_name || 'Restaurant'}</div>
      <div class="separator"></div>
      <table>
        <tr><td>Bill:</td><td class="bold">${order.order_number || order.id?.slice(-6) || 'N/A'}</td></tr>
        ${order.table_number ? `<tr><td>Table:</td><td>${order.table_number}</td></tr>` : ''}
      </table>
      <div class="separator"></div>
      <table>
        ${items.map(item => `
          <tr>
            <td>${item.quantity || 1}x ${item.name}</td>
            <td style="text-align: right">₹${((item.price || 0) * (item.quantity || 1)).toFixed(2)}</td>
          </tr>
        `).join('')}
      </table>
      <div class="separator"></div>
      <table>
        <tr>
          <td class="bold">TOTAL</td>
          <td class="bold" style="text-align: right">₹${total.toFixed(2)}</td>
        </tr>
      </table>
    </body>
    </html>
  `;
};

/**
 * Get available print methods for current platform
 */
export const getAvailablePrintMethods = () => {
  const methods = [];

  if (isElectronApp()) {
    methods.push({ name: 'Electron Printer', priority: 1 });
  }

  if (ctxPrinterConnected()) {
    methods.push({ name: 'Bluetooth Printer', priority: 2 });
  }

  if (isAndroidTWA()) {
    methods.push({ name: 'RawBT / Share', priority: 3 });
  }

  if (isBluetoothPrinterConnected()) {
    methods.push({ name: 'Web Bluetooth', priority: 4 });
  }

  methods.push({ name: 'Browser Print Dialog', priority: 5 });

  return methods;
};

export default {
  printOrder,
  getAvailablePrintMethods
};
