/**
 * Maps low-level Gemini / AI SDK errors into clearer UI copy for /app Optimize.
 */
export function userFacingOptimizeError(err: unknown): string {
  const raw =
    err instanceof Error ? err.message.trim() : String(err).trim();
  const m = raw.toLowerCase();

  if (!raw) return 'Optimization failed. Please try again.';

  if (m.includes('missing') && m.includes('api key')) {
    return (
      `${raw} Set GOOGLE_GENERATIVE_AI_API_KEY, GEMINI_API_KEY, or GOOGLE_API_KEY on the server.`
    );
  }

  if (
    m.includes('resource exhausted') ||
    m.includes('resource_exhausted') ||
    /\b429\b/.test(m) ||
    m.includes('too many requests') ||
    m.includes('rate limit') ||
    (m.includes('quota') && !m.includes('missing'))
  ) {
    return (
      'Google Gemini is limiting requests right now (quota or rate limit). Wait a few minutes and try again. ' +
      'Check usage and billing in Google AI Studio. If it keeps happening, set GEMINI_MODEL in your environment ' +
      'to another model (for example gemini-2.5-flash).'
    );
  }

  if (
    m.includes('maxretries') ||
    m.includes('failed after') ||
    m.includes('retry')
  ) {
    if (m.includes('resource exhausted') || m.includes('429')) {
      return (
        'Google Gemini is limiting requests right now (quota or rate limit). Wait a few minutes and try again. ' +
          'Check usage and billing in Google AI Studio. If it keeps happening, set GEMINI_MODEL in your environment ' +
          'to another model (for example gemini-2.5-flash).'
      );
    }
    return (
      'The model did not respond after retries. Wait a moment and try again, or switch GEMINI_MODEL in .env.'
    );
  }

  if (
    m.includes('api key') ||
    m.includes('invalid api') ||
    m.includes('permission_denied') ||
    m.includes('403')
  ) {
    return (
      'Google API key is missing or invalid. Verify GOOGLE_API_KEY / GOOGLE_GENERATIVE_AI_API_KEY for this deployment.'
    );
  }

  return raw;
}
