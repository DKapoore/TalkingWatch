# Kapoore Art Talking Clock

A driving-friendly PWA that announces the current time out loud at a chosen
interval — designed to run in the background while your phone is connected
to a Bluetooth speaker or car audio system.

```
index.html          Single-page app shell (onboarding, setup, main, settings, license)
style.css            Dark, instrument-cluster themed styling
app.js                Clock engine, speech synthesis, trial/license client, install flow
config.js             Public, non-secret configuration
manifest.webmanifest  PWA manifest (standalone display)
service-worker.js     Offline caching of the app shell
icons/                App icons (192, 512, maskable 512)
backend/               Node/Express license, trial, and receipt backend
```

---

## 1. How it works

- **Trial**: every new device gets a 10-day free trial, tracked server-side
  (keyed by a random device ID stored in `localStorage`) — not just in the
  browser, so clearing site data alone doesn't regenerate a trial.
- **License**: after the trial, the app follows the existing **Kapoore Art
  License System** contract exactly as documented in
  `license_integration_kit/API_REFERENCE.md` — `?action=validate` (safe,
  no secret) and `?action=generate` (server-only, requires `SECRET_KEY`).
  This app does not introduce a second license database.
- **Lifetime plan**: the license system's native concept is
  `duration_days`. Since there's no "true lifetime" field in that API, a
  lifetime license is represented as a very long duration (100 years /
  36,500 days) rather than artificially set to 365 days. See
  `backend/licenseKit.js`.
- **Payment**: ₹299 one-time via UPI (`dkapoore@oksbi`), shown as a
  scannable QR (generated client-side, no external QR image dependency)
  plus the raw UPI ID. Uploading a receipt does **not** auto-activate a
  license — an admin reviews it in `/admin` and issues a license code,
  which the customer enters in the app.

---

## 2. Running the frontend

The frontend is static — any static file host works (it does not need
Node). For local testing:

```bash
cd kapoore-talking-clock
npx serve .          # or: python3 -m http.server 5173
```

Open the printed URL over **HTTP on localhost** (fine for testing) — for
real installs (`beforeinstallprompt`, Service Worker) you need **HTTPS**
in production; browsers refuse to install PWAs served over plain HTTP on
a real domain.

If your backend runs on a different origin than the frontend, update
`backendApiUrl` in `config.js` to the full backend URL (e.g.
`https://api.yourdomain.com/api`) and set `CORS_ORIGIN` in the backend's
`.env` to your frontend's origin.

## 3. Running the backend

```bash
cd kapoore-talking-clock/backend
cp .env.example .env
# edit .env:
#   LICENSE_API_URL      -> your Apps Script Web App URL
#   LICENSE_SECRET_KEY   -> your Super Admin SECRET_KEY (server-only, never exposed)
#   ADMIN_KEY             -> a password you choose for the /admin panel
#   APP_DOMAIN            -> your deployed domain
npm install
npm start
```

The backend listens on `PORT` (default 8080) and exposes:

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/license/status?deviceId=` | Trial/license state for a device |
| POST | `/api/license/activate` | Validate + store a serial code for a device |
| POST | `/api/receipt/upload` | Upload a payment receipt (multipart) |
| GET | `/admin` | Admin panel (receipt review + license issuance) |
| GET/POST | `/admin/api/*` | Admin API, requires `X-Admin-Key` header |

Receipts are stored under `backend/uploads/`; device/license/receipt
records are stored as JSON under `backend/data/` — swap `backend/store.js`
for a real database in production (the function signatures are the only
thing that matters to `server.js`).

## 4. Admin workflow (verifying a ₹299 payment)

1. Customer pays via the QR / UPI ID and uploads a receipt in-app.
2. Open `https://your-backend/admin`, enter your `ADMIN_KEY`, click **Load
   Receipts**.
3. Open the receipt image/PDF to confirm the payment.
4. Click **Verify & Generate License** — this calls the license system's
   `?action=generate` endpoint server-side (with your `SECRET_KEY`) for a
   36,500-day ("lifetime") license, and shows you the serial code. If the
   customer supplied an email, the license system emails it to them
   automatically (per the existing kit's behavior); otherwise send it to
   them yourself.
5. Customer enters the code in the app's **Enter License Code** field →
   `Activate License` → unlocked permanently.

## 5. Hosting / HTTPS

- The frontend **must** be served over HTTPS in production — PWA install
  and several browser APIs (Service Worker, Wake Lock) require a secure
  context (localhost is exempted for testing).
- Any static host works for the frontend (Netlify, Vercel static, Nginx,
  GitHub Pages, S3+CloudFront, etc).
- The backend needs a Node.js host (Render, Railway, Fly.io, a VPS with
  PM2/systemd, etc.) reachable over HTTPS from the frontend's origin.

## 6. PWA install testing

**Android / Chrome**: visit the site, wait for the "Install Talking
Clock" banner (or the button on the onboarding screen), tap **Install
App**. Confirm it opens standalone (no address bar) from the home
screen icon.

**iPhone / Safari**: `beforeinstallprompt` doesn't exist on iOS — the app
shows **Tap Share → Add to Home Screen** instructions instead. This is a
real iOS/Safari limitation, not a bug.

**Offline**: after first load (and after the service worker has cached
the shell), turn on airplane mode and reload — the clock UI should still
load. License/trial checks will show `OFFLINE_GRACE` for up to 72 hours
per the integration kit's grace-period rule, matching the existing
license system's recommended behavior.

## 7. Trial / license / payment configuration

All of it lives in two places:

- `config.js` (frontend, public only): `trialDays`, `payment.amount`,
  `payment.upiId`, `payment.merchantName`, `backendApiUrl`.
- `backend/.env` (server, secret): `LICENSE_API_URL`,
  `LICENSE_SECRET_KEY`, `ADMIN_KEY`, `APP_DOMAIN`.

Never put `LICENSE_SECRET_KEY` or `ADMIN_KEY` in `config.js` or anywhere
client-side.

## 8. Background operation

Starting the clock now also plays a silent, looping audio track and
registers a Media Session (`app.js` → `KeepAlive`). This is the standard,
policy-compliant technique web apps use to stay alive with the screen off
or the app switched away — browsers avoid throttling a tab that's audibly
playing, and it gives the user a lock-screen Stop control too.

Real-world behavior:
- **Android / Chrome**: works well — announcements continue with the
  screen locked or another app in the foreground.
- **iOS / Safari**: iOS suspends backgrounded web pages aggressively; the
  silent-audio trick helps but isn't guaranteed for long periods. Reopening
  the app resumes it immediately. This is a platform limitation, not a bug
  — no web app can override it.
- The service worker cache version was bumped (`v1` → `v2`) so existing
  installs pick up this update automatically on next load.

## 9. Known real-world limitations (by design, not bugs)

- A browser cannot force-hide its own address bar in a normal tab —
  standalone chrome only appears once the app is installed.
- Mobile OSes may suspend background JS/audio after prolonged screen-lock;
  the app degrades gracefully (shows a "tap START again" hint) rather
  than claiming guaranteed background operation.
- Client-side JavaScript cannot make licensing tamper-proof — the
  authoritative check is always the server-side Kapoore Art License
  System; this app is only the interface to it.
