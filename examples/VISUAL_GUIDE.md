# Visual Setup Guide - n8n Workflow

## 🎯 3-Step Setup Process

### Step 1: Import Workflow

**1. Open n8n in your browser**
```
https://your-n8n-instance.com
```

**2. Go to Workflows**
```
📁 Workflows → ➕ Add workflow
```

**3. Import from File**
```
⋮ Menu → 📥 Import from File → Select n8n-optimize-prompt.json
```

✅ **Result:** Workflow appears in your n8n editor

---

### Step 2: Configure URL

**1. Click "Set Input Parameters" node**

**2. Edit the values:**
```javascript
┌─────────────────────────────────────────┐
│ Set Input Parameters                    │
├─────────────────────────────────────────┤
│                                         │
│ promptperfect_url:                      │
│ ┌─────────────────────────────────────┐ │
│ │ http://localhost:3000               │ │ ← Change this!
│ └─────────────────────────────────────┘ │
│                                         │
│ prompt:                                 │
│ ┌─────────────────────────────────────┐ │
│ │ Write a blog post about AI          │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ mode: better                            │
│ provider: gemini                        │
└─────────────────────────────────────────┘
```

**3. Click "Save"**

---

### Step 3: Test It!

**1. Click "Test workflow" button**
```
▶️ Test workflow
```

**2. Wait 2-10 seconds**
```
⏳ Processing...
```

**3. View results in "Extract Results" node**
```
✅ Success!

{
  "original_prompt": "Write a blog post about AI",
  "optimized_prompt": "Craft a comprehensive blog post...",
  "explanation": "The optimized prompt adds...",
  ...
}
```

---

## 📸 Screenshot Guide

### What You'll See

```
┌─────────────────────────────────────────────────────────────┐
│ n8n Workflow Canvas                                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ①                  ②                  ③              ④   │
│  [👆]───────────▶[⚙️]───────────▶[🌐]───────────▶[📊]      │
│  Manual           Set Input        Call API         Extract │
│  Trigger          Parameters                       Results  │
│                                                             │
│  Click here       Configure        Sends POST      Formats  │
│  to start         your settings    request         output   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Node Details

#### ① Manual Trigger
```
┌──────────────────┐
│ When clicking    │
│ 'Test workflow'  │
└──────────────────┘
```
**Purpose:** Starts the workflow
**Status:** Ready to use as-is

#### ② Set Input Parameters
```
┌──────────────────────────┐
│ Set Input Parameters     │
├──────────────────────────┤
│ • promptperfect_url      │ ← Edit this!
│ • prompt                 │ ← Edit this!
│ • mode                   │ ← Optional
│ • provider               │ ← Optional
└──────────────────────────┘
```
**Purpose:** Configure your request
**Action Required:** Update URL at minimum

#### ③ Call PromptPerfect API
```
┌──────────────────────────┐
│ HTTP Request             │
├──────────────────────────┤
│ POST /api/optimize-sync  │
│ Timeout: 60s             │
└──────────────────────────┘
```
**Purpose:** Sends request to PromptPerfect
**Status:** Pre-configured, no changes needed

#### ④ Extract Results
```
┌──────────────────────────┐
│ Code                     │
├──────────────────────────┤
│ Parses API response      │
│ Extracts all fields      │
│ Formats as JSON          │
└──────────────────────────┘
```
**Purpose:** Clean up the output
**Status:** Ready to use as-is

---

## 🎨 Customization Examples

### Example 1: Change the Prompt

**In "Set Input Parameters" node:**
```javascript
Before:
"prompt": "Write a blog post about AI"

After:
"prompt": "Create a Python function to sort a list"
```

### Example 2: Change the Mode

```javascript
Before:
"mode": "better"

After:
"mode": "developer"  // For code-related prompts
```

**Available modes:**
- `better` → General improvement
- `specific` → Add details
- `cot` → Chain-of-thought
- `developer` → Code/technical
- `research` → Academic
- `beginner` → Simplified
- `product` → Product management
- `marketing` → Marketing content

### Example 3: Change Provider

```javascript
Before:
"provider": "gemini"

