/**
 * Consolidated ESC/POS Builder
 * 
 * Centralized ESC/POS command builder for all thermal printers
 * Used by Android, Electron, Web Bluetooth, and Browser print
 * 
 * Features:
 * - Proper UTF-8 encoding for special characters (₹, etc)
 * - Command constants for common operations
 * - Receipt and KOT ticket builders
 * - Reliable byte array generation
 */

// ESC/POS Control Codes
const ESC = 0x1B;
const GS = 0x1D;
const LF = 0x0A;
const FF = 0x0C;

export const ESC_COMMANDS = {
  INIT: [ESC, 0x40],
  ALIGN_LEFT: [ESC, 0x61, 0x00],
  ALIGN_CENTER: [ESC, 0x61, 0x01],
  ALIGN_RIGHT: [ESC, 0x61, 0x02],
  BOLD_ON: [ESC, 0x45, 0x01],
  BOLD_OFF: [ESC, 0x45, 0x00],
  DOUBLE_HEIGHT: [GS, 0x21, 0x10],
  DOUBLE_WIDTH: [GS, 0x21, 0x20],
  DOUBLE_SIZE: [GS, 0x21, 0x30],
  NORMAL_SIZE: [GS, 0x21, 0x00],
  UNDERLINE_ON: [ESC, 0x2D, 0x01],
  UNDERLINE_OFF: [ESC, 0x2D, 0x00],
  LINE_FEED: [LF],
  FORM_FEED: [FF],
  PAPER_CUT_FULL: [GS, 0x56, 0x00],
  PAPER_CUT_PARTIAL: [GS, 0x56, 0x01],
  CASH_DRAWER_KICK: [ESC, 0x70, 0x00, 0x19, 0xFA]
};

/**
 * Build byte array from mixed inputs
 * Handles strings, arrays, and numbers with proper UTF-8 encoding
 */
export const buildBytes = (...inputs) => {
  const result = [];
  
  for (const input of inputs) {
    if (Array.isArray(input)) {
      result.push(...input);
    } else if (typeof input === 'string') {
      try {
        // Use TextEncoder for proper UTF-8 encoding of special chars like ₹
        const encoded = new TextEncoder().encode(input);
        result.push(...encoded);
      } catch (err) {
        console.error('[v0] ESCPOSBuilder: Text encoding failed:', err, 'input:', input);
        // Fallback to Latin1 encoding
        for (let i = 0; i < input.length; i++) {
          result.push(input.charCodeAt(i) & 0xFF);
        }
      }
    } else if (typeof input === 'number') {
      result.push(input & 0xFF);
    }
  }
  
  return result;
};

/**
 * Convert byte array to Uint8Array
 */
export const toUint8Array = (bytes) => {
  if (bytes instanceof Uint8Array) return bytes;
  return new Uint8Array(bytes);
};

/**
 * Convert Uint8Array to Base64 for RawBT
 */
export const uint8ToBase64 = (u8) => {
  if (!(u8 instanceof Uint8Array)) {
    u8 = toUint8Array(u8);
  }

  let bin = '';
  const CHUNK_SIZE = 0x8000;
  
  try {
    for (let i = 0; i < u8.length; i += CHUNK_SIZE) {
      const chunk = u8.subarray(i, i + CHUNK_SIZE);
      bin += String.fromCharCode.apply(null, Array.from(chunk));
    }
    return btoa(bin);
  } catch (err) {
    console.error('[v0] ESCPOSBuilder: Base64 encoding failed:', err);
    return '';
  }
};

/**
 * Build a complete receipt in ESC/POS format
 */
