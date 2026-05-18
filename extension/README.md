# PromptPerfect — Chrome Extension

Inject an **✨ Optimize** button into any text field on the page (ChatGPT, Gmail, Notion, etc.). One click sends the text to your PromptPerfect API and replaces the field with the optimized prompt.

**Default API URL:** `https://promptperfect-beaglecorp.vercel.app` (change in the extension popup for self‑hosted or local dev).

**API key required:** The extension uses BYOK (your Gemini / OpenAI / Anthropic key). Web-app sign-in does not apply inside the extension.

---

## Screenshots (for store & docs)

Add images under `extension/screenshots/` and reference them in the Web Store listing.

| Screenshot | Suggested filename | What to capture |
|------------|--------------------|-----------------|
| Popup settings | `screenshots/01-popup.png` | Dark popup: API URL, mode, Save, version badge, Beagle footer |
| Optimize on site | `screenshots/02-on-page.png` | **✨ Optimize** button below a text field (e.g. ChatGPT) |
| After success | `screenshots/03-toast.png` (optional) | Green success toast + button state |

**Placeholder paths in this repo (add your files):**

- `extension/screenshots/01-popup.png`
- `extension/screenshots/02-on-page.png`
- `extension/screenshots/03-toast.png`

---

## Install (side load / unpacked)

1. **Get the code**  
   Clone the repo and open the `extension/` folder, or copy the `extension` directory from a release zip.

2. **Open Chrome extensions**  
   - Open **Google Chrome**  
   - Go to `chrome://extensions`  
   - Turn on **Developer mode** (top right)

3. **Load the extension**  
   - Click **Load unpacked**  
   - Select the **`extension`** folder (the one that contains `manifest.json` at its root — not the parent repo root)

4. **Pin the extension (optional)**  
   - Click the puzzle icon in the toolbar → **Pin** next to PromptPerfect

5. **First-time settings**  
   - Click the PromptPerfect icon in the toolbar  
   - **API URL** should default to `https://promptperfect-beaglecorp.vercel.app`  
   - Choose **Provider** and paste your **API key** (required)  
   - For a local app, set API URL to `http://localhost:3000` and click **Save**  
   - Status should show **API reachable** if the server responds

6. **Reload after code changes**  
   - On `chrome://extensions`, click **Reload** on the PromptPerfect card whenever you change files in `extension/`

### Folder structure (verify before “Load unpacked”)

```
extension/
  manifest.json
  background/
  content/
  popup/
  styles/
  icons/
  README.md
```

`Load unpacked` must target the folder that **directly** contains `manifest.json`.

---

## How others get the extension

**Option A: Chrome Web Store (easiest for users)**  
1. [Chrome Web Store Developer](https://chrome.google.com/webstore/devconsole) (one-time $5)  
2. Zip the **contents** of `extension/` (or the `extension` folder itself, depending on how the store accepts the zip) so `manifest.json` is at the root of the zip.  
3. **New item** → upload zip → screenshots, description, icons (use `icons/icon128.png`).  
4. Bump `version` in `manifest.json` for each release.

**Option B: Side load** — Follow **Install (side load / unpacked)** above.

---

## Behavior (PP-506)

| State | UX |
|-------|-----|
| Loading | Optimize button shows a **spinner** + “Optimizing” (no plain ellipsis-only state) |
| Success | Brief **green flash** on the button + **toast**: “Prompt optimized!” |
| API error | **Toast**: “Optimization failed: …” |
| Unreachable | **Toast**: “Could not reach PromptPerfect API” (or reload hint if the extension disconnected) |

Theme: `#050505` backgrounds in popup, **`#4552FF`** accent — matches the web app.

---

## Smoke test (Week 6 audit)

Run through these steps after every `Load unpacked` reload.

1. **Load unpacked** — `chrome://extensions` → Developer mode → Load unpacked → select `extension/` (the folder containing `manifest.json`). Extension card appears with no errors.
2. **Settings check** — Click the extension icon → expand **⚙ Settings** → confirm API URL → paste API key + provider → **Save** → **✅ API reachable · key saved**.
3. **Popup optimize** — In the popup, paste any prompt into the **Prompt** textarea → **✨ Optimize** button enables → click it → optimized result appears in the **Result** box within 10 s.
4. **Stateless check** — Close the popup, reopen it → textarea is empty, result is gone, no history panel visible.
5. **On-page button** — Focus any text field on ChatGPT / Gmail / Notion → **✨ Optimize** button appears below it → click → spinner shows → result replaces the field text + green toast.

## Testing

## Troubleshooting

| Issue | What to try |
|-------|----------------|
| `401` / sign in message | Add your **API key** in Settings — extension cannot use web login |
| Provider mismatch | Gemini key → Provider **Gemini**; same for OpenAI / Anthropic |
| Optimize does nothing | Check API URL and **Reload** extension after changing settings |
| Not connected | API must expose `/api/config` and `/api/optimize-sync` (included in PromptPerfect app) |
| Button missing on a site | Extension only runs on ChatGPT, Gmail, Docs, Notion, X, and localhost — see `manifest.json` |
| Wrong project | Ensure **API URL** matches where the app is deployed |

## Files

| Path | Role |
|------|------|
| `manifest.json` | MV3 manifest, icons, permissions |
| `background/service-worker.js` | Calls `/api/optimize-sync` using stored URL / mode / API key |
| `content/universal.js` | Injects button, spinner, toasts, success flash |
| `styles/button.css` | Button, spinner, toast styles |
| `popup/` | Optimize-in-popup UI (prompt → result, stateless) + collapsed settings panel |
| `icons/` | Toolbar / store icons (**Beagle / PromptPerfect branding**) |
