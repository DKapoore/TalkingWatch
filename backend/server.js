"use strict";

require("dotenv").config();
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const express = require("express");
const cors = require("cors");
const multer = require("multer");

const licenseKit = require("./licenseKit");
const store = require("./store");

const app = express();
const PORT = process.env.PORT || 8080;
const APP_DOMAIN = process.env.APP_DOMAIN || "unknown";
const ADMIN_KEY = process.env.ADMIN_KEY || "";
const TRIAL_DAYS = 10;
const CHECK_INTERVAL_HOURS = 12;
const GRACE_HOURS = 72;

const UPLOAD_DIR = path.join(__dirname, "uploads");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

app.use(cors({ origin: process.env.CORS_ORIGIN === "*" ? true : (process.env.CORS_ORIGIN || "").split(",") }));
app.use(express.json());
app.use("/admin", express.static(path.join(__dirname, "public")));

/* ------------------------------------------------------------------ *
 * Helpers
 * ------------------------------------------------------------------ */
function daysBetween(fromIso, toDate) {
  const from = new Date(fromIso);
  const ms = toDate.getTime() - from.getTime();
  return ms / 86400000;
}

function trialState(device) {
  const elapsed = daysBetween(device.trialStart, new Date());
  const daysRemaining = Math.max(0, Math.ceil(TRIAL_DAYS - elapsed));
  return {
    state: daysRemaining > 0 ? "TRIAL" : "EXPIRED",
    daysRemaining,
    licensedAt: null,
    expiresAtLabel: null,
  };
}

async function refreshLicenseIfNeeded(device) {
  const lic = device.license;
  if (!lic) return trialState(device);

  const lastChecked = lic.lastCheckedAt ? new Date(lic.lastCheckedAt) : null;
  const hoursSinceCheck = lastChecked ? (Date.now() - lastChecked.getTime()) / 3600000 : 999;

  if (hoursSinceCheck < CHECK_INTERVAL_HOURS && lic.status === "active") {
    return { state: "LICENSED", daysRemaining: null, licensedAt: lic.activatedAt, expiresAtLabel: "Lifetime" };
  }

  const result = await licenseKit.validateSerial(lic.serialCode, APP_DOMAIN);

  if (result.ok && result.data.valid) {
    store.updateDevice(device.deviceId, {
      license: Object.assign({}, lic, {
        status: "active",
        expiresAt: result.data.expires_at || lic.expiresAt,
        lastCheckedAt: new Date().toISOString(),
        lastCheckError: null,
      }),
    });
    return { state: "LICENSED", daysRemaining: null, licensedAt: lic.activatedAt, expiresAtLabel: "Lifetime" };
  }

  if (result.ok && !result.data.valid) {
    store.updateDevice(device.deviceId, {
      license: Object.assign({}, lic, {
        status: "invalid",
        lastCheckedAt: new Date().toISOString(),
        lastCheckError: result.data.reason || "License is invalid.",
      }),
    });
    return { state: "LICENSE_INVALID", daysRemaining: null, message: result.data.reason };
  }

  // Network/API failure — honor the 72h offline grace period from the kit.
  const graceDeadline = (lastChecked ? lastChecked.getTime() : Date.now()) + GRACE_HOURS * 3600000;
  if (Date.now() > graceDeadline) {
    store.updateDevice(device.deviceId, {
      license: Object.assign({}, lic, { status: "invalid", lastCheckError: "Offline grace period expired: " + result.error }),
    });
    return { state: "LICENSE_INVALID", daysRemaining: null, message: "Unable to verify your license. Please reconnect to the internet." };
  }
  store.updateDevice(device.deviceId, { license: Object.assign({}, lic, { lastCheckError: result.error }) });
  return { state: "OFFLINE_GRACE", daysRemaining: null, licensedAt: lic.activatedAt, expiresAtLabel: "Lifetime" };
}

/* ------------------------------------------------------------------ *
 * Public API — consumed by the PWA frontend
 * ------------------------------------------------------------------ */

app.get("/api/license/status", async (req, res) => {
  const deviceId = String(req.query.deviceId || "").trim();
  if (!deviceId) return res.status(400).json({ message: "deviceId is required." });
  const device = store.getOrCreateDevice(deviceId);
  const state = await refreshLicenseIfNeeded(device);
  res.json(state);
});

