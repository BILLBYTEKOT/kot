/**
 * Bluetooth Thermal Printer Direct Print
 * 
 * This enables direct printing to Bluetooth thermal printers
 * without opening any print dialog or external app.
 * 
 * Supported printers: Most 58mm/80mm Bluetooth thermal printers
 * (Generic ESC/POS compatible)
 */

// ESC/POS Commands
const ESC = 0x1B;
const GS = 0x1D;
const COMMANDS = {
  INIT: [ESC, 0x40], // Initialize printer
  ALIGN_LEFT: [ESC, 0x61, 0x00],
  ALIGN_CENTER: [ESC, 0x61, 0x01],
  ALIGN_RIGHT: [ESC, 0x61, 0x02],
  BOLD_ON: [ESC, 0x45, 0x01],
  BOLD_OFF: [ESC, 0x45, 0x00],
  DOUBLE_HEIGHT_ON: [GS, 0x21, 0x10],
  DOUBLE_WIDTH_ON: [GS, 0x21, 0x20],
  DOUBLE_ON: [GS, 0x21, 0x30],
  NORMAL_SIZE: [GS, 0x21, 0x00],
  UNDERLINE_ON: [ESC, 0x2D, 0x01],
  UNDERLINE_OFF: [ESC, 0x2D, 0x00],
  CUT_PAPER: [GS, 0x56, 0x00], // Full cut
  CUT_PARTIAL: [GS, 0x56, 0x01], // Partial cut
  FEED_LINE: [0x0A], // Line feed
  FEED_LINES: (n) => [ESC, 0x64, n], // Feed n lines
  CASH_DRAWER: [ESC, 0x70, 0x00, 0x19, 0xFA], // Open cash drawer
};

// Store connected printer
let connectedDevice = null;
let printerCharacteristic = null;
let savedPrinterInfo = null;

/**
 * Check if Web Bluetooth is supported
 */
export function isBluetoothSupported() {
  return 'bluetooth' in navigator;
}

/**
 * Get saved printer from localStorage
 */
export function getSavedPrinter() {
  try {
    const saved = localStorage.getItem('bluetooth_printer');
    if (saved) {
      savedPrinterInfo = JSON.parse(saved);
      return savedPrinterInfo;
    }
  } catch (e) {}
  return null;
}

/**
 * Save printer to localStorage
 */
function savePrinter(device) {
  const info = {
    name: device.name,
    id: device.id,
    savedAt: new Date().toISOString()
  };
  localStorage.setItem('bluetooth_printer', JSON.stringify(info));
  savedPrinterInfo = info;
}

/**
 * Scan and connect to Bluetooth printer
 */
export async function connectPrinter() {
  if (!isBluetoothSupported()) {
    throw new Error('Bluetooth not supported on this device');
  }

  try {
    // Request Bluetooth device - filter for printers
    const device = await navigator.bluetooth.requestDevice({
      // Accept all devices (most thermal printers don't advertise specific services)
      acceptAllDevices: true,
      optionalServices: [
        '000018f0-0000-1000-8000-00805f9b34fb', // Generic printer service
        '49535343-fe7d-4ae5-8fa9-9fafd205e455', // Serial Port Profile
        '0000ff00-0000-1000-8000-00805f9b34fb', // Common printer service
        '0000ffe0-0000-1000-8000-00805f9b34fb', // HM-10 BLE
        'e7810a71-73ae-499d-8c15-faa9aef0c3f2', // RawBT service
      ]
    });

    console.log('Selected device:', device.name);
    
    // Connect to GATT server
    const server = await device.gatt.connect();
    console.log('Connected to GATT server');

    // Try to find printer service
    let service = null;
    let characteristic = null;

    const serviceUUIDs = [
      '000018f0-0000-1000-8000-00805f9b34fb',
      '49535343-fe7d-4ae5-8fa9-9fafd205e455',
      '0000ff00-0000-1000-8000-00805f9b34fb',
      '0000ffe0-0000-1000-8000-00805f9b34fb',
      'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
    ];

    for (const uuid of serviceUUIDs) {
      try {
        service = await server.getPrimaryService(uuid);
        console.log('Found service:', uuid);
        break;
      } catch (e) {
        continue;
      }
    }

    if (!service) {
      // Try getting all services
      const services = await server.getPrimaryServices();
      if (services.length > 0) {
        service = services[0];
        console.log('Using first available service');
      }
    }

    if (!service) {
      throw new Error('No printer service found');
    }

    // Get characteristics
    const characteristics = await service.getCharacteristics();
    
    // Find writable characteristic
    for (const char of characteristics) {
      if (char.properties.write || char.properties.writeWithoutResponse) {
        characteristic = char;
        console.log('Found writable characteristic');
        break;
      }
    }

    if (!characteristic) {
      throw new Error('No writable characteristic found');
    }

    connectedDevice = device;
    printerCharacteristic = characteristic;
    
    // Save printer info
    savePrinter(device);

    // Handle disconnection
    device.addEventListener('gattserverdisconnected', () => {
      console.log('Printer disconnected');
      connectedDevice = null;
      printerCharacteristic = null;
    });

    return {
      success: true,
      device: {
        name: device.name,
        id: device.id
      }
    };
  } catch (error) {
    console.error('Bluetooth connection error:', error);
    throw error;
  }
}

