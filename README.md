# PromptPerfect

> PromptPerfect is an open-source prompt optimization tool that automatically improves your LLM prompts and explains the changes.

<img width="1899" height="912" alt="image" src="https://github.com/user-attachments/assets/79d8f61d-aab4-4f0d-a81f-85c2de4d75b8" />
<img width="1902" height="890" alt="image" src="https://github.com/user-attachments/assets/f4af916b-ab2a-437f-8034-26e2c3c3e73e" />


PromptPerfect takes your draft prompts—whether vague, messy, or just a rough idea—and transforms them into high-quality, engineered prompts using AI. It doesn't just rewrite them; it teaches you *why* the changes were made, helping you become a better prompt engineer over time. Choose from modes like "Make it Better," "Make it Specific," or "Add Chain-of-Thought" to get exactly the result you need.

## Features

- **Instant Optimization**: Turn simple phrases into professional prompts in seconds.
- **Detailed Explanations**: Learn the "why" behind every change with educational breakdowns.
- **Multiple Modes**:
  - **Better**: General improvement for clarity and robustness.
  - **Specific**: Adds constraints and details to reduce hallucinations.
  - **Chain-of-Thought**: Structures the prompt to encourage step-by-step reasoning.
- **Privacy-First**: Your API keys are stored locally in your browser and never saved to our servers.
- **Open Source**: Built with modern web technologies, free to use and extend.
- **n8n Integration**: Ready-to-import workflow templates for automation (see `examples/`).

## Tech Stack

| Component | Technology |
| :--- | :--- |
| **Framework** | Next.js 14 (App Router) |
| **Language** | TypeScript |
| **Styling** | Tailwind CSS + shadcn/ui |
| **AI Integration** | Vercel AI SDK |
| **Icons** | Lucide React |
| **Database** | Supabase (for analytics) |
| **Deployment** | Vercel |

## Getting Started

Follow these steps to run PromptPerfect locally on your machine.

### Prerequisites

- Node.js 18+ installed
- A Google Gemini API key (or OpenAI/Anthropic key for BYOK)

### Installation

1.  **Clone the repository:**

    ```bash
    git clone https://github.com/Beagle-AI-automation/promptperfect.git
    cd promptperfect
    ```

2.  **Install dependencies:**

    ```bash
    npm install
    ```

3.  **Configure environment variables:**

    Create a `.env.local` file in the root directory and add your API keys:

    ```env
    # Required for default provider
    GOOGLE_API_KEY=your_gemini_api_key_here

    # Optional: For analytics (Supabase)
    NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
    NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
    ```

4.  **Run the development server:**

    ```bash
    npm run dev
    ```

    Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Integrations

### n8n Workflow Automation

PromptPerfect includes ready-to-import n8n workflow templates for automating prompt optimization in your workflows.

**Quick Start:**
1. Import `examples/n8n-optimize-prompt.json` into n8n
2. Configure your PromptPerfect URL
3. Start automating!

See `examples/README.md` for full documentation and advanced use cases.

## Deploy Your Own

You can deploy your own instance of PromptPerfect to Vercel with a single click:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Beagle-AI-automation/promptperfect&env=GOOGLE_API_KEY&envDescription=Get%20a%20Gemini%20API%20key%20from%20ai.google.dev)

## Contributing

We welcome contributions! Whether it's fixing bugs, improving documentation, or suggesting new features, your help is appreciated.

1.  Fork the repository.
2.  Create a new branch (`git checkout -b feature/amazing-feature`).
3.  Commit your changes (`git commit -m 'Add some amazing feature'`).
4.  Push to the branch (`git push origin feature/amazing-feature`).
5.  Open a Pull Request.

## FAQ

### What is PromptPerfect?

PromptPerfect is an open-source prompt optimization tool. Paste any LLM prompt, pick an optimization mode, and get an improved version with explanations of what changed and why. It runs in your browser — no install needed.

### What LLM providers does it work with?

PromptPerfect supports OpenAI (GPT-4, GPT-3.5), Anthropic (Claude), and Google (Gemini). You bring your own API key. The key is sent directly from your browser to the provider — it never touches our servers.

### Is my API key safe?

Yes. Your API key is sent from your browser directly to the LLM provider's API. It is not stored, logged, or transmitted to any other server. You can verify this in the source code — the API route proxies the request without persisting the key.

### How do I add a new optimization mode?

Add a new prompt string to `lib/prompts.ts` and a corresponding option in the ModeSelector component. See CONTRIBUTING.md for the step-by-step guide.

### How is this different from DSPy or PromptFoo?

DSPy is a framework for programmatic prompt optimization in Python pipelines. PromptFoo is a CLI tool for evaluating and testing prompts. PromptPerfect is a web-based tool for manually improving individual prompts with explanations — more like Grammarly for prompts than a testing framework.

### Can I deploy my own instance?

Yes. Click the "Deploy with Vercel" button in this README. You'll need a Gemini API key (free from ai.google.dev). The whole setup takes under 5 minutes.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<p align="center">
  Built by the <a href="https://github.com/Beagle-AI-automation">Beagle Builder Program</a>
</p>
