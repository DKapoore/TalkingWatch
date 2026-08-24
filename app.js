"use strict";

/* =========================================================================
   Kapoore Art Talking Clock — app.js
   Pure vanilla JS. No framework. Single-page view switching.
   ========================================================================= */

const CFG = window.APP_CONFIG;

/* ---------------------------------------------------------------------
   0. Small utilities
   --------------------------------------------------------------------- */
const $ = (sel) => document.querySelector(sel);
const $all = (sel) => Array.from(document.querySelectorAll(sel));
const pad2 = (n) => String(n).padStart(2, "0");

function toast(msg, ms = 3200) {
  const el = $("#toast");
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { el.hidden = true; }, ms);
}

function uuid() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function getDeviceId() {
  let id = localStorage.getItem("kapoore_device_id");
  if (!id) {
    id = uuid();
    localStorage.setItem("kapoore_device_id", id);
  }
  return id;
}

async function api(path, opts = {}) {
  const res = await fetch(CFG.backendApiUrl + path, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  let data = null;
  try { data = await res.json(); } catch (e) { /* non-JSON */ }
  if (!res.ok) {
    const err = new Error((data && data.message) || `Request failed (${res.status})`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

/* ---------------------------------------------------------------------
   1. Preferences (non-sensitive, local only)
   --------------------------------------------------------------------- */
const DEFAULT_PREFS = {
  language: "hi",      // en | hi | mr
  interval: 5,          // minutes
  customInterval: 5,
  voiceURI: "",
  rate: 1.0,
  drivingMode: false,
  wakeLock: true,
  setupDone: false,
};

function loadPrefs() {
  try {
    const raw = localStorage.getItem("kapoore_prefs");
    return raw ? Object.assign({}, DEFAULT_PREFS, JSON.parse(raw)) : { ...DEFAULT_PREFS };
  } catch (e) {
    return { ...DEFAULT_PREFS };
  }
}
function savePrefs(prefs) {
  localStorage.setItem("kapoore_prefs", JSON.stringify(prefs));
}
let prefs = loadPrefs();

const INTERVAL_OPTIONS = [1, 2, 5, 10, 15, 30, 60];
const SPEED_OPTIONS = [0.7, 0.8, 0.9, 1.0, 1.1, 1.2, 1.3];
const LANGUAGES = [
  { code: "en", label: "English", bcp47: "en" },
  { code: "hi", label: "Hindi", bcp47: "hi" },
  { code: "mr", label: "Marathi", bcp47: "mr" },
];

/* ---------------------------------------------------------------------
   2. Speech formatting (modular — one function per language)
   --------------------------------------------------------------------- */
const EN_ONES = ["zero","one","two","three","four","five","six","seven","eight","nine","ten",
  "eleven","twelve","thirteen","fourteen","fifteen","sixteen","seventeen","eighteen","nineteen"];
const EN_TENS = ["", "", "twenty", "thirty", "forty", "fifty"];

function enNumber(n) {
  if (n < 20) return EN_ONES[n];
  const t = Math.floor(n / 10), o = n % 10;
  return o ? `${EN_TENS[t]}-${EN_ONES[o]}` : EN_TENS[t];
}

function formatSpeechEN(h24, m) {
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  if (m === 0) return `Time is ${enNumber(h12)} o'clock.`;
  return `Time is ${enNumber(h12)} ${m < 10 ? "oh " + enNumber(m) : enNumber(m)}.`;
}

// Hindi number words 0-59 (minutes) and 1-12 (hours), simplified spoken forms.
const HI_HOUR = ["", "एक", "दो", "तीन", "चार", "पांच", "छह", "सात", "आठ", "नौ", "दस", "ग्यारह", "बारह"];
const HI_UNITS = ["", "एक","दो","तीन","चार","पांच","छह","सात","आठ","नौ",
  "दस","ग्यारह","बारह","तेरह","चौदह","पंद्रह","सोलह","सत्रह","अठारह","उन्नीस",
  "बीस","इक्कीस","बाईस","तेईस","चौबीस","पच्चीस","छब्बीस","सत्ताईस","अट्ठाईस","उनतीस",
  "तीस","इकतीस","बत्तीस","तैंतीस","चौंतीस","पैंतीस","छत्तीस","सैंतीस","अड़तीस","उनतालीस",
  "चालीस","इकतालीस","बयालीस","तैंतालीस","चवालीस","पैंतालीस","छियालीस","सैंतालीस","अड़तालीस","उनचास",
  "पचास","इक्यावन","बावन","तिरेपन","चौवन","पचपन","छप्पन","सत्तावन","अट्ठावन","उनसठ"];

function formatSpeechHI(h24, m) {
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  if (m === 0) return `समय है ${HI_HOUR[h12]} बजे।`;
  return `समय है ${HI_HOUR[h12]} बजकर ${HI_UNITS[m]} मिनट।`;
}

const MR_HOUR = ["", "एक", "दोन", "तीन", "चार", "पाच", "सहा", "सात", "आठ", "नऊ", "दहा", "अकरा", "बारा"];
const MR_UNITS = ["", "एक","दोन","तीन","चार","पाच","सहा","सात","आठ","नऊ",
  "दहा","अकरा","बारा","तेरा","चौदा","पंधरा","सोळा","सतरा","अठरा","एकोणीस",
  "वीस","एकवीस","बावीस","तेवीस","चोवीस","पंचवीस","सव्वीस","सत्तावीस","अठ्ठावीस","एकोणतीस",
  "तीस","एकतीस","बत्तीस","तेहतीस","चौतीस","पस्तीस","छत्तीस","सदतीस","अडतीस","एकोणचाळीस",
  "चाळीस","एक्केचाळीस","बेचाळीस","त्रेचाळीस","चव्वेचाळीस","पंचेचाळीस","सेहेचाळीस","सत्तेचाळीस","अठ्ठेचाळीस","एकोणपन्नास",
  "पन्नास","एक्कावन्न","बावन्न","त्रेपन्न","चोपन्न","पंचावन्न","छप्पन्न","सत्तावन्न","अठ्ठावन्न","एकोणसाठ"];

function formatSpeechMR(h24, m) {
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  if (m === 0) return `वेळ झाली आहे ${MR_HOUR[h12]} वाजता.`;
  return `वेळ झाली आहे ${MR_HOUR[h12]} वाजून ${MR_UNITS[m]} मिनिटे.`;
}

function formatSpeech(langCode, h24, m) {
  if (langCode === "en") return formatSpeechEN(h24, m);
  if (langCode === "mr") return formatSpeechMR(h24, m);
  return formatSpeechHI(h24, m);
}

/* ---------------------------------------------------------------------
   3. Voice selection (never assume a voice exists)
   --------------------------------------------------------------------- */
let availableVoices = [];
function refreshVoiceList() {
  if (!("speechSynthesis" in window)) { availableVoices = []; return; }
  availableVoices = window.speechSynthesis.getVoices() || [];
}
if ("speechSynthesis" in window) {
  window.speechSynthesis.onvoiceschanged = () => {
    refreshVoiceList();
    populateVoiceSelects();
  };
}

function voicesForLanguage(langCode) {
  const target = LANGUAGES.find((l) => l.code === langCode).bcp47;
  return availableVoices.filter((v) => v.lang && v.lang.toLowerCase().startsWith(target));
}

function pickVoice(langCode, preferredURI) {
  const candidates = voicesForLanguage(langCode);
  if (preferredURI) {
    const exact = candidates.find((v) => v.voiceURI === preferredURI);
    if (exact) return exact;
  }
  if (candidates.length) return candidates[0];
  return null; // caller must handle "no voice" gracefully
}

function populateVoiceSelects() {
  const lang = document.getElementById("set-language")
    ? document.getElementById("set-language").value || prefs.language
    : prefs.language;
  const candidates = voicesForLanguage(lang);

  [$("#set-voice"), $("#setup-voice")].forEach((sel) => {
    if (!sel) return;
    const current = sel.value;
    sel.innerHTML = "";
    if (!candidates.length) {
      const opt = document.createElement("option");
      opt.value = "";
      opt.textContent = "No voice found for this language";
      sel.appendChild(opt);
      sel.disabled = true;
      return;
    }
    sel.disabled = false;
    candidates.forEach((v) => {
      const opt = document.createElement("option");
      opt.value = v.voiceURI;
      opt.textContent = `${v.name} (${v.lang})`;
      sel.appendChild(opt);
    });
    if (candidates.some((v) => v.voiceURI === current)) sel.value = current;
    else if (candidates.some((v) => v.voiceURI === prefs.voiceURI)) sel.value = prefs.voiceURI;
  });
}

function speakTime(h24, m, { isTest = false } = {}) {
  return new Promise((resolve) => {
    if (!("speechSynthesis" in window)) {
      toast("Speech is not supported on this device/browser.");
      resolve(false);
      return;
    }
    const text = formatSpeech(prefs.language, h24, m);
    const utter = new SpeechSynthesisUtterance(text);
    const voice = pickVoice(prefs.language, prefs.voiceURI);
    if (voice) {
      utter.voice = voice;
      utter.lang = voice.lang;
    } else {
      utter.lang = LANGUAGES.find((l) => l.code === prefs.language).bcp47;
      if (isTest) {
        $("#voice-msg") && ($("#voice-msg").textContent = "No compatible voice was found for this language on your device. Using a system default if available.");
        $("#setup-voice-msg") && ($("#setup-voice-msg").textContent = "No compatible voice was found for this language on your device.");
      }
    }
    utter.rate = prefs.rate;
    utter.onend = () => resolve(true);
    utter.onerror = () => {
      if (!isTest) {
        $("#speech-hint").hidden = false;
      }
      resolve(false);
    };
    try {
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utter);
    } catch (e) {
      resolve(false);
    }
  });
}

/* ---------------------------------------------------------------------
   4. Clock + minute-aligned announcement scheduler
   --------------------------------------------------------------------- */
const Clock = (() => {
  let tickHandle = null;
  let running = false;
  let nextAnnounceAt = null; // Date
  let lastAnnounceAt = null; // Date

  const RING_CIRCUMFERENCE = 2 * Math.PI * 132;

  function currentInterval() {
    return prefs.interval === "custom" ? clampInt(prefs.customInterval, 1, 120) : prefs.interval;
  }
  function clampInt(v, min, max) {
    v = parseInt(v, 10);
    if (isNaN(v)) return min;
    return Math.min(max, Math.max(min, v));
  }

  function computeNextAlignedTime(from) {
    const interval = currentInterval();
    const d = new Date(from);
    d.setSeconds(0, 0);
    const minutes = d.getHours() * 60 + d.getMinutes();
    const nextSlot = Math.ceil((minutes + (from.getSeconds() > 0 || from.getMilliseconds() > 0 ? 1 : 0)) / interval) * interval;
    const next = new Date(d);
    next.setHours(0, nextSlot, 0, 0);
    if (next <= from) next.setMinutes(next.getMinutes() + interval);
    return next;
  }

  function updateRing() {
    const ring = document.getElementById("gauge-progress");
    if (!ring) return;
    let fraction = 0;
    if (running && nextAnnounceAt && lastAnnounceAt) {
      const total = nextAnnounceAt.getTime() - lastAnnounceAt.getTime();
      const elapsed = Date.now() - lastAnnounceAt.getTime();
      fraction = total > 0 ? Math.min(1, Math.max(0, elapsed / total)) : 0;
    }
    ring.style.strokeDasharray = `${RING_CIRCUMFERENCE}`;
    ring.style.strokeDashoffset = `${RING_CIRCUMFERENCE * (1 - fraction)}`;
  }

  function updateDisplay() {
    const now = new Date();
    $("#clock-display").textContent = `${pad2(now.getHours())}:${pad2(now.getMinutes())}`;
    if (nextAnnounceAt) {
      $("#next-time").textContent = `${pad2(nextAnnounceAt.getHours())}:${pad2(nextAnnounceAt.getMinutes())}`;
    }
    updateRing();
  }

  function tick() {
    updateDisplay();
    if (!running || !nextAnnounceAt) return;
    const now = new Date();
    if (now >= nextAnnounceAt) {
      const target = nextAnnounceAt;
      lastAnnounceAt = target;
      nextAnnounceAt = computeNextAlignedTime(new Date(target.getTime() + 1000));
      speakTime(target.getHours(), target.getMinutes());
    }
  }

  function start() {
    if (running) return; // no duplicate timers
    running = true;
    lastAnnounceAt = new Date();
    nextAnnounceAt = computeNextAlignedTime(new Date());
    updateDisplay();
    tickHandle = setInterval(tick, 1000);
    document.body.dataset.running = "true";
  }

  function stop() {
    running = false;
    if (tickHandle) clearInterval(tickHandle);
    tickHandle = null;
    nextAnnounceAt = null;
    lastAnnounceAt = null;
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    document.body.dataset.running = "false";
    $("#next-time").textContent = "—";
    updateRing();
  }

  function isRunning() { return running; }

  // keep the idle (not-yet-started) clock face updating too
  setInterval(() => { if (!running) updateDisplay(); }, 1000);
  updateDisplay();

  return { start, stop, isRunning, computeNextAlignedTime };
})();

/* ---------------------------------------------------------------------
   5. Screen Wake Lock (graceful fallback)
   --------------------------------------------------------------------- */
let wakeLockSentinel = null;
async function acquireWakeLock() {
  if (!prefs.wakeLock || !("wakeLock" in navigator)) return;
  try {
    wakeLockSentinel = await navigator.wakeLock.request("screen");
    wakeLockSentinel.addEventListener("release", () => { wakeLockSentinel = null; });
  } catch (e) {
    // Not fatal — continue without it.
    wakeLockSentinel = null;
  }
}
function releaseWakeLock() {
  if (wakeLockSentinel) { wakeLockSentinel.release().catch(() => {}); wakeLockSentinel = null; }
}
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && Clock.isRunning() && prefs.wakeLock) acquireWakeLock();
});