/**
 * Disconnect from printer with proper cleanup
 */
export function disconnectPrinter() {
  try {
    console.log('[v0] Bluetooth: Disconnecting printer...');
    
    // Remove event listener
    if (connectedDevice) {
      try {
        connectedDevice.removeEventListener('gattserverdisconnected', () => {});
      } catch (e) {
        console.debug('[v0] Could not remove disconnect listener');
      }
    }

    // Disconnect GATT
    if (connectedDevice && connectedDevice.gatt.connected) {
      try {
        connectedDevice.gatt.disconnect();
        console.log('[v0] Bluetooth: GATT disconnected');
      } catch (e) {
        console.warn('[v0] Error disconnecting GATT:', e.message);
      }
    }

    // Clear references to allow garbage collection
    connectedDevice = null;
    printerCharacteristic = null;
    
    console.log('[v0] Bluetooth: Cleanup complete');
  } catch (err) {
    console.error('[v0] Bluetooth: Disconnect error:', err);
  }
}

/**
 * Check if printer is connected
 */
export function isPrinterConnected() {
  return connectedDevice && connectedDevice.gatt.connected && printerCharacteristic;
}

/**
 * Send raw data to printer with retry logic
 */
async function sendToPrinter(data, retryCount = 0, maxRetries = 2) {
  if (!isPrinterConnected()) {
    console.error('[v0] Bluetooth: Printer not connected');
    throw new Error('Printer not connected - please reconnect');
  }

  const uint8Array = new Uint8Array(data);
  
  if (uint8Array.length === 0) {
    console.warn('[v0] Bluetooth: Empty data to send');
    return;
  }

  try {
    // Send in chunks (BLE has MTU limit, usually 20 bytes)
    const chunkSize = 20;
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const chunk = uint8Array.slice(i, i + chunkSize);
      
      try {
        if (printerCharacteristic.properties.writeWithoutResponse) {
          await printerCharacteristic.writeValueWithoutResponse(chunk);
        } else {
          await printerCharacteristic.writeValue(chunk);
        }
        console.log(`[v0] Bluetooth: Sent chunk ${i / chunkSize + 1}/${Math.ceil(uint8Array.length / chunkSize)}`);
      } catch (chunkErr) {
        console.error(`[v0] Bluetooth: Chunk write failed:`, chunkErr.message);
        
        // If characteristic is invalidated, try to reconnect
        if (chunkErr.name === 'NotFoundError' || !isPrinterConnected()) {
          throw new Error('Printer disconnected during print');
        }
        throw chunkErr;
      }
      
      // Delay between chunks to prevent buffer overflow
      await new Promise(resolve => setTimeout(resolve, 30));
    }
    console.log('[v0] Bluetooth: All data sent successfully');
  } catch (err) {
    console.error('[v0] Bluetooth: Send error:', err.message);
    
    // Retry logic
    if (retryCount < maxRetries) {
      console.log(`[v0] Bluetooth: Retry attempt ${retryCount + 1}/${maxRetries}`);
      // Wait before retry with exponential backoff
      await new Promise(resolve => setTimeout(resolve, 500 * (retryCount + 1)));
      
      // Check if still connected
      if (isPrinterConnected()) {
        return sendToPrinter(data, retryCount + 1, maxRetries);
      } else {
        throw new Error('Printer disconnected - cannot retry');
      }
    }
    
    throw err;
  }
}

/**
 * Convert text to printer bytes
 */
