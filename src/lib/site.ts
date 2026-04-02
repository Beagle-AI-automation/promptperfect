/** Canonical deploy URL (no trailing slash). Override with NEXT_PUBLIC_SITE_URL. */
export function getSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (raw) return raw.replace(/\/$/, '');
  return 'https://promptperfect.vercel.app';
}

export const REPO_URL =
  'https://github.com/Beagle-AI-automation/promptperfect';

/** GitHub: extension install guide (markdown). */
export const EXTENSION_README_URL = `${REPO_URL}/blob/main/extension/README.md`;

/**
 * Default social preview image (absolute URL). Override with NEXT_PUBLIC_OG_IMAGE.
 * Uses a README asset so OG validators get a real image without adding binary to the repo.
 */
export function getOgImageUrl(): string {
  const raw = process.env.NEXT_PUBLIC_OG_IMAGE?.trim();
  if (raw) return raw;
  return 'https://github.com/user-attachments/assets/79d8f61d-aab4-4f0d-a81f-85c2de4d75b8';
}

export const SITE_NAME = 'PromptPerfect';

export const DEFAULT_OG_TITLE = 'PromptPerfect — Open-source prompt optimizer';

export const DEFAULT_OG_DESCRIPTION =
  'Improve your LLM prompts with AI-powered suggestions and explanations. Free, open source, bring your own API key.';
