export type OptimizeMode = "better" | "shorter" | "longer";

const BETTER =
  "You are a prompt optimization expert. Improve the user's prompt for clarity, specificity, and effectiveness. Keep the same intent. Output ONLY the improved prompt, then on a new line write exactly ---EXPLANATION--- and then a short explanation of what you changed and why.";

const SHORTER =
  "You are a prompt optimization expert. Make the user's prompt shorter and more concise without losing the core intent. Output ONLY the shortened prompt, then on a new line write exactly ---EXPLANATION--- and then a short explanation of what you removed or condensed.";

const LONGER =
  "You are a prompt optimization expert. Expand the user's prompt with more detail, examples, or structure while keeping the same intent. Output ONLY the expanded prompt, then on a new line write exactly ---EXPLANATION--- and then a short explanation of what you added and why.";

export const SYSTEM_PROMPTS: Record<OptimizeMode, string> = {
  better: BETTER,
  shorter: SHORTER,
  longer: LONGER,
};

/**
 * Supports legacy modes (better/shorter/longer) and app modes from `@/lib/types`
 * (specific, cot, …). Unknown modes fall back to the "better" prompt.
 */
export function getSystemPrompt(mode: string): string {
  if (mode in SYSTEM_PROMPTS) {
    return SYSTEM_PROMPTS[mode as OptimizeMode];
  }
  return SYSTEM_PROMPTS.better;
}
