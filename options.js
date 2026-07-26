/**
 * Gmail OTP Fast Copier - Options Controller
 */

document.addEventListener('DOMContentLoaded', () => {
  const optAutoCopy = document.getElementById('opt-autocopy');
  const optSound = document.getElementById('opt-sound');
  const optInterval = document.getElementById('opt-interval');
  const optKeywords = document.getElementById('opt-keywords');
  const btnSave = document.getElementById('btn-save');
  const btnClearHistory = document.getElementById('btn-clear-history');
  const saveMsg = document.getElementById('save-msg');

  // Load existing settings
  chrome.storage.local.get(['settings'], (res) => {
    const s = res.settings || {};
    optAutoCopy.checked = !!s.autoCopy;
    optSound.checked = !!s.soundEnabled;
    if (s.pollingInterval) optInterval.value = s.pollingInterval;
    if (s.customKeywords) optKeywords.value = s.customKeywords.join(', ');
  });

  // Save Settings
  btnSave.addEventListener('click', () => {
    const rawKw = optKeywords.value || '';
    const keywordsArr = rawKw.split(',').map(k => k.trim()).filter(Boolean);

    const updatedSettings = {
      autoCopy: optAutoCopy.checked,
      soundEnabled: optSound.checked,
      pollingInterval: parseInt(optInterval.value, 10) || 15,
      customKeywords: keywordsArr
    };

    chrome.storage.local.set({ settings: updatedSettings }, () => {
      saveMsg.classList.remove('hidden');
      setTimeout(() => {
        saveMsg.classList.add('hidden');
      }, 2000);
    });
  });

  // Clear History
  btnClearHistory.addEventListener('click', () => {
    if (confirm('Are you sure you want to clear all saved OTP history?')) {
      chrome.storage.local.set({ otps: [], processedIds: [] }, () => {
        alert('OTP history cleared successfully.');
      });
    }
  });
});
