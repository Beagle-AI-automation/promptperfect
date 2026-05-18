'use strict';

const DEFAULT_API_URL = 'https://promptperfect-beaglecorp.vercel.app';

const promptInput = document.getElementById('promptInput');
const modeEl = document.getElementById('mode');
const optimizeBtn = document.getElementById('optimizeBtn');
const optimizeStatus = document.getElementById('optimizeStatus');
const resultSection = document.getElementById('resultSection');
const resultOutput = document.getElementById('resultOutput');
const copyBtn = document.getElementById('copyBtn');

const apiUrlEl = document.getElementById('apiUrl');
const providerEl = document.getElementById('provider');
const apiKeyEl = document.getElementById('apiKey');
const apiKeyHint = document.getElementById('apiKeyHint');
const saveBtn = document.getElementById('save');
const connStatus = document.getElementById('connStatus');
const settingsPanel = document.getElementById('settingsPanel');

const versionEl = document.getElementById('ext-version');
const linkAppEl = document.getElementById('link-app');
const linkDocsEl = document.getElementById('link-docs');

function originFromUrl(raw) {
  const s = (raw || DEFAULT_API_URL).trim().replace(/\/$/, '');
  try {
    return new URL(s).origin;
  } catch {
    return DEFAULT_API_URL;
  }
}

function updateDocLinks(apiUrlValue) {
  const origin = originFromUrl(apiUrlValue);
  linkAppEl.href = origin + '/';
  linkDocsEl.href = origin + '/docs';
}

function setOptimizeStatus(msg, isError) {
  optimizeStatus.textContent = msg;
  optimizeStatus.className = isError ? 'err' : '';
}

function setConnStatus(connected, detail) {
  if (detail) {
    connStatus.textContent = detail;
    connStatus.className = connected ? 'connected' : 'disconnected';
    return;
  }
  connStatus.textContent = connected ? '✅ API reachable' : '❌ API unreachable';
  connStatus.className = connected ? 'connected' : 'disconnected';
}

function updateApiKeyHint(hasKey) {
  if (!apiKeyHint) return;
  apiKeyHint.hidden = Boolean(hasKey);
  if (!hasKey && settingsPanel && !settingsPanel.open) {
    settingsPanel.open = true;
  }
}

async function checkConnection() {
  const origin = originFromUrl(apiUrlEl.value);
  try {
    const res = await fetch(origin + '/api/config', { method: 'GET' });
    if (!res.ok) {
      setConnStatus(false);
      return false;
    }
    const hasKey = Boolean((apiKeyEl.value || '').trim());
    setConnStatus(true, hasKey ? '✅ API reachable · key saved' : '✅ API reachable · add API key');
    return true;
  } catch {
    setConnStatus(false);
    return false;
  }
}

if (versionEl && chrome.runtime?.getManifest) {
  versionEl.textContent = 'v' + chrome.runtime.getManifest().version;
}

promptInput.addEventListener('input', () => {
  optimizeBtn.disabled = !promptInput.value.trim();
});

optimizeBtn.addEventListener('click', async () => {
  const text = promptInput.value.trim();
  if (!text) return;

  const apiKey = (apiKeyEl.value || '').trim();
  if (!apiKey) {
    setOptimizeStatus('❌ Add your API key in Settings (⚙) first.', true);
    updateApiKeyHint(false);
    return;
  }

  optimizeBtn.disabled = true;
  optimizeBtn.textContent = 'Optimizing…';
  resultSection.hidden = true;
  setOptimizeStatus('', false);

  try {
    const response = await new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        {
          type: 'OPTIMIZE',
          text,
          mode: modeEl.value,
          provider: providerEl.value,
        },
        (res) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(res);
          }
        },
      );
    });

    if (!response) {
      setOptimizeStatus('No response — reload the extension on chrome://extensions.', true);
      return;
    }
    if (response.error) {
      setOptimizeStatus('❌ ' + response.error, true);
      if (response.code === 'MISSING_API_KEY') {
        updateApiKeyHint(false);
      }
      return;
    }
    const optimized = response.optimizedText ?? response.result ?? '';
    if (!optimized) {
      setOptimizeStatus('❌ Empty response from API.', true);
      return;
    }
    resultOutput.value = optimized;
    resultSection.hidden = false;
  } catch (err) {
    setOptimizeStatus('❌ ' + (err instanceof Error ? err.message : 'Optimization failed'), true);
  } finally {
    optimizeBtn.disabled = !promptInput.value.trim();
    optimizeBtn.textContent = '✨ Optimize';
  }
});

copyBtn.addEventListener('click', () => {
  navigator.clipboard
    .writeText(resultOutput.value)
    .then(() => {
      copyBtn.textContent = 'Copied!';
      setTimeout(() => {
        copyBtn.textContent = 'Copy';
      }, 1500);
    })
    .catch(() => {
      resultOutput.select();
      document.execCommand('copy');
      copyBtn.textContent = 'Copied!';
      setTimeout(() => {
        copyBtn.textContent = 'Copy';
      }, 1500);
    });
});

saveBtn.addEventListener('click', async () => {
  const apiUrl = (apiUrlEl.value || DEFAULT_API_URL).trim().replace(/\/$/, '');
  const mode = modeEl.value;
  const provider = providerEl.value;
  const apiKey = (apiKeyEl.value || '').trim();
  await chrome.storage.sync.set({ apiUrl, mode, provider, apiKey });
  updateDocLinks(apiUrl);
  updateApiKeyHint(Boolean(apiKey));
  connStatus.textContent = 'Saving…';
  connStatus.className = '';
  await checkConnection();
});

apiUrlEl.addEventListener('change', () => updateDocLinks(apiUrlEl.value));
apiKeyEl.addEventListener('input', () => updateApiKeyHint(Boolean(apiKeyEl.value.trim())));

chrome.storage.sync.get(
  { apiUrl: DEFAULT_API_URL, mode: 'better', provider: 'gemini', apiKey: '' },
  (items) => {
    apiUrlEl.value = items.apiUrl || DEFAULT_API_URL;
    modeEl.value = items.mode || 'better';
    providerEl.value = items.provider || 'gemini';
    apiKeyEl.value = items.apiKey || '';
    updateDocLinks(apiUrlEl.value);
    updateApiKeyHint(Boolean(items.apiKey));
    checkConnection();
  },
);