/* ---------------------------------------------------------------------
   5b. Background keep-alive (Media Session + silent audio loop)
   -----------------------------------------------------------------------
   Web pages get their JS timers throttled/suspended when backgrounded or
   the screen locks. The one reliable, policy-compliant way to reduce this
   on Android/Chrome is to keep an <audio> element genuinely playing —
   browsers treat actively-playing audio as a reason to keep a tab alive.
   We play a silent looping clip (started from the same user gesture as
   Start, so autoplay policies allow it) and register a Media Session so
   the OS shows the app as an active audio session with a lock-screen
   Stop control. This is NOT guaranteed on every platform — iOS Safari in
   particular suspends backgrounded web pages aggressively regardless —
   so we say so in the UI rather than promising more than the web
   platform can deliver.
   --------------------------------------------------------------------- */
const KeepAlive = {
  audioEl: null,

  init() {
    this.audioEl = document.getElementById("keep-alive-audio");
  },

  async start() {
    if (!this.audioEl) return;
    try {
      await this.audioEl.play();
    } catch (e) {
      // Autoplay blocked — will retry on next user interaction (Stop/Start).
    }
    if ("mediaSession" in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: "Kapoore Art Talking Clock",
        artist: "Announcing time automatically",
        album: "Talking Clock is active",
      });
      navigator.mediaSession.playbackState = "playing";
      try {
        navigator.mediaSession.setActionHandler("stop", () => $("#btn-stop").click());
        navigator.mediaSession.setActionHandler("pause", () => $("#btn-stop").click());
        navigator.mediaSession.setActionHandler("play", () => $("#btn-start").click());
      } catch (e) { /* action not supported on this platform, ignore */ }
    }
  },

  stop() {
    if (this.audioEl) {
      this.audioEl.pause();
      this.audioEl.currentTime = 0;
    }
    if ("mediaSession" in navigator) {
      navigator.mediaSession.playbackState = "none";
      navigator.mediaSession.metadata = null;
    }
  },

  // Some browsers pause background <audio> elements when a tab regains
  // visibility after being deprioritized — make sure it's still running.
  resumeIfNeeded() {
    if (Clock.isRunning() && this.audioEl && this.audioEl.paused) {
      this.audioEl.play().catch(() => {});
    }
  },
};

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") KeepAlive.resumeIfNeeded();
});

