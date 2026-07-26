/**
 * Gmail OTP Fast Copier - Background Service Worker
 * Periodically checks Gmail atom feed, processes incoming DOM notifications,
 * extracts OTPs, stores them, and manages Chrome Desktop Notifications.
 */

import { parseOTP } from './otp_parser.js';

const ALARM_NAME = 'gmail_otp_check';
const POLLING_INTERVAL_MINUTES = 0.25; // Check every 15 seconds

// Initialize extension state and alarms on startup / install
chrome.runtime.onInstalled.addListener(() => {
  console.log('[Background] Gmail OTP Fast Copier installed');
  setupDefaults();
  createAlarm();
  checkGmailFeed();
});

chrome.runtime.onStartup.addListener(() => {
  console.log('[Background] Chrome started - checking Gmail feed');
  createAlarm();
  checkGmailFeed();
});

function setupDefaults() {
  chrome.storage.local.get(['settings', 'otps', 'processedIds'], (res) => {
    const settings = res.settings || {
      autoCopy: false,          // 1-click copy by default per user request
      soundEnabled: false,      // Sound off by default (user preference)
      pollingInterval: 15,      // Seconds
      autoClearMinutes: 5       // Clear OTP from storage after X mins
    };
    const otps = res.otps || [];
    const processedIds = res.processedIds || [];

    chrome.storage.local.set({ settings, otps, processedIds });
  });
}

function createAlarm() {
  chrome.alarms.get(ALARM_NAME, (alarm) => {
    if (!alarm) {
      chrome.alarms.create(ALARM_NAME, { periodInMinutes: POLLING_INTERVAL_MINUTES });
    }
  });
}

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) {
    checkGmailFeed();
  }
});

/**
 * Fetches Gmail Atom XML Feed using user's active session cookies
 */
async function checkGmailFeed() {
  try {
    const response = await fetch('https://mail.google.com/mail/feed/atom', {
      credentials: 'include',
      headers: { 'Cache-Control': 'no-cache' }
    });

    if (!response.ok) {
      console.warn('[Background] Gmail Feed returned status:', response.status);
      return;
    }

    const xmlText = await response.text();
    processGmailXML(xmlText);
  } catch (err) {
    console.error('[Background] Failed to fetch Gmail feed:', err);
  }
}

/**
 * Parses Gmail Feed XML entries and extracts OTP codes
 */
function processGmailXML(xmlText) {
  // Regex extraction for XML entries without DOMParser dependency in service worker
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/gi;
  let match;

  while ((match = entryRegex.exec(xmlText)) !== null) {
    const entryXml = match[1];

    const id = getXmlValue(entryXml, 'id');
    const title = getXmlValue(entryXml, 'title');
    const summary = getXmlValue(entryXml, 'summary');
    const issued = getXmlValue(entryXml, 'issued');
    const authorName = getXmlValue(entryXml, 'name');
    const authorEmail = getXmlValue(entryXml, 'email');

    const emailObj = {
      id: id || `atom_${Date.now()}_${Math.random()}`,
      subject: title,
      snippet: summary,
      sender: `${authorName} <${authorEmail}>`,
      date: issued ? new Date(issued).getTime() : Date.now()
    };

    handleNewEmail(emailObj);
  }
}

function getXmlValue(xml, tag) {
  const reg = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const m = xml.match(reg);
  return m ? decodeHTMLEntities(m[1].trim()) : '';
}

function decodeHTMLEntities(str) {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

/**
 * Processes an email object, checks if OTP exists, stores it & notifies user
 */
function handleNewEmail(email) {
  chrome.storage.local.get(['processedIds', 'otps', 'settings'], (res) => {
    const processedIds = new Set(res.processedIds || []);
    if (processedIds.has(email.id)) {
      return; // Already processed
    }

    const otpResult = parseOTP(email);
    if (otpResult) {
      processedIds.add(email.id);

      const otps = res.otps || [];
      // Avoid duplicate codes received within 60 seconds
      const existsRecent = otps.some(o => o.code === otpResult.code && (Date.now() - o.timestamp) < 60000);

      if (!existsRecent) {
        otps.unshift(otpResult); // Newest at top
        const trimmedOTPs = otps.slice(0, 30); // Keep max 30 recent OTPs

        chrome.storage.local.set({
          otps: trimmedOTPs,
          processedIds: Array.from(processedIds)
        });

        // Trigger Notification & Action
        triggerOTPNotification(otpResult, res.settings || {});
      }
    } else {
      // Mark non-OTP email as processed so we don't scan it repeatedly
      processedIds.add(email.id);
      chrome.storage.local.set({ processedIds: Array.from(processedIds) });
    }
  });
}

/**
 * Triggers Chrome Desktop Notification with 1-Click Copy action button
 */
function triggerOTPNotification(otp, settings) {
  const notificationId = `otp_notif_${otp.id}`;

  const options = {
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title: `🔑 ${otp.service} OTP Code: ${otp.code}`,
    message: `${otp.subject}\nClick 'Copy Code' to copy to clipboard!`,
    priority: 2,
    requireInteraction: true,
    buttons: [
      { title: '📋 Copy Code' },
      { title: 'Dismiss' }
    ]
  };

  chrome.notifications.create(notificationId, options);

  // If sound is enabled in settings
  if (settings.soundEnabled) {
    playNotificationSound();
  }
}

// Notification button click handler
chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
  if (buttonIndex === 0) {
    // "Copy Code" clicked
    chrome.storage.local.get(['otps'], (res) => {
      const otps = res.otps || [];
      const otp = otps.find(o => notificationId.includes(o.id)) || otps[0];
      if (otp) {
        copyToClipboard(otp.code);
        chrome.notifications.update(notificationId, {
          title: `✅ Copied Code ${otp.code}!`,
          message: `OTP copied to clipboard successfully.`
        });
        setTimeout(() => chrome.notifications.clear(notificationId), 2500);
      }
    });
  } else {
    chrome.notifications.clear(notificationId);
  }
});

// Helper: Copy code to clipboard from background worker offscreen / navigator.clipboard
async function copyToClipboard(text) {
  try {
    // Send to active tab or write offscreen
    await createOffscreenDocument();
    chrome.runtime.sendMessage({ type: 'OFFSCREEN_COPY', text: text });
  } catch (e) {
    console.warn('[Background] Offscreen clipboard fallback:', e);
  }
}

async function createOffscreenDocument() {
  if (await chrome.offscreen.hasDocument()) return;
  await chrome.offscreen.createDocument({
    url: 'offscreen.html',
    reasons: ['CLIPBOARD'],
    justification: 'Copy OTP code to system clipboard on user notification action'
  });
}

function playNotificationSound() {
  // Notification audio triggered via offscreen document or popup
  createOffscreenDocument().then(() => {
    chrome.runtime.sendMessage({ type: 'PLAY_SOUND' });
  }).catch(() => {});
}

// Message Listener from Popup / Content Scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'REFRESH_GMAIL') {
    checkGmailFeed().then(() => sendResponse({ status: 'ok' }));
    return true;
  }

  if (message.type === 'GMAIL_DOM_EMAIL') {
    if (message.email) {
      handleNewEmail(message.email);
      sendResponse({ status: 'received' });
    }
    return true;
  }

  if (message.type === 'COPY_TEXT') {
    copyToClipboard(message.text).then(() => sendResponse({ success: true }));
    return true;
  }
});
