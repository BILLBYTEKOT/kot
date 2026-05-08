# Print System - Comprehensive Test Cases

## Test Suite Overview

```
├── Unit Tests (printValidator, escposBuilder)
├── Integration Tests (Full print flows)
├── Platform Tests (Android, Electron, Bluetooth, Browser)
├── Error Handling Tests
├── Performance Tests
└── Manual User Acceptance Tests
```

---

## 1. Unit Tests

### 1.1 PrintValidator Tests

#### Test Case: TC-VAL-001 - Valid Order Passes Validation
```gherkin
Given: Valid order with all required fields
When: validateOrder() is called
Then: valid = true, errors.length = 0

Test Data:
{
  id: "ORD-123",
  items: [
    { name: "Biryani", quantity: 2, price: 250 },
    { name: "Raita", quantity: 1, price: 50 }
  ],
  total: 550
}

Expected:
{
  valid: true,
  errors: [],
  warnings: []
}
```

#### Test Case: TC-VAL-002 - Missing Order ID
```gherkin
Given: Order without id field
When: validateOrder() is called
Then: valid = false, contains error "Order ID missing"

Test Data: { items: [...], total: 550 }

Expected:
{
  valid: false,
  errors: ["Order ID is required"],
  warnings: []
}
```

#### Test Case: TC-VAL-003 - Empty Items Array
```gherkin
Given: Order with empty items array
When: validateOrder() is called
Then: valid = false

Test Data: { id: "123", items: [], total: 0 }

Expected:
{
  valid: false,
  errors: ["Order must have at least one item"],
  warnings: []
}
```

#### Test Case: TC-VAL-004 - Invalid Item Price
```gherkin
Given: Item with negative price
When: validateOrder() is called
Then: valid = false, errors contain price error

Test Data:
{
  id: "123",
  items: [{ name: "Biryani", quantity: 2, price: -100 }],
  total: -200
}

Expected:
{
  valid: false,
  errors: ["Item 'Biryani' has invalid price: -100"],
  warnings: []
}
```

#### Test Case: TC-VAL-005 - Partial Payment Triggers Warning
```gherkin
Given: Order total = 500, paymentAmount = 300
When: validateOrder() is called
Then: valid = true, warnings contain "Partial payment"

Test Data:
{
  id: "123",
  items: [{ name: "Biryani", quantity: 2, price: 250 }],
  total: 500,
  paymentAmount: 300
}

Expected:
{
  valid: true,
  errors: [],
  warnings: ["Partial payment detected - ₹200 credit"]
}
```

#### Test Case: TC-VAL-006 - Business Settings Fallback
```gherkin
Given: No businessSettings provided
When: validateOrder(order, undefined) is called
Then: Validator uses default empty settings, order still validates

Expected: Validates order, no settings error
```

---

### 1.2 ESC/POS Builder Tests

#### Test Case: TC-ESC-001 - Text Encoding UTF-8
```gherkin
Given: Text with Unicode character "₹"
When: bytes("₹100") is called
Then: Returns correct UTF-8 bytes for ₹ (E2 82 B9)

Test Data: "₹100"

Expected: [0xE2, 0x82, 0xB9, 0x31, 0x30, 0x30]
```

#### Test Case: TC-ESC-002 - Byte Array Flattening
```gherkin
Given: Nested arrays and mixed types
When: bytes([1, 2], "AB", 3) is called
Then: Returns flattened Uint8Array

Test Data: bytes([0x1B, 0x40], "Hello", 0x0A)

Expected: Uint8Array with length > 5
```

#### Test Case: TC-ESC-003 - Text Alignment
```gherkin
Given: Text "Biryani" with alignment = "center"
When: commands.TEXT("Biryani", "center") is called
Then: Returns padded bytes with spaces for centering

Test Data: Text = "Biryani" (7 chars), width = 32

Expected: ~12 spaces before, ~12 after
```

#### Test Case: TC-ESC-004 - Bold Text Commands
```gherkin
Given: Text "Total: ₹500"
When: commands.BOLD_TEXT("Total: ₹500") is called
Then: Returns ESC E 1, text bytes, ESC E 0

Expected: [0x1B, 0x45, 0x01, ...text bytes..., 0x1B, 0x45, 0x00]
```

#### Test Case: TC-ESC-005 - Barcode Generation
```gherkin
Given: Code "ORD123456" with type "CODE128"
When: commands.BARCODE("ORD123456", "CODE128") is called
Then: Returns valid ESC/POS barcode commands

Expected: GS k sequence with correct type and data
```

