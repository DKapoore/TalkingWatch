/**
 * config.js — PUBLIC configuration only.
 * Never place secrets (SECRET_KEY, admin keys, payment gateway secrets) here.
 * This file is served to every visitor's browser.
 */
window.APP_CONFIG = {
  appId: "kapoore-talking-clock",
  appName: "Kapoore Art Talking Clock",
  appDomain: window.location.hostname || "localhost",

  // Your own backend (see /backend). The backend proxies to the real
  // Kapoore Art License System so the Google Apps Script SECRET_KEY never
  // reaches the browser, and so trial start dates can't be reset just by
  // clearing localStorage.
  backendApiUrl: "/api",

  trialDays: 10,

  payment: {
    upiId: "dkapoore@oksbi",
    merchantName: "Kapoore Art",
    productName: "Talking Clock Lifetime License",
    amount: 299,
    currency: "INR"
  },

  licenseCheckIntervalHours: 12,
  licenseGraceHours: 72
};
