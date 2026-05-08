# Print System - Quick Reference Guide

## TL;DR - System Overview

**What:** Multi-platform print system for receipts and kitchen tickets (KOT)
**Where:** Android (TWA), Electron (Desktop), Web (Bluetooth), Browser
**How:** Smart orchestrator that tries multiple methods, falls back gracefully
**Why:** Reliable printing across all platforms with timeout protection

---

## Architecture in 30 Seconds

```
User clicks "Print"
        ↓
SmartPrintHandler detects platform
        ↓
Tries methods in order:
  1. Electron (if on desktop)
  2. Android RawBT (if installed)
  3. Android Share API (if RawBT fails)
  4. Bluetooth printer (if connected)
  5. Browser print dialog (always works)
        ↓
First method that works → Print succeeds
No method available → Falls back to browser print
```

---

## File Structure

```
Core Print Utils (7 files):
├── smartPrintHandler.js      ← USE THIS (main entry point)
├── printValidator.js         ← Input validation
├── escposBuilder.js          ← Byte commands for thermal printers
├── electronPrint.js          ← Desktop printing
├── androidPrint.js           ← Android TWA printing
├── bluetoothPrint.js         ← Bluetooth thermal printer
└── printLogger.js            ← Debug logging

UI Integration (3 files):
├── OrdersPage.js             ← Print buttons & KOT integration
├── OrderDisplayPage.js       ← Print in order detail view
└── PrintPreviewModal.js      ← Print preview with loading states

Legacy Utils (1 file):
└── printUtils.js             ← Original functions (still works, enhanced)
```

---

## Common Tasks

### 1. Print Receipt from React Component

```javascript
import { smartPrintHandler } from '../utils/smartPrintHandler';

const handlePrintReceipt = async (order, businessSettings) => {
  setPrintLoading(true);
  try {
    const result = await smartPrintHandler.printReceipt(order, businessSettings);
    
    if (result.success) {
      toast.success('Receipt sent to printer');
    } else {
      toast.error(result.message);
    }
  } catch (error) {
    toast.error('Print failed: ' + error.message);
  } finally {
    setPrintLoading(false);
  }
};
```

### 2. Print Kitchen Order Ticket (KOT)

```javascript
const handlePrintKOT = async (order, businessSettings) => {
  const result = await smartPrintHandler.printKOT(order, businessSettings);
  // ... same as receipt, different template
};
```

### 3. Validate Order Before Printing

```javascript
import { printValidator } from '../utils/printValidator';

const order = { id: '123', items: [...], total: 500 };
const validation = printValidator.validateOrder(order, businessSettings);

if (!validation.valid) {
  console.error('Validation errors:', validation.errors);
  toast.error(validation.errors[0]);
} else {
  // Safe to print
  await smartPrintHandler.printReceipt(order, businessSettings);
}
```

### 4. Check Which Platform Works

```javascript
const { detectPlatform } = require('../utils/smartPrintHandler');

const platform = detectPlatform();
console.log('Electron:', platform.electron);
console.log('Android:', platform.android);
console.log('Bluetooth:', platform.bluetoothAvailable);
```

### 5. View Print History/Logs

```javascript
import { printLogger } from '../utils/printLogger';

const history = printLogger.getPrintHistory();
console.log('Last 50 print operations:', history.entries);

// Export logs for debugging
printLogger.exportPrintLogs(); // Downloads JSON file
```

---

## API Reference (Quick)

### smartPrintHandler.printReceipt(order, businessSettings)

```javascript
Input:
  order: {
    id: string,
    items: Array<{name, quantity, price}>,
    total: number,
    paymentAmount?: number,
    paymentMode?: string,
    ...otherFields
  },
  businessSettings?: {
    name?: string,
    address?: string,
    phone?: string,
    gst?: string,
    ...customFields
  }

Output: Promise<{
  success: boolean,
  message: string,
  error?: string,
  platform?: string,        // 'electron'|'android'|'bluetooth'|'browser'
  duration?: number         // milliseconds
}>

Example:
const result = await smartPrintHandler.printReceipt(
  { id: 'ORD123', items: [...], total: 500 },
  { name: 'My Restaurant' }
);
if (result.success) {
  console.log(`Printed on ${result.platform} in ${result.duration}ms`);
}
```