---

## 2. Integration Tests

### 2.1 Full Receipt Print Flow

#### Test Case: TC-INT-001 - Complete Receipt Print (Bluetooth)
```gherkin
Given:
  - Order: { id: "ORD001", items: [...], total: 550 }
  - Bluetooth printer connected
  - BusinessSettings: { name: "Restaurant A" }

When: smartPrintHandler.printReceipt(order, settings) is called

Then:
  1. Order validated ✓
  2. Platform detected as "Bluetooth" ✓
  3. ESC/POS commands generated ✓
  4. Data sent to printer in chunks ✓
  5. Result returned: { success: true, message: "Receipt sent..." }

Verification:
  - No console errors
  - Loading state managed correctly
  - Toast notification shown
  - Printer receives data
```

#### Test Case: TC-INT-002 - Fallback Chain (Electron → Android → Bluetooth)
```gherkin
Given:
  - Electron available but printer offline
  - Android also available
  - Bluetooth connected

When: smartPrintHandler.printReceipt(order, settings) called

Then:
  1. Try Electron → Fails (timeout)
  2. Try Android → Succeeds via RawBT
  3. Return success (doesn't try Bluetooth)

Expected Result:
{
  success: true,
  platform: "android",
  message: "Receipt sent to RawBT",
  duration: <5000
}
```

#### Test Case: TC-INT-003 - All Methods Fail - Browser Fallback
```gherkin
Given:
  - Electron fails
  - Android RawBT app not installed
  - Bluetooth disconnected
  - Browser available

When: smartPrintHandler.printReceipt(order, settings) called

Then:
  1. Try Electron → Fails
  2. Try Android → Fails
  3. Try Bluetooth → Fails
  4. Use Browser print dialog
  5. Return { success: true, platform: "browser" }

User sees: Browser print dialog appears
```

#### Test Case: TC-INT-004 - KOT Print Flow
```gherkin
Given:
  - Order with 5 items
  - Bluetooth thermal printer

When: smartPrintHandler.printKOT(order, settings) called

Then:
  1. KOT template generated (Kitchen Order Ticket)
  2. Different from receipt (shows prep notes, not payment)
  3. Sent to printer
  4. Success returned

Verification:
  - Receipt shows payment info
  - KOT hides payment info
  - Both use same printer
```

---

## 3. Platform-Specific Tests

### 3.1 Android (TWA) Tests

#### Test Case: TC-AND-001 - RawBT Available
```
Prerequisites: RawBT app installed and printer paired in RawBT

Steps:
1. Click Print button in OrdersPage
2. System detects Android TWA
3. Calls printViaRawBT()
4. Iframe created with intent URI
5. Intent triggers RawBT app

Expected:
✓ Iframe created
✓ Intent URI valid format: rawbt:base64,...
✓ No visible UI change (background operation)
✓ RawBT app receives data
✓ Toast: "Print sent to RawBT"
✓ Iframe cleaned up after 5s
```

#### Test Case: TC-AND-002 - RawBT Not Available - Share Fallback
```
Prerequisites: RawBT app NOT installed

Steps:
1. Click Print button
2. printViaRawBT() fails
3. Falls back to shareReceiptText()
4. Web Share API opens system share sheet

Expected:
✓ Share sheet appears
✓ User can select: Gmail, WhatsApp, Printer app, etc.
✓ User cancels: Toast disappears, ready to retry
✓ User shares: Toast "Receipt shared"
```

#### Test Case: TC-AND-003 - Special Character Encoding
```
Order contains: ₹, €, ©, ™

When: printViaRawBT(escPosBytes) called

Then:
✓ UTF-8 encoding of ₹ byte sequence correct
✓ All special characters display in RawBT app
✓ No garbled characters in receipt
```

#### Test Case: TC-AND-004 - Memory Cleanup After Print
```
When: Multiple prints (5x) in sequence

Then:
✓ Each creates iframe (visible in DOM momentarily)
✓ Each removed after timeout
✓ No orphaned iframes remain
✓ No memory growth (GC working)

Verification: Chrome DevTools → Elements tab
```

### 3.2 Desktop (Electron) Tests

