# PromptPerfect — Chrome Extension

Inject an **✨ Optimize** button into any text input on any page (ChatGPT, Claude, Gmail, Notion, Slack, etc.). One click sends the text to PromptPerfect and replaces it with the optimized prompt.

---

## How others get the extension

**Option A: Chrome Web Store (easiest for users)**  
1. Create a [Chrome Developer account](https://chrome.google.com/webstore/devconsole) (one-time $5 fee).  
2. Zip the `extension/` folder (contents of the folder only: `manifest.json`, `popup/`, `content/`, etc. at the root of the zip).  
3. In the [Developer Dashboard](https://chrome.google.com/webstore/devconsole), click **New item** and upload the zip.  
4. Fill in store listing (description, screenshots, icon). Submit for review.  
5. Once approved, anyone can install from the store with one click.  
6. When you push code changes: bump `version` in `manifest.json`, zip again, upload a new version in the dashboard.

**Option B: Load unpacked (for your team / open-source users)**  
1. Clone the repo: `git clone <your-repo-url>` and `cd promptperfect`.  
2. In Chrome go to `chrome://extensions` → **Developer mode** → **Load unpacked** → select the `extension/` folder.  
3. Tell users to set **API URL** in the extension popup to your deployed app (e.g. `https://your-app.vercel.app`).

---

## How to work on the extension

1. **Clone and open** — `git clone <repo>` then open the `extension/` folder in your editor.  
2. **Load in Chrome** — `chrome://extensions` → Developer mode → **Load unpacked** → select `extension/`.  
3. **Edit** — Change files under `extension/` (e.g. `content/universal.js`, `popup/popup.js`, `styles/button.css`).  
4. **Reload** — After saving, go to `chrome://extensions` and click the **reload** icon on PromptPerfect.  
5. **Test** — Use the extension on ChatGPT, Gmail, etc. Set API URL in the popup to your deployed app or `http://localhost:3000` for local.  
6. **Push** — Commit and push. If you use the Web Store, bump `version` in `manifest.json`, zip the extension, and upload a new version in the developer dashboard.

---

## Setup (first-time install)

1. Open **Chrome** → go to `chrome://extensions`
2. Turn on **Developer mode** (top right)
3. Click **Load unpacked**
4. Select the `extension/` folder (this folder)

## Testing

1. **ChatGPT** — Go to [chat.openai.com](https://chat.openai.com), focus the prompt input. The **✨ Optimize** button should appear below it. Type a prompt, click **Optimize**, and confirm the text is replaced with the optimized version.

2. **Claude** — Open [claude.ai](https://claude.ai), focus the message input, and repeat the same test.

3. **Gmail** — Open Gmail, start a new compose. Focus the body or subject, then use **✨ Optimize** and verify the text updates.

4. **Popup / settings** — Click the extension icon in the toolbar. The popup should open with:
   - **API URL** (default: `http://localhost:3000` — set to your deployed URL so the extension talks to your app)
   - **Mode** (Better / Specific / Chain of thought)
   - **API Key** (optional)
   After clicking **Save**, the status should show **✅ Connected** if the API is reachable, or **❌ Not connected** otherwise.

## If "Optimize" doesn't replace the text

1. **Set the correct API URL** — Click the extension icon. If you're running PromptPerfect locally, set **API URL** to `http://localhost:3000`. If you use a different deployment, use that URL (e.g. `https://your-app.vercel.app`). Click **Save**. The status should show **✅ Connected** when the API is reachable.
2. **Check for errors** — After clicking Optimize, if the button briefly shows **Error**, hover it to see the message (or open DevTools → Console and look for "PromptPerfect:").
3. **Reload the extension** — After changing the API URL, go to `chrome://extensions` and click the reload icon on the PromptPerfect extension.

## Local development

To point the extension at your local PromptPerfect app:

1. Start your app: `npm run dev` in the PromptPerfect repo.
2. Click the extension icon → set **API URL** to `http://localhost:3000` (or your dev URL).
3. Save and test on any page with a text input.

## Files

- `manifest.json` — Extension manifest (Manifest V3)
- `popup/` — Options popup (API URL, mode, API key)
- `content/universal.js` — Injects the Optimize button on focus, handles replace
- `background/service-worker.js` — Calls `/api/optimize-sync` with stored settings
- `styles/button.css` — Styles for the **✨ Optimize** button
- `icons/` — Extension icons (16, 48, 128)
