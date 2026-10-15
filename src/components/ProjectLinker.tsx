'use client';

import { useRef, useState } from 'react';
import { FolderGit2, Loader2 } from 'lucide-react';
import {
  buildProjectDigest,
  isBinaryPath,
  isSkippedPath,
  looksLikeBinary,
  type AnalyzedFile,
} from '@/lib/projectDigest';

/** Minimal structural types for the File System Access API (not in all lib.dom versions). */
interface FsFileHandle {
  kind: 'file';
  name: string;
  getFile: () => Promise<File>;
}
interface FsDirHandle {
  kind: 'directory';
  name: string;
  values: () => AsyncIterableIterator<FsFileHandle | FsDirHandle>;
}
type PickerWindow = Window & {
  showDirectoryPicker?: (opts?: { mode?: 'read' }) => Promise<FsDirHandle>;
};

interface ProjectLinkerProps {
  /** Called with the digest text + project name once analysis finishes. */
  onDigest: (digest: string, projectName: string) => void;
  disabled?: boolean;
}

const MAX_ENTRIES = 800;
const MAX_FILE_BYTES = 12_000;
const SKIP_DIR_NAMES = new Set([
  'node_modules', '.git', '.next', 'dist', 'build', 'coverage',
  '.turbo', '.vercel', 'vendor', '__pycache__', '.venv', 'venv', 'target',
]);

type Status =
  | { kind: 'idle' }
  | { kind: 'analyzing'; files: number }
  | { kind: 'error'; message: string };

async function readFileCapped(file: File): Promise<string> {
  try {
    const slice = file.size > MAX_FILE_BYTES ? file.slice(0, MAX_FILE_BYTES) : file;
    return await slice.text();
  } catch {
    return '';
  }
}

async function walkFsDir(
  dir: FsDirHandle,
  prefix: string,
  out: AnalyzedFile[],
  seen: { count: number },
  onProgress: (n: number) => void,
): Promise<void> {
  for await (const entry of dir.values()) {
    if (seen.count >= MAX_ENTRIES) return;
    if (entry.kind === 'directory') {
      if (SKIP_DIR_NAMES.has(entry.name)) continue;
      await walkFsDir(entry, prefix ? `${prefix}/${entry.name}` : entry.name, out, seen, onProgress);
      continue;
    }
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (isSkippedPath(rel)) continue;
    seen.count += 1;
    try {
      const file = await entry.getFile();
      out.push(await toAnalyzedFile(rel, file));
      if (seen.count % 25 === 0) onProgress(seen.count);
    } catch {
      // unreadable file (permissions/lock) — skip silently
    }
  }
}

/**
 * Build an AnalyzedFile for any file: binaries and oversized files are
 * listed but never read; unknown extensions are content-sniffed so any
 * directory (not just code projects) is safe to walk.
 */
async function toAnalyzedFile(rel: string, file: File): Promise<AnalyzedFile> {
  if (file.size > 500_000 || isBinaryPath(rel)) {
    return { path: rel, content: '', size: file.size, binary: true };
  }
  const content = await readFileCapped(file);
  if (looksLikeBinary(content)) {
    return { path: rel, content: '', size: file.size, binary: true };
  }
  return { path: rel, content, size: file.size };
}

