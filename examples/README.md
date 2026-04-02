# PromptPerfect n8n Workflow Template

## What This Does

This n8n workflow calls the **PromptPerfect Optimize API** (`POST /api/optimize-sync`) to turn a raw prompt into a clearer, stronger version for your target AI model. Use it to **automate prompt optimization** inside any n8n pipeline—e.g. before calling OpenAI, Claude, or Gemini—so every run gets a consistent, production-ready prompt without leaving your automation stack.

## Prerequisites

- **n8n** installed ([self-hosted](https://docs.n8n.io/hosting/) or [n8n Cloud](https://n8n.io/cloud/))
- **PromptPerfect API key** — obtain from [app.promptperfect.com](https://app.promptperfect.com) (or your PromptPerfect account dashboard)

## Setup — 3 Steps

### Step 1: Import the Workflow

1. Open your n8n instance.
2. Go to **Workflows** → click **"+"** → **Import from File** (or **Import workflow**).
3. Select `examples/n8n-optimize-prompt.json` from this repository.
4. Confirm **Import**.

### Step 2: Add Your API Key

1. Open the workflow and click the **Set Prompt Input** node.
2. Find the assignment **`apiKey`** and replace `YOUR_API_KEY_HERE` with your real PromptPerfect API key.
3. **Save** the workflow.

### Step 3: Set Your Prompt

1. In the same **Set Prompt Input** node, edit **`promptText`** to the prompt you want optimized.
2. Adjust **`targetModel`** if needed (see [Supported Target Models](#supported-target-models) below).
3. **Save** the workflow.

## Running the Workflow

- Click **Test workflow** (or execute **Start** → run) to run manually.
- Open the **Extract Result** node output after a successful run.
- The field **`optimized_prompt`** contains the optimized text.

## Using in Your Own Workflows

You can reuse this pattern in larger flows:

- **Sub-workflow:** Save this as a dedicated workflow and call it with **Execute Workflow** from another workflow, passing `promptText` / `apiKey` / `targetModel` via the parent.
- **Webhook:** Replace **Start** (Manual Trigger) with a **Webhook** node. Map `promptText`, `targetModel`, and `apiKey` from the webhook body (or use n8n **Credentials** / **Variables** for the key instead of storing it in the Set node).

**Example trigger swaps** (replace Manual Trigger **Start** with):

| Trigger | Use case |
|--------|----------|
| **Webhook** | Call from any app or service with HTTP POST |
| **Schedule Trigger** | Optimize prompts on a timer (e.g. hourly digest) |
| **Slack Trigger** | Optimize prompts from channel messages or slash commands |
| **Google Sheets** | Read a column of prompts, optimize each row in a loop |

After swapping the trigger, connect its output to **Set Prompt Input** (or merge fields so `promptText`, `targetModel`, and `apiKey` exist on the item before **Optimize Prompt**).

## Output Format

After **Extract Result**, each item looks like:

```json
{
  "original_prompt": "your original text",
  "optimized_prompt": "the AI-optimized version",
  "target_model": "chatgpt",
  "success": true,
  "timestamp": "2025-03-21T10:30:00.000Z"
}
```

If the API returns an unexpected shape, `optimized_prompt` may be `"No result returned"` and `success` will be `false`.

## Troubleshooting

| Issue | What to check |
|-------|----------------|
| **401 Unauthorized** | API key missing, wrong, or expired. Update **`apiKey`** in **Set Prompt Input** or your credential store. |
| **Timeout** | Increase **Timeout** in the **Optimize Prompt** HTTP Request node (**Options** → **Timeout**), e.g. 60000 ms. |
| **Empty / wrong result** | Inspect the raw output of **Optimize Prompt**; confirm the live API returns `result.promptOptimized` (or adjust **Extract Result** code to match the actual JSON). |
| **SSL / DNS errors** | Verify the URL `https://api.promptperfect.jina.ai/api/optimize-sync` is reachable from your n8n host. |

## Supported Target Models

Use these values for **`targetModel`** in the Set node (and in the JSON body). Exact behavior depends on PromptPerfect’s hosted API.

| `targetModel` | Typical use |
|---------------|-------------|
| `chatgpt` | OpenAI ChatGPT-style chat |
| `gpt4` | GPT-4 class models |
| `claude` | Anthropic Claude |
| `gemini` | Google Gemini |
| `midjourney` | Midjourney / image-style prompting |

> **Self-hosted PromptPerfect:** This template targets the **hosted** API URL and body shape above. If you run the open-source app locally, your `POST /api/optimize-sync` may expect fields like `text`, `prompt`, `mode`, and `provider`, plus `Authorization: Bearer <key>`. In that case, change the **Optimize Prompt** URL, headers, and JSON body to match your deployment.

## Files

| File | Description |
|------|-------------|
| `n8n-optimize-prompt.json` | Importable n8n workflow (Manual → Set → HTTP → Code). |

---

**Validate JSON locally:**

```bash
node -e "JSON.parse(require('fs').readFileSync('examples/n8n-optimize-prompt.json', 'utf8')); console.log('Valid JSON')"
```

**Test in n8n:**

1. `npx n8n` (or open your cloud instance).
2. Import `n8n-optimize-prompt.json`.
3. Set **apiKey** and **promptText** in **Set Prompt Input**.
4. Run the workflow and confirm **Extract Result** → `optimized_prompt`.