app.post("/api/license/activate", async (req, res) => {
  const { deviceId, serialCode, domain } = req.body || {};
  if (!deviceId || !serialCode) {
    return res.status(400).json({ success: false, message: "deviceId and serialCode are required." });
  }
  const result = await licenseKit.validateSerial(String(serialCode).trim(), domain || APP_DOMAIN);

  if (!result.ok) {
    return res.status(200).json({ success: false, message: "Unable to verify license right now. Please check your internet connection." });
  }
  if (!result.data.valid) {
    return res.status(200).json({ success: false, message: result.data.reason || "This license is invalid or has expired." });
  }

  store.updateDevice(deviceId, {
    license: {
      serialCode: String(serialCode).trim(),
      status: "active",
      expiresAt: result.data.expires_at || null,
      activatedAt: new Date().toISOString(),
      lastCheckedAt: new Date().toISOString(),
      lastCheckError: null,
    },
  });

  res.json({
    success: true,
    license: { state: "LICENSED", daysRemaining: null, expiresAtLabel: "Lifetime" },
  });
});

const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (req, file, cb) => {
      const safeExt = path.extname(file.originalname).toLowerCase().replace(/[^.a-z0-9]/g, "");
      cb(null, `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${safeExt}`);
    },
  }),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    cb(null, allowed.includes(file.mimetype));
  },
});

app.post("/api/receipt/upload", upload.single("receipt"), (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: "No valid receipt file provided." });
  const deviceId = String(req.body.deviceId || "").trim();
  if (!deviceId) return res.status(400).json({ success: false, message: "deviceId is required." });

  const receipt = store.addReceipt({
    id: crypto.randomUUID(),
    deviceId,
    email: (req.body.email || "").trim(),
    originalName: req.file.originalname,
    storedName: req.file.filename,
    uploadedAt: new Date().toISOString(),
    verified: false,
  });

  res.json({ success: true, receiptId: receipt.id });
});

/* ------------------------------------------------------------------ *
 * Admin API — protected by ADMIN_KEY, used by /admin panel only.
 * Handles: review uploaded receipts, generate a lifetime license after
 * a human confirms the ₹299 payment. The SECRET_KEY never leaves the
 * server (see licenseKit.js).
 * ------------------------------------------------------------------ */
function requireAdmin(req, res, next) {
  const key = req.header("X-Admin-Key");
  if (!ADMIN_KEY || key !== ADMIN_KEY) {
    return res.status(401).json({ message: "Invalid or missing admin key." });
  }
  next();
}

app.get("/admin/api/receipts", requireAdmin, (req, res) => {
  const receipts = store.getReceipts().sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
  res.json({ receipts });
});

app.get("/admin/api/receipt-file/:id", requireAdmin, (req, res) => {
  const receipt = store.getReceipts().find((r) => r.id === req.params.id);
  if (!receipt) return res.status(404).end();
  res.sendFile(path.join(UPLOAD_DIR, receipt.storedName));
});

app.get("/admin/api/devices", requireAdmin, (req, res) => {
  res.json({ devices: Object.values(store.getDevices()) });
});

app.post("/admin/api/verify-receipt", requireAdmin, async (req, res) => {
  const { receiptId } = req.body || {};
  const receipt = store.getReceipts().find((r) => r.id === receiptId);
  if (!receipt) return res.status(404).json({ success: false, message: "Receipt not found." });

  try {
    const result = await licenseKit.generateLifetimeLicense({
      client: receipt.deviceId,
      email: receipt.email,
      paid: true,
    });
    if (!result.ok || !result.data.success) {
      return res.status(502).json({ success: false, message: (result.data && result.data.error) || result.error || "License generation failed." });
    }
    store.updateReceipt(receiptId, { verified: true, serialCode: result.data.serial_code, verifiedAt: new Date().toISOString() });
    res.json({ success: true, serialCode: result.data.serial_code, expiresAt: result.data.expires_at });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

app.get("/health", (req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`Kapoore Art Talking Clock backend listening on :${PORT}`);
  if (!process.env.LICENSE_API_URL) console.warn("WARNING: LICENSE_API_URL not set — copy .env.example to .env");
});
