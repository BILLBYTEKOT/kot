import { 
  smartPrint,
  determineBestMethod,
  executePrintWithTimeout,
  handlePrintError,
  getPrintResult
} from '../smartPrintHandler';

describe('smartPrintHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('smartPrint', () => {
    test('should handle valid input', async () => {
      const order = { id: '123', items: [], total: 100 };
      const settings = { businessName: 'Test' };
      
      const result = await smartPrint(order, settings);
      expect(result).toHaveProperty('success');
    });

    test('should reject invalid order', async () => {
      const result = await smartPrint(null, {});
      expect(result.success).toBe(false);
    });

    test('should include platform info in result', async () => {
      const order = { id: '123', items: [], total: 100 };
      const result = await smartPrint(order, {});
      expect(result).toHaveProperty('platform');
    });

    test('should return error message on failure', async () => {
      const result = await smartPrint(null, {});
      expect(result).toHaveProperty('message');
    });
  });

  describe('determineBestMethod', () => {
    test('should prefer Electron when available', () => {
      global.window.electronAPI = true;
      const method = determineBestMethod();
      expect(method).toBe('electron');
      delete global.window.electronAPI;
    });

    test('should prefer Android RawBT on Android', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Android 11',
        writable: true
      });
      const method = determineBestMethod();
      expect(['android', 'rawbt']).toContain(method);
    });

    test('should fallback to web/browser', () => {
      const method = determineBestMethod();
      expect(['web', 'browser', 'bluetooth']).toContain(method);
    });

    test('should return string', () => {
      const method = determineBestMethod();
      expect(typeof method).toBe('string');
    });
  });

  describe('executePrintWithTimeout', () => {
    test('should execute function within timeout', async () => {
      const mockFn = jest.fn().mockResolvedValue({ success: true });
      const result = await executePrintWithTimeout(mockFn, 5000);
      expect(result.success).toBe(true);
      expect(mockFn).toHaveBeenCalled();
    });

    test('should reject on timeout', async () => {
      const mockFn = jest.fn(() => 
        new Promise(resolve => setTimeout(resolve, 10000))
      );
      const result = await executePrintWithTimeout(mockFn, 100);
      expect(result.success).toBe(false);
      expect(result.message).toContain('timeout');
    });

    test('should use default timeout', async () => {
      const mockFn = jest.fn().mockResolvedValue({ success: true });
      const result = await executePrintWithTimeout(mockFn);
      expect(result.success).toBe(true);
    });

    test('should pass error details', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('Test error'));
      const result = await executePrintWithTimeout(mockFn, 5000);
      expect(result.success).toBe(false);
    });
  });

  describe('handlePrintError', () => {
    test('should return structured error for timeout', () => {
      const error = new Error('Print timeout after 30s');
      const result = handlePrintError(error, 'test-order');
      expect(result.success).toBe(false);
      expect(result.error).toContain('timeout');
    });

    test('should return structured error for disconnection', () => {
      const error = new Error('Printer disconnected');
      const result = handlePrintError(error, 'test-order');
      expect(result.success).toBe(false);
      expect(result.retryable).toBe(true);
    });

    test('should suggest retry for recoverable errors', () => {
      const error = new Error('Connection failed - reconnecting');
      const result = handlePrintError(error, 'test-order');
      expect(result).toHaveProperty('retryable');
    });

    test('should log error with order ID', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const error = new Error('Test error');
      handlePrintError(error, 'order-123');
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('getPrintResult', () => {
    test('should return success result', () => {
      const result = getPrintResult(true, 'test-order', null);
      expect(result.success).toBe(true);
      expect(result.orderId).toBe('test-order');
    });

    test('should return error result', () => {
      const result = getPrintResult(false, 'test-order', new Error('Failed'));
      expect(result.success).toBe(false);
      expect(result.message).toContain('Failed');
    });

    test('should include timestamp', () => {
      const result = getPrintResult(true, 'order-1', null);
      expect(result).toHaveProperty('timestamp');
    });

    test('should include retry info when applicable', () => {
      const error = new Error('Connection timeout');
      const result = getPrintResult(false, 'order-1', error);
      expect(result).toHaveProperty('retryable');
    });
  });
});
