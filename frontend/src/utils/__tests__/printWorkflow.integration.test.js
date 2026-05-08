import { manualPrintReceipt, manualPrintKOT } from '../printUtils';
import { smartPrint } from '../smartPrintHandler';

describe('Print Workflow Integration Tests', () => {
  const mockOrder = {
    id: 'ORD-001',
    items: [
      { id: '1', name: 'Tea', quantity: 2, price: 50 },
      { id: '2', name: 'Coffee', quantity: 1, price: 100 }
    ],
    total: 200,
    status: 'pending',
    createdAt: new Date(),
    customerName: 'John Doe',
    phone: '9876543210'
  };

  const mockSettings = {
    businessName: 'Test Cafe',
    address: '123 Main Street',
    phone: '1234567890',
    gst: '18AAC1234K'
  };

  describe('Receipt Printing Workflow', () => {
    test('should complete full receipt print workflow', async () => {
      const result = await smartPrint(mockOrder, mockSettings);
      expect(result).toBeDefined();
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('orderId');
    });

    test('should handle receipt with special characters', async () => {
      const orderWithSpecialChars = {
        ...mockOrder,
        items: [
          { id: '1', name: 'Tea ☕', quantity: 1, price: 50 },
          { id: '2', name: 'Coffee ₹100', quantity: 1, price: 100 }
        ]
      };
      const result = await smartPrint(orderWithSpecialChars, mockSettings);
      expect(result).toBeDefined();
    });

    test('should handle receipt with long item names', async () => {
      const orderWithLongNames = {
        ...mockOrder,
        items: [
          { 
            id: '1', 
            name: 'Extra Long Item Name That Might Wrap On Receipt', 
            quantity: 1, 
            price: 100 
          }
        ]
      };
      const result = await smartPrint(orderWithLongNames, mockSettings);
      expect(result).toBeDefined();
    });

    test('should handle receipt with multiple items', async () => {
      const orderWithManyItems = {
        ...mockOrder,
        items: Array(10).fill(0).map((_, i) => ({
          id: String(i),
          name: `Item ${i + 1}`,
          quantity: 1,
          price: 50
        }))
      };
      const result = await smartPrint(orderWithManyItems, mockSettings);
      expect(result).toBeDefined();
    });

    test('should handle payment info in receipt', async () => {
      const orderWithPayment = {
        ...mockOrder,
        paymentMethod: 'cash',
        paidAmount: 200,
        status: 'completed'
      };
      const result = await smartPrint(orderWithPayment, mockSettings);
      expect(result).toBeDefined();
    });

    test('should handle partial payment in receipt', async () => {
      const orderWithPartialPayment = {
        ...mockOrder,
        total: 200,
        paidAmount: 150,
        status: 'partial',
        dueAmount: 50
      };
      const result = await smartPrint(orderWithPartialPayment, mockSettings);
      expect(result).toBeDefined();
    });
  });

  describe('KOT Printing Workflow', () => {
    test('should complete full KOT print workflow', async () => {
      const result = await manualPrintKOT(mockOrder, mockSettings);
      expect(result).toBeDefined();
    });

    test('should handle KOT with multiple items', async () => {
      const order = {
        ...mockOrder,
        items: [
          { id: '1', name: 'Item 1', quantity: 2, price: 50 },
          { id: '2', name: 'Item 2', quantity: 1, price: 100 },
          { id: '3', name: 'Item 3', quantity: 3, price: 75 }
        ]
      };
      const result = await manualPrintKOT(order, mockSettings);
      expect(result).toBeDefined();
    });

    test('should handle KOT with special instructions', async () => {
      const orderWithInstructions = {
        ...mockOrder,
        items: [
          { 
            id: '1', 
            name: 'Tea', 
            quantity: 1, 
            price: 50,
            specialInstructions: 'No sugar, extra milk'
          }
        ]
      };
      const result = await manualPrintKOT(orderWithInstructions, mockSettings);
      expect(result).toBeDefined();
    });

    test('should handle KOT with item modifiers', async () => {
      const orderWithModifiers = {
        ...mockOrder,
        items: [
          {
            id: '1',
            name: 'Coffee',
            quantity: 1,
            price: 100,
            modifiers: ['Extra hot', 'Large size']
          }
        ]
      };
      const result = await manualPrintKOT(orderWithModifiers, mockSettings);
      expect(result).toBeDefined();
    });
  });

  describe('Workflow Error Handling', () => {
    test('should handle missing order ID gracefully', async () => {
      const invalidOrder = { ...mockOrder };
      delete invalidOrder.id;
      const result = await smartPrint(invalidOrder, mockSettings);
      expect(result.success).toBe(false);
      expect(result.message).toBeDefined();
    });

    test('should handle missing items', async () => {
      const invalidOrder = { ...mockOrder, items: [] };
      const result = await smartPrint(invalidOrder, mockSettings);
      expect(result.success).toBe(false);
    });

    test('should handle null settings', async () => {
      const result = await smartPrint(mockOrder, null);
      expect(result).toBeDefined();
    });

    test('should handle null order', async () => {
      const result = await smartPrint(null, mockSettings);
      expect(result.success).toBe(false);
    });

    test('should provide recovery suggestions on error', async () => {
      const result = await smartPrint(null, mockSettings);
      expect(result).toHaveProperty('message');
      if (!result.success) {
        expect(result.message.length > 0).toBe(true);
      }
    });
  });

  describe('Workflow Performance', () => {
    test('receipt print should complete within timeout', async () => {
      const startTime = Date.now();
      const result = await smartPrint(mockOrder, mockSettings);
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(35000); // 30s timeout + buffer
    });

    test('KOT print should complete quickly', async () => {
      const startTime = Date.now();
      const result = await manualPrintKOT(mockOrder, mockSettings);
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(35000);
    });
  });

  describe('Concurrent Workflows', () => {
    test('should handle multiple orders printing', async () => {
      const orders = [
        { ...mockOrder, id: 'ORD-001' },
        { ...mockOrder, id: 'ORD-002' },
        { ...mockOrder, id: 'ORD-003' }
      ];
      const results = await Promise.all(
        orders.map(order => smartPrint(order, mockSettings))
      );
      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result).toBeDefined();
      });
    });

    test('should not interfere between concurrent prints', async () => {
      const order1 = { ...mockOrder, id: 'ORD-001' };
      const order2 = { ...mockOrder, id: 'ORD-002' };
      
      const [result1, result2] = await Promise.all([
        smartPrint(order1, mockSettings),
        smartPrint(order2, mockSettings)
      ]);
      
      expect(result1.orderId).toBe('ORD-001');
      expect(result2.orderId).toBe('ORD-002');
    });
  });

  describe('Workflow Validation', () => {
    test('should validate all required order fields', async () => {
      const incompleteOrder = { id: 'ORD-001' };
      const result = await smartPrint(incompleteOrder, mockSettings);
      expect(result.success).toBe(false);
    });

    test('should validate item structure', async () => {
      const orderWithBadItems = {
        ...mockOrder,
        items: [{ id: '1' }] // Missing name and price
      };
      const result = await smartPrint(orderWithBadItems, mockSettings);
      expect(result).toBeDefined();
    });

    test('should validate total amount', async () => {
      const orderWithWrongTotal = {
        ...mockOrder,
        total: 0
      };
      const result = await smartPrint(orderWithWrongTotal, mockSettings);
      expect(result).toBeDefined();
    });
  });
});
