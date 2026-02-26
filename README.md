# PromptPerfect

**PromptPerfect is an open-source prompt optimization tool that automatically improves your LLM prompts and explains the changes.**

Improve your prompts in seconds. Paste any prompt, choose an optimization mode, and get a clearer, more structured, more effective version — with an explanation of what changed and why.

 Live Demo: `'
 MIT Licensed
 Built with Next.js 14 + Vercel AI SDK

---

## ✨ Features

*  Multiple optimization modes (Better, Specific, Chain-of-Thought)
*  Explanation panel that teaches you why changes were made
*  BYOK (Bring Your Own Key) — your API key never leaves your browser
*  Streaming responses in real-time
*  Supabase feedback tracking (thumbs up/down)
*  Fully responsive UI
*  Works with OpenAI, Claude, and Gemini

---

## 🖼 Demo



---

## 🚀 How It Works

1. Paste your prompt
2. Select an optimization mode
3. Get an improved version + explanation

That’s it.

---

## 🛠 Tech Stack

| Layer        | Technology                  |
| ------------ | --------------------------- |
| Framework    | Next.js 14 (App Router)     |
| Language     | TypeScript                  |
| Styling      | Tailwind CSS + shadcn/ui    |
| AI Streaming | Vercel AI SDK               |
| Models       | OpenAI · Anthropic · Gemini |
| Database     | Supabase                    |
| Deployment   | Vercel                      |

---

## 🧪 Run Locally

Clone the repository:

```bash
git clone https://github.com/Beagle-AI-automation/promptperfect.git
cd promptperfect
npm install
```

Create a `.env.local` file in the root:

```env
GOOGLE_API_KEY=your_gemini_api_key
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_supabase_service_key
```

Then run:

```bash
npm run dev
```

Open:

```
http://localhost:3000
```

---

## ☁ Deploy Your Own

Click below to deploy instantly to Vercel:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Beagle-AI-automation/promptperfect&env=GOOGLE_API_KEY)

You’ll need:

* A Gemini API key (from ai.google.dev)
* Optional: Supabase keys for feedback tracking

Deployment takes under 5 minutes.

---

## 🔐 Is My API Key Safe?

Yes.

Your API key is sent directly from your browser to the LLM provider’s API. It is not stored, logged, or persisted. You can verify this in the source code.

---

## 🤝 Contributing

Contributions are welcome.

To add a new optimization mode:

1. Add a new prompt template in `lib/prompts.ts`
2. Add the corresponding option in `ModeSelector`
3. Test locally
4. Open a PR

See `CONTRIBUTING.md` for full details.

---

## 📊 Feedback Tracking

After each optimization, users can submit 👍 or 👎 feedback.

Feedback is stored in Supabase to help improve optimization quality over time.

---

## 📄 License

MIT License © Beagle AI Solutions

---