export const buildReceipt = (order, businessSettings = {}, options = {}) => {
  const {
    paperWidth = '80mm',
    copies = 1,
    includeQR = false
  } = options;

  const cols = paperWidth === '58mm' ? 32 : 48;
  const bytes = [];

  try {
    // Initialize
    bytes.push(...ESC_COMMANDS.INIT);
    bytes.push(...buildBytes(ESC, 0x74, 0x10)); // Code page windows-1252 for ₹ symbol

    // --- HEADER ---
    bytes.push(...ESC_COMMANDS.ALIGN_CENTER);
    bytes.push(...ESC_COMMANDS.BOLD_ON);
    bytes.push(...ESC_COMMANDS.DOUBLE_SIZE);
    bytes.push(...buildBytes(businessSettings.restaurant_name || businessSettings.business_name || 'Restaurant'));
    bytes.push(LF);

    bytes.push(...ESC_COMMANDS.NORMAL_SIZE);
    bytes.push(...ESC_COMMANDS.BOLD_OFF);

    // Tagline
    if (businessSettings.tagline) {
      bytes.push(...buildBytes(businessSettings.tagline));
      bytes.push(LF);
    }

    // Address
    if (businessSettings.address) {
      bytes.push(...buildBytes(businessSettings.address));
      bytes.push(LF);
    }

    // Phone
    if (businessSettings.phone) {
      bytes.push(...buildBytes('Tel: ' + businessSettings.phone));
      bytes.push(LF);
    }

    // GSTIN
    if (businessSettings.gstin || businessSettings.gst_number) {
      bytes.push(...buildBytes('GSTIN: ' + (businessSettings.gstin || businessSettings.gst_number)));
      bytes.push(LF);
    }

    // Separator
    bytes.push(...ESC_COMMANDS.ALIGN_LEFT);
    bytes.push(...buildBytes('='.repeat(Math.min(cols, 48))));
    bytes.push(LF);

    // --- ORDER DETAILS ---
    const billNo = order.order_number || (order.id ? String(order.id).slice(-6) : 'N/A');
    const date = new Date(order.created_at || Date.now());

    bytes.push(...buildBytes(`Bill: ${billNo}`));
    bytes.push(LF);
    bytes.push(...buildBytes(`Date: ${date.toLocaleString('en-IN')}`));
    bytes.push(LF);

    if (order.table_number) {
      bytes.push(...buildBytes(`Table: ${order.table_number}`));
      bytes.push(LF);
    }

    if (order.customer_name) {
      bytes.push(...buildBytes(`Customer: ${order.customer_name}`));
      bytes.push(LF);
    }

    bytes.push(...buildBytes('-'.repeat(cols)));
    bytes.push(LF);

    // --- ITEMS ---
    const nameW = cols - 16;
    const qtyW = 4;
    const amtW = 10;

    bytes.push(...ESC_COMMANDS.BOLD_ON);
    const header = 'Item'.padEnd(nameW) + 'Qty'.padStart(qtyW) + 'Amt'.padStart(amtW + 2);
    bytes.push(...buildBytes(header.slice(0, cols)));
    bytes.push(LF);
    bytes.push(...ESC_COMMANDS.BOLD_OFF);
    bytes.push(...buildBytes('-'.repeat(cols)));
    bytes.push(LF);

    const items = order.items || [];
    for (const item of items) {
      const name = (item.name || 'Item').slice(0, nameW - 1).padEnd(nameW);
      const qty = String(item.quantity || 1).padStart(qtyW);
      const amt = (((item.price || 0) * (item.quantity || 1)).toFixed(2)).padStart(amtW + 2);
      bytes.push(...buildBytes((name + qty + amt).slice(0, cols)));
      bytes.push(LF);

      if (item.notes) {
        bytes.push(...buildBytes(('  ~ ' + item.notes).slice(0, cols)));
        bytes.push(LF);
      }
    }

    bytes.push(...buildBytes('-'.repeat(cols)));
    bytes.push(LF);

    // --- TOTALS ---
    const subtotal = order.subtotal ?? items.reduce((s, i) => s + (i.price || 0) * (i.quantity || 1), 0);
    const tax = order.tax || 0;
    const discount = order.discount || order.discount_amount || 0;
    const total = order.total ?? (subtotal + tax - discount);

    const formatLine = (label, value) => {
      const v = ('Rs.' + Number(value).toFixed(2)).padStart(cols - label.length);
      return label + v;
    };

    bytes.push(...buildBytes(formatLine('Sub Total', subtotal)));
    bytes.push(LF);

    if (discount > 0) {
      bytes.push(...buildBytes(formatLine('Discount', -discount)));
      bytes.push(LF);
    }

    if (tax > 0) {
      bytes.push(...buildBytes(formatLine('Tax', tax)));
      bytes.push(LF);
    }

    bytes.push(...buildBytes('='.repeat(cols)));
    bytes.push(LF);
    bytes.push(...ESC_COMMANDS.BOLD_ON);
    bytes.push(...ESC_COMMANDS.DOUBLE_HEIGHT);
    bytes.push(...buildBytes(formatLine('TOTAL', total)));
    bytes.push(LF);
    bytes.push(...ESC_COMMANDS.NORMAL_SIZE);
    bytes.push(...ESC_COMMANDS.BOLD_OFF);
    bytes.push(...buildBytes('='.repeat(cols)));
    bytes.push(LF);

    // Payment method
    if (order.payment_method) {
      bytes.push(...buildBytes(`Payment: ${String(order.payment_method).toUpperCase()}`));
      bytes.push(LF);
    }

    // Footer
    bytes.push(LF);
    bytes.push(...ESC_COMMANDS.ALIGN_CENTER);
    bytes.push(...buildBytes(businessSettings.footer_message || 'Thank You! Visit Again'));
    bytes.push(LF);
    bytes.push(...ESC_COMMANDS.ALIGN_LEFT);

    // Print multiple copies
    for (let i = 1; i < Math.max(1, Math.min(5, copies)); i++) {
      bytes.push(...buildBytes('\n'.repeat(3)));
    }

    // Feed and cut
    bytes.push(...buildBytes(ESC, 0x64, 0x04)); // Feed 4 lines
    bytes.push(...ESC_COMMANDS.PAPER_CUT_PARTIAL);

    console.log('[v0] ESCPOSBuilder: Receipt built, size:', bytes.length);
    return toUint8Array(bytes);
  } catch (err) {
    console.error('[v0] ESCPOSBuilder: Receipt build failed:', err);
    throw new Error('Failed to build receipt: ' + err.message);
  }
};

