# 🔑 Gmail OTP Fast Copier (instantOTP)

> A modern, lightning-fast **Chrome Extension (Manifest V3)** that automatically detects incoming OTPs, 2FA security codes, and verification numbers from your Gmail and allows **instant 1-click clipboard copying** with native desktop notifications.

![Chrome Manifest V3](https://img.shields.io/badge/Chrome_Extension-Manifest_V3-blue?style=for-the-badge&logo=googlechrome)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)
![JavaScript](https://img.shields.io/badge/Language-JavaScript-yellow?style=for-the-badge&logo=javascript)

---

## ✨ Features

- ⚡ **Real-Time OTP Extraction**: Advanced parsing engine supporting 4 to 8 digit numeric (`123456`, `849-102`) and alphanumeric (`X7K9-2P`) verification codes.
- 📋 **1-Click Copy**: Instant **"Copy Code"** button on native Chrome desktop notifications and in the popup UI with animated `Copied!` checkmark feedback.
- 🔔 **Desktop Alerts**: Native browser popup notifications trigger the moment a code arrives in Gmail.
- 🎨 **Modern Glassmorphic UI**: Built with a sleek dark glassmorphism design, Inter/Outfit typography, live search, and relative timestamps.
- 🔊 **Sound Alerts**: Optional audio chime toggle for incoming OTP alerts.
- ⚙️ **Full Customization**: Configure polling intervals (10s, 15s, 30s, 60s), auto-copy behavior, and custom regex keywords via the Settings page.
- 🔒 **Zero Setup & 100% Private**: Works automatically using your active logged-in Gmail browser session—no Google Cloud API keys or complex OAuth setup required.

---

## 📸 Extension Preview

```
┌────────────────────────────────────────────────────────┐
│  🔑 Gmail OTP Copier                   [●] Active      │
├────────────────────────────────────────────────────────┤
│  [🔊 Sound Alert: ON]           [📋 Auto-Copy: OFF]    │
├────────────────────────────────────────────────────────┤
│  🔍 Search OTPs or services...                         │
├────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────┐  │
│  │ 🌐 Google                              Just now  │  │
│  │ Code: 492018              [ 📋 Copy ]           │  │
│  │ "492018 is your Google verification code..."     │  │
│  └──────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────┐  │
│  │ 📦 Amazon                              2m ago    │  │
│  │ Code: 849102              [ 📋 Copy ]           │  │
│  │ "Use code 849-102 to complete your sign-in..."   │  │
│  └──────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Installation Guide

1. Clone or download this repository:
   ```bash
   git clone https://github.com/naveengouda091/instantOTP.git
   ```
2. Open **Google Chrome** and navigate to:
   ```
   chrome://extensions
   ```
3. Enable **Developer mode** using the toggle in the top-right corner.
4. Click **Load unpacked** in the top-left corner.
5. Select the `instantOTP` project folder.
6. Pin **Gmail OTP Fast Copier** 🔑 to your Chrome toolbar!

---

## 🛠️ How It Works (Architecture)

1. **Gmail Feed Listener (`background.js`)**:
   Periodically checks `https://mail.google.com/mail/feed/atom` in the background using your active Chrome Gmail session cookies.
2. **Gmail DOM Observer (`gmail_content.js`)**:
   Runs inside open Gmail tabs (`mail.google.com`) using `MutationObserver` for sub-second, real-time OTP capture.
3. **Smart OTP Parser (`otp_parser.js`)**:
   Uses pattern matching and keyword proximity scoring to accurately extract verification codes while ignoring false positives like years (`2026`), postal codes, or order IDs.
4. **Offscreen Clipboard Manager (`offscreen.js`)**:
   Manifest V3 offscreen API handler ensuring reliable system clipboard writing and audio playback.

---

## 🧪 Running Local Tests

You can test the OTP parsing logic against sample emails (Google, Amazon, GitHub, Microsoft, Uber, Discord, etc.) locally:

```bash
node test_otp_parser.js
```

---

## 📜 License

Distributed under the MIT License. See `LICENSE` for details.