#### Test Case: TC-ELN-001 - Print to Local Printer
```
Setup: Windows/Mac with connected printer

Steps:
1. Click Print button in OrdersPage
2. System detects Electron
3. Calls electronPrint.printReceipt()
4. IPC message sent to main process
5. Printer selection dialog appears

Expected:
✓ Dialog shows available printers
✓ User can select printer
✓ Print preview (Windows) or confirm
✓ Receipt prints correctly
✓ Toast: "Print sent to printer"
```

#### Test Case: TC-ELN-002 - Print to PDF
```
Setup: Electron app running on macOS/Windows

Steps:
1. Click Print
2. Select "Save as PDF" option
3. Choose location
4. Save

Expected:
✓ PDF file created
✓ Receipt layout correct
✓ Special characters preserved
✓ File size reasonable
```

#### Test Case: TC-ELN-003 - Printer Not Available
```
Setup: No printers configured

Steps:
1. Click Print
2. Dialog appears (empty or showing error)
3. User cancels

Expected:
✓ Toast: "No printer available - try browser print"
✓ Fallback to browser print (if enabled)
✓ User can still print
```

#### Test Case: TC-ELN-004 - IPC Timeout
```
Setup: Electron main process slow/unresponsive

When: Print request times out (>5s)

Then:
✓ Timeout caught and logged
✓ Result: { success: false, error: "Printer unavailable" }
✓ Fall through to next method (Android/Bluetooth)
```

### 3.3 Bluetooth Tests

#### Test Case: TC-BLE-001 - Thermal Printer Connection
```
Hardware: ESC/POS thermal printer (80mm), Bluetooth

Steps:
1. Go to Settings → Pair printer via Bluetooth
2. Return to app
3. Click Print
4. System detects Bluetooth connection

Expected:
✓ connectBluetoothPrinter() finds device
✓ GATT service discovered
✓ Characteristic found
✓ Connection established
```

#### Test Case: TC-BLE-002 - Print Receipt via Bluetooth
```
Given: Printer connected in previous test

Steps:
1. Click Print Receipt
2. Order sent as ESC/POS bytes
3. Data chunked (20-byte MTU)
4. Sent with 30ms delays between chunks

Expected:
✓ Receipt prints on thermal printer
✓ Special characters correct (₹)
✓ Alignment correct (centered/right-aligned)
✓ Paper cut works (if printer supports)
✓ Toast: "Receipt sent to printer"
```

#### Test Case: TC-BLE-003 - Chunk Transmission Retry
```
Setup: Printer temporarily not responding during print

Steps:
1. Start print
2. Chunk 5 of 12 fails with network error
3. Automatic retry (exponential backoff)
4. Wait 500ms
5. Retry succeeds

Expected:
✓ No user intervention needed
✓ All chunks eventually sent
✓ Toast still shows success
✓ Log shows retry attempt
```

#### Test Case: TC-BLE-004 - Disconnect During Print
```
Setup: Print in progress, user disconnects printer

When: Printer disconnects mid-print

Then:
✓ NotFoundError caught
✓ Remaining chunks not sent
✓ Error returned: "Printer disconnected"
✓ No crash or freeze
✓ Toast: "Reconnect printer and retry"
✓ Button re-enabled for retry
```

#### Test Case: TC-BLE-005 - Print Timeout
```
Given: Bluetooth printer slow/unresponsive

When: Print takes >10 seconds

Then:
✓ Timeout triggered (Promise.race)
✓ Operation cancelled
✓ Result: { success: false, error: "Printer timeout" }
✓ Fall through to next method
```

### 3.4 Browser Print Tests

#### Test Case: TC-BRW-001 - Browser Print Dialog
```
Setup: Web app in Chrome/Firefox/Safari

Steps:
1. Click Print
2. No other printer available
3. Browser print dialog should appear

Expected:
✓ Browser print dialog opens
✓ User can select printer
✓ User can select PDF/printer
✓ Print settings visible
✓ After print: Toast shows (or closes automatically)
```

#### Test Case: TC-BRW-002 - HTML Receipt Rendering
```
When: generateReceiptHTML(order, settings) called

Then:
✓ Returns valid HTML string
✓ Includes order items in table
✓ Shows totals and payment info
✓ Business name/address visible
✓ Formatting printer-friendly
✓ Special characters render (₹)
```

---

## 4. Error Handling Tests

### 4.1 Validation Error Tests

#### Test Case: TC-ERR-001 - Invalid Order Object
```
Given: order = null

When: printReceipt(order) called

Then:
✓ Caught before print attempt
✓ Result: { success: false, message: "Invalid order", retryable: false }
✓ Toast: "Invalid order - cannot print"
✓ No print attempt made
```

