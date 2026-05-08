/**
 * Print Validator & Error Handler
 * Validates all print inputs and provides structured error handling
 */

export const PRINT_ERRORS = {
  NO_DATA: 'No order data provided',
  NO_SETTINGS: 'Business settings not available',
  NO_PRINTER: 'No printer available - connect a printer in settings',
  INVALID_ORDER: 'Order data is invalid or incomplete',
  TIMEOUT: 'Print operation timed out',
  DEVICE_ERROR: 'Device error - printer may be disconnected',
  UNSUPPORTED: 'Printing not supported on this platform',
};

/**
 * Validate order data before printing
 */
export const validateOrderData = (order) => {
  if (!order) {
    return { valid: false, error: PRINT_ERRORS.NO_DATA };
  }

  if (typeof order !== 'object') {
    return { valid: false, error: PRINT_ERRORS.INVALID_ORDER };
  }

  // Check for required fields
  const requiredFields = ['id', 'items', 'total'];
  for (const field of requiredFields) {
    if (!(field in order)) {
      return { valid: false, error: `${PRINT_ERRORS.INVALID_ORDER} - missing ${field}` };
    }
  }

  // Validate items
  if (!Array.isArray(order.items) || order.items.length === 0) {
    return { valid: false, error: 'Order must have at least one item' };
  }

  // Validate each item
  for (const item of order.items) {
    if (!item.name || item.quantity <= 0 || item.price < 0) {
      return { valid: false, error: 'Order items are invalid' };
    }
  }

  // Validate total
  if (typeof order.total !== 'number' || order.total < 0) {
    return { valid: false, error: 'Order total is invalid' };
  }

  return { valid: true };
};

/**
 * Validate business settings
 */
export const validateBusinessSettings = (settings) => {
  if (!settings || typeof settings !== 'object') {
    return { valid: true, settings: {} }; // Defaults to empty object which is OK
  }
  
  return { valid: true, settings };
};

/**
 * Structured print result object
 */
export const createPrintResult = (success, options = {}) => {
  return {
    success,
    message: options.message || (success ? 'Print sent successfully' : 'Print failed'),
    error: options.error || null,
    timestamp: new Date().toISOString(),
    retryable: options.retryable ?? true,
    details: options.details || {},
  };
};

/**
 * Parse print error and provide user-friendly message
 */
export const getPrintErrorMessage = (error, context = '') => {
  if (!error) return 'Unknown print error occurred';

  const errorStr = error?.message || String(error);

  // Platform-specific errors
  if (errorStr.includes('NotFoundError') || errorStr.includes('disconnected')) {
    return 'Printer was disconnected during print. Please reconnect and try again.';
  }

  if (errorStr.includes('NotAllowedError') || errorStr.includes('permission')) {
    return 'Print permission denied. Check browser or app permissions.';
  }

  if (errorStr.includes('timeout') || errorStr.includes('Timeout')) {
    return 'Print operation timed out. Printer may be slow or offline.';
  }

  if (errorStr.includes('bluetooth') || errorStr.includes('RawBT')) {
    return 'Bluetooth printer error. Ensure printer is paired and in range.';
  }

  if (errorStr.includes('Electron') || errorStr.includes('electron')) {
    return 'Desktop print error. Check printer is installed on your system.';
  }

  // Generic fallback
  return `Print error: ${errorStr.substring(0, 100)}`;
};

/**
 * Determine if error is retryable
 */
export const isRetryableError = (error) => {
  const errorStr = error?.message || String(error);
  
  // Non-retryable errors
  const nonRetryable = [
    'NotAllowedError',
    'SecurityError',
    'InvalidState',
    'no data',
    'no printer',
    'invalid',
  ];
  
  for (const err of nonRetryable) {
    if (errorStr.toLowerCase().includes(err.toLowerCase())) {
      return false;
    }
  }
  
  return true;
};

/**
 * Wrap any print function with validation and error handling
 */
export const wrapPrintFunction = (printFn, fnName = 'print') => {
  return async (order, businessSettings, options = {}) => {
    try {
      // Validate order
      const orderValidation = validateOrderData(order);
      if (!orderValidation.valid) {
        console.error(`[v0] ${fnName}: ${orderValidation.error}`);
        return createPrintResult(false, {
          message: orderValidation.error,
          error: orderValidation.error,
          retryable: false,
        });
      }

      // Validate settings
      const settingsValidation = validateBusinessSettings(businessSettings);
      const settings = settingsValidation.settings || {};

      console.log(`[v0] ${fnName}: Starting with order`, order.id);

      // Call the actual print function with timeout
      const result = await Promise.race([
        printFn(order, settings, options),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Print timeout after 30s')), 30000)
        ),
      ]);

      console.log(`[v0] ${fnName}: Success`);
      return createPrintResult(true, {
        message: 'Print sent successfully',
        details: result || {},
      });
    } catch (error) {
      const errorMsg = getPrintErrorMessage(error, fnName);
      const isRetryable = isRetryableError(error);

      console.error(`[v0] ${fnName}: Error -`, error.message);

      return createPrintResult(false, {
        message: errorMsg,
        error: error.message,
        retryable: isRetryable,
        details: { originalError: error },
      });
    }
  };
};

/**
 * Chain multiple print methods with fallback
 */
export const chainPrintMethods = (methods = []) => {
  return async (order, businessSettings, options = {}) => {
    const results = [];

    for (let i = 0; i < methods.length; i++) {
      const method = methods[i];
      const methodName = method.name || `method-${i}`;

      console.log(`[v0] Attempting ${methodName}...`);

      try {
        const result = await method(order, businessSettings, options);
        if (result?.success) {
          console.log(`[v0] ${methodName} succeeded`);
          return createPrintResult(true, {
            message: `Print succeeded via ${methodName}`,
            details: { method: methodName, ...result },
          });
        }
        results.push({ method: methodName, success: false, ...result });
      } catch (error) {
        console.warn(`[v0] ${methodName} failed:`, error.message);
        results.push({ method: methodName, success: false, error: error.message });
      }
    }

    // All methods failed
    const failedMethods = results.map((r) => r.method).join(', ');
    return createPrintResult(false, {
      message: `All print methods failed: ${failedMethods}`,
      error: 'No printer available',
      retryable: true,
      details: { attemptedMethods: results },
    });
  };
};
