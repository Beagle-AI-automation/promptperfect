import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('ai', () => ({
  generateText: vi.fn(async () => ({
    text: 'Optimized---EXPLANATION---Because---CHANGES---Tweaks',
  })),
}));

vi.mock('@/lib/client/supabase', () => ({
  getSupabaseAdminClient: vi.fn(() => null),
}));

vi.mock('@/lib/providers', () => ({
  createProvider: vi.fn(() => ({
    model: {},
    modelId: 'gemini-2.0-flash',
  })),
}));

import { OPTIONS, POST } from './route';

describe('/api/optimize-sync OPTIONS', () => {
  it('returns 204 with CORS headers', async () => {
    const res = await OPTIONS();
    expect(res.status).toBe(204);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
    expect(res.headers.get('Access-Control-Allow-Methods')).toContain('POST');
    expect(res.headers.get('Access-Control-Allow-Headers')).toContain(
      'Content-Type',
    );
  });
});

describe('/api/optimize-sync POST', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function jsonPost(body: unknown) {
    return new NextRequest('http://localhost/api/optimize-sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  it('returns 400 when prompt and text are missing', async () => {
    const res = await POST(jsonPost({}));
    expect(res.status).toBe(400);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
    const data = await res.json();
    expect(data.error).toMatch(/prompt or text is required/i);
  });

  it('returns 200 and JSON for a valid request', async () => {
    const res = await POST(
      jsonPost({
        text: 'Hello world',
        mode: 'better',
        provider: 'gemini',
        apiKey: 'test-api-key',
      }),
    );
    expect(res.status).toBe(200);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
    const data = await res.json();
    expect(data.optimizedText).toBeDefined();
    expect(data.provider).toBe('gemini');
    expect(data.model).toBe('gemini-2.0-flash');
  });
});
