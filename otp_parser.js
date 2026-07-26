/**
 * Gmail OTP Fast Copier - OTP Parser Engine
 * Analyzes email subjects, sender info, and body snippets to accurately extract One-Time Passwords (OTPs).
 */

const KEYWORDS = [
  'otp', 'verification', 'verify', 'verification code', 'security code',
  'confirmation code', 'passcode', 'pin', 'login code', 'one-time',
  'two-factor', '2fa', 'mfa', 'auth code', 'authorization code',
  'access code', 'secret code', 'reset code', 'security pin'
];

const COMMON_WORDS_TO_IGNORE = new Set([
  'code', 'codes', 'verification', 'security', 'account', 'google', 'amazon',
  'github', 'microsoft', 'device', 'login', 'access', 'number', 'system',
  'please', 'service', 'secret', 'sign-in', 'signin', 'passcode', 'password',
  'authentication', 'location', 'detected'
]);

const KNOWN_SERVICES = [
  { name: 'Google', pattern: /google/i },
  { name: 'Microsoft', pattern: /microsoft/i },
  { name: 'GitHub', pattern: /github/i },
  { name: 'Amazon', pattern: /amazon/i },
  { name: 'Apple', pattern: /apple/i },
  { name: 'Discord', pattern: /discord/i },
  { name: 'Steam', pattern: /steam/i },
  { name: 'PayPal', pattern: /paypal/i },
  { name: 'Uber', pattern: /uber/i },
  { name: 'LinkedIn', pattern: /linkedin/i },
  { name: 'Facebook', pattern: /facebook/i },
  { name: 'Instagram', pattern: /instagram/i },
  { name: 'Twitter / X', pattern: /(twitter|x\.com)/i },
  { name: 'Slack', pattern: /slack/i },
  { name: 'Stripe', pattern: /stripe/i },
  { name: 'Binance', pattern: /binance/i },
  { name: 'Coinbase', pattern: /coinbase/i },
  { name: 'Netflix', pattern: /netflix/i },
  { name: 'Spotify', pattern: /spotify/i }
];

// Targeted Regex Patterns
// Pattern 1: Pure digits (4 to 8 digits, optional dash/space in middle e.g. 123-456, 849-102)
const PATTERN_DIGITS = /\b(\d{4,8}|\d{2,5}[-\s]\d{2,5})\b/g;

// Pattern 2: Explicit OTP prefixes e.g. "code is 123456", "OTP: 123456", "passcode is X7K9-2P", "code is X7K92P"
const PATTERN_EXPLICIT_PREFIX = /(?:code|otp|pin|passcode|verification|security|confirmation|token|secret)\s*(?:is|:|;|=|-|\s)\s*([A-Za-z0-9]{2,6}[-\s]?[A-Za-z0-9]{2,6})\b/gi;

// Pattern 3: "Use 123456 to", "Enter 123456", "123456 is your"
const PATTERN_CONTEXTUAL = /(?:use|enter|input|your|is)\s+([A-Za-z0-9]{2,6}[-\s]?[A-Za-z0-9]{2,6})\b/gi;

/**
 * Parses an email entry and returns an OTP extraction result object if valid.
 * @param {Object} email - { id, subject, sender, body, snippet, date }
 * @returns {Object|null} Result object or null if no valid OTP detected
 */