function textToBytes(text) {
  const encoder = new TextEncoder();
  return Array.from(encoder.encode(text));
}

/**
 * Print text with formatting
 */
export async function printText(text, options = {}) {
  const {
    align = 'left',
    bold = false,
    doubleHeight = false,
    doubleWidth = false,
    underline = false,
    feedLines = 1
  } = options;

  let data = [];

  // Alignment
  if (align === 'center') data.push(...COMMANDS.ALIGN_CENTER);
  else if (align === 'right') data.push(...COMMANDS.ALIGN_RIGHT);
  else data.push(...COMMANDS.ALIGN_LEFT);

  // Bold
  if (bold) data.push(...COMMANDS.BOLD_ON);

  // Size
  if (doubleHeight && doubleWidth) data.push(...COMMANDS.DOUBLE_ON);
  else if (doubleHeight) data.push(...COMMANDS.DOUBLE_HEIGHT_ON);
  else if (doubleWidth) data.push(...COMMANDS.DOUBLE_WIDTH_ON);

  // Underline
  if (underline) data.push(...COMMANDS.UNDERLINE_ON);

  // Text
  data.push(...textToBytes(text));

  // Reset formatting
  data.push(...COMMANDS.NORMAL_SIZE);
  data.push(...COMMANDS.BOLD_OFF);
  data.push(...COMMANDS.UNDERLINE_OFF);

  // Line feeds
  for (let i = 0; i < feedLines; i++) {
    data.push(...COMMANDS.FEED_LINE);
  }

  await sendToPrinter(data);
}

/**
 * Print a line separator
 */
export async function printLine(char = '-', length = 32) {
  await printText(char.repeat(length));
}

/**
 * Print receipt with comprehensive error handling
 */
export async function printReceipt(order, businessSettings = {}) {
  if (!order) {
    console.error('[v0] Bluetooth: No order data provided');
    throw new Error('No order data to print');
  }

  if (!isPrinterConnected()) {
    console.log('[v0] Bluetooth: Attempting to reconnect...');
    // Try to reconnect
    const saved = getSavedPrinter();
    if (saved) {
      try {
        await connectPrinter();
        console.log('[v0] Bluetooth: Reconnected successfully');
      } catch (reconnectErr) {
        console.error('[v0] Bluetooth: Reconnection failed:', reconnectErr.message);
        throw new Error('Printer not connected. Please connect printer in Settings.');
      }
    } else {
      console.error('[v0] Bluetooth: No saved printer configured');
      throw new Error('No printer configured. Please connect a printer in Settings.');
    }
  }

  try {
    console.log('[v0] Bluetooth: Starting receipt print...');
    
    // Initialize printer with timeout
    await Promise.race([
      sendToPrinter(COMMANDS.INIT),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Printer init timeout')), 5000)
      )
    ]);
    await new Promise(r => setTimeout(r, 100));

    // Business name (large, centered, bold)
    await printText(businessSettings.business_name || 'BillByteKOT', {
      align: 'center',
      bold: true,
      doubleHeight: true,
      doubleWidth: true
    });

    // Address
    if (businessSettings.address) {
      await printText(businessSettings.address, { align: 'center' });
    }

    // Phone
    if (businessSettings.phone) {
      await printText(`Tel: ${businessSettings.phone}`, { align: 'center' });
    }

    // GST
    if (businessSettings.gst_number) {
      await printText(`GSTIN: ${businessSettings.gst_number}`, { align: 'center' });
    }

    await printLine('=');

    // Receipt header
    await printText('TAX INVOICE', { align: 'center', bold: true });
    await printLine('-');

    // Order details
    const orderDate = new Date(order.created_at).toLocaleString('en-IN');
    await printText(`Bill No: ${order.order_number || order.id?.slice(-6) || 'N/A'}`);
    await printText(`Date: ${orderDate}`);
    
    if (order.table_number) {
      await printText(`Table: ${order.table_number}`);
    }
    
    if (order.customer_name) {
      await printText(`Customer: ${order.customer_name}`);
    }

    await printLine('-');

    // Items header
    await printText('Item              Qty    Amount', { bold: true });
    await printLine('-');

    // Items
    const items = order.items || [];
    for (const item of items) {
      const name = (item.name || 'Item').substring(0, 16).padEnd(16);
      const qty = String(item.quantity || 1).padStart(3);
      const amount = `₹${((item.price || 0) * (item.quantity || 1)).toFixed(0)}`.padStart(9);
      await printText(`${name} ${qty} ${amount}`);
    }

    await printLine('-');

    // Totals
    const subtotal = order.subtotal || items.reduce((sum, i) => sum + (i.price * i.quantity), 0);
    const tax = order.tax || 0;
    const total = order.total || (subtotal + tax);

    await printText(`Subtotal:`.padEnd(20) + `₹${subtotal.toFixed(2)}`.padStart(12));
    
    if (tax > 0) {
      const taxRate = order.tax_rate || businessSettings.tax_rate || 5;
      await printText(`Tax (${taxRate}%):`.padEnd(20) + `₹${tax.toFixed(2)}`.padStart(12));
    }

    await printLine('=');
    await printText(`TOTAL:`.padEnd(20) + `₹${total.toFixed(2)}`.padStart(12), { bold: true, doubleHeight: true });
    await printLine('=');

    // Payment info
    if (order.payment_method) {
      await printText(`Payment: ${order.payment_method.toUpperCase()}`);
    }

    // Footer
    await printText('');
    await printText('Thank you for your visit!', { align: 'center' });
    await printText('Please come again', { align: 'center' });
    
    if (businessSettings.receipt_footer) {
      await printText(businessSettings.receipt_footer, { align: 'center' });
    }

    // Feed and cut
    try {
      await sendToPrinter([...COMMANDS.FEED_LINES(4), ...COMMANDS.CUT_PARTIAL]);
    } catch (cutErr) {
      console.warn('[v0] Bluetooth: Cut operation failed (non-critical):', cutErr.message);
      // Don't fail the entire print if cut fails
    }

    console.log('[v0] Bluetooth: Receipt printed successfully');
    return { success: true };
  } catch (error) {
    console.error('[v0] Bluetooth: Print error:', error.message);
    
    // Provide helpful error messages
    if (error.message.includes('NotFoundError') || error.message.includes('disconnected')) {
      throw new Error('Printer disconnected during print - try reconnecting');
    }
    
    throw error;
  }
}

