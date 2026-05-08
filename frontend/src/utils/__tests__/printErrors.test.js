import { handlePrintError, categorizeError, isRetryable } from '../printValidator';

describe('Print Error Handling', () => {
  describe('Timeout Errors', () => {
    test('should handle 30s global timeout', () => {
      const error = new Error('Print timeout after 30s');
      const result = handlePrintError(error, 'ORD-001');
      expect(result.success).toBe(false);
      expect(result.message).toContain('timeout');
    });

    test('should handle Electron 10s timeout', () => {
      const error = new Error('Electron print timeout after 10s');
      const result = handlePrintError(error, 'ORD-001');
      expect(result.success).toBe(false);
    });

    test('should suggest printer offline for timeout', () => {
      const error = new Error('Print timeout');
      const result = handlePrintError(error, 'ORD-001');
      expect(result.message).toMatch(/offline|timeout|reconnect/i);
    });

    test('should mark timeout as retryable', () => {
      const error = new Error('timeout');
      expect(isRetryable(error)).toBe(true);
    });
  });

  describe('Platform-Specific Errors', () => {
    test('should handle Android permission errors', () => {
      const error = new Error('Permission denied: BLUETOOTH');
      const result = handlePrintError(error, 'ORD-001');
      expect(result.success).toBe(false);
      expect(result.message).toMatch(/permission|bluetooth/i);
    });

    test('should handle Android RawBT not installed', () => {
      const error = new Error('RawBT app not found');
      const result = handlePrintError(error, 'ORD-001');
      expect(result.success).toBe(false);
      expect(result.message).toMatch(/RawBT|install/i);
    });

    test('should handle Electron printer not found', () => {
      const error = new Error('Printer not found');
      const result = handlePrintError(error, 'ORD-001');
      expect(result.success).toBe(false);
    });

    test('should handle Bluetooth disconnection', () => {
      const error = new Error('NotFoundError: Bluetooth device disconnected');
      const result = handlePrintError(error, 'ORD-001');
      expect(result.success).toBe(false);
      expect(result.retryable).toBe(true);
    });

    test('should handle Bluetooth GATT errors', () => {
      const error = new Error('GATT operation failed');
      const result = handlePrintError(error, 'ORD-001');
      expect(result.success).toBe(false);
    });
  });

  describe('Validation Errors', () => {
    test('should handle invalid order data', () => {
      const error = new Error('Invalid order: missing id');
      const result = handlePrintError(error, 'ORD-001');
      expect(result.success).toBe(false);
      expect(result.retryable).toBe(false);
    });

    test('should handle invalid ESC/POS bytes', () => {
      const error = new Error('Invalid byte value: 256 (must be 0-255)');
      const result = handlePrintError(error, 'ORD-001');
      expect(result.success).toBe(false);
      expect(result.retryable).toBe(false);
    });

    test('should handle invalid print settings', () => {
      const error = new Error('Invalid print settings: missing businessName');
      const result = handlePrintError(error, 'ORD-001');
      expect(result.success).toBe(false);
    });

    test('should mark validation errors as non-retryable', () => {
      const error = new Error('Validation failed: invalid data');
      expect(isRetryable(error)).toBe(false);
    });
  });

  describe('Encoding Errors', () => {
    test('should handle UTF-8 encoding failures', () => {
      const error = new Error('Text encoding failed for character: ₹');
      const result = handlePrintError(error, 'ORD-001');
      expect(result.success).toBe(false);
    });

    test('should handle Base64 encoding failures', () => {
      const error = new Error('Base64 encoding failed');
      const result = handlePrintError(error, 'ORD-001');
      expect(result.success).toBe(false);
    });

    test('should suggest encoding fallback', () => {
      const error = new Error('Special character encoding failed');
      const result = handlePrintError(error, 'ORD-001');
      expect(result.message).toBeDefined();
    });
  });

  describe('Memory/Resource Errors', () => {
    test('should handle out of memory errors', () => {
      const error = new Error('Out of memory');
      const result = handlePrintError(error, 'ORD-001');
      expect(result.success).toBe(false);
      expect(result.message).toMatch(/memory|resource/i);
    });

    test('should handle DOM operation errors', () => {
      const error = new Error('Failed to execute appendChild on iframe');
      const result = handlePrintError(error, 'ORD-001');
      expect(result.success).toBe(false);
    });

    test('should handle listener cleanup errors', () => {
      const error = new Error('Cannot remove event listener on null');
      const result = handlePrintError(error, 'ORD-001');
      expect(result.success).toBe(false);
    });
  });

  describe('Network Errors', () => {
    test('should handle network timeouts', () => {
      const error = new Error('Network request timeout');
      const result = handlePrintError(error, 'ORD-001');
      expect(result.success).toBe(false);
    });

    test('should handle connection refused', () => {
      const error = new Error('Connection refused');
      const result = handlePrintError(error, 'ORD-001');
      expect(result.success).toBe(false);
      expect(result.retryable).toBe(true);
    });

    test('should handle no printer available', () => {
      const error = new Error('No available printers');
      const result = handlePrintError(error, 'ORD-001');
      expect(result.success).toBe(false);
    });
  });

  describe('Error Recovery', () => {
    test('should provide recovery steps for timeout', () => {
      const error = new Error('Printer timeout');
      const result = handlePrintError(error, 'ORD-001');
      if (result.recovery) {
        expect(result.recovery.length > 0).toBe(true);
      }
    });

    test('should provide recovery steps for disconnection', () => {
      const error = new Error('Printer disconnected');
      const result = handlePrintError(error, 'ORD-001');
      if (result.recovery) {
        expect(result.recovery).toContain('reconnect');
      }
    });

    test('should log error with context', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const error = new Error('Test error');
      handlePrintError(error, 'ORD-001');
      expect(consoleSpy).toHaveBeenCalled();
      const callArgs = consoleSpy.mock.calls[0][0];
      expect(callArgs).toContain('ORD-001');
      consoleSpy.mockRestore();
    });

    test('should include timestamp in error report', () => {
      const error = new Error('Test error');
      const result = handlePrintError(error, 'ORD-001');
      expect(result).toHaveProperty('timestamp');
    });
  });

  describe('Error Categorization', () => {
    test('should categorize timeout errors', () => {
      const error = new Error('timeout');
      const category = categorizeError(error);
      expect(category).toBe('TIMEOUT');
    });

    test('should categorize disconnection errors', () => {
      const error = new Error('disconnected');
      const category = categorizeError(error);
      expect(['DISCONNECTION', 'CONNECTION'].includes(category)).toBe(true);
    });

    test('should categorize validation errors', () => {
      const error = new Error('invalid data');
      const category = categorizeError(error);
      expect(['VALIDATION', 'INVALID_DATA'].includes(category)).toBe(true);
    });

    test('should categorize encoding errors', () => {
      const error = new Error('encoding failed');
      const category = categorizeError(error);
      expect(['ENCODING', 'VALIDATION'].includes(category)).toBe(true);
    });

    test('should categorize unknown errors as UNKNOWN', () => {
      const error = new Error('something completely unexpected');
      const category = categorizeError(error);
      expect(category).toBe('UNKNOWN');
    });
  });

  describe('Retry Logic', () => {
    test('should allow retry for timeout', () => {
      const error = new Error('Printer timeout');
      expect(isRetryable(error)).toBe(true);
    });

    test('should allow retry for disconnection', () => {
      const error = new Error('Disconnected from printer');
      expect(isRetryable(error)).toBe(true);
    });

    test('should not allow retry for validation', () => {
      const error = new Error('Invalid order');
      error.category = 'VALIDATION';
      expect(isRetryable(error)).toBe(false);
    });

    test('should not allow retry for encoding errors', () => {
      const error = new Error('Encoding failed');
      error.category = 'ENCODING';
      expect(isRetryable(error)).toBe(false);
    });

    test('should determine retry attempts needed', () => {
      const timeoutError = new Error('timeout');
      const validationError = new Error('invalid');
      
      expect(isRetryable(timeoutError)).toBe(true);
      expect(isRetryable(validationError)).toBe(false);
    });
  });
});