/* ---------------------------------------------------------------------
   6. Trial / License state machine
   States: TRIAL, LICENSED, EXPIRED, LICENSE_INVALID, OFFLINE_GRACE,
           PAYMENT_PENDING, NOT_ACTIVATED
   --------------------------------------------------------------------- */
const LicenseState = {
  current: { state: "TRIAL", daysRemaining: CFG.trialDays, licensedAt: null },

  // Used only when the backend can't be reached at all (e.g. no backend
  // deployed yet, or genuinely offline with nothing cached). This keeps the
  // app usable standalone — trial start is still recorded (not reset on
  // every reload) so it can't be gamed by simply refreshing the page.
  localTrialFallback() {
    let start = localStorage.getItem("kapoore_local_trial_start");
    if (!start) {
      start = new Date().toISOString();
      localStorage.setItem("kapoore_local_trial_start", start);
    }
    const elapsed = (Date.now() - new Date(start).getTime()) / 86400000;
    const daysRemaining = Math.max(0, Math.ceil(CFG.trialDays - elapsed));
    return {
      state: daysRemaining > 0 ? "TRIAL" : "EXPIRED",
      daysRemaining,
      licensedAt: null,
      expiresAtLabel: null,
    };
  },

  async refresh() {
    const deviceId = getDeviceId();
    try {
      const data = await api(`/license/status?deviceId=${encodeURIComponent(deviceId)}`);
      this.current = data;
    } catch (e) {
      // Backend unreachable. If we previously had a real (server-issued)
      // license or trial record, don't silently discard it — fall back to
      // whatever was last cached and mark licenses as offline-grace rather
      // than inventing a fresh trial. But if we've never successfully
      // talked to a backend at all (nothing cached yet), run the trial
      // locally so the app is usable before a backend is deployed.
      const cached = JSON.parse(localStorage.getItem("kapoore_license_cache") || "null");
      if (cached && cached.state === "LICENSED") {
        this.current = { ...cached, state: "OFFLINE_GRACE" };
      } else if (cached) {
        this.current = cached;
      } else {
        this.current = this.localTrialFallback();
      }
    }
    localStorage.setItem("kapoore_license_cache", JSON.stringify(this.current));
    return this.current;
  },

  isUsable() {
    return ["TRIAL", "LICENSED", "OFFLINE_GRACE"].includes(this.current.state);
  },

  async activate(code) {
    const deviceId = getDeviceId();
    const data = await api("/license/activate", {
      method: "POST",
      body: JSON.stringify({ deviceId, serialCode: code, domain: CFG.appDomain }),
    });
    if (data.success) {
      this.current = data.license;
      localStorage.setItem("kapoore_license_cache", JSON.stringify(this.current));
    }
    return data;
  },
};