#### Test Case: TC-ERR-002 - Incomplete Business Settings
```
Given: businessSettings = { name: "Restaurant A" } (address missing)

When: printReceipt(order, settings) called

Then:
✓ Validator accepts (address optional)
✓ Receipt prints with available info
✓ Fallback values for missing fields
✓ No errors thrown
```

### 4.2 Retry Logic Tests

#### Test Case: TC-ERR-003 - Retryable Error Detection
```
Error: "Network timeout"

When: getRetryableError(error) called

Then:
✓ Returns true (retryable)
✓ smartPrintHandler tries next method
```

#### Test Case: TC-ERR-004 - Non-Retryable Error
```
Error: "Order validation failed"

When: getRetryableError(error) called

Then:
✓ Returns false (non-retryable)
✓ Return error immediately, don't try next method
```

### 4.3 Timeout Tests

#### Test Case: TC-ERR-005 - Global Timeout 30s
```
Setup: All methods very slow

When: Print takes 31 seconds

Then:
✓ Promise.race triggers after 30s
✓ Error: "Print operation timed out"
✓ Operation cancelled
✓ Toast: "Print timed out - printer offline?"
✓ No hanging processes
```

#### Test Case: TC-ERR-006 - Per-Method Timeout
```
Setup: Electron takes 15 seconds (exceeds 10s limit)

When: smartPrintHandler tries Electron

Then:
✓ Electron timeout (10s) triggers
✓ Move to next method
✓ Android/Bluetooth still tried
✓ Eventually succeeds or fails properly
```

---

## 5. Performance Tests

### 5.1 Latency Tests

#### Test Case: TC-PERF-001 - Total Print Latency
```
Measurement: Time from click to "Printing..." state

Expected:
✓ <500ms to show loading state
✓ <1s to show result (success or error)

Method: 
1. Record Date.now() at click
2. Record Date.now() when toast shown
3. Calculate difference
4. Repeat 10 times, average

Acceptance: Average <1s
```

#### Test Case: TC-PERF-002 - Platform Detection Speed
```
Function: detectPlatform()

Expected: <100ms

Test:
1. Call 100 times
2. Measure average execution time
3. Check results match expectations

Acceptance: <100ms average
```

#### Test Case: TC-PERF-003 - Bluetooth Chunk Send Speed
```
Scenario: Send 500 bytes in 20-byte chunks

Expected:
✓ 25 chunks × 30ms = 750ms minimum
✓ <2s total for typical printer

Acceptance: <2s
```

### 5.2 Memory Tests

#### Test Case: TC-PERF-004 - Memory Leak Detection
```
Setup: Print 50 times in sequence, monitor memory

Tools: Chrome DevTools → Memory tab

Steps:
1. Take heap snapshot
2. Print receipt 50 times (back-to-back)
3. Force garbage collection
4. Take heap snapshot
5. Compare

Expected:
✓ Memory stable (±5% variance allowed)
✓ No orphaned iframes
✓ No orphaned event listeners
✓ No dangling references

Acceptance: <2% memory growth
```

#### Test Case: TC-PERF-005 - Large Order Memory
```
Setup: Order with 100 items (each item: name, qty, price)

When: printReceipt(largeOrder) called

Memory usage:
✓ <5MB allocated
✓ Released within 2s after print

Acceptance: <5MB peak
```

---

## 6. User Acceptance Tests (Manual)

### 6.1 OrdersPage Print Integration

#### Test Case: TC-UAT-001 - Print Receipt from OrdersPage
```
Steps:
1. Open OrdersPage
2. See order with status badge
3. Click "Print Receipt" button
4. Button shows loading spinner
5. Printer receives data
6. Toast: "Receipt sent to printer"
7. Button re-enabled

Expected UX:
✓ Clear visual feedback (spinner)
✓ Not jarring (smooth animations)
✓ Success message prominent
✓ Can click again if retry needed
```

#### Test Case: TC-UAT-002 - Print KOT from OrdersPage
```
Steps:
1. Click "KOT" button
2. Same as above but KOT layout

Expected:
✓ KOT prints (no payment info)
✓ Receipt and KOT both print correctly
✓ No confusion between templates
```

