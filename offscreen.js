chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'OFFSCREEN_COPY') {
    copyText(message.text);
  } else if (message.type === 'PLAY_SOUND') {
    playSound();
  }
});

function copyText(text) {
  const textarea = document.getElementById('copy-area');
  if (!textarea) return;
  textarea.value = text;
  textarea.select();
  document.execCommand('copy');
  console.log('[Offscreen] Copied code to clipboard:', text);
}

function playSound() {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, audioContext.currentTime); // D5 note
    osc.frequency.exponentialRampToValueAtTime(880, audioContext.currentTime + 0.15); // A5 note

    gain.gain.setValueAtTime(0.3, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

    osc.connect(gain);
    gain.connect(audioContext.destination);

    osc.start();
    osc.stop(audioContext.currentTime + 0.3);
  } catch (e) {
    console.warn('[Offscreen] Sound play error:', e);
  }
}
