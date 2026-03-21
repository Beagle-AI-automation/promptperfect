# n8n Workflow Quick Start Guide

## ✅ Workflow Tested Successfully!

This workflow has been tested and confirmed working with PromptPerfect.

---

## 🚀 Quick Setup (3 Steps)

### 1. Import the Workflow

**In n8n:**
1. Click **"Workflows"** → **"Add Workflow"**
2. Click the **"..."** menu → **"Import from File"**
3. Select `examples/n8n-optimize-prompt.json`

### 2. Configure the URL

**In the "Set Input Parameters" node:**
- Change `promptperfect_url` to your PromptPerfect URL:
  - **Local:** `http://localhost:3000`
  - **Production:** `https://your-domain.com`

### 3. Test It!

- Click **"Test workflow"** button
- Wait 2-10 seconds
- View results in the "Extract Results" node ✨

---

## 📊 What You Get

The workflow returns:

```json
{
  "original_prompt": "Write a blog post about AI",
  "optimized_prompt": "Craft a comprehensive blog post exploring...",
  "explanation": "The optimized prompt adds clarity by...",
  "changes": "Key improvements: Added specificity...",
  "mode": "better",
  "provider": "gemini",
  "model": "gemini-2.0-flash"
}
```

---

## 🎨 Customization Options

### Change the Prompt
In "Set Input Parameters" node, update:
```javascript
"prompt": "Your prompt here"
```

### Change the Mode
```javascript
"mode": "developer"  // or: specific, cot, research, etc.
```

**Available modes:**
- `better` - General improvement
- `specific` - Add details and constraints
- `cot` - Chain-of-thought reasoning
- `developer` - Technical/coding prompts
- `research` - Academic prompts
- `beginner` - Simplified explanations
- `product` - Product management
- `marketing` - Marketing content

### Change the Provider
```javascript
"provider": "openai"  // or: gemini, anthropic
```

---

## 🔌 Advanced Integrations

### 1. Webhook Trigger
Replace "Manual Trigger" with "Webhook" node:
```
POST /webhook/optimize
{
  "prompt": "your prompt",
  "mode": "better"
}
```

### 2. Slack Bot
```
Slack Trigger → PromptPerfect → Send Message
```

### 3. Google Sheets Integration
```
Google Sheets Trigger → Read Prompts → PromptPerfect → Update Sheet
```

### 4. Email Automation
```
Email Trigger → Extract Prompt → PromptPerfect → Send Response
```

---

## 🧪 Test Locally

Before importing to n8n, you can test the API:

```bash
node examples/test-n8n-workflow.js
```

This simulates what the n8n workflow does.

---

## ❓ Troubleshooting

### Workflow Times Out
- Increase timeout in HTTP Request node settings
- Default is 60 seconds, try 120 seconds for longer prompts

### Connection Refused
- Make sure PromptPerfect is running: `npm run dev`
- Verify the URL is correct in "Set Input Parameters"

### Empty Results
- Check the HTTP Request node output for errors
- Verify your `.env` has `GOOGLE_API_KEY` configured

### 500 Error
- Check PromptPerfect terminal for error logs
- Try a different provider (e.g., switch to `gemini`)

---

## 📚 Full Documentation

See `examples/README.md` for:
- Detailed setup instructions
- More advanced use cases
- Error handling tips
- Production deployment guide

---

## 🎯 Example Use Cases

1. **Bulk Optimization:** Process 100+ prompts from a CSV
2. **Content Pipeline:** Optimize → Generate → Format → Publish
3. **Slack Command:** `/optimize [prompt]` → Get instant results
4. **API Endpoint:** Expose PromptPerfect via your own API
5. **A/B Testing:** Compare different modes side-by-side

---

## 🤝 Need Help?

- **Issues:** https://github.com/Beagle-AI-automation/promptperfect/issues
- **n8n Docs:** https://docs.n8n.io
- **n8n Community:** https://community.n8n.io

---

**Happy Automating! 🚀**