/* ---------------------------------------------------------------------
   7. Install prompt (beforeinstallprompt) + iOS detection
   --------------------------------------------------------------------- */
let deferredInstallPrompt = null;
const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent);

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;
  if (localStorage.getItem("kapoore_installed") !== "true") {
    $("#btn-install-onboard").hidden = false;
    if (Views.current === "main" && localStorage.getItem("kapoore_install_dismissed") !== "true") {
      $("#install-banner").hidden = false;
    }
  }
});

window.addEventListener("appinstalled", () => {
  localStorage.setItem("kapoore_installed", "true");
  $("#install-banner").hidden = true;
  toast("App Installed Successfully");
});

async function triggerInstall() {
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  const choice = await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  if (choice.outcome === "accepted") {
    localStorage.setItem("kapoore_installed", "true");
  }
}

/* ---------------------------------------------------------------------
   8. View management
   --------------------------------------------------------------------- */
const Views = {
  current: null,
  show(name) {
    $all(".view").forEach((v) => (v.hidden = true));
    const el = document.getElementById(`view-${name}`);
    if (el) el.hidden = false;
    document.body.dataset.view = name;
    this.current = name;
  },
};

function populateSelect(sel, items, formatter) {
  sel.innerHTML = "";
  items.forEach((item) => {
    const opt = document.createElement("option");
    opt.value = item.value;
    opt.textContent = formatter(item);
    sel.appendChild(opt);
  });
}

