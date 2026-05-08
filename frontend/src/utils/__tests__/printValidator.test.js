import { 
  validateOrder, 
  validatePrintSettings, 
  validateEscposBytes,
  determinePlatform,
  isRetryable,
  categorizeError
} from '../printValidator';

describe('printValidator', () => {
  describe('validateOrder', () => {
    test('should pass valid order', () => {
      const order = {
        id: '123',
        items: [{ id: '1', name: 'Item', price: 100 }],
        total: 100
      };
      const result = validateOrder(order);
      expect(result.valid).toBe(true);
    });

    test('should fail with missing id', () => {
      const order = { items: [], total: 100 };
      const result = validateOrder(order);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('id');
    });

    test('should fail with missing items', () => {
      const order = { id: '123', total: 100 };
      const result = validateOrder(order);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('items');
    });

    test('should fail with null order', () => {
      const result = validateOrder(null);
      expect(result.valid).toBe(false);
    });

    test('should fail with undefined order', () => {
      const result = validateOrder(undefined);
      expect(result.valid).toBe(false);
    });

    test('should pass order with all required fields', () => {
      const order = {
        id: 'ORD-001',
        items: [{ id: 'ITEM1', name: 'Tea', price: 50 }],
        total: 50,
        status: 'pending',
        createdAt: new Date()
      };
      const result = validateOrder(order);
      expect(result.valid).toBe(true);
    });
  });

  describe('validatePrintSettings', () => {
    test('should pass valid settings', () => {
      const settings = {
        businessName: 'My Cafe',
        address: '123 Main St'
      };
      const result = validatePrintSettings(settings);
      expect(result.valid).toBe(true);
    });

    test('should pass empty settings', () => {
      const result = validatePrintSettings({});
      expect(result.valid).toBe(true);
    });

    test('should handle null settings', () => {
      const result = validatePrintSettings(null);
      expect(result.valid).toBe(true); // Optional
    });

    test('should handle undefined settings', () => {
      const result = validatePrintSettings(undefined);
      expect(result.valid).toBe(true); // Optional
    });
  });

  describe('validateEscposBytes', () => {
    test('should accept byte array', () => {
      const bytes = [0x1B, 0x40, 0x48, 0x65, 0x6C, 0x6C, 0x6F];
      const result = validateEscposBytes(bytes);
      expect(result.valid).toBe(true);
    });

    test('should accept Uint8Array', () => {
      const bytes = new Uint8Array([0x1B, 0x40]);
      const result = validateEscposBytes(bytes);
      expect(result.valid).toBe(true);
    });

    test('should reject empty array', () => {
      const result = validateEscposBytes([]);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('empty');
    });

    test('should reject invalid byte values', () => {
      const bytes = [256, 300]; // Out of byte range
      const result = validateEscposBytes(bytes);
      expect(result.valid).toBe(false);
    });

    test('should reject null', () => {
      const result = validateEscposBytes(null);
      expect(result.valid).toBe(false);
    });

    test('should accept large byte array', () => {
      const bytes = new Array(1000).fill(0x41); // 1000 'A' chars
      const result = validateEscposBytes(bytes);
      expect(result.valid).toBe(true);
    });
  });

  describe('determinePlatform', () => {
    const originalUserAgent = navigator.userAgent;

    test('should detect Android', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Linux; Android 11)',
        writable: true
      });
      const platform = determinePlatform();
      expect(platform).toBe('android');
    });

    test('should detect Electron', () => {
      global.window.electronAPI = true;
      const platform = determinePlatform();
      expect(platform).toBe('electron');
      delete global.window.electronAPI;
    });

    test('should detect Web', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0)',
        writable: true
      });
      delete global.window.electronAPI;
      const platform = determinePlatform();
      expect(['web', 'browser']).toContain(platform);
    });
  });

  describe('isRetryable', () => {
    test('should allow retry for timeout errors', () => {
      const error = new Error('Printer timeout');
      expect(isRetryable(error)).toBe(true);
    });

    test('should allow retry for connection errors', () => {
      const error = new Error('Connection failed');
      expect(isRetryable(error)).toBe(true);
    });

    test('should not allow retry for validation errors', () => {
      const error = new Error('Invalid order data');
      error.type = 'VALIDATION_ERROR';
      expect(isRetryable(error)).toBe(false);
    });

    test('should not allow retry for invalid data errors', () => {
      const error = new Error('Invalid bytes');
      expect(isRetryable(error)).toBe(false);
    });

    test('should allow retry for temporary failures', () => {
      const error = new Error('Printer offline - please reconnect');
      expect(isRetryable(error)).toBe(true);
    });
  });

  describe('categorizeError', () => {
    test('should categorize timeout errors', () => {
      const error = new Error('timeout');
      const category = categorizeError(error);
      expect(category).toBe('TIMEOUT');
    });

    test('should categorize disconnection errors', () => {
      const error = new Error('disconnected');
      const category = categorizeError(error);
      expect(category).toMatch(/DISCONNECTION|CONNECTION/);
    });

    test('should categorize validation errors', () => {
      const error = new Error('invalid order');
      const category = categorizeError(error);
      expect(['VALIDATION', 'INVALID_DATA']).toContain(category);
    });

    test('should categorize encoding errors', () => {
      const error = new Error('encoding failed');
      const category = categorizeError(error);
      expect(category).toMatch(/ENCODING|VALIDATION/);
    });

    test('should categorize unknown errors', () => {
      const error = new Error('something went wrong');
      const category = categorizeError(error);
      expect(category).toBe('UNKNOWN');
    });
  });
});