export function parseOTP(email) {
  if (!email) return null;

  const subject = email.subject || '';
  const body = email.snippet || email.body || '';
  const sender = email.sender || email.from || '';
  const fullText = `${subject} ${body}`;

  // Step 1: Check context keywords
  const textLower = fullText.toLowerCase();
  const matchedKeyword = KEYWORDS.find(kw => textLower.includes(kw));

  if (!matchedKeyword && !/code|otp|pin/i.test(subject)) {
    return null;
  }

  // Step 2: Service / app detection
  const serviceName = detectService(sender, subject, body);

  // Step 3: Extract candidate codes
  const candidates = [];

  // Match explicit prefixes first (highest accuracy: 0.95 base score)
  let prefixMatch;
  const prefixRegex = new RegExp(PATTERN_EXPLICIT_PREFIX.source, PATTERN_EXPLICIT_PREFIX.flags);
  while ((prefixMatch = prefixRegex.exec(fullText)) !== null) {
    if (prefixMatch[1]) {
      addCandidate(candidates, prefixMatch[1], fullText, matchedKeyword, 0.95, true);
    }
  }

  // Match digit sequences (base score: 0.75)
  let digitMatch;
  const digitRegex = new RegExp(PATTERN_DIGITS.source, PATTERN_DIGITS.flags);
  while ((digitMatch = digitRegex.exec(fullText)) !== null) {
    if (digitMatch[1]) {
      addCandidate(candidates, digitMatch[1], fullText, matchedKeyword, 0.75, false);
    }
  }

  // Match contextual sequences
  let contextMatch;
  const contextRegex = new RegExp(PATTERN_CONTEXTUAL.source, PATTERN_CONTEXTUAL.flags);
  while ((contextMatch = contextRegex.exec(fullText)) !== null) {
    if (contextMatch[1]) {
      addCandidate(candidates, contextMatch[1], fullText, matchedKeyword, 0.8, false);
    }
  }

  // Filter out invalid candidates and common words
  const validCandidates = candidates.filter(c => isValidOTP(c.code, c.rawText, c.isExplicit));

  if (validCandidates.length === 0) return null;

  // Deduplicate and pick highest scoring candidate
  validCandidates.sort((a, b) => b.score - a.score);
  const best = validCandidates[0];

  return {
    id: email.id || `otp_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    code: best.code,
    rawCode: best.rawText,
    service: serviceName,
    sender: sender,
    subject: subject,
    snippet: body.substring(0, 150),
    confidence: Math.round(best.score * 100),
    timestamp: email.date || Date.now(),
    isRead: false
  };
}

function detectService(sender, subject, body) {
  const combined = `${sender} ${subject} ${body}`;
  for (const item of KNOWN_SERVICES) {
    if (item.pattern.test(combined)) {
      return item.name;
    }
  }

  if (sender) {
    const nameMatch = sender.match(/^"?([^"<]+)"?\s*</);
    if (nameMatch && nameMatch[1].trim()) {
      return nameMatch[1].trim();
    }
    const domainMatch = sender.match(/@([\w.-]+)/);
    if (domainMatch && domainMatch[1]) {
      const parts = domainMatch[1].split('.');
      if (parts.length >= 2) {
        const mainName = parts[parts.length - 2];
        return mainName.charAt(0).toUpperCase() + mainName.slice(1);
      }
    }
  }

  return 'Verification Service';
}

function addCandidate(candidates, rawVal, fullText, matchedKeyword, baseScore, isExplicit) {
  if (!rawVal) return;
  const cleanCode = rawVal.replace(/[-\s]/g, '');

  if (cleanCode.length < 4 || cleanCode.length > 8) return;

  // If already exists, update & boost score
  const existing = candidates.find(c => c.code === cleanCode);
  if (existing) {
    existing.score = Math.min(existing.score + 0.15, 1.0);
    if (isExplicit) existing.isExplicit = true;
    return;
  }

  let score = baseScore;

  if (/^\d+$/.test(cleanCode)) {
    score += 0.05;
    if (cleanCode.length === 6) score += 0.1;
  } else if (/[A-Z]/.test(cleanCode) && /\d/.test(cleanCode)) {
    score += 0.1;
  }

  // Check keyword proximity
  const lowerText = fullText.toLowerCase();
  const codeIdx = lowerText.indexOf(rawVal.toLowerCase());
  if (codeIdx !== -1 && matchedKeyword) {
    const kwIdx = lowerText.indexOf(matchedKeyword.toLowerCase());
    if (Math.abs(codeIdx - kwIdx) < 40) {
      score += 0.1;
    }
  }

  candidates.push({
    code: cleanCode,
    rawText: rawVal,
    score: Math.min(score, 1.0),
    isExplicit: !!isExplicit
  });
}

function isValidOTP(code, rawText, isExplicit) {
  const codeLower = code.toLowerCase();

  // Reject dictionary words / common words
  if (COMMON_WORDS_TO_IGNORE.has(codeLower)) return false;

  if (/^[a-zA-Z]+$/.test(code)) {
    if (code !== code.toUpperCase()) return false;
  }

  // If NOT explicitly prefixed, reject suspicious standalone year digits 2020-2029
  if (!isExplicit) {
    if (/^202[0-9]$/.test(code)) return false;
  }

  // Reject repeating single digit like 0000, 111111
  if (/^(\d)\1+$/.test(code)) return false;

  // Reject trivial sequences
  if (code === '1234' || code === '123456' || code === '654321' || code === '012345') return false;

  return true;
}