export function ProjectLinker({ onDigest, disabled = false }: ProjectLinkerProps) {
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const [lastProject, setLastProject] = useState<string | null>(null);
  const fallbackRef = useRef<HTMLInputElement>(null);

  const analyzeFiles = async (projectName: string, entries: { rel: string; file: File }[]) => {
    setStatus({ kind: 'analyzing', files: 0 });
    const seen = { count: 0 };
    const out: AnalyzedFile[] = [];
    for (const { rel, file } of entries) {
      if (seen.count >= MAX_ENTRIES) break;
      if (isSkippedPath(rel)) continue;
      seen.count += 1;
      out.push(await toAnalyzedFile(rel, file));
      if (seen.count % 25 === 0) setStatus({ kind: 'analyzing', files: seen.count });
    }
    setLastProject(projectName);
    setStatus({ kind: 'idle' });
    onDigest(buildProjectDigest(projectName, out), projectName);
  };

  const handlePick = async () => {
    setStatus({ kind: 'analyzing', files: 0 });
    try {
      const picker = (window as PickerWindow).showDirectoryPicker;
      if (picker) {
        const dir = await picker({ mode: 'read' });
        const out: AnalyzedFile[] = [];
        const seen = { count: 0 };
        await walkFsDir(dir, '', out, seen, (n) =>
          setStatus({ kind: 'analyzing', files: n }),
        );
        setLastProject(dir.name);
        setStatus({ kind: 'idle' });
        onDigest(buildProjectDigest(dir.name || 'linked-project', out), dir.name || 'linked-project');
        return;
      }
      // Fallback: classic directory input (Firefox/Safari or non-secure contexts).
      fallbackRef.current?.click();
      setStatus({ kind: 'idle' });
    } catch (e) {
      // AbortError = user cancelled the picker — back to idle silently.
      if (e instanceof DOMException && e.name === 'AbortError') {
        setStatus({ kind: 'idle' });
        return;
      }
      // Surface the real reason instead of a generic message:
      // SecurityError  → non-secure context (must be localhost or HTTPS) or
      //                  protected directory; NotAllowedError → permission
      //                  denied; TypeError/other → unsupported browser.
      const name = e instanceof DOMException ? e.name : e instanceof Error ? e.name : '';
      const msg =
        name === 'SecurityError'
          ? 'SecurityError: directory access requires a secure context (use http://localhost or https).'
          : name === 'NotAllowedError'
            ? 'NotAllowedError: permission to read that directory was denied.'
            : 'Could not read that directory.';
      setStatus({ kind: 'error', message: msg });
    }
  };

  const handleFallbackFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) {
      setStatus({ kind: 'idle' });
      return;
    }
    const list = [...files];
    const first = list[0];
    const rel0: string = (first as File & { webkitRelativePath?: string }).webkitRelativePath ?? '';
    const projectName = rel0.split('/')[0] || 'linked-project';
    await analyzeFiles(
      projectName,
      list.map((f) => ({
        rel: (f as File & { webkitRelativePath?: string }).webkitRelativePath || f.name,
        file: f,
      })),
    );
  };

  const analyzing = status.kind === 'analyzing';

  return (
    <div className="flex flex-col items-center gap-1.5">
      <button
        type="button"
        onClick={() => void handlePick()}
        disabled={disabled || analyzing}
        className="inline-flex items-center gap-2 rounded-[12px] border border-dashed border-[#3a3a3a] bg-transparent px-4 py-2 text-[13px] font-medium text-[#B0B0B0] transition-colors hover:border-accent hover:text-[#ECECEC] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {analyzing ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        ) : (
          <FolderGit2 className="h-4 w-4" aria-hidden />
        )}
        {analyzing
          ? `Analyzing… ${status.files} files`
          : lastProject
            ? `Re-link project (last: ${lastProject})`
            : 'Link project directory'}
      </button>
      <p className="max-w-xs text-center text-[11px] leading-relaxed text-[#8a8a8a]">
        Reads any directory locally in your browser — code, docs, data, media, or mixed
        content in any language — and builds a structural digest. Files stay on your
        device until you run Optimize.
      </p>
      {status.kind === 'error' ? (
        <p className="text-xs text-red-400" role="alert">
          {status.message}
        </p>
      ) : null}
      {/* Fallback for browsers without showDirectoryPicker */}
      <input
        ref={fallbackRef}
        type="file"
        multiple
        className="hidden"
        aria-hidden
        tabIndex={-1}
        // @ts-expect-error — webkitdirectory is non-standard but widely supported
        webkitdirectory=""
        onChange={(e) => void handleFallbackFiles(e.target.files)}
      />
    </div>
  );
}
