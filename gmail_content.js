/**
 * Gmail OTP Fast Copier - Content Script
 * Runs inside mail.google.com to detect incoming unread emails in real-time.
 */

console.log('[Gmail OTP Fast Copier] Content script loaded on Gmail');

let scannedEmailIds = new Set();

// Observe Gmail inbox changes
function initObserver() {
  const observer = new MutationObserver((mutations) => {
    scanGmailDOM();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  // Initial scan
  scanGmailDOM();
}

function scanGmailDOM() {
  // Gmail unread rows usually have class 'zE' or 'zA'
  const emailRows = document.querySelectorAll('tr.zA');
  if (!emailRows || emailRows.length === 0) return;

  emailRows.forEach((row) => {
    // Check if unread or recent
    const isUnread = row.classList.contains('zE');
    if (!isUnread) return;

    const rowId = row.getAttribute('id') || row.innerText.substring(0, 30);
    if (scannedEmailIds.has(rowId)) return;

    scannedEmailIds.add(rowId);

    // Extract elements
    const senderElem = row.querySelector('.zF, .yW span, [email]');
    const subjectElem = row.querySelector('.bog, .y6 span');
    const snippetElem = row.querySelector('.y2');

    const sender = senderElem ? (senderElem.getAttribute('email') || senderElem.innerText) : '';
    const subject = subjectElem ? subjectElem.innerText : '';
    const snippet = snippetElem ? snippetElem.innerText : '';

    if (subject || snippet) {
      const emailData = {
        id: `dom_${rowId}_${Date.now()}`,
        sender: sender,
        subject: subject,
        snippet: snippet,
        date: Date.now()
      };

      chrome.runtime.sendMessage({
        type: 'GMAIL_DOM_EMAIL',
        email: emailData
      });
    }
  });
}

// Start watching after idle
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  initObserver();
} else {
  document.addEventListener('DOMContentLoaded', initObserver);
}