/**
 * Print KOT (Kitchen Order Ticket)
 */
export async function printKOT(order, businessSettings = {}) {
  if (!isPrinterConnected()) {
    throw new Error('Printer not connected');
  }

  try {
    await sendToPrinter(COMMANDS.INIT);
    await new Promise(r => setTimeout(r, 100));

    // KOT Header
    await printText('*** KOT ***', { align: 'center', bold: true, doubleHeight: true });
    await printLine('=');

    // Order info
    await printText(`Order: ${order.order_number || order.id?.slice(-6) || 'N/A'}`, { bold: true });
    await printText(`Time: ${new Date().toLocaleTimeString('en-IN')}`);
    
    if (order.table_number) {
      await printText(`TABLE: ${order.table_number}`, { bold: true, doubleHeight: true });
    }

    await printLine('-');

    // Items
    const items = order.items || [];
    for (const item of items) {
      await printText(`${item.quantity}x ${item.name}`, { bold: true });
      if (item.notes) {
        await printText(`   Note: ${item.notes}`);
      }
    }

    await printLine('=');
    await printText(`Total Items: ${items.reduce((sum, i) => sum + i.quantity, 0)}`, { bold: true });

    // Feed and cut
    await sendToPrinter([...COMMANDS.FEED_LINES(3), ...COMMANDS.CUT_PARTIAL]);

    return { success: true };
  } catch (error) {
    console.error('KOT print error:', error);
    throw error;
  }
}

/**
 * Test print
 */
export async function testPrint() {
  if (!isPrinterConnected()) {
    throw new Error('Printer not connected');
  }

  await sendToPrinter(COMMANDS.INIT);
  await printText('BillByteKOT', { align: 'center', bold: true, doubleHeight: true });
  await printLine('=');
  await printText('Printer Test Successful!', { align: 'center' });
  await printText(new Date().toLocaleString('en-IN'), { align: 'center' });
  await printLine('=');
  await sendToPrinter([...COMMANDS.FEED_LINES(3), ...COMMANDS.CUT_PARTIAL]);

  return { success: true };
}

export default {
  isBluetoothSupported,
  getSavedPrinter,
  connectPrinter,
  disconnectPrinter,
  isPrinterConnected,
  printText,
  printLine,
  printReceipt,
  printKOT,
  testPrint
};