function buildStaticSelects() {
  const langItems = LANGUAGES.map((l) => ({ value: l.code, label: l.label }));
  [$("#setup-language"), $("#set-language")].forEach((sel) =>
    populateSelect(sel, langItems, (i) => i.label)
  );

  const intervalItems = INTERVAL_OPTIONS.map((n) => ({ value: String(n), label: n === 1 ? "1 Minute" : `${n} Minutes` }));
  intervalItems.push({ value: "custom", label: "Custom" });
  [$("#setup-interval"), $("#set-interval")].forEach((sel) =>
    populateSelect(sel, intervalItems, (i) => i.label)
  );

  const speedItems = SPEED_OPTIONS.map((n) => ({ value: String(n), label: `${n.toFixed(1)}x` }));
  populateSelect($("#set-speed"), speedItems, (i) => i.label);
}

function applyPrefsToForm() {
  $("#setup-language").value = prefs.language;
  $("#set-language").value = prefs.language;
  $("#setup-interval").value = String(prefs.interval);
  $("#set-interval").value = String(prefs.interval);
  $("#set-custom-interval").value = prefs.customInterval;
  $("#custom-interval-field").hidden = prefs.interval !== "custom";
  $("#set-speed").value = String(prefs.rate);
  $("#set-wakelock").checked = prefs.wakeLock;
  $("#toggle-driving-mode").checked = prefs.drivingMode;
  document.body.dataset.driving = prefs.drivingMode ? "true" : "false";
  $("#wakelock-support-msg").textContent = ("wakeLock" in navigator)
    ? "Keeps the screen on while Talking Clock is active."
    : "Screen Wake Lock isn't supported on this browser — the screen may sleep normally.";
  updateMetaRow();
}

