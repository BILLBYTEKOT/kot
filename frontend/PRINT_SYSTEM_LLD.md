# Print System - Low Level Design (LLD)

## 1. Module Specifications

### 1.1 printValidator.js

#### Function: `validateOrder(order, businessSettings)`
```javascript
Input:
  - order: { id, items[], total, paymentAmount?, paymentMode?, ... }
  - businessSettings: { name?, address?, logo?, ... } (optional)

Output:
  - { 
      valid: boolean,
      errors: string[],      // Critical issues preventing print
      warnings: string[],    // Non-blocking issues
      sanitized?: object     // Cleaned order object
    }

Logic:
1. Check order exists and is object
2. Validate order.id (required, string/number)
3. Validate order.items array
   - Not empty
   - All items have: name (string), quantity (number >= 1), price (number >= 0)
4. Validate order.total >= 0
5. Validate paymentAmount if present
   - If < order.total: Add warning "Partial payment"
   - If > order.total: Add error "Payment exceeds total"
6. Return object with validation results
```

#### Function: `getRetryableError(error)`
```javascript
Input: error object or string

Output: boolean (true if error is retryable)

Retryable errors:
- Network timeouts
- BLE disconnection
- Device temporarily unavailable
- Service temporarily unavailable

Non-retryable errors:
- Validation failures
- Invalid input format
- Permission denied
- Unknown printer

Logic:
1. Check error.name and error.message
2. Match against known retryable patterns
3. Return boolean result
```

---

### 1.2 electronPrint.js

#### Function: `isElectronAvailable()`
```javascript
Output: boolean

Logic:
1. Check if window.electronAPI exists (set by preload script)
2. Check if window.process exists with app property
3. Return boolean

Safety: No errors thrown, always returns boolean
```

#### Function: `printReceipt(order, businessSettings)`
```javascript
Input:
  - order: validated order object
  - businessSettings: { name, address, phone, ... }

Output:
  - Promise<{ success, message, error? }>

Process:
1. Generate receipt HTML (from printUtils)
2. Send IPC message: 'app:print' with { html, title, settings }
3. Wait for IPC response with 5s timeout
4. Return structured result
   - success: true if IPC returned success
   - message: "Print sent to printer" or error detail
   - error: Only if failed

Error handling:
- Timeout after 5 seconds
- IPC send fails: Catch and report as "Electron print unavailable"
- Main process rejects: Report error message to user
```

#### Function: `detectPrinters()`
```javascript
Output: Promise<string[]> (printer names)

Process:
1. Send IPC: 'app:get-printers'
2. Wait response with 3s timeout
3. Return array of printer names

Usage: For printer selection dialog (future enhancement)
```

---

### 1.3 androidPrint.js

#### Function: `isAndroid()`
```javascript
Output: boolean

Logic:
1. Check navigator.userAgent.match(/Android/i)
2. Return boolean

Note: No error handling, returns false on any issue
```

#### Function: `isAndroidTWA()`
```javascript
Output: boolean

Detection heuristics (in order):
1. document.referrer starts with 'android-app://'
2. window.matchMedia('(display-mode: standalone)').matches
3. window.navigator.standalone === true

Returns true if ANY heuristic matches
```

#### Function: `printViaRawBT(escPosBytes, retryCount = 0)`
```javascript
Input:
  - escPosBytes: Uint8Array of ESC/POS commands
  - retryCount: Internal counter for recursion

Output: boolean (true if attempted)

Process:
1. Validate not Android → return false
2. Validate escPosBytes not empty → show error toast, return false
3. Convert bytes to base64: uint8ToBase64(escPosBytes)
4. Build URI: `rawbt:base64,${base64String}`
5. Create hidden iframe element
6. Set iframe.src = URI (triggers intent)
7. Set cleanup timeout (PRINT_TIMEOUT = 5000ms)
8. Return true

Cleanup:
- Timer fires after 5s → Remove iframe from DOM
- Clear iframe references → Null out
- Prevent memory leaks

Error handling:
- If base64 conversion fails → Log error, return false
- If all retries exhausted → Show toast "RawBT print failed"
- Otherwise → Retry (max 2 total)

Note: No synchronous feedback (intent launches, user sees result in RawBT app)
```

