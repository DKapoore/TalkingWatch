"use strict";

const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "data");
const DEVICES_PATH = path.join(DATA_DIR, "devices.json");
const RECEIPTS_PATH = path.join(DATA_DIR, "receipts.json");

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function readJson(p, fallback) {
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch (e) {
    return fallback;
  }
}
function writeJson(p, data) {
  fs.writeFileSync(p, JSON.stringify(data, null, 2));
}

// ---- devices: { [deviceId]: { trialStart, license: {...} | null } } ----
function getDevices() { return readJson(DEVICES_PATH, {}); }
function saveDevices(devices) { writeJson(DEVICES_PATH, devices); }

function getOrCreateDevice(deviceId) {
  const devices = getDevices();
  if (!devices[deviceId]) {
    devices[deviceId] = {
      deviceId,
      trialStart: new Date().toISOString(),
      license: null, // { serialCode, status, expiresAt, plan, lastCheckedAt, lastCheckError }
    };
    saveDevices(devices);
  }
  return devices[deviceId];
}

function updateDevice(deviceId, patch) {
  const devices = getDevices();
  devices[deviceId] = Object.assign({}, devices[deviceId], patch);
  saveDevices(devices);
  return devices[deviceId];
}

// ---- receipts: array of { id, deviceId, email, filePath, originalName, uploadedAt, verified } ----
function getReceipts() { return readJson(RECEIPTS_PATH, []); }
function saveReceipts(receipts) { writeJson(RECEIPTS_PATH, receipts); }

function addReceipt(receipt) {
  const receipts = getReceipts();
  receipts.push(receipt);
  saveReceipts(receipts);
  return receipt;
}

function updateReceipt(id, patch) {
  const receipts = getReceipts();
  const idx = receipts.findIndex((r) => r.id === id);
  if (idx === -1) return null;
  receipts[idx] = Object.assign({}, receipts[idx], patch);
  saveReceipts(receipts);
  return receipts[idx];
}

module.exports = {
  getDevices, saveDevices, getOrCreateDevice, updateDevice,
  getReceipts, saveReceipts, addReceipt, updateReceipt,
};