function updateMetaRow() {
  const langLabel = LANGUAGES.find((l) => l.code === prefs.language).label;
  const interval = prefs.interval === "custom" ? `${prefs.customInterval} Min` : `${prefs.interval} Minutes`;
  $("#meta-interval").textContent = `Every ${interval}`;
  $("#meta-language").textContent = langLabel;
}

/* ---------------------------------------------------------------------
   9. Trial pill + license screen rendering
   --------------------------------------------------------------------- */
function renderTrialPill() {
  const s = LicenseState.current;
  const pill = $("#trial-pill");
  if (s.state === "LICENSED") {
    pill.hidden = true;
    return;
  }
  pill.hidden = false;
  if (s.state === "TRIAL") {
    pill.className = "pill" + (s.daysRemaining <= 3 ? " warn" : "");
    pill.textContent = s.daysRemaining <= 0 ? "TRIAL ENDS TODAY" : `TRIAL • ${s.daysRemaining}D LEFT`;
  } else if (s.state === "OFFLINE_GRACE") {
    pill.className = "pill warn";
    pill.textContent = "OFFLINE — VERIFYING";
  } else {
    pill.className = "pill danger";
    pill.textContent = "EXPIRED";
  }
}

function renderLicenseScreen() {
  const s = LicenseState.current;
  const block = $("#license-status-block");
  const payBlock = $("#payment-block");
  block.innerHTML = "";

  if (s.state === "LICENSED") {
    payBlock.hidden = true;
    block.innerHTML = `
      <div class="status-card active">
        <div class="big-label">✓ LIFETIME LICENSE</div>
        <div class="label">Kapoore Art Talking Clock</div>
        <div class="label">Lifetime Access · ₹299 One-Time Payment</div>
        <div class="label">Validity: LIFETIME</div>
      </div>`;
    $("#btn-license-back").hidden = false;
    return;
  }

  if (s.state === "TRIAL" || s.state === "OFFLINE_GRACE") {
    payBlock.hidden = true;
    const days = s.daysRemaining ?? "—";
    block.innerHTML = `
      <div class="status-card">
        <div class="big-days">${days}</div>
        <div class="label">Day${days === 1 ? "" : "s"} remaining in your free trial</div>
        ${s.state === "OFFLINE_GRACE" ? '<div class="label">Verifying your license — you\'re still covered while offline.</div>' : ""}
      </div>`;
    $("#btn-license-back").hidden = false;
    return;
  }

  // EXPIRED / LICENSE_INVALID / NOT_ACTIVATED / PAYMENT_PENDING
  block.innerHTML = `
    <div class="status-card">
      <div class="big-label" style="color:var(--red)">Your 10-day free trial has expired.</div>
      <div class="label">Please activate a license to continue using Talking Clock.</div>
    </div>`;
  payBlock.hidden = false;
  $("#btn-license-back").hidden = true;
  renderQr();
}

function renderQr() {
  const holder = $("#qr-canvas-holder");
  holder.innerHTML = "";
  const p = CFG.payment;
  const upiUri = `upi://pay?pa=${encodeURIComponent(p.upiId)}&pn=${encodeURIComponent(p.merchantName)}&am=${p.amount}&cu=${p.currency}&tn=${encodeURIComponent(p.productName)}`;
  if (window.QRCode) {
    // eslint-disable-next-line no-new
    new window.QRCode(holder, { text: upiUri, width: 220, height: 220, colorDark: "#0a0c10", colorLight: "#ffffff" });
  } else {
    holder.textContent = "QR generator unavailable — pay via UPI ID below.";
  }
}

/* ---------------------------------------------------------------------
   10. Wiring: onboarding
   --------------------------------------------------------------------- */
function wireOnboarding() {
  if (isStandalone()) {
    // Already running as installed app — skip straight past onboarding.
    return false;
  }
  $("#btn-install-onboard").addEventListener("click", triggerInstall);
  $("#btn-continue-browser").addEventListener("click", () => proceedPastOnboarding());
  if (isIOS() && !("standalone" in navigator && navigator.standalone)) {
    $("#ios-install-hint").hidden = false;
  }
  return true;
}

function proceedPastOnboarding() {
  localStorage.setItem("kapoore_onboarded", "true");
  routeToNextView();
}

/* ---------------------------------------------------------------------
   11. Wiring: first-time setup
   --------------------------------------------------------------------- */