#### Function: `shareReceiptText(text)`
```javascript
Input: text (plain text receipt)

Output: Promise<boolean> (true if shared)

Process:
1. Validate navigator.share exists (Web Share API)
2. Call navigator.share({ title: 'Receipt', text })
3. Await user selection or cancellation
4. Return true on success

Error handling:
- AbortError: User cancelled (return false, no toast)
- NotAllowedError: Permission denied (log warning, return false)
- Other errors: Log and return false (not user's fault)

Timeout: None (controlled by user)
```

#### Function: `androidPrint(escPosBytes, plainText)`
```javascript
Input:
  - escPosBytes: Uint8Array
  - plainText: string (fallback for share)

Output: Promise<boolean>

Process:
1. Check isAndroid() → return false if not
2. Try printViaRawBT(escPosBytes)
   - If true → return true
3. Try shareReceiptText(plainText)
   - If true → return true
4. All failed → Show error toast, return false

Priority:
1. RawBT (most reliable, zero-UI)
2. Share API (user picks app)
3. Fail with message

Note: Returns immediately after first successful method
```

---

### 1.4 bluetoothPrint.js

#### Function: `connectBluetoothPrinter()`
```javascript
Output: Promise<BluetoothDevice>

Process:
1. Check navigator.bluetooth exists
2. Request device: navigator.bluetooth.requestDevice({
     filters: [{ services: ['180a'] }] // Device Info Service
   })
3. Connect GATT: device.gatt.connect()
4. Get service: gatt.getPrimaryService('180a')
5. Get characteristic: service.getCharacteristic('2a29')
6. Store in connectedBluetoothPrinter
7. Return device

Event listeners:
- device.addEventListener('gattserverdisconnected', handleDisconnect)

Error handling:
- User cancelled selection: Throw "User cancelled pairing"
- Service not found: Throw "Not a valid thermal printer"
- GATT connection failed: Throw "Could not connect to device"
- Already connected: Clear previous, reconnect

Timeout: None (controlled by user selection)
```

#### Function: `sendToPrinter(data, retryCount = 0, maxRetries = 2)`
```javascript
Input:
  - data: Uint8Array of bytes to send
  - retryCount: Internal counter
  - maxRetries: Max retry attempts

Output: Promise<void>

Process:
1. Validate printer connected → Throw if not
2. Validate data not empty → Return (no-op)
3. Split into 20-byte chunks (BLE MTU)
4. For each chunk:
   a. Try writeValue() or writeValueWithoutResponse()
   b. Catch errors → Handle per type
   c. Delay 30ms between chunks (prevent buffer overflow)
5. Return success

Retry Logic (on error):
- If NotFoundError or disconnected: Throw "Printer disconnected"
- If other network error:
  - If retryCount < maxRetries:
    - Wait 500ms * (retryCount + 1) (exponential backoff)
    - Recursively call sendToPrinter(data, retryCount + 1)
  - Else: Throw error

Timeout: None per-chunk, but operation has overall timeout in caller

Logging:
- Log chunk number sent
- Log errors with context
- Log successful completion
```

#### Function: `printReceipt(order, businessSettings)`
```javascript
Input:
  - order: validated order object
  - businessSettings: print customization

Output: Promise<{ success: boolean, message: string, error?: string }>

Process:
1. Validate order exists → Throw if not
2. Check printer connected:
   - If not: Try reconnect via getSavedPrinter() + connectBluetoothPrinter()
   - If fails: Throw "Printer not connected"
3. Generate ESC/POS bytes:
   - INIT command
   - Receipt content (order items, total, date, etc.)
   - FEED_LINES(4) for spacing
   - CUT_PARTIAL for paper cut
4. Send each command via sendToPrinter()
5. Return { success: true }

Error handling:
- Wrap in try/catch
- If timeout error: Show "Printer offline"
- If disconnection: Show "Reconnect printer"
- If cut fails (non-critical): Log warning, continue
- Return { success: false, message: error.message }

Special handling:
- Init timeout: 5 seconds (Promise.race with setTimeout)
- Cut operation: Non-blocking (failure doesn't fail whole print)
```

#### Function: `disconnectBluetoothPrinter()`
```javascript
Output: void

Process:
1. Remove gattserverdisconnected event listener
2. Disconnect GATT: connectedDevice.gatt.disconnect()
3. Clear references:
   - connectedDevice = null
   - printerCharacteristic = null
4. Log success

Error handling:
- All errors caught and logged (non-critical)
- Always clears references (for GC)
```

