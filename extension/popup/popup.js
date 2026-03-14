'use strict';

const DEFAULT_API_URL = 'http://localhost:3000';

const apiUrlEl = document.getElementById('apiUrl');
const modeEl = document.getElementById('mode');
const apiKeyEl = document.getElementById('apiKey');
const saveBtn = document.getElementById('save');
const statusEl = document.getElementById('status');

function setStatus(connected) {
  statusEl.textContent = connected ? '✅ Connected' : '❌ Not connected';
  statusEl.className = connected ? 'connected' : 'disconnected';
}

async function checkConnection() {
  const url = (apiUrlEl.value || DEFAULT_API_URL).replace(/\/$/, '') + '/api/optimize-sync';
  try {
    const res = await fetch(url, { method: 'OPTIONS' });
    setStatus(res.ok || res.status === 204);
  } catch {
    setStatus(false);
  }
}

saveBtn.addEventListener('click', async () => {
  const apiUrl = (apiUrlEl.value || DEFAULT_API_URL).trim().replace(/\/$/, '');
  const mode = modeEl.value;
  const apiKey = (apiKeyEl.value || '').trim();
  await chrome.storage.sync.set({ apiUrl, mode, apiKey });
  statusEl.textContent = 'Saved.';
  statusEl.className = '';
  await checkConnection();
});

chrome.storage.sync.get(['apiUrl', 'mode', 'apiKey'], (items) => {
  apiUrlEl.value = items.apiUrl || DEFAULT_API_URL;
  modeEl.value = items.mode || 'better';
  apiKeyEl.value = items.apiKey || '';
  checkConnection();
});