function wireSetup() {
  $("#setup-language").addEventListener("change", (e) => {
    prefs.language = e.target.value;
    populateVoiceSelects();
  });
  $("#btn-test-voice-setup").addEventListener("click", async () => {
    prefs.voiceURI = $("#setup-voice").value;
    const now = new Date();
    await speakTime(now.getHours(), now.getMinutes(), { isTest: true });
  });
  $("#setup-interval").addEventListener("change", (e) => { prefs.interval = e.target.value === "custom" ? "custom" : parseInt(e.target.value, 10); });
  $("#setup-voice").addEventListener("change", (e) => { prefs.voiceURI = e.target.value; });

  $("#btn-start-setup").addEventListener("click", () => {
    prefs.language = $("#setup-language").value;
    prefs.voiceURI = $("#setup-voice").value;
    const iv = $("#setup-interval").value;
    prefs.interval = iv === "custom" ? "custom" : parseInt(iv, 10);
    prefs.setupDone = true;
    savePrefs(prefs);
    Views.show("main");
    applyPrefsToForm();
  });
}

/* ---------------------------------------------------------------------
   12. Wiring: main screen
   --------------------------------------------------------------------- */
function wireMain() {
  $("#btn-settings").addEventListener("click", () => {
    $("#view-settings").hidden = false;
    populateVoiceSelects();
  });

  $("#btn-install-banner").addEventListener("click", triggerInstall);
  $("#btn-install-later").addEventListener("click", () => {
    localStorage.setItem("kapoore_install_dismissed", "true");
    $("#install-banner").hidden = true;
  });

  $("#toggle-driving-mode").addEventListener("change", (e) => {
    prefs.drivingMode = e.target.checked;
    document.body.dataset.driving = prefs.drivingMode ? "true" : "false";
    savePrefs(prefs);
  });

  $("#btn-start").addEventListener("click", async () => {
    if (!LicenseState.isUsable()) {
      Views.show("license");
      renderLicenseScreen();
      return;
    }
    $("#speech-hint").hidden = true;
    Clock.start();
    await acquireWakeLock();
    await KeepAlive.start();
    $("#btn-start").hidden = true;
    $("#btn-stop").hidden = false;
    $("#status-text").textContent = "● TALKING CLOCK ACTIVE";
    // Confirm speech engine responds to this user gesture.
    if ("speechSynthesis" in window) window.speechSynthesis.resume();
  });

  $("#btn-stop").addEventListener("click", () => {
    Clock.stop();
    releaseWakeLock();
    KeepAlive.stop();
    $("#btn-start").hidden = false;
    $("#btn-stop").hidden = true;
    $("#status-text").textContent = "TALKING CLOCK READY";
  });
}

/* ---------------------------------------------------------------------
   13. Wiring: settings overlay
   --------------------------------------------------------------------- */
function wireSettings() {
  $("#btn-close-settings").addEventListener("click", () => { $("#view-settings").hidden = true; });

  $("#set-language").addEventListener("change", () => {
    populateVoiceSelects();
  });
  $("#set-interval").addEventListener("change", (e) => {
    $("#custom-interval-field").hidden = e.target.value !== "custom";
  });
  $("#btn-test-voice").addEventListener("click", async () => {
    const now = new Date();
    const savedLang = prefs.language, savedVoice = prefs.voiceURI, savedRate = prefs.rate;
    prefs.language = $("#set-language").value;
    prefs.voiceURI = $("#set-voice").value;
    prefs.rate = parseFloat($("#set-speed").value);
    $("#voice-msg").textContent = "";
    const ok = await speakTime(now.getHours(), now.getMinutes(), { isTest: true });
    if (ok) $("#voice-msg").textContent = "Voice test played.";
    prefs.language = savedLang; prefs.voiceURI = savedVoice; prefs.rate = savedRate;
  });

  $("#set-wakelock").addEventListener("change", (e) => { prefs.wakeLock = e.target.checked; });

  $("#btn-open-license").addEventListener("click", () => {
    $("#view-settings").hidden = true;
    Views.show("license");
    renderLicenseScreen();
  });

  $("#btn-save-settings").addEventListener("click", () => {
    prefs.language = $("#set-language").value;
    prefs.voiceURI = $("#set-voice").value;
    prefs.rate = parseFloat($("#set-speed").value);
    const iv = $("#set-interval").value;
    prefs.interval = iv === "custom" ? "custom" : parseInt(iv, 10);
    prefs.customInterval = parseInt($("#set-custom-interval").value, 10) || 5;
    prefs.wakeLock = $("#set-wakelock").checked;
    savePrefs(prefs);
    updateMetaRow();
    $("#view-settings").hidden = true;
    toast("Settings saved");
    // If running, re-align the next announcement to the (possibly) new interval.
    if (Clock.isRunning()) { Clock.stop(); Clock.start(); }
  });
}