---

### 1.5 smartPrintHandler.js

#### Function: `detectPlatform()`
```javascript
Output: {
  electron: boolean,
  android: boolean,
  androidTWA: boolean,
  bluetoothAvailable: boolean,
  platform: string // 'electron' | 'android' | 'browser'
}

Logic:
1. Check isElectronAvailable() → electron = true
2. Check isAndroid() → android = true
3. Check isAndroidTWA() → androidTWA = true
4. Check navigator.bluetooth exists → bluetoothAvailable = true
5. Determine primary platform (priority: electron > android > browser)
```

#### Function: `printWithFallback(order, businessSettings, printMethod)`
```javascript
Input:
  - order: validated order
  - businessSettings: customization
  - printMethod: 'receipt' | 'kot'

Output: Promise<{ success, message, error?, retryable? }>

Fallback chain (in order):
1. Electron (if available) → electronPrint.printReceipt()
2. Android (if available) → androidPrint.androidPrint()
3. Bluetooth (if connected) → bluetoothPrint.printReceipt()
4. Browser (always available) → window.print()

Process:
1. Get platform info via detectPlatform()
2. For each applicable platform in chain:
   a. Try print method with timeout promise
   b. If succeeds: Return { success: true, ... }
   c. If fails:
      - Log error
      - Check if retryable
      - If retryable AND more methods: Continue to next
      - If not retryable: Return { success: false, ... }
3. If all fail: Return final error

Timeout wrapper:
```javascript
await Promise.race([
  printMethod(),
  new Promise((_, reject) => 
    setTimeout(() => reject(new Error('Timeout')), TIMEOUT_MS)
  )
])
```

Example:
```
Try Electron (10s timeout)
  ├─ Success → Return
  ├─ Timeout → Log, try next
  ├─ Error (non-retryable) → Return error
  └─ Error (retryable) → Try next

Try Android (5s timeout)
  ├─ Success → Return
  ├─ Failure → Try next

Try Bluetooth (5s timeout)
  ├─ Success → Return
  └─ Failure → Try next

Try Browser (no timeout)
  ├─ Success → Return
  └─ Failure → Return error
```
```

#### Function: `printReceipt(order, businessSettings)`
```javascript
Input:
  - order: { id, items, total, ... }
  - businessSettings: { name, address, ... }

Output: Promise<{ success, message, error?, retryable? }>

Process:
1. Validate inputs via printValidator.validateOrder()
   - If invalid: Return { success: false, message: error, retryable: false }
2. Generate receipt content:
   - HTML (for visual printers/web)
   - ESC/POS (for thermal printers)
   - Plain text (for fallback)
3. Call printWithFallback(order, businessSettings, 'receipt')
4. Return structured result

Logging:
- Log operation start with order ID
- Log each method attempted
- Log final result (success/failure)
```

---

### 1.6 printLogger.js

#### Function: `logPrintOperation(operation, result)`
```javascript
Input:
  - operation: { type, order, platform, method, timestamp }
  - result: { success, error?, duration, message }

Output: void

Process:
1. Create log entry with timestamp
2. Append to localStorage: 'print_log' (max 50 entries)
3. Log to console with [v0] prefix
4. If error: Log with full context

Log entry structure:
{
  timestamp: Date.now(),
  type: 'receipt' | 'kot',
  orderId: order.id,
  platform: 'electron' | 'android' | 'bluetooth' | 'browser',
  success: boolean,
  duration: number (ms),
  error?: string,
  message: string
}

Storage:
- Key: 'print_log'
- Value: JSON array of entries
- Max entries: 50 (remove oldest)
```

#### Function: `getPrintHistory()`
```javascript
Output: { success: boolean, entries: LogEntry[] }

Process:
1. Get from localStorage['print_log']
2. Parse JSON (safe with try/catch)
3. Return array sorted by timestamp (newest first)
4. Limit to 50 entries
```

#### Function: `exportPrintLogs()`
```javascript
Output: string (JSON)

Process:
1. Get all logs via getPrintHistory()
2. Convert to pretty JSON
3. Create blob and trigger download
4. Filename: `print-logs-${Date.now()}.json`
```

---

### 1.7 escposBuilder.js

