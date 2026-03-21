# n8n Workflow Examples

This folder contains ready-to-import n8n workflow templates for integrating PromptPerfect into your automation workflows.

## Available Workflows

### 1. Optimize Prompt Workflow

**File:** `n8n-optimize-prompt.json`

A simple workflow that takes a prompt, sends it to PromptPerfect for optimization, and returns the improved version with explanations.

#### Features:
- ✅ Manual trigger for easy testing
- ✅ Configurable input parameters
- ✅ Calls PromptPerfect API
- ✅ Extracts and formats results
- ✅ Returns optimized prompt, explanation, and changes

---

## Setup Instructions

### Prerequisites

1. **PromptPerfect running locally or deployed**
   - Local: `http://localhost:3000`
   - Production: `https://your-domain.com`

2. **n8n installed**
   - Cloud: https://n8n.io
   - Self-hosted: https://docs.n8n.io/hosting/

### Import the Workflow

1. **Open n8n** in your browser
2. Click **"Workflows"** in the left sidebar
3. Click **"Import from File"** or **"Import from URL"**
4. Select `n8n-optimize-prompt.json`
5. Click **"Import"**

### Configure the Workflow

#### Node 1: Set Input Parameters

Update these values in the "Set Input Parameters" node:

```javascript
{
  "promptperfect_url": "http://localhost:3000",  // Your PromptPerfect URL
  "prompt": "Write a blog post about AI",        // Prompt to optimize
  "mode": "better",                              // Optimization mode
  "provider": "gemini"                           // LLM provider
}
```

**Available Modes:**
- `better` - General improvement for clarity and robustness
- `specific` - Adds constraints and details
- `cot` - Chain-of-thought reasoning
- `developer` - Technical/coding prompts
- `research` - Academic/research prompts
- `beginner` - Simplified explanations
- `product` - Product management prompts
- `marketing` - Marketing/content prompts

**Available Providers:**
- `gemini` - Google Gemini (default)
- `openai` - OpenAI GPT models
- `anthropic` - Anthropic Claude models

### Test the Workflow

1. Click **"Test workflow"** button in n8n
2. The workflow will:
   - Send your prompt to PromptPerfect
   - Wait for optimization (usually 2-10 seconds)
   - Extract the results
3. View the output in the "Extract Results" node

### Output Format

The workflow returns a JSON object with:

```json
{
  "original_prompt": "Write a blog post about AI",
  "optimized_prompt": "Write a comprehensive blog post...",
  "explanation": "The optimized prompt adds clarity by...",
  "changes": "Key improvements:\n- Added specificity...",
  "mode": "better",
  "provider": "gemini",
  "model": "gemini-2.0-flash"
}
```

---

## Advanced Usage

### Use with Webhooks

Replace the **"When clicking 'Test workflow'"** node with a **Webhook** node to:
- Trigger via HTTP POST requests
- Integrate with other services
- Build automated workflows

**Example webhook payload:**
```json
{
  "prompt": "Your prompt here",
  "mode": "developer",
  "provider": "gemini"
}
```

### Chain Multiple Optimizations

You can chain multiple PromptPerfect calls:
1. Optimize with `mode: "specific"`
2. Take the result and optimize again with `mode: "cot"`
3. Compare results

### Save to Database

Add a database node after "Extract Results" to:
- Store optimization history
- Track improvements over time
- Build a prompt library

### Integration Examples

#### Slack Bot
```
Slack Trigger → Set Parameters → PromptPerfect → Send to Slack
```

#### Automated Content Pipeline
```
Google Sheets → Read Prompts → PromptPerfect → Update Sheet
```

#### API Endpoint
```
Webhook → PromptPerfect → Return Response
```

---

## Troubleshooting

### Common Issues

**1. Connection Timeout**
- Increase timeout in HTTP Request node (default: 60s)
- Check if PromptPerfect is running and accessible

**2. 404 Error**
- Verify the URL is correct (`http://localhost:3000` for local)
- Make sure PromptPerfect is running: `npm run dev`

**3. 500 Error**
- Check PromptPerfect logs for errors
- Verify API keys are configured in `.env`
- Try a different provider (e.g., switch from `openai` to `gemini`)

**4. Empty Response**
- Check if the mode is valid
- Verify the prompt is not empty
- Look at the HTTP Request node output for error messages

### Debug Tips

1. **Enable "Always Output Data"** in HTTP Request node settings
2. **View raw response** in the HTTP Request node output
3. **Check PromptPerfect terminal** for API logs
4. **Test with curl** first:

```bash
curl -X POST http://localhost:3000/api/optimize-sync \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "test prompt",
    "mode": "better",
    "provider": "gemini",
    "version": "v1"
  }'
```

---

## Workflow Customization

### Add Authentication

If your PromptPerfect instance requires authentication:

1. Update HTTP Request node
2. Set "Authentication" to "Header Auth"
3. Add your API key:
   - Name: `Authorization`
   - Value: `Bearer YOUR_API_KEY`

### Change Timeout

For longer prompts, increase timeout:
- Open "Call PromptPerfect API" node
- Go to "Options" → "Timeout"
- Set to 120000 (2 minutes) or higher

### Add Error Handling

Add an "IF" node after the HTTP Request to:
- Check for successful response
- Handle errors gracefully
- Retry on failure

---

## Example Use Cases

### 1. Bulk Prompt Optimization
```
CSV File → Loop → PromptPerfect → Save Results
```

### 2. Prompt Testing Pipeline
```
Test Prompts → PromptPerfect (multiple modes) → Compare Results
```

### 3. Content Generation Workflow
```
Topic List → Generate Prompt → PromptPerfect → LLM → Format Output
```

### 4. Slack Command
```
Slack "/optimize" → PromptPerfect → Reply in Thread
```

---

## Support

- **PromptPerfect Issues:** https://github.com/Beagle-AI-automation/promptperfect/issues
- **n8n Documentation:** https://docs.n8n.io
- **n8n Community:** https://community.n8n.io

---

## Contributing

Have improvements or new workflows? Submit a PR with:
- New workflow JSON file
- Updated README documentation
- Example use case

---

## License

These workflows are provided under the same MIT License as PromptPerfect.
