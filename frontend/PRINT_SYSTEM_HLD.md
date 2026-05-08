# Print System - High Level Design (HLD)

## 1. System Architecture Overview

### Multi-Platform Print Stack
```
┌─────────────────────────────────────────────────────────────────┐
│                        User Interface Layer                      │
│  (OrdersPage, OrderDisplayPage, PrintPreviewModal)             │
└─────────────────────────┬───────────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────────┐
│               Smart Print Handler (Orchestrator)                │
│  - Platform Detection (Electron/Android/Bluetooth/Browser)     │
│  - Fallback Chain Management                                    │
│  - Timeout Handling (30s global timeout)                        │
└─────────────────────────┬───────────────────────────────────────┘
                          │
      ┌───────────┬──────────┼──────────┬──────────┐
      │           │          │          │          │
      ▼           ▼          ▼          ▼          ▼
┌──────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌──────────┐
│ Electron │ │Android │ │Bluetooth│Browser  │ Print    │
│ Print    │ │ Print  │ │ Print  │ Print   │ Logger   │
│ (Electron)│ │(RawBT/│ │(Web BLE)│(JS Print)│         │
└──────────┘ │ Share) │ └────────┘ └────────┘ └──────────┘
             └────────┘

     ▼─────────────────────────────────────────────────────────────▼
                        Physical Printers
                 (Thermal, Inkjet, etc. via USB/BLE/WiFi)
```

## 2. Component Responsibilities

### A. Smart Print Handler (`smartPrintHandler.js`)
**Responsibility:** Intelligent print method selection and fallback orchestration

**Inputs:**
- Order data (structure, items, totals)
- Business settings (name, address, logo, etc.)
- Optional: Print type (receipt/KOT), custom settings

**Outputs:**
- `{ success: boolean, message: string, error?: string, retryable?: boolean }`

**Decision Tree:**
1. **Validate inputs** → PrintValidator
2. **Detect platform**
   - Is Electron running? → Try Electron print
   - Is Android device? → Try RawBT (if app installed) → Fallback to Share API
   - Is Bluetooth connected? → Try BLE thermal printer
   - Default: Browser print dialog
3. **Apply timeouts** (30s global, 5-10s per method)
4. **Handle fallback** on failure (try next method)
5. **Return structured result**

### B. Print Validator (`printValidator.js`)
**Responsibility:** Pre-flight validation before any print attempt

**Validations:**
- Order object exists and has required fields (id, items array)
- Business settings are valid (can be empty, fills with defaults)
- Order items have: name, quantity, price
- Payment amount ≥ 0, matches order total or partial

**Output:**
- `{ valid: boolean, errors: string[], warnings: string[] }`

### C. Platform-Specific Handlers

#### Electron Print (`electronPrint.js`)
- Detect if running inside Electron
- Use IPC to communicate with main process
- Trigger system printer selection dialog
- Support PDF generation (if configured)
- Timeout: 10 seconds

#### Android Print (`androidPrint.js`)
- Method 1: RawBT URI scheme (`rawbt:base64,...`)
  - Most reliable when RawBT app is installed
  - Zero configuration if printer already paired in RawBT app
  - Timeout: 5 seconds
  
- Method 2: Web Share API (fallback)
  - Opens system share sheet
  - User selects any printer app
  - Timeout: 5 seconds

- Special handling:
  - UTF-8 encoding for special characters (₹, €, etc.)
  - Base64 encoding for binary data
  - Memory cleanup for iframe elements

#### Bluetooth Print (`bluetoothPrint.js`)
- Web Bluetooth API (BLE) for thermal printers
- Connection management:
  - `connectBluetoothPrinter()` - Discover and pair
  - `printViaBluetooth()` - Send ESC/POS commands
  - `disconnectBluetoothPrinter()` - Clean disconnect
- Chunk transmission (20-byte MTU chunks)
- Retry logic: Up to 2 retries with exponential backoff
- Timeout: 5-10 seconds per operation
- Cleanup: Remove event listeners, clear references

#### Browser Print (`printUtils.js`)
- Generate HTML receipt
- Trigger browser print dialog (`window.print()`)
- No timeout needed (user controls timing)
- Fallback when all else fails

### D. Print Logger (`printLogger.js`)
**Responsibility:** Comprehensive logging and debugging

**Captures:**
- Operation start/end times
- Platform detection results
- Method attempts and results
- Error details and stack traces
- Performance metrics

**Features:**
- localStorage persistence (last 50 operations)
- Export logs as JSON for debugging
- Console output with `[v0]` prefix
- Performance measurement

### E. ESC/POS Builder (`escposBuilder.js`)
**Responsibility:** Consistent thermal printer command generation

**Features:**
- Unified byte array building
- Text alignment (left, center, right)
- Font styling (normal, bold, double-width/height)
- Barcode generation
- QR code support
- Image printing
- Paper cut commands

## 3. Data Flow

### Receipt Print Flow

