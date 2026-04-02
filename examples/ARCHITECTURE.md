# n8n Workflow Architecture

## Workflow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     PromptPerfect n8n Workflow                  │
└─────────────────────────────────────────────────────────────────┘

   ┌───────────────┐
   │  Manual       │
   │  Trigger      │  ← Click "Test workflow"
   └───────┬───────┘
           │
           ▼
   ┌───────────────┐
   │  Set Input    │
   │  Parameters   │  ← Configure: URL, prompt, mode, provider
   └───────┬───────┘
           │
           │  {
           │    "promptperfect_url": "http://localhost:3000",
           │    "prompt": "Write a blog post about AI",
           │    "mode": "better",
           │    "provider": "gemini"
           │  }
           │
           ▼
   ┌───────────────┐
   │  HTTP Request │
   │  POST /api/   │  ← Calls PromptPerfect API
   │  optimize-sync│
   └───────┬───────┘
           │
           │  Response:
           │  {
           │    "optimizedText": "...",
           │    "explanation": "...",
           │    "changes": "...",
           │    "provider": "gemini",
           │    "model": "gemini-2.0-flash"
           │  }
           │
           ▼
   ┌───────────────┐
   │  Code Node    │
   │  Extract      │  ← Parse and format results
   │  Results      │
   └───────┬───────┘
           │
           ▼
   ┌───────────────┐
   │  Output       │  ← Final structured data
   │               │
   │  - original   │
   │  - optimized  │
   │  - explanation│
   │  - changes    │
   │  - mode       │
   │  - provider   │
   │  - model      │
   └───────────────┘
```

## Data Flow

### Step 1: Set Input Parameters
```javascript
{
  "promptperfect_url": "http://localhost:3000",
  "prompt": "Write a blog post about AI",
  "mode": "better",
  "provider": "gemini"
}
```

### Step 2: HTTP Request
**Request:**
```http
POST http://localhost:3000/api/optimize-sync
Content-Type: application/json

{
  "prompt": "Write a blog post about AI",
  "mode": "better",
  "provider": "gemini",
  "version": "v1"
}
```

**Response:**
```json
{
  "optimizedText": "Craft a comprehensive blog post exploring...",
  "explanation": "The optimized prompt adds clarity by...",
  "changes": "Key improvements:\n- Added specificity...",
  "rawText": "---SCORE---85---\n(full text)",
  "provider": "gemini",
  "model": "gemini-2.0-flash"
}
```

### Step 3: Extract Results
The Code node processes the response and outputs:
```json
{
  "original_prompt": "Write a blog post about AI",
  "optimized_prompt": "Craft a comprehensive blog post exploring...",
  "explanation": "The optimized prompt adds clarity by...",
  "changes": "Key improvements:\n- Added specificity...",
  "mode": "better",
  "provider": "gemini",
  "model": "gemini-2.0-flash"
}
```

## Integration Patterns

### Pattern 1: Simple API Call
```
Trigger → PromptPerfect → Output
```
**Use case:** One-off optimizations

### Pattern 2: Batch Processing
```
CSV/Sheet → Loop → PromptPerfect → Aggregate → Save
```
**Use case:** Optimize 100+ prompts from a list

### Pattern 3: Webhook Endpoint
```
Webhook → Validate → PromptPerfect → Return JSON
```
**Use case:** Expose as your own API

### Pattern 4: Slack Bot
```
Slack Trigger → Parse → PromptPerfect → Format → Reply
```
**Use case:** `/optimize [prompt]` command

### Pattern 5: Content Pipeline
```
Topic → Generate Prompt → PromptPerfect → LLM → Format → Publish
```
**Use case:** Automated content generation

### Pattern 6: A/B Testing
```
Input → Split → [Mode 1] PromptPerfect
              → [Mode 2] PromptPerfect → Compare → Best Result
