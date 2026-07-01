# BillByteKOT — Restaurant Billing App

## Original Problem Statement
> Android app facing issue with printing — fix thermal printer (mobile/desktop/web) and enhance / modernize UI across all pages. Bubblewrapped mobile app shows raw "Offline" text in the command UI when there is no network — turn it into a branded offline screen. Prioritise the printing issue. Works for restaurants.

## Architecture
- **Frontend**: React (CRA + craco), Tailwind, Radix/Shadcn UI, PWA + Bubblewrap TWA for Android, Electron for desktop.
- **Backend**: FastAPI + MongoDB (existing, no changes made).
- **Service Worker**: `/frontend/public/sw.js` — caches app shell + serves branded offline page.

## What's been implemented (2026-01-30)
1. **Thermal printer fix across Web / Desktop / Android TWA**
   - New utility `/frontend/src/utils/androidPrint.js` with:
     - ESC/POS byte builders for receipts and KOTs.
     - **RawBT intent bridge** (`rawbt:base64,...`) — the de-facto standard for reliable Bluetooth thermal printing inside Android WebViews / Bubblewrap TWAs where Web Bluetooth is restricted.
     - Web Share fallback for devices without RawBT.
   - `/frontend/src/utils/printUtils.js` updated with a proper fallback chain:
     1. Electron → 2. Persistent Context Bluetooth printer → 3. Legacy direct BT → 4. Android RawBT → 5. Browser print dialog.
   - `BluetoothPrinterContext` now exposes its live state on `window.__btPrinter` so legacy print call-sites see the shared connection.
   - `App.js` wraps the router in `<BluetoothPrinterProvider>` for app-wide persistent printer state.

2. **Branded offline page for TWA / PWA**
   - New `/frontend/public/offline.html` — modern dark design (orange/amber accents, glass chips, grain, decorative receipt SVG), online/offline pulse indicator, retry + "Continue in app" CTAs, auto-redirect on reconnect.
   - `/frontend/public/sw.js` upgraded (v1.7.0): dedicated `navigationStrategy` serves `offline.html` when the network fails, instead of raw "Offline" text.
   - Honors `prefers-reduced-motion`, safe-area aware, all key elements carry `data-testid`.

3. **Modernised Bluetooth Printer Settings UI** (`components/BluetoothPrinterSettings.js`)
   - Glass/gradient dark card, live status chip, reconnect counter, queued print jobs badge, device identity card, Android/RawBT help-card, twin-action CTA row (Test Print / Disconnect), features grid.
   - Wired to `useBluetoothPrinter` context — status survives page navigation.

## Next Action Items
- [ ] Modernize remaining high-traffic pages (Dashboard, BillingPage, OrdersPage, SettingsPage header/tabs, Counter Sale mobile) — deferred.
- [ ] Optional: RawBT install prompt on first Android print error.
- [ ] Optional: `printer reconnected` push notification.

## What's been implemented (2026-07-01) — Registration retention + security patches
- **Removed OTP leakage** from `/api/auth/register-request` response body and stopped logging full OTPs.
- **verify-registration returns `{token, user}`** so users are auto-logged in after email verify (was the main funnel drop).
- **OTP storage moved to Mongo** (`registration_otps`) — survives backend restarts / worker cycles.
- **Removed dead code** after `return user_obj` (the referral tracking that never ran). Referral record is now created inline before the response.
- **Per-email OTP request rate limit** (5 / 10 min) in addition to per-IP auth limit.
- **`/api/auth/register` (direct/no-OTP) gated** behind `ALLOW_DIRECT_REGISTER=true`. Returns 403 in normal deployments.
- Frontend `handleResendOTP` referenced-before-assigned bug fixed.
- Frontend "Skip verification" bypass removed.
- BusinessSetupPage: no more `window.location.reload()` — SPA-native handoff, updates auth storage with fresh user.

## Files Changed (this session)
- `backend/server.py` (auth register/verify + Mongo OTP store + rate limit + gated direct-register)
- `frontend/src/pages/LoginPage.js` (auto-login on verify, resend fix, skip removed)
- `frontend/src/pages/BusinessSetupPage.js` (SPA-native handoff)
- Created `backend/.env`, `frontend/.env`, `memory/test_credentials.md`

## Backlog
- P1: UI modernization sweep (remaining ~35 pages).
- P2: Native-Android print plugin (Capacitor bridge) as alternative to RawBT for self-contained APK.
- P2: Print queue UI (list failed jobs, retry button).

## Files Changed
- Added: `frontend/public/offline.html`, `frontend/src/utils/androidPrint.js`
- Modified: `frontend/public/sw.js`, `frontend/src/utils/printUtils.js`, `frontend/src/contexts/BluetoothPrinterContext.js`, `frontend/src/components/BluetoothPrinterSettings.js`, `frontend/src/App.js`, `frontend/.env`, `backend/.env`