### smartPrintHandler.printKOT(order, businessSettings)

Same as printReceipt but uses kitchen-specific template (no payment info)

### printValidator.validateOrder(order, businessSettings)

```javascript
Output: {
  valid: boolean,
  errors: string[],         // Must fix to print
  warnings: string[]        // Non-blocking
}

Example:
const v = printValidator.validateOrder(order);
if (!v.valid) {
  console.error('Cannot print:', v.errors);
} else if (v.warnings.length > 0) {
  console.warn('Warnings:', v.warnings);
}
```

### printLogger.getPrintHistory()

```javascript
Output: {
  success: boolean,
  entries: Array<{
    timestamp: number,
    type: 'receipt'|'kot',
    orderId: string,
    platform: string,
    success: boolean,
    duration: number,
    error?: string,
    message: string
  }>
}
```

---

## Error Handling

### Common Errors & Solutions

| Error | Cause | Fix |
|-------|-------|-----|
| "Order data is missing" | order = null/undefined | Pass valid order object |
| "Order has no items" | items.length = 0 | Add items to order |
| "Printer not connected" | Bluetooth unpaired | Pair printer in settings |
| "Printer timeout" | Device not responding | Check printer power, distance |
| "RawBT print failed" | RawBT app not installed | Install RawBT app on Android |
| "Print timed out" | All methods took >30s | Check network, printer |

### Error Recovery

```javascript
try {
  const result = await smartPrintHandler.printReceipt(order, settings);
  
  if (!result.success) {
    // Determine if retryable
    if (result.error?.includes('timeout')) {
      // User can retry immediately
      console.log('Temporary issue, user can retry');
    } else {
      // Permanent issue
      console.log('Check printer setup');
    }
  }
} catch (error) {
  console.error('Print error:', error.message);
}
```

---

## Testing Checklist

### Before Committing Code
```
- [ ] Unit tests pass: npm test
- [ ] No console errors: DevTools
- [ ] Loading state shows/hides: Click print button
- [ ] Toast notifications work: Success & error cases
- [ ] Special characters: ₹ symbol displays correctly
```

### Before Deploy to Staging
```
- [ ] Tested on Android device (with RawBT app)
- [ ] Tested on Electron desktop
- [ ] Tested with Bluetooth thermal printer
- [ ] Tested on web browser (Chrome/Safari)
- [ ] Large orders print correctly (50+ items)
- [ ] Print history available in logs
```

### Before Production Release
```
- [ ] All test cases in PRINT_SYSTEM_TEST_CASES.md pass
- [ ] Performance: <1s latency to feedback
- [ ] Memory: No leaks detected
- [ ] User acceptance sign-off received
- [ ] Documentation reviewed
```

---

## Performance Tips

### Optimize Printing Performance

```javascript
// Good: Batch prints
for (const order of orders) {
  await smartPrintHandler.printReceipt(order, settings);
  await new Promise(r => setTimeout(r, 500)); // 500ms between prints
}

// Bad: Concurrent prints (may queue)
orders.forEach(order => {
  smartPrintHandler.printReceipt(order, settings); // Don't await
});
```

### Monitor Performance

```javascript
const start = Date.now();
const result = await smartPrintHandler.printReceipt(order, settings);
const duration = Date.now() - start;

console.log(`Print took ${duration}ms on ${result.platform}`);

// Target: <1000ms
if (duration > 1000) {
  console.warn('Print slower than expected');
}
```

---

## Debugging

### Enable Verbose Logging

```javascript
// Check browser console for [v0] prefix logs
// Example:
// [v0] detectPlatform: electron=false android=true
// [v0] printReceipt: Starting for order ORD123
// [v0] printReceipt: Attempting android
// [v0] RawBT print sent successfully
```

### Export Print Logs

```javascript
import { printLogger } from '../utils/printLogger';

// Export last 50 operations
printLogger.exportPrintLogs(); // Downloads print-logs-TIMESTAMP.json

// View in console
const history = printLogger.getPrintHistory();
console.table(history.entries);
```

### Check Platform Detection

