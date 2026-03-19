'use strict';

const DEFAULT_API_URL = 'http://localhost:3000';
const DEFAULT_MODE = 'better';

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type !== 'OPTIMIZE') return false;

  (async () => {
    const { apiUrl = DEFAULT_API_URL, mode = DEFAULT_MODE, apiKey = '' } = await chrome.storage.sync.get([
      'apiUrl',
      'mode',
      'apiKey',
    ]);
    const url = `${apiUrl.replace(/\/$/, '')}/api/optimize-sync`;
    const body = { prompt: message.text, mode };
    const headers = { 'Content-Type': 'application/json' };
    if (apiKey && typeof apiKey === 'string' && apiKey.trim() !== '') {
      headers['Authorization'] = `Bearer ${apiKey.trim()}`;
    }
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        return { error: data.error || data.message || `Request failed: ${res.status}` };
      }
      return data;
    } catch (err) {
      return { error: err.message || 'Network error' };
    }
  })()
    .then(sendResponse)
    .catch((e) => sendResponse({ error: e.message }));

  return true;
});
