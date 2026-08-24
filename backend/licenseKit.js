"use strict";

/**
 * licenseKit.js
 * -----------------------------------------------------------------------
 * Server-side-only wrapper around the existing Kapoore Art License System
 * (Google Apps Script backend), following exactly the contract documented
 * in license_integration_kit/API_REFERENCE.md — same actions, same params,
 * same response shape. This file does NOT introduce a second license
 * database or a competing API; it is the transport layer this app's
 * server.js uses to talk to the real license system.
 *
 * SECRET_KEY is read from process.env only and is never returned to any
 * HTTP client of THIS server.
 * -----------------------------------------------------------------------
 */

const LICENSE_API_URL = process.env.LICENSE_API_URL;
const SECRET_KEY = process.env.LICENSE_SECRET_KEY;

// Practical "lifetime" representation for a backend whose native concept is
// duration_days. 100 years is functionally permanent and keeps this app
// backward compatible with the existing license system (see Section
// "LICENSE ACTIVATION" in the product spec — do not use 365 days for a
// lifetime plan).
const LIFETIME_DAYS = 36500;

async function callApi(params) {
  if (!LICENSE_API_URL) {
    throw new Error("LICENSE_API_URL is not configured on the server.");
  }
  const url = LICENSE_API_URL + "?" + new URLSearchParams(params).toString();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data) {
      return { ok: false, data: null, error: `License server returned HTTP ${res.status}` };
    }
    return { ok: true, data, error: null };
  } catch (err) {
    return { ok: false, data: null, error: "Could not reach license server: " + err.message };
  } finally {
    clearTimeout(timeout);
  }
}

/** GET ?action=validate&code=&domain= — safe, no secret required. */
async function validateSerial(code, domain) {
  return callApi({ action: "validate", code, domain: domain || "unknown" });
}

/**
 * GET ?action=generate&secret=&client=&days=&email=&type=&paid=
 * SERVER-SIDE ONLY. Called from the admin receipt-verification flow after
 * a human confirms the ₹299 payment — never exposed to the browser.
 */
async function generateLifetimeLicense({ client, email, paid = true }) {
  if (!SECRET_KEY || SECRET_KEY === "changeme") {
    throw new Error("LICENSE_SECRET_KEY is not configured on the server.");
  }
  return callApi({
    action: "generate",
    secret: SECRET_KEY,
    client: client || "Kapoore Art Talking Clock customer",
    days: String(LIFETIME_DAYS),
    email: email || "",
    type: "Lifetime",
    paid: paid ? "1" : "0",
  });
}

module.exports = { validateSerial, generateLifetimeLicense, LIFETIME_DAYS };