After:
"provider": "openai"  // If you have OpenAI configured
```

---

## 🔍 How to View Results

### Method 1: In the Workflow

**After clicking "Test workflow":**

1. Each node shows a green checkmark ✅
2. Click on "Extract Results" node
3. Click "OUTPUT" tab at the bottom
4. See the formatted JSON

```
OUTPUT (1 item)
─────────────────────────────────────────
{
  "original_prompt": "...",
  "optimized_prompt": "...",
  "explanation": "...",
  "changes": "...",
  "mode": "better",
  "provider": "gemini",
  "model": "gemini-2.0-flash"
}
```

### Method 2: Connect to Another Node

**Add a node after "Extract Results":**

```
Extract Results ──▶ [Your Node]
```

Common next steps:
- **HTTP Request:** Send to another API
- **Write to File:** Save as JSON/CSV
- **Send Email:** Email the results
- **Slack:** Post to a channel
- **Database:** Store in your DB

---

## 🚦 Status Indicators

### Success ✅
```
[Node] ────✅
```
- Green checkmark
- Node executed successfully
- Check OUTPUT tab for results

### In Progress ⏳
```
[Node] ────⏳
```
- Yellow/orange indicator
- Node is currently running
- Wait for completion

### Error ❌
```
[Node] ────❌
```
- Red X or exclamation
- Something went wrong
- Check error message in node

### Not Executed ⚫
```
[Node] ────⚫
```
- Gray/inactive
- Node hasn't run yet
- Click "Test workflow" to start

---

## 📱 Mobile-Friendly Tips

### Using n8n on Tablet/Mobile

1. **Zoom In:** Use pinch to zoom on the canvas
2. **Pan Around:** Drag with one finger
3. **Edit Node:** Double-tap to open settings
4. **Run Workflow:** Use the play button in top-right

---

## 🎓 Learning Path

### Beginner (You are here!)
- ✅ Import workflow
- ✅ Configure URL
- ✅ Run test
- ✅ View results

### Intermediate
- ⬜ Add webhook trigger
- ⬜ Connect to Slack
- ⬜ Process multiple prompts
- ⬜ Add error handling

### Advanced
- ⬜ Build custom nodes
- ⬜ Implement caching
- ⬜ Create API endpoint
- ⬜ Deploy to production

---

## 🆘 Quick Troubleshooting

### Problem: "Connection refused"
**Solution:** Make sure PromptPerfect is running
```bash
cd promptperfect
npm run dev
```

### Problem: "Timeout"
**Solution:** Increase timeout in HTTP Request node
```
Settings → Options → Timeout → 120000 (2 minutes)
```

### Problem: "Empty result"
**Solution:** Check HTTP Request node output
```
Click node → OUTPUT tab → Look for error message
```

### Problem: "Can't import workflow"
**Solution:** Check file format
```
File must be valid JSON
Try opening in text editor to verify
```

---

## 🎉 You're All Set!

### What You Can Do Now

1. ✅ **Test with different prompts**
2. ✅ **Try different modes**
3. ✅ **Connect to other services**
4. ✅ **Automate your workflow**

### Next Steps

1. Read `examples/README.md` for advanced features
2. Check `examples/QUICKSTART.md` for integration ideas
3. Join n8n community for support
4. Share your workflows with others!

---

## 📚 Quick Reference

### Essential URLs
- **n8n Docs:** https://docs.n8n.io
- **PromptPerfect:** https://github.com/Beagle-AI-automation/promptperfect
- **Support:** https://github.com/Beagle-AI-automation/promptperfect/issues

### File Locations
- **Workflow:** `examples/n8n-optimize-prompt.json`
- **Docs:** `examples/README.md`
- **Quick Start:** `examples/QUICKSTART.md`
- **Test Script:** `examples/test-n8n-workflow.js`

### Command Reference
```bash
# Start PromptPerfect
npm run dev

# Test workflow locally
node examples/test-n8n-workflow.js

# Check if API is running
curl http://localhost:3000/api/stats
```

---

**Happy Automating! 🚀**