#### Core byte building functions

```javascript
Function: bytes(...args)
Purpose: Unified byte array builder
Input: Mix of strings, numbers, arrays
Output: Uint8Array

Process:
1. For each arg:
   - If array: spread into output
   - If string: encode via TextEncoder (UTF-8)
   - If number: add as single byte (0-255)
2. Return Uint8Array

Special handling:
- Unicode chars (₹, €) encoded as UTF-8
- Fallback to Latin1 if UTF-8 fails
- Numbers masked to 0xFF (single byte)
```

```javascript
Function: commands.TEXT(text, align = 'left')
Purpose: Add justified text
Input: text (string), align ('left'|'center'|'right')
Output: Uint8Array

Process:
- Calculate text width in columns (typically 32 for 80mm)
- Pad with spaces as needed for alignment
- Return ESC/POS formatted bytes
```

```javascript
Function: commands.BOLD_TEXT(text)
Purpose: Print bold text
Input: text (string)
Output: Uint8Array

ESC/POS sequence:
- ESC E 1 (Enable emphasis/bold)
- Text bytes
- ESC E 0 (Disable)
```

```javascript
Function: commands.BARCODE(code, type = 'CODE128')
Purpose: Generate barcode
Input: code (string), type (barcode format)
Output: Uint8Array

ESC/POS sequence:
- GS k <type> <length> <data>
- Set barcode width/height
- Print barcode
```

---

## 2. State Machines

### Print Operation State Machine

```
┌─────────────┐
│   IDLE      │◄─────────────┐
└──────┬──────┘              │
       │ User clicks Print   │
       ▼                     │
┌─────────────┐              │
│ VALIDATING  │              │
└──────┬──────┘              │
       │                     │
       ├─ Valid ────────────►│
       │                     │
       ├─ Invalid ──┐        │
       │            │        │
       ▼            ▼        │
┌─────────────┐  Show error  │
│ DETECTING   │  toast       │
└──────┬──────┘   ────────────┘
       │
       ▼
┌─────────────┐
│ ATTEMPTING  │ (try platform 1)
└──────┬──────┘
       │
       ├─ Success ─────┐
       │                ▼
       │        ┌──────────────┐
       │        │ SUCCESS      │ (show success toast)
       │        └──────┬───────┘
       │               │
       ├─ Timeout ─────┤
       │        ┌──────▼────────┐
       ├─ Error ┤ FALLBACK      │ (try next platform)
       │        └──────┬────────┘
       │               │
       │               ├─ More platforms? ──┐
       │               │                     │
       │               └─ No more ──┐       │
       │                             │      │
       └─────────────────────────────┼──────┘
                                     │
                                     ▼
                            ┌──────────────────┐
                            │ FAILURE          │
                            │ (show error toast)
                            └─────────┬────────┘
                                      │
                                      └──► IDLE
```

### Connection State Machine (Bluetooth)

```
┌──────────────┐
│ DISCONNECTED │
└──────┬───────┘
       │ requestDevice()
       ▼
┌──────────────┐
│ DISCOVERING  │
└──────┬───────┘
       │
       ├─ User cancelled ────┐
       │                     │
       │                     ▼
       ├─ Device found    ┌────────────┐
       │ (gatt.connect)   │ ERROR      │
       │                  └────┬───────┘
       ▼                       │
┌──────────────┐              │
│ CONNECTING   │              │
└──────┬───────┘              │
       │                      │
       ├─ Success ────┐      │
       │              │      │
       └─ Failure ────┼──────┘
                      │
                      ▼
             ┌──────────────┐
             │ CONNECTED    │
             └──────┬───────┘
                    │
         ┌──────────┴───────────┐
         │                      │
         │ (can send/receive)   │
         │                      │
         └──────────┬───────────┘
                    │
                    │ gattserverdisconnected event
                    ▼
             ┌──────────────┐
             │ DISCONNECTED │ (return to top)
             └──────────────┘
```

---

## 3. Error Codes & Messages

