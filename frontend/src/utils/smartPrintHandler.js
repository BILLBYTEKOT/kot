/**
 * Smart Print Handler - Intelligent routing across all platforms
 * Auto-detects platform and routes to the best available printer
 */

import { toast } from 'sonner';
import { createPrintResult, getPrintErrorMessage, isRetryableError } from './printValidator';
import { isElectron } from '../hooks/useElectron';
import { isAndroid, isAndroidTWA, androidPrint, shareReceiptText } from './androidPrint';
import { isBluetoothPrinterConnected, printReceipt as bluetoothPrintReceipt } from './printUtils';

const PRINT_TIMEOUT = 30000; // 30 seconds

/**
 * Detect current platform
 */
export const detectPlatform = () => {
  if (isElectron?.()) return 'electron';
  if (isAndroidTWA?.()) return 'android-twa';
  if (isAndroid?.()) return 'android';
  if (isBluetoothPrinterConnected?.()) return 'bluetooth';
  return 'browser';
};

/**
 * Try printing via Electron (Desktop)
 */
const tryElectronPrint = async (order, businessSettings) => {
  try {
    if (!window.electronAPI?.printReceipt) {
      return { success: false, error: 'Electron API not available' };
    }

    // Build receipt HTML
    const html = generateReceiptHTML(order, businessSettings);
    
    console.log('[v0] smartPrint: Trying Electron...');
    window.electronAPI.printReceipt(html);
    
    return { success: true, method: 'electron' };
  } catch (error) {
    console.warn('[v0] Electron print failed:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Try printing via Bluetooth
 */
const tryBluetoothPrint = async (order, businessSettings) => {
  try {
    if (!isBluetoothPrinterConnected?.()) {
      return { success: false, error: 'Bluetooth printer not connected' };
    }

    console.log('[v0] smartPrint: Trying Bluetooth...');
    const result = await bluetoothPrintReceipt(order, businessSettings);
    
    return { success: result?.success ?? true, method: 'bluetooth' };
  } catch (error) {
    console.warn('[v0] Bluetooth print failed:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Try printing via Android RawBT/Share
 */
const tryAndroidPrint = async (order, businessSettings) => {
  try {
    console.log('[v0] smartPrint: Trying Android...');
    
    // Generate plain text receipt for Android
    const plainText = generatePlainTextReceipt(order, businessSettings);
    
    // Try RawBT or Share
    const result = await androidPrint(buildReceiptEscPos(order, businessSettings), plainText);
    
    return { success: result, method: 'android' };
  } catch (error) {
    console.warn('[v0] Android print failed:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Try printing via browser Print Dialog
 */
const tryBrowserPrint = async (order, businessSettings) => {
  try {
    console.log('[v0] smartPrint: Trying browser print dialog...');
    
    const html = generateReceiptHTML(order, businessSettings);
    const printWindow = window.open('', '_blank');
    
    if (!printWindow) {
      return { success: false, error: 'Cannot open print dialog - popup may be blocked' };
    }

    printWindow.document.write(html);
    printWindow.document.close();
    
    // Wait for page to load then print
    printWindow.onload = () => {
      printWindow.print();
    };
    
    return { success: true, method: 'browser' };
  } catch (error) {
    console.warn('[v0] Browser print failed:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Smart print - tries all available methods in optimal order
 */
export const smartPrint = async (order, businessSettings = {}) => {
  const startTime = Date.now();

  try {
    // Validate order
    if (!order || !order.id) {
      const msg = 'Invalid order data';
      toast.error(msg);
      return createPrintResult(false, { message: msg, retryable: false });
    }

    console.log('[v0] smartPrint: Starting - order:', order.id);
    toast.loading('Preparing to print...', { id: 'print-loading' });

    // Determine platform and build method chain
    const platform = detectPlatform();
    console.log('[v0] smartPrint: Platform detected:', platform);

    const printMethods = [];

    // Build method priority list based on platform
    if (platform === 'electron') {
      printMethods.push(tryElectronPrint);
      printMethods.push(tryBrowserPrint);
    } else if (platform === 'android-twa' || platform === 'android') {
      printMethods.push(tryAndroidPrint);
      printMethods.push(tryBluetoothPrint);
      printMethods.push(tryBrowserPrint);
    } else if (platform === 'bluetooth') {
      printMethods.push(tryBluetoothPrint);
      printMethods.push(tryBrowserPrint);
    } else {
      // Browser/Web
      printMethods.push(tryBrowserPrint);
      printMethods.push(tryBluetoothPrint);
    }

    // Try each method
    let lastError = null;
    for (const printMethod of printMethods) {
      try {
        const result = await Promise.race([
          printMethod(order, businessSettings),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Print method timeout')), PRINT_TIMEOUT)
          ),
        ]);

        if (result?.success) {
          const duration = Date.now() - startTime;
          console.log(`[v0] smartPrint: Success via ${result.method} in ${duration}ms`);
          
          toast.dismiss('print-loading');
          toast.success(`Sent to ${result.method}`, {
            duration: 2000,
            icon: '✅',
          });

          return createPrintResult(true, {
            message: `Print succeeded via ${result.method}`,
            details: { method: result.method, duration },
          });
        }

        lastError = result?.error;
        console.log(`[v0] ${printMethod.name} failed: ${lastError}`);
      } catch (error) {
        lastError = error.message;
        console.warn(`[v0] ${printMethod.name} error:`, lastError);
      }
    }

    // All methods failed
    toast.dismiss('print-loading');
    const errorMsg = getPrintErrorMessage(lastError || 'No printer available');
    toast.error(errorMsg, { duration: 4000 });

    console.error('[v0] smartPrint: All methods failed');
    return createPrintResult(false, {
      message: errorMsg,
      error: lastError,
      retryable: isRetryableError(lastError),
    });
  } catch (error) {
    toast.dismiss('print-loading');
    const errorMsg = getPrintErrorMessage(error);
    toast.error(errorMsg, { duration: 4000 });

    console.error('[v0] smartPrint: Fatal error:', error);
    return createPrintResult(false, {
      message: errorMsg,
      error: error.message,
      retryable: isRetryableError(error),
    });
  }
};

/**
 * Export smart printer status
 */
export const getPrinterStatus = () => {
  const platform = detectPlatform();
  
  const status = {
    platform,
    hasElectron: isElectron?.(),
    hasBluetoothConnected: isBluetoothPrinterConnected?.(),
    isAndroid: isAndroid?.(),
    isAndroidTWA: isAndroidTWA?.(),
    canPrint: true, // Browser print always available
  };

  return status;
};

/**
 * Format printer info for UI display
 */
export const getPrinterStatusText = () => {
  const status = getPrinterStatus();

  if (status.platform === 'electron') {
    return 'Desktop Printer Ready';
  }
  if (status.hasBluetoothConnected) {
    return 'Bluetooth Printer Connected';
  }
  if (status.isAndroidTWA) {
    return 'Android Printing Available';
  }
  if (status.isAndroid) {
    return 'Android Device Ready';
  }
  return 'Browser Print Ready';
};

// Placeholder imports - these would come from actual printUtils.js
const generateReceiptHTML = (order, settings) => `<html><body>${JSON.stringify(order)}</body></html>`;
const generatePlainTextReceipt = (order, settings) => JSON.stringify(order);
const buildReceiptEscPos = (order, settings) => new Uint8Array();