```javascript
import { smartPrintHandler } from '../utils/smartPrintHandler';

const platform = smartPrintHandler.detectPlatform();
console.log({
  isElectron: platform.electron,
  isAndroid: platform.android,
  isAndroidTWA: platform.androidTWA,
  hasBluetoothAPI: platform.bluetoothAvailable,
  recommendedPlatform: platform.platform
});
```

---

## Supported Printers

### Android (TWA)
- **RawBT Method** (recommended)
  - Any thermal printer paired in RawBT app
  - Requires RawBT app installation
  - Zero configuration after pairing
  
- **Share API Fallback**
  - Any printer app user has installed
  - Google Cloud Print
  - Manufacturer apps (HP, Epson, Canon)

### Desktop (Electron)
- **System Printers**
  - Any printer installed in OS
  - Windows, macOS, Linux supported
  - PDF printing as fallback

### Web
- **Bluetooth Thermal Printers**
  - Require BLE support (Web Bluetooth API)
  - ESC/POS compatible
  - Typically 80mm or 58mm thermal printers
  
- **Browser Print Fallback**
  - Any OS printer
  - PDF output supported
  - User controls final destination

---

## Configuration

### BusinessSettings Object

```javascript
const businessSettings = {
  // Display
  name: 'My Restaurant',           // Business name on receipt
  address: '123 Main St, City',   // Address line
  phone: '+1-800-FOOD',            // Phone number
  
  // Branding
  logo: 'base64-image-string',     // Receipt header logo
  gst: '18AABCT1234A1Z5',         // GST number
  
  // Printer Config
  paperWidth: 80,                  // mm (80 or 58)
  darkMode: false,                 // High contrast for old printers
  
  // Custom
  ...anyOtherCustomSettings
};

// Usage
const result = await smartPrintHandler.printReceipt(order, businessSettings);
```

---

## Known Issues & Workarounds

### Issue: Android Print Doesn't Work
**Cause:** RawBT app not installed
**Workaround:** Use Share API - user picks printer app
**Code:** Automatic - no code change needed

### Issue: Bluetooth Timeout
**Cause:** Printer too far or offline
**Workaround:** Bring printer closer, check battery
**Code:** Call `smartPrintHandler.printReceipt()` again to retry

### Issue: Special Characters Garbled
**Cause:** Printer doesn't support UTF-8
**Workaround:** Use Latin1 fallback (automatic)
**Code:** No code change - handled internally

### Issue: Very Large Orders Timeout
**Cause:** ESC/POS data too large (>10KB)
**Workaround:** Chunking is automatic (20-byte chunks)
**Code:** No code change needed

---

## Next Steps / Further Reading

1. **Understand Architecture:** Read `PRINT_SYSTEM_HLD.md`
2. **Implementation Details:** Read `PRINT_SYSTEM_LLD.md`
3. **Test Coverage:** Read `PRINT_SYSTEM_TEST_CASES.md`
4. **Running Tests:** `npm test -- printUtils`
5. **Debug Issues:** Check console logs with `[v0]` prefix

---

## Support

### Getting Help

1. Check this quick reference first
2. Search HLD/LLD documents
3. Look at test cases for examples
4. Check print logs: `printLogger.getPrintHistory()`
5. Contact: [Print System Owner]

### Reporting Bugs

Include:
1. Platform (Android/Electron/Web)
2. Printer type
3. Order data (sanitized)
4. Error message from console
5. Print logs (exported JSON)

---

## Cheat Sheet

```javascript
// Quick import
import { smartPrintHandler } from '../utils/smartPrintHandler';
import { printValidator } from '../utils/printValidator';
import { printLogger } from '../utils/printLogger';

// Quick validate
const v = printValidator.validateOrder(order, settings);
if (!v.valid) return console.error(v.errors[0]);

// Quick print receipt
const result = await smartPrintHandler.printReceipt(order, settings);
console.log(result.success ? '✓ Printed' : '✗ Failed: ' + result.message);

// Quick print KOT
const result = await smartPrintHandler.printKOT(order, settings);

// Quick debug
console.table(printLogger.getPrintHistory().entries);

// Quick timeout (30s default)
// Automatically applied - no code needed
```

---

**Version:** 1.0
**Last Updated:** 2026-05-08
**Maintained By:** Print System Team