```
User clicks "Print Receipt" in OrdersPage
        ▼
handlePrintReceipt() [OrdersPage]
        ▼
SmartPrintHandler.printReceipt(order, businessSettings)
        ▼
PrintValidator.validateOrder(order, businessSettings)
        ▼ (if valid)
Detect platform:
  ├─ Electron? → electronPrint.printReceipt()
  ├─ Android? → androidPrint.androidPrint()
  ├─ Bluetooth available? → bluetoothPrint.printReceipt()
  └─ Default → Browser print (printUtils)
        ▼
Return structured result { success, message, error? }
        ▼
Show toast notification to user
        ▼
Update UI state (loading spinner, button disabled)
        ▼
Auto-cleanup (remove loading state, close menu)
```

### KOT Print Flow

```
User clicks "KOT" button in OrdersPage
        ▼
handlePrintKOT() [OrdersPage]
        ▼
SmartPrintHandler.printKOT(order, businessSettings)
        ▼
PrintValidator.validateOrder(order, businessSettings)
        ▼ (if valid)
Generate KOT HTML (Kitchen Order Ticket)
        ▼
Send to appropriate printer via fallback chain
        ▼
Return result and update UI
```

## 4. Error Handling Strategy

### Error Categories & Recovery

| Error Type | Cause | Recovery |
|-----------|-------|----------|
| **Validation** | Invalid order data | User message, no retry |
| **Device** | Printer disconnected | Try next method in chain |
| **Network** | BLE connection lost | Retry up to 2x, then fallback |
| **Permission** | App not allowed to print | Show user, open settings |
| **Timeout** | Print took >30s | Show timeout message, suggest reconnect |
| **Format** | ESC/POS encoding failed | Fallback to plain text, then browser print |

### Retry Strategy
- **Deterministic errors** (validation, permission) → No retry, show user error
- **Network errors** (Bluetooth, device timeout) → Retry 2x with backoff
- **Method fallback** → If method fails, try next in chain

## 5. Timeout Architecture

```
Global Timeout (30 seconds)
├─ Electron: 10 seconds max
├─ Android RawBT: 5 seconds max
├─ Android Share: 5 seconds max (user action-based)
├─ Bluetooth: 10 seconds max per operation
└─ Browser: None (user controls)
```

Race conditions with timeouts prevent hanging processes:
```javascript
await Promise.race([
  printOperation(),
  new Promise((_, reject) => 
    setTimeout(() => reject(new Error('Timeout')), TIMEOUT_MS)
  )
])
```

## 6. State Management

### Component-Level State
- `printLoading` - Whether print is in progress
- `printingOrderId` - Current order being printed (prevents concurrent prints)
- `printSuccess` - Last print succeeded (for UI feedback)
- `lastPrintError` - Last error for retry capability

### App-Level State (Optional)
- Recent print jobs (for history)
- Print queue (if implementing job queuing)
- Connected printer information (for display)

## 7. User Experience Flow

```
1. User sees order in list
   ├─ Status badge with animation
   └─ Print button (enabled)

2. User clicks Print
   ├─ Button shows loading spinner
   ├─ Button becomes disabled
   └─ Modal/UI is blocked

3. System attempts print
   ├─ First method (Electron/Android/Bluetooth)
   ├─ If fails → Try next method
   └─ Timeout after 30s

4. Result shown
   ├─ Success: Green toast "Receipt sent to printer"
   ├─ Failure: Red toast with error message
   └─ Loading state removed

5. User can retry if needed
   ├─ Print button re-enabled
   └─ Error message suggests action
```

## 8. Performance Considerations

### Memory
- No memory leaks from print operations
- Iframe elements cleaned up properly
- Event listeners removed on disconnect
- References nullified for garbage collection

### Latency
- Print detection: <100ms (platform detection)
- Validation: <50ms (order validation)
- Method selection: <100ms (fallback chain)
- Total init: <250ms before actual print starts

### Concurrency
- Prevent multiple concurrent prints: `printingOrderId` state
- Cancel previous print if new one initiated
- Per-order print tracking (different orders can print simultaneously)

## 9. Testing Strategy

### Unit Tests
- PrintValidator: Valid/invalid orders, edge cases
- ESC/POS Builder: Command generation, encoding
- Platform detection: Android, Electron, Bluetooth availability

### Integration Tests
- Full print flow: OrdersPage → SmartHandler → Platform
- Fallback chain: Try each method, verify sequence
- Error handling: Network failures, timeouts, invalid data

### Manual Tests (Per Platform)
- **Android (TWA)**: RawBT app, Share API, Bluetooth
- **Desktop (Electron)**: Printer selection, PDF, fallback
- **Web**: Bluetooth printer, browser print
- **Special cases**: Unicode (₹), large orders, network issues

## 10. Deployment Checklist

- [ ] All print utilities tested on target platforms
- [ ] Business settings properly configured
- [ ] Print templates tested (receipt, KOT)
- [ ] Special characters verified (₹, €, etc.)
- [ ] Timeout values appropriate for network conditions
- [ ] Error messages user-friendly
- [ ] Print history logged (if implemented)
- [ ] No console errors on print success
- [ ] UI states properly managed (no stuck loading)
- [ ] Memory cleanup verified (no leaks)

---

## Summary

The print system is architected as a **smart orchestrator** that abstracts away platform differences and provides a consistent, reliable interface for users to print receipts and KOTs. Through intelligent fallback chains, timeout protection, and comprehensive error handling, it ensures printing works across Android (TWA), Desktop (Electron), Web (Bluetooth), and browsers.
