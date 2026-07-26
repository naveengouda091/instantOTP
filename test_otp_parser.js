import { parseOTP } from './otp_parser.js';

const testCases = [
  {
    name: 'Google Verification Code',
    email: {
      sender: 'Google <no-reply@accounts.google.com>',
      subject: 'Google Verification Code',
      snippet: '492018 is your Google verification code. Do not share it with anyone.'
    },
    expectedCode: '492018',
    expectedService: 'Google'
  },
  {
    name: 'Amazon Security OTP',
    email: {
      sender: 'Amazon <account-update@amazon.com>',
      subject: 'Your Amazon security code',
      snippet: 'Use code 849-102 to complete your Amazon sign-in. This code will expire in 10 minutes.'
    },
    expectedCode: '849102',
    expectedService: 'Amazon'
  },
  {
    name: 'GitHub 2FA',
    email: {
      sender: 'GitHub <noreply@github.com>',
      subject: '[GitHub] Please verify your device',
      snippet: 'Your GitHub authentication code is: 938102.'
    },
    expectedCode: '938102',
    expectedService: 'GitHub'
  },
  {
    name: 'Microsoft Account Code',
    email: {
      sender: 'Microsoft account team <account-security-noreply@accountprotection.microsoft.com>',
      subject: 'Microsoft account security code',
      snippet: 'Security code: 739102. Please use this code to finish logging into your account.'
    },
    expectedCode: '739102',
    expectedService: 'Microsoft'
  },
  {
    name: 'Uber Login OTP',
    email: {
      sender: 'Uber <uber@uber.com>',
      subject: 'Your Uber verification code',
      snippet: 'Your Uber code is 1928. Never share this code.'
    },
    expectedCode: '1928',
    expectedService: 'Uber'
  },
  {
    name: 'Discord Security Code',
    email: {
      sender: 'Discord <noreply@discord.com>',
      subject: 'Discord Login Location Detected',
      snippet: 'Here is your security code to log in: 582910'
    },
    expectedCode: '582910',
    expectedService: 'Discord'
  },
  {
    name: 'Alphanumeric Code (Custom)',
    email: {
      sender: 'Acme Auth <auth@acme.io>',
      subject: 'Your confirmation code',
      snippet: 'Your passcode is X7K9-2P. Enter this code on the verification screen.'
    },
    expectedCode: 'X7K92P',
    expectedService: 'Acme Auth'
  },
  {
    name: 'False Positive: Newsletter with year 2026',
    email: {
      sender: 'Tech Weekly <news@techweekly.com>',
      subject: 'Top Trends of 2026',
      snippet: 'Here are the top stories for 2026. Read our annual report.'
    },
    expectedCode: null
  }
];

console.log('--- Testing OTP Parser Engine ---');
let passed = 0;
let failed = 0;

for (const test of testCases) {
  const result = parseOTP(test.email);
  const actualCode = result ? result.code : null;

  if (actualCode === test.expectedCode) {
    console.log(`✅ [PASS] ${test.name}: extracted code '${actualCode}' (${result ? result.service : 'No OTP'})`);
    passed++;
  } else {
    console.error(`❌ [FAIL] ${test.name}: Expected '${test.expectedCode}', got '${actualCode}'`);
    failed++;
  }
}

console.log(`\nTest Summary: ${passed} Passed, ${failed} Failed`);
if (failed > 0) process.exit(1);