/**
 * Build KOT (Kitchen Order Ticket) in ESC/POS format
 */
export const buildKOT = (order, options = {}) => {
  const {
    paperWidth = '80mm'
  } = options;

  const cols = paperWidth === '58mm' ? 32 : 48;
  const bytes = [];

  try {
    bytes.push(...ESC_COMMANDS.INIT);
    bytes.push(...ESC_COMMANDS.ALIGN_CENTER);
    bytes.push(...ESC_COMMANDS.BOLD_ON);
    bytes.push(...ESC_COMMANDS.DOUBLE_SIZE);
    bytes.push(...buildBytes('*** KOT ***'));
    bytes.push(LF);
    bytes.push(...ESC_COMMANDS.NORMAL_SIZE);
    bytes.push(...ESC_COMMANDS.BOLD_OFF);
    bytes.push(...buildBytes('='.repeat(cols)));
    bytes.push(LF);

    bytes.push(...ESC_COMMANDS.ALIGN_LEFT);

    const billNo = order.order_number || (order.id ? String(order.id).slice(-6) : 'N/A');
    bytes.push(...buildBytes(`Order: ${billNo}`));
    bytes.push(LF);
    bytes.push(...buildBytes(`Time: ${new Date().toLocaleTimeString('en-IN')}`));
    bytes.push(LF);

    if (order.table_number) {
      bytes.push(...ESC_COMMANDS.BOLD_ON);
      bytes.push(...ESC_COMMANDS.DOUBLE_HEIGHT);
      bytes.push(...buildBytes(`TABLE: ${order.table_number}`));
      bytes.push(LF);
      bytes.push(...ESC_COMMANDS.NORMAL_SIZE);
      bytes.push(...ESC_COMMANDS.BOLD_OFF);
    }

    bytes.push(...buildBytes('-'.repeat(cols)));
    bytes.push(LF);

    // Items
    for (const item of order.items || []) {
      bytes.push(...ESC_COMMANDS.BOLD_ON);
      bytes.push(...buildBytes(`${item.quantity || 1}x ${item.name}`));
      bytes.push(LF);
      bytes.push(...ESC_COMMANDS.BOLD_OFF);

      if (item.notes) {
        bytes.push(...buildBytes(`   Note: ${item.notes}`));
        bytes.push(LF);
      }
    }

    bytes.push(...buildBytes('='.repeat(cols)));
    bytes.push(LF);
    bytes.push(...ESC_COMMANDS.BOLD_ON);
    const totalQty = (order.items || []).reduce((s, i) => s + (i.quantity || 1), 0);
    bytes.push(...buildBytes(`Total Items: ${totalQty}`));
    bytes.push(LF);
    bytes.push(...ESC_COMMANDS.BOLD_OFF);

    // Feed and cut
    bytes.push(...buildBytes(ESC, 0x64, 0x03)); // Feed 3 lines
    bytes.push(...ESC_COMMANDS.PAPER_CUT_PARTIAL);

    console.log('[v0] ESCPOSBuilder: KOT built, size:', bytes.length);
    return toUint8Array(bytes);
  } catch (err) {
    console.error('[v0] ESCPOSBuilder: KOT build failed:', err);
    throw new Error('Failed to build KOT: ' + err.message);
  }
};

export default {
  ESC_COMMANDS,
  buildBytes,
  toUint8Array,
  uint8ToBase64,
  buildReceipt,
  buildKOT
};