```javascript
// Validation errors
VALIDATION_NO_ORDER = "Order data is missing"
VALIDATION_NO_ITEMS = "Order has no items to print"
VALIDATION_INVALID_TOTAL = "Order total is invalid"

// Device errors
DEVICE_NOT_FOUND = "Printer not found"
DEVICE_DISCONNECTED = "Printer disconnected during print"
DEVICE_BUSY = "Printer is busy, try again"

// Permission errors
PERMISSION_DENIED = "App not allowed to access printer"
PERMISSION_NOT_AVAILABLE = "Print permission not available on this device"

// Timeout errors
TIMEOUT_PRINTER = "Printer did not respond (timeout)"
TIMEOUT_PRINT = "Print operation timed out after 30 seconds"

// Format errors
FORMAT_INVALID = "Could not format receipt for printer"
ENCODING_FAILED = "Character encoding failed"

// Platform specific
ELECTRON_NOT_AVAILABLE = "Desktop app not detected"
ANDROID_RAWBT_NOT_INSTALLED = "RawBT printer app not installed"
BLUETOOTH_NOT_SUPPORTED = "Bluetooth not available on this device"
```

---

## 4. API Contracts

### SmartPrintHandler.printReceipt()

```javascript
// Request
{
  order: {
    id: string | number,
    items: Array<{ name: string, qty: number, price: number }>,
    total: number,
    date?: string,
    paymentMode?: string,
    paymentAmount?: number,
    ...otherFields
  },
  businessSettings?: {
    name?: string,
    address?: string,
    phone?: string,
    gst?: string,
    logo?: string,
    ...customFields
  }
}

// Response
{
  success: boolean,
  message: string,
  error?: string,
  retryable?: boolean,
  platform?: string,      // Which platform succeeded
  duration?: number       // ms taken
}
```

### PrintValidator.validateOrder()

```javascript
// Response
{
  valid: boolean,
  errors: string[],       // Must fix to print
  warnings: string[],     // Non-blocking
  sanitized?: {
    // Cleaned order object safe to print
  }
}
```

---

## 5. Performance Characteristics

### Latency Budget
| Component | Target | Notes |
|-----------|--------|-------|
| Platform detection | <100ms | Quick checks |
| Order validation | <50ms | Synchronous |
| HTML generation | <200ms | DOM operations |
| ESC/POS generation | <100ms | Byte building |
| Print initiation | <500ms | Varies by platform |
| **Total user wait** | <1s | Before feedback |

### Memory Usage
- No memory leaks (all references cleaned)
- Iframe elements removed immediately
- Event listeners removed on disconnect
- Large orders (100+ items): <5MB allocated

### Concurrency
- Max concurrent prints: 5 (configurable)
- Per-order: Only one print at a time
- Different orders: Can print simultaneously

---

## 6. Testing Specification

### Unit Tests

#### printValidator.js
- Valid order passes validation
- Missing fields trigger errors
- Partial payment triggers warnings
- Business settings fallback to defaults

#### escposBuilder.js
- Text encoding (including ₹, €, etc.)
- Barcode generation
- Alignment (left, center, right)
- Bold and double-width text

### Integration Tests

#### Full print flow
```
1. Click print button
2. Validator runs
3. Platform detected
4. Appropriate printer method called
5. Result received
6. Toast notification shown
7. UI state cleaned up
```

#### Fallback chain
```
1. Electron fails → Try Android
2. Android fails → Try Bluetooth
3. Bluetooth fails → Use Browser
4. Browser fails → Show error
```

### Manual Tests

#### Android (TWA)
- [ ] RawBT app installed: Print works
- [ ] RawBT app not installed: Share fallback works
- [ ] Special characters display correctly (₹)
- [ ] Large orders (50+ items) print correctly
- [ ] Network loss during print: Graceful recovery

#### Electron (Desktop)
- [ ] Printer selection dialog appears
- [ ] Multiple printers available
- [ ] Print to PDF option works
- [ ] Cancel print works
- [ ] Offline printer handling

#### Web (Bluetooth)
- [ ] Device pairing works
- [ ] Print completes without timeout
- [ ] Disconnect handling graceful
- [ ] Reconnect works

#### All Platforms
- [ ] No console errors
- [ ] No memory leaks
- [ ] Loading state shows/hides properly
- [ ] Error messages are helpful
- [ ] Special characters (₹, €, ©) display correctly

---

## Summary

The LLD provides detailed specifications for each module's implementation, including:
- Function signatures and contracts
- Process flows and error handling
- State machines for complex operations
- Performance targets
- Testing requirements

This ensures consistent, reliable, and maintainable implementation across all platforms.
