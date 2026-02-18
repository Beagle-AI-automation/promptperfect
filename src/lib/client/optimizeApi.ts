import type { Mode, ProviderId } from '@/lib/types';

export interface OptimizeApiArgs {
  prompt: string;
  mode: Mode;
  session_id?: string;
  version?: 'v1' | 'v2';
  provider: ProviderId;
  apiKey?: string;
  model?: string;
  signal?: AbortSignal;
}

export interface OptimizeSyncResult {
  optimizedText: string;
  explanation: string;
  changes: string;
  rawText: string;
  provider: ProviderId;
  model: string;
}

function trimOrUndefined(value?: string) {
  const v = value?.trim();
  return v ? v : undefined;
}

async function readErrorMessage(res: Response): Promise<string> {
  const contentType = res.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    try {
      const data = (await res.json()) as { error?: string };
      if (typeof data.error === 'string' && data.error.trim()) return data.error.trim();
      return `Request failed: ${res.status}`;
    } catch {
      return `Request failed: ${res.status}`;
    }
  }

  const text = await res.text().catch(() => '');
  return text || `Request failed: ${res.status}`;
}

export async function postOptimizeSync(args: OptimizeApiArgs): Promise<OptimizeSyncResult> {
  const res = await fetch('/api/optimize-sync', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      prompt: args.prompt.trim(),
      mode: args.mode,
      session_id: args.session_id?.trim() || undefined,
      version: args.version,
      provider: args.provider,
      apiKey: trimOrUndefined(args.apiKey),
      model: trimOrUndefined(args.model),
    }),
    signal: args.signal,
  });

  if (!res.ok) throw new Error(await readErrorMessage(res));
  return (await res.json()) as OptimizeSyncResult;
}

export async function postOptimizeStream(args: OptimizeApiArgs): Promise<{
  provider: ProviderId;
  model: string;
  reader: ReadableStreamDefaultReader<Uint8Array>;
}> {
  const res = await fetch('/api/optimize', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      prompt: args.prompt.trim(),
      mode: args.mode,
      session_id: args.session_id?.trim() || undefined,
      version: args.version,
      provider: args.provider,
      apiKey: trimOrUndefined(args.apiKey),
      model: trimOrUndefined(args.model),
    }),
    signal: args.signal,
  });

  if (!res.ok || !res.body) {
    throw new Error(await readErrorMessage(res));
  }

  const provider = (res.headers.get('x-promptperfect-provider') as ProviderId | null) ?? args.provider;
  const model = res.headers.get('x-promptperfect-model') ?? '';
  return { provider, model, reader: res.body.getReader() };
}

export async function readUint8Stream(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  onChunk: (chunkText: string) => void,
) {
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) onChunk(decoder.decode(value, { stream: true }));
  }
  onChunk(decoder.decode());
}

