/**
 * Electron Desktop Print Support
 * 
 * Provides reliable printing on Electron (desktop) apps with:
 * - Printer detection
 * - ESC/POS support via USB/Bluetooth
 * - Fallback to system print dialog
 * - Error recovery and retry logic
 */

import { toast } from 'sonner';

const PRINT_TIMEOUT = 10000; // 10s timeout for desktop print
const MAX_RETRIES = 2;

/**
 * Check if running in Electron
 */
export const isElectronApp = () => {
  if (typeof window === 'undefined') return false;
  return !!(window.electronAPI || window.__ELECTRON__ || process.type === 'renderer');
};

/**
 * Get list of available printers
 */
export const getAvailablePrinters = async () => {
  if (!isElectronApp()) {
    console.debug('[v0] Not in Electron, skipping printer detection');
    return [];
  }

  try {
    if (window.electronAPI?.getPrinters) {
      const printers = await window.electronAPI.getPrinters();
      console.log('[v0] Found printers:', printers.length);
      return printers || [];
    }
  } catch (err) {
    console.error('[v0] Error getting printers:', err.message);
  }

  return [];
};

/**
 * Get the default/last used printer
 */
export const getDefaultPrinter = async () => {
  if (!isElectronApp()) return null;

  try {
    if (window.electronAPI?.getDefaultPrinter) {
      const printer = await window.electronAPI.getDefaultPrinter();
      if (printer) {
        console.log('[v0] Default printer:', printer.name);
        return printer;
      }
    }

    // Fallback: get first available printer
    const printers = await getAvailablePrinters();
    if (printers.length > 0) {
      console.log('[v0] Using first available printer:', printers[0].name);
      return printers[0];
    }
  } catch (err) {
    console.error('[v0] Error getting default printer:', err.message);
  }

  return null;
};

/**
 * Validate printer before printing
 */
export const validatePrinterConnection = async (printerName) => {
  if (!isElectronApp()) {
    console.debug('[v0] Not in Electron, skipping printer validation');
    return true;
  }

  try {
    if (window.electronAPI?.validatePrinter) {
      const isValid = await window.electronAPI.validatePrinter(printerName);
      console.log(`[v0] Printer '${printerName}' validation:`, isValid);
      return isValid;
    }
    return true;
  } catch (err) {
    console.error('[v0] Error validating printer:', err.message);
    return false;
  }
};

/**
 * Print HTML content on Electron
 */
export const printHTMLOnElectron = async (htmlContent, options = {}, retryCount = 0) => {
  if (!isElectronApp()) {
    console.debug('[v0] Not in Electron, use browser print');
    return false;
  }

  if (!htmlContent) {
    console.error('[v0] No HTML content to print');
    toast.error('No print data available');
    return false;
  }

  try {
    const {
      printerName = null,
      paperSize = 'A4',
      margins = { top: 0, bottom: 0, left: 0, right: 0 },
      landscape = false,
      color = true,
      copies = 1
    } = options;

    // Validate printer if specified
    if (printerName) {
      const isValid = await validatePrinterConnection(printerName);
      if (!isValid) {
        console.warn('[v0] Specified printer not available, using default');
      }
    }

    const printOptions = {
      silent: false,
      printBackground: true,
      color: color,
      margin: margins,
      pageSize: paperSize,
      landscape: landscape,
      copies: Math.max(1, Math.min(5, copies)),
      printerName: printerName || undefined
    };

    if (window.electronAPI?.printHTML) {
      const result = await window.electronAPI.printHTML(htmlContent, printOptions);
      
      if (result.success) {
        console.log('[v0] Print job queued successfully');
        toast.success('Print job sent to printer');
        return true;
      } else {
        throw new Error(result.error || 'Print failed');
      }
    }

    console.error('[v0] electronAPI.printHTML not available');
    return false;
  } catch (err) {
    console.error('[v0] Print HTML error:', err.message);

    // Retry logic
    if (retryCount < MAX_RETRIES) {
      console.log(`[v0] Retry attempt ${retryCount + 1}/${MAX_RETRIES}`);
      await new Promise(r => setTimeout(r, 1000 * (retryCount + 1))); // Exponential backoff
      return printHTMLOnElectron(htmlContent, options, retryCount + 1);
    }

    toast.error('Print failed: ' + err.message);
    return false;
  }
};