/* ---------------------------------------------------------------------
   14. Wiring: license / payment screen
   --------------------------------------------------------------------- */
let selectedReceiptFile = null;

function wireLicense() {
  $("#btn-license-back").addEventListener("click", () => Views.show("main"));

  $("#btn-download-qr").addEventListener("click", () => {
    const canvas = $("#qr-canvas-holder canvas");
    if (!canvas) { toast("QR not ready yet"); return; }
    const link = document.createElement("a");
    link.download = "kapoore-art-payment-qr.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  });

  $("#btn-choose-receipt").addEventListener("click", () => $("#receipt-file").click());
  $("#receipt-file").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const okTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "application/pdf"];
    if (!okTypes.includes(file.type)) {
      toast("Unsupported file type. Use JPG, PNG, WEBP, or PDF.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast("File too large (max 8MB).");
      return;
    }
    selectedReceiptFile = file;
    $("#receipt-filename").textContent = file.name;
    if (file.type.startsWith("image/")) {
      $("#receipt-preview").src = URL.createObjectURL(file);
      $("#receipt-preview").hidden = false;
    } else {
      $("#receipt-preview").hidden = true;
    }
  });

  $("#btn-upload-receipt").addEventListener("click", async () => {
    if (!selectedReceiptFile) { toast("Choose a receipt file first."); return; }
    const statusEl = $("#receipt-status");
    statusEl.textContent = "Uploading…";
    try {
      const form = new FormData();
      form.append("deviceId", getDeviceId());
      form.append("email", $("#receipt-email").value || "");
      form.append("receipt", selectedReceiptFile);
      const res = await fetch(CFG.backendApiUrl + "/receipt/upload", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "Upload failed");
      statusEl.textContent = "Payment receipt submitted successfully. Your payment will be verified and your Lifetime License will be activated.";
    } catch (e) {
      statusEl.textContent = "Receipt upload failed. Please try again.";
    }
  });

  $("#btn-activate-license").addEventListener("click", async () => {
    const code = $("#license-code-input").value.trim();
    const statusEl = $("#activate-status");
    if (!code) { statusEl.textContent = "Enter a license code."; return; }
    statusEl.textContent = "Validating…";
    try {
      const result = await LicenseState.activate(code);
      if (result.success) {
        statusEl.textContent = `License Activated Successfully. Valid Until: ${result.license.expiresAtLabel || "Lifetime"}`;
        toast("License Activated Successfully");
        renderTrialPill();
        setTimeout(() => Views.show("main"), 1200);
      } else {
        statusEl.textContent = result.message || "This license is invalid or has expired.";
      }
    } catch (e) {
      statusEl.textContent = "Unable to verify license right now. Please check your internet connection.";
    }
  });
}

/* ---------------------------------------------------------------------
   15. Routing / boot
   --------------------------------------------------------------------- */
function routeToNextView() {
  if (!LicenseState.isUsable()) {
    Views.show("license");
    renderLicenseScreen();
    return;
  }
  if (!prefs.setupDone) {
    Views.show("setup");
    populateVoiceSelects();
    return;
  }
  Views.show("main");
  applyPrefsToForm();
}

async function boot() {
  buildStaticSelects();
  refreshVoiceList();
  populateVoiceSelects();
  applyPrefsToForm();
  KeepAlive.init();

  wireOnboarding();
  wireSetup();
  wireMain();
  wireSettings();
  wireLicense();

  await LicenseState.refresh();
  renderTrialPill();

  const onboarded = localStorage.getItem("kapoore_onboarded") === "true";
  if (!onboarded && !isStandalone()) {
    Views.show("onboarding");
  } else {
    routeToNextView();
  }

  // Periodic license re-check (per integration kit: ~12h interval, handled
  // server-side; client just asks again on interval + focus).
  setInterval(() => LicenseState.refresh().then(renderTrialPill), 60 * 60 * 1000);
  window.addEventListener("focus", () => LicenseState.refresh().then(renderTrialPill));

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("service-worker.js").catch(() => {});
  }
}

document.addEventListener("DOMContentLoaded", boot);
