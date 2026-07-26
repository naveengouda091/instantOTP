/**
 * Gmail OTP Fast Copier - Popup Controller
 * Manages OTP listing, search filtering, 1-click clipboard copy, and settings sync.
 */

document.addEventListener('DOMContentLoaded', () => {
  const otpListElem = document.getElementById('otp-list');
  const emptyStateElem = document.getElementById('empty-state');
  const searchInput = document.getElementById('search-input');
  const refreshBtn = document.getElementById('btn-refresh');
  const toggleSound = document.getElementById('toggle-sound');
  const toggleAutoCopy = document.getElementById('toggle-autocopy');
  const toastElem = document.getElementById('toast');
  const toastMessage = document.getElementById('toast-message');
  const optionsBtn = document.getElementById('btn-options');

  let currentOTPs = [];

  // Load initial settings and OTPs
  loadSettings();
  loadOTPs();

  // Storage listener for live updates when background service adds an OTP
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local') {
      if (changes.otps) {
        currentOTPs = changes.otps.newValue || [];
        renderOTPs(currentOTPs, searchInput.value);
      }
      if (changes.settings) {
        updateToggleStates(changes.settings.newValue);
      }
    }
  });

  // Toggle Controls listeners
  toggleSound.addEventListener('change', (e) => {
    updateSetting('soundEnabled', e.target.checked);
  });

  toggleAutoCopy.addEventListener('change', (e) => {
    updateSetting('autoCopy', e.target.checked);
  });

  // Search Filter
  searchInput.addEventListener('input', (e) => {
    renderOTPs(currentOTPs, e.target.value);
  });

  // Refresh Feed
  refreshBtn.addEventListener('click', () => {
    refreshBtn.querySelector('.spin-icon').classList.add('spinning');
    chrome.runtime.sendMessage({ type: 'REFRESH_GMAIL' }, () => {
      setTimeout(() => {
        refreshBtn.querySelector('.spin-icon').classList.remove('spinning');
        loadOTPs();
        showToast('Gmail feed refreshed!');
      }, 600);
    });
  });

  // Options Page link
  if (optionsBtn) {
    optionsBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (chrome.runtime.openOptionsPage) {
        chrome.runtime.openOptionsPage();
      } else {
        window.open(chrome.runtime.getURL('options.html'));
      }
    });
  }

  function loadSettings() {
    chrome.storage.local.get(['settings'], (res) => {
      const settings = res.settings || { soundEnabled: false, autoCopy: false };
      updateToggleStates(settings);
    });
  }

  function updateToggleStates(settings) {
    toggleSound.checked = !!settings.soundEnabled;
    toggleAutoCopy.checked = !!settings.autoCopy;
  }

  function updateSetting(key, val) {
    chrome.storage.local.get(['settings'], (res) => {
      const settings = res.settings || {};
      settings[key] = val;
      chrome.storage.local.set({ settings });
    });
  }

  function loadOTPs() {
    chrome.storage.local.get(['otps'], (res) => {
      currentOTPs = res.otps || [];
      renderOTPs(currentOTPs, searchInput.value);
    });
  }

  function renderOTPs(otps, filterText = '') {
    otpListElem.innerHTML = '';

    const query = filterText.trim().toLowerCase();
    const filtered = otps.filter(o => {
      return (
        o.service.toLowerCase().includes(query) ||
        o.code.toLowerCase().includes(query) ||
        (o.subject && o.subject.toLowerCase().includes(query)) ||
        (o.sender && o.sender.toLowerCase().includes(query))
      );
    });

    if (filtered.length === 0) {
      emptyStateElem.classList.remove('hidden');
      return;
    }

    emptyStateElem.classList.add('hidden');

    filtered.forEach((otp) => {
      const card = document.createElement('div');
      card.className = 'otp-card';

      const timeAgoStr = formatTimeAgo(otp.timestamp);
      const iconLetter = otp.service.charAt(0).toUpperCase();

      card.innerHTML = `
        <div class="otp-card-header">
          <div class="service-badge">
            <span class="service-icon">${iconLetter}</span>
            <span>${escapeHTML(otp.service)}</span>
          </div>
          <span class="time-ago">${timeAgoStr}</span>
        </div>
        <div class="otp-code-row">
          <span class="code-value">${escapeHTML(otp.code)}</span>
          <button class="btn-copy" data-code="${escapeHTML(otp.code)}">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"></path>
            </svg>
            <span>Copy</span>
          </button>
        </div>
        <div class="email-snippet" title="${escapeHTML(otp.subject)}">
          ${escapeHTML(otp.subject || otp.snippet)}
        </div>
      `;

      // 1-Click Copy Click Handler
      const copyBtn = card.querySelector('.btn-copy');
      copyBtn.addEventListener('click', () => {
        executeCopy(otp.code, copyBtn);
      });

      otpListElem.appendChild(card);
    });
  }

  function executeCopy(code, btnElem) {
    navigator.clipboard.writeText(code).then(() => {
      onCopySuccess(code, btnElem);
    }).catch(() => {
      // Offscreen fallback via background script
      chrome.runtime.sendMessage({ type: 'COPY_TEXT', text: code }, (res) => {
        onCopySuccess(code, btnElem);
      });
    });
  }

  function onCopySuccess(code, btnElem) {
    btnElem.classList.add('copied');
    btnElem.innerHTML = `
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
      <span>Copied!</span>
    `;

    showToast(`Code '${code}' copied to clipboard!`);

    setTimeout(() => {
      btnElem.classList.remove('copied');
      btnElem.innerHTML = `
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
          <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"></path>
        </svg>
        <span>Copy</span>
      `;
    }, 2000);
  }

  function showToast(msg) {
    toastMessage.textContent = msg;
    toastElem.classList.remove('hidden');
    setTimeout(() => {
      toastElem.classList.add('hidden');
    }, 2200);
  }

  function formatTimeAgo(timestamp) {
    if (!timestamp) return 'Just now';
    const elapsedSecs = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
    if (elapsedSecs < 60) return 'Just now';
    if (elapsedSecs < 3600) return `${Math.floor(elapsedSecs / 60)}m ago`;
    if (elapsedSecs < 86400) return `${Math.floor(elapsedSecs / 3600)}h ago`;
    return `${Math.floor(elapsedSecs / 86400)}d ago`;
  }

  function escapeHTML(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
});