/**
 * Print ESC/POS bytes directly to printer (USB/Bluetooth thermal)
 */
export const printEscPosOnElectron = async (escPosBytes, printerName = null, retryCount = 0) => {
  if (!isElectronApp()) {
    console.debug('[v0] Not in Electron, ESC/POS not supported');
    return false;
  }

  if (!escPosBytes || escPosBytes.length === 0) {
    console.error('[v0] No ESC/POS data to print');
    return false;
  }

  try {
    // Validate printer
    if (!printerName) {
      const defaultPrinter = await getDefaultPrinter();
      if (!defaultPrinter) {
        console.error('[v0] No printer available');
        toast.error('No printer found - connect a printer first');
        return false;
      }
      printerName = defaultPrinter.name;
    }

    // Validate connection
    const isValid = await validatePrinterConnection(printerName);
    if (!isValid) {
      console.warn('[v0] Printer connection lost, trying again...');
      if (retryCount < MAX_RETRIES) {
        await new Promise(r => setTimeout(r, 1500));
        return printEscPosOnElectron(escPosBytes, printerName, retryCount + 1);
      }
      toast.error('Printer not responding');
      return false;
    }

    // Convert Uint8Array to Buffer-compatible format if needed
    let printData = escPosBytes;
    if (escPosBytes instanceof Uint8Array) {
      printData = Array.from(escPosBytes);
    }

    if (window.electronAPI?.printESCPOS) {
      const result = await Promise.race([
        window.electronAPI.printESCPOS(printData, printerName),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Print timeout')), PRINT_TIMEOUT)
        )
      ]);

      if (result.success) {
        console.log('[v0] ESC/POS print sent');
        toast.success('Receipt printed');
        return true;
      } else {
        throw new Error(result.error || 'ESC/POS print failed');
      }
    }

    console.error('[v0] electronAPI.printESCPOS not available');
    return false;
  } catch (err) {
    console.error('[v0] ESC/POS print error:', err.message);

    if (retryCount < MAX_RETRIES) {
      console.log(`[v0] Retry attempt ${retryCount + 1}/${MAX_RETRIES}`);
      await new Promise(r => setTimeout(r, 1000 * (retryCount + 1)));
      return printEscPosOnElectron(escPosBytes, printerName, retryCount + 1);
    }

    toast.error('Print failed: ' + err.message);
    return false;
  }
};

/**
 * Open system print dialog (fallback for all printing)
 */
export const showPrintDialog = async (htmlContent) => {
  if (!isElectronApp()) {
    // Browser print
    const printWindow = window.open('', '', 'height=400,width=600');
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.print();
    return true;
  }

  try {
    if (window.electronAPI?.showPrintDialog) {
      const result = await window.electronAPI.showPrintDialog(htmlContent);
      return result.success || false;
    }

    // Fallback: use browser print
    console.log('[v0] No print dialog API, using browser print');
    return false;
  } catch (err) {
    console.error('[v0] Print dialog error:', err.message);
    return false;
  }
};

/**
 * Get printer status/info
 */
export const getPrinterStatus = async (printerName) => {
  if (!isElectronApp()) return null;

  try {
    if (window.electronAPI?.getPrinterStatus) {
      const status = await window.electronAPI.getPrinterStatus(printerName);
      return status;
    }
  } catch (err) {
    console.error('[v0] Error getting printer status:', err.message);
  }

  return null;
};

export default {
  isElectronApp,
  getAvailablePrinters,
  getDefaultPrinter,
  validatePrinterConnection,
  printHTMLOnElectron,
  printEscPosOnElectron,
  showPrintDialog,
  getPrinterStatus
};
