'use strict';

const DEFAULT_API_URL = 'https://promptperfect.vercel.app';
const DEFAULT_MODE = 'better';

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type !== 'OPTIMIZE') return false;

  (async () => {
    const settings = await chrome.storage.sync.get({
      apiUrl: DEFAULT_API_URL,
      mode: DEFAULT_MODE,
      apiKey: '',
    });
    const apiUrl =
      typeof settings.apiUrl === 'string' && settings.apiUrl.trim()
        ? settings.apiUrl.trim().replace(/\/$/, '')
        : DEFAULT_API_URL;
    const mode =
      typeof settings.mode === 'string' && settings.mode.trim()
        ? settings.mode.trim()
        : DEFAULT_MODE;
    const apiKey =
      typeof settings.apiKey === 'string' ? settings.apiKey.trim() : '';

    const url = `${apiUrl}/api/optimize-sync`;
    const body = { prompt: message.text, mode };
    const headers = { 'Content-Type': 'application/json' };
    if (apiKey) {
      headers.Authorization = `Bearer ${apiKey}`;
    }

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });
      let data = {};
      try {
        data = await res.json();
      } catch {
        data = {};
      }
      if (!res.ok) {
        return {
          error:
            data.error ||
            data.message ||
            `Request failed (${res.status})`,
        };
      }
      return data;
    } catch (err) {
      return {
        error:
          err instanceof Error ? err.message : 'Network error — check API URL',
      };
    }
  })()
    .then(sendResponse)
    .catch((e) =>
      sendResponse({
        error: e instanceof Error ? e.message : 'Optimization failed',
      }),
    );

  return true;
});