```
**Use case:** Find the best optimization mode

## Error Handling

### Recommended Error Flow
```
HTTP Request → IF (Status = 200)
                │
                ├─ Yes → Extract Results → Continue
                │
                └─ No → Error Handler → Retry/Log/Alert
```

### Example Error Handler
```javascript
// In Code node after HTTP Request
if ($input.item.json.error) {
  throw new Error(`PromptPerfect Error: ${$input.item.json.error}`);
}
```

## Performance Considerations

### Timeout Settings
- **Short prompts:** 30-60 seconds (default)
- **Long prompts:** 90-120 seconds
- **Batch jobs:** 120+ seconds per item

### Rate Limiting
- Sequential processing: ~20-30 prompts/minute
- Parallel processing (Split in Batches): ~60-100 prompts/minute
  - Use "Split In Batches" node with batch size 3-5

### Caching Strategy
```
Input → Check Cache (Redis/Memory)
        │
        ├─ Cache Hit → Return Cached
        │
        └─ Cache Miss → PromptPerfect → Save to Cache → Return
```

## Security Best Practices

### 1. Use Environment Variables
```javascript
// Don't hardcode URLs
{{ $env.PROMPTPERFECT_URL }}

// Instead of
"http://localhost:3000"
```

### 2. Validate Input
```javascript
// In Code node before API call
if (!$json.prompt || $json.prompt.length < 5) {
  throw new Error('Prompt too short');
}
```

### 3. Sanitize Output
```javascript
// Remove sensitive data from logs
const sanitized = {
  ...results,
  prompt: results.prompt.substring(0, 50) + '...'
};
```

## Monitoring & Logging

### Add Logging Nodes
```
PromptPerfect → [Success] → Log Success
                │
                └─ [Error] → Log Error → Alert
```

### Track Metrics
```javascript
// In Code node
{
  timestamp: new Date().toISOString(),
  prompt_length: $json.prompt.length,
  response_time: $executionTime,
  mode: $json.mode,
  success: true
}
```

## Advanced Customizations

### Custom Retry Logic
```
HTTP Request → IF (Failed)
                │
                ├─ Retry Count < 3 → Wait → Retry
                │
                └─ Give Up → Error Handler
```

### Multi-Provider Fallback
```
Try Gemini → IF (Failed)
              │
              └─ Try OpenAI → IF (Failed)
                              │
                              └─ Try Anthropic
```

### Response Caching
```javascript
// Redis Cache node
const cacheKey = `pp:${$json.prompt}:${$json.mode}`;

// Check cache first
const cached = await redis.get(cacheKey);
if (cached) return JSON.parse(cached);

// Call API and cache result
const result = await callPromptPerfect();
await redis.setex(cacheKey, 3600, JSON.stringify(result));
```

## Testing Checklist

- [ ] Workflow imports without errors
- [ ] URL is configured correctly
- [ ] Test with short prompt (< 50 chars)
- [ ] Test with long prompt (> 500 chars)
- [ ] Test different modes (better, specific, cot)
- [ ] Test different providers (if configured)
- [ ] Error handling works (wrong URL, timeout)
- [ ] Output format is correct
- [ ] Performance is acceptable (< 30s)

## Production Deployment

### Pre-deployment Checklist
- [ ] Replace localhost URL with production URL
- [ ] Use environment variables for configuration
- [ ] Add error handling and retry logic
- [ ] Implement logging/monitoring
- [ ] Test with production data
- [ ] Set appropriate timeouts
- [ ] Configure rate limiting if needed
- [ ] Document the workflow for team

### Environment Variables
```
PROMPTPERFECT_URL=https://your-domain.com
PROMPTPERFECT_API_KEY=optional_if_auth_enabled
RETRY_COUNT=3
TIMEOUT_MS=60000
```

## Support Resources

- **n8n Documentation:** https://docs.n8n.io
- **PromptPerfect GitHub:** https://github.com/Beagle-AI-automation/promptperfect
- **Community Forum:** https://community.n8n.io
- **Examples:** See `examples/` folder for more workflows
