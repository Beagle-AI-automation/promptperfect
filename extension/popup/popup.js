'use strict';

const DEFAULT_API_URL = 'https://promptperfect.vercel.app';

const apiUrlEl = document.getElementById('apiUrl');
const modeEl = document.getElementById('mode');
const apiKeyEl = document.getElementById('apiKey');
const saveBtn = document.getElementById('save');
const statusEl = document.getElementById('status');
const versionEl = document.getElementById('ext-version');
const linkAppEl = document.getElementById('link-app');
const linkDocsEl = document.getElementById('link-docs');

function baseFromApiUrl(raw) {
  const s = (raw || DEFAULT_API_URL).trim().replace(/\/$/, '');
  try {
    return new URL(s).origin;
  } catch {
    return 'https://promptperfect.vercel.app';
  }
}

function setDocLinks(apiUrlValue) {
  const origin = baseFromApiUrl(apiUrlValue);
  linkAppEl.href = origin + '/';
  linkDocsEl.href = origin + '/docs';
}

if (versionEl && chrome.runtime.getManifest) {
  versionEl.textContent = 'v' + chrome.runtime.getManifest().version;
}

function setStatus(connected) {
  statusEl.textContent = connected ? '✅ Connected' : '❌ Not connected';
  statusEl.className = connected ? 'connected' : 'disconnected';
}

async function checkConnection() {
  const origin = baseFromApiUrl(apiUrlEl.value || DEFAULT_API_URL);
  const pingUrl = origin + '/api/optimize-sync';
  try {
    const res = await fetch(pingUrl, { method: 'OPTIONS' });
    setStatus(res.ok || res.status === 204 || res.status === 405);
  } catch {
    setStatus(false);
  }
}

saveBtn.addEventListener('click', async () => {
  const apiUrl = (apiUrlEl.value || DEFAULT_API_URL).trim().replace(/\/$/, '');
  const mode = modeEl.value;
  const apiKey = (apiKeyEl.value || '').trim();
  await chrome.storage.sync.set({ apiUrl, mode, apiKey });
  setDocLinks(apiUrl);
  statusEl.textContent = 'Saved.';
  statusEl.className = '';
  await checkConnection();
});

chrome.storage.sync.get(
  {
    apiUrl: DEFAULT_API_URL,
    mode: 'better',
    apiKey: '',
  },
  (items) => {
    apiUrlEl.value = items.apiUrl || DEFAULT_API_URL;
    modeEl.value = items.mode || 'better';
    apiKeyEl.value = items.apiKey || '';
    setDocLinks(apiUrlEl.value);
    checkConnection();
  },
);

apiUrlEl.addEventListener('change', () => setDocLinks(apiUrlEl.value));