#### Test Case: TC-UAT-003 - Status Badges
```
Given: Multiple orders with different statuses

Expected:
✓ Pending: Yellow badge with ⏳ icon, pulsing
✓ Preparing: Blue badge with 👨‍🍳 icon, pulsing
✓ Ready: Green badge with 🎉 icon, bouncing
✓ Completed: Gray badge, no animation
✓ Visual distinction clear
```

### 6.2 OrderDisplayPage Integration

#### Test Case: TC-UAT-004 - Print Receipt from Order Detail
```
Steps:
1. Open OrderDisplayPage
2. See order details
3. Click print button on order card
4. Loading spinner appears
5. Receipt prints
6. Toast confirmation

Expected:
✓ Print button clearly visible
✓ Loading state obvious
✓ Integration with receipt print works
✓ Business settings properly applied
```

### 6.3 Error Scenarios

#### Test Case: TC-UAT-005 - Handle Printer Offline
```
Setup: Printer turned off / disconnected

Steps:
1. Click Print
2. System tries each method
3. All fail after timeouts
4. Error toast shown

Expected message:
"Print failed - please check printer is online and try again"

Expected behavior:
✓ Message is helpful
✓ Button re-enabled
✓ User can retry
✓ No crash or freeze
```

#### Test Case: TC-UAT-006 - Partial Payment Order
```
Given: Order total ₹500, payment ₹300

When: Print receipt

Then:
✓ Receipt shows payment ₹300
✓ Receipt shows due ₹200
✓ Visual indication of partial payment (maybe bold "DUE")
```

### 6.4 Special Cases

#### Test Case: TC-UAT-007 - Unicode Characters in Receipt
```
Order items:
- Samosa - ₹30
- Café Latte - €5
- Biryani® - ₹250

When: Print

Then:
✓ ₹ symbol prints correctly
✓ € symbol prints correctly (if supported)
✓ ® symbol prints correctly
✓ No garbled text
```

#### Test Case: TC-UAT-008 - Very Large Order (100+ items)
```
Order with 100 items

When: Print

Then:
✓ Receipt prints (may be multiple pages)
✓ All items visible
✓ Totals correct
✓ Performance acceptable (<2s)
✓ No truncation or data loss
```

---

## 7. Test Execution Matrix

| Test Case | Android (TWA) | Electron | Bluetooth | Browser | Manual | Automated |
|-----------|---------------|----------|-----------|---------|--------|-----------|
| TC-VAL-001 | - | - | - | - | ✓ | ✓ |
| TC-VAL-002 | - | - | - | - | ✓ | ✓ |
| TC-ESC-001 | - | - | - | - | ✓ | ✓ |
| TC-INT-001 | ✓ | ✓ | ✓ | ✓ | ✓ | - |
| TC-AND-001 | ✓ | - | - | - | ✓ | - |
| TC-ELN-001 | - | ✓ | - | - | ✓ | - |
| TC-BLE-001 | - | ✓ | ✓ | - | ✓ | - |
| TC-BRW-001 | ✓ | ✓ | ✓ | ✓ | ✓ | - |
| TC-ERR-001 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| TC-PERF-001 | ✓ | ✓ | ✓ | ✓ | ✓ | - |
| TC-UAT-001 | ✓ | ✓ | ✓ | ✓ | ✓ | - |

---

## 8. Known Limitations & Workarounds

### Limitation: RawBT app not installed (Android)
**Workaround:** Use Web Share API fallback to let user pick printer app

### Limitation: Bluetooth MTU limit (20 bytes)
**Workaround:** Chunk data and add delays between chunks

### Limitation: No printer on browser
**Workaround:** Use browser print dialog (PDF/email option)

### Limitation: Special characters encoding
**Workaround:** UTF-8 encoding with fallback to Latin1

---

## Test Execution Timeline

```
Phase 1 (Unit Tests):      1-2 days (automated)
Phase 2 (Integration):     2-3 days (semi-automated)
Phase 3 (Platform):        3-5 days (manual on each device)
Phase 4 (User Acceptance): 2-3 days (stakeholder review)
Phase 5 (Performance):     1-2 days (load testing)

Total: ~2 weeks for complete test coverage
```

---

## Acceptance Criteria

All tests must pass before release:
- ✓ 100% of unit tests pass
- ✓ 100% of integration tests pass
- ✓ ≥90% of manual tests pass
- ✓ No critical bugs found
- ✓ Performance within targets
- ✓ No memory leaks
- ✓ User feedback positive (UAT)
- ✓ All platforms tested (Android, Electron, Web)
