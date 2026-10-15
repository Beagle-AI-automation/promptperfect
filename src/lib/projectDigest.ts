/**
 * Directory analysis for the "Production Audit" flow.
 *
 * `buildProjectDigest` is pure (input: relative paths + selected file
 * contents) so it is unit-testable. The DOM-dependent directory walk lives in
 * `components/ProjectLinker.tsx`, which calls this builder. Everything runs
 * client-side: file contents never leave the browser except inside the
 * optimization request the user explicitly runs.
 *
 * The analysis is content-agnostic: it works for ANY directory — code
 * projects, document folders, datasets, media libraries, or mixed trees.
 * Binary files are listed in the structure (so the model knows they exist)
 * but their contents are never read; text files of any language are sampled.
 */

export interface AnalyzedFile {
  /** Path relative to the linked directory, e.g. `src/app/page.tsx`. */
  path: string;
  /** File contents (already truncated by the walker). Empty when unreadable or binary. */
  content: string;
  /** Size in bytes (approximate is fine). */
  size: number;
  /** True when the file is binary or too large — listed in the tree, content not read. */
  binary?: boolean;
}

/** Hard budgets so a huge tree cannot blow up the prompt. */
export const DIGEST_BUDGETS = {
  maxFilesInTree: 300,
  maxTreeDepth: 8,
  maxContentChars: 40_000,
  maxReadmeChars: 2_000,
  /** Per-file cap when sampling representative non-config content. */
  maxSampleChars: 8_000,
  /** How many representative files to sample after the priority configs. */
  maxSampleFiles: 6,
} as const;

const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  '.next',
  'dist',
  'build',
  'coverage',
  '.turbo',
  '.vercel',
  'vendor',
  '__pycache__',
  '.venv',
  'venv',
  'target',
]);

/**
 * Extensions whose contents are never read as text. Files with these
 * extensions still appear in the structure listing (marked `[binary]`) so
 * non-code directories — photo libraries, design folders, doc archives —
 * are fully represented; only their bytes are skipped.
 * `.svg` is deliberately NOT here: it is plain XML and is read as text.
 */
const BINARY_EXTS = new Set([
  // images (incl. camera RAW)
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.avif', '.ico', '.icns', '.bmp',
  '.tiff', '.tif', '.heic', '.heif', '.cr2', '.cr3', '.nef', '.arw', '.dng',
  '.orf', '.rw2', '.pef',
  // video / audio
  '.mp4', '.mov', '.mkv', '.avi', '.webm', '.m4v', '.wmv', '.flv',
  '.mp3', '.wav', '.flac', '.ogg', '.m4a', '.aac', '.opus', '.aiff',
  // archives / packages / disks
  '.zip', '.tar', '.gz', '.tgz', '.bz2', '.xz', '.7z', '.rar', '.jar',
  '.war', '.ear', '.dmg', '.iso', '.apk', '.ipa', '.deb', '.rpm', '.msi',
  // binary document containers
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
  '.odt', '.ods', '.odp', '.pages', '.numbers', '.key', '.epub', '.mobi',
  // fonts
  '.woff', '.woff2', '.ttf', '.otf', '.eot',
  // executables / compiled artifacts
  '.exe', '.dll', '.so', '.dylib', '.bin', '.dat', '.o', '.a', '.lib',
  '.class', '.pyc', '.pyo', '.wasm', '.beam', '.com',
  // databases / design tools / generated
  '.sqlite', '.sqlite3', '.db', '.mdb',
  '.psd', '.ai', '.sketch', '.fig', '.xd', '.indd',
  '.lock', '.map',
]);

const SIGNAL_FILES = [
  'package.json',
  'requirements.txt',
  'pyproject.toml',
  'Cargo.toml',
  'go.mod',
  'tsconfig.json',
  'Dockerfile',
  'docker-compose.yml',
  '.github/workflows',
  '.gitlab-ci.yml',
  'README.md',
  'LICENSE',
  '.env.example',
] as const;

function extOf(path: string): string {
  const base = path.split('/').pop() ?? path;
  const i = base.lastIndexOf('.');
  return i > 0 ? base.slice(i).toLowerCase() : '';
}

/**
 * Language / format labels by extension. Covers mainstream and niche
 * programming languages, shell scripting, data, config, and document
 * formats. Unknown extensions fall back to the raw extension so the
 * summary still carries real information (e.g. `po (12)`); extensionless
 * files are grouped as `other`.
 */
const LANG_BY_EXT: Record<string, string> = {
  // web
  '.ts': 'TypeScript', '.tsx': 'TypeScript', '.mts': 'TypeScript', '.cts': 'TypeScript',
  '.js': 'JavaScript', '.jsx': 'JavaScript', '.mjs': 'JavaScript', '.cjs': 'JavaScript',
  '.html': 'HTML', '.htm': 'HTML',
  '.css': 'CSS', '.scss': 'SCSS', '.sass': 'Sass', '.less': 'Less', '.styl': 'Stylus',
  '.vue': 'Vue', '.svelte': 'Svelte', '.astro': 'Astro',
  // data / config
  '.json': 'JSON', '.jsonl': 'JSONL', '.ndjson': 'JSONL', '.json5': 'JSON5',
  '.yml': 'YAML', '.yaml': 'YAML', '.toml': 'TOML', '.xml': 'XML', '.svg': 'SVG',
  '.ini': 'INI', '.cfg': 'INI', '.conf': 'config', '.properties': 'properties',
  '.csv': 'CSV', '.tsv': 'TSV', '.tf': 'Terraform', '.hcl': 'HCL',
  '.graphql': 'GraphQL', '.gql': 'GraphQL', '.proto': 'Protobuf',
  // documents / prose
  '.md': 'Markdown', '.mdx': 'Markdown', '.txt': 'text', '.rst': 'reStructuredText',
  '.tex': 'LaTeX', '.adoc': 'AsciiDoc', '.org': 'Org', '.rtf': 'RTF',
  // general-purpose languages
  '.py': 'Python', '.pyi': 'Python', '.ipynb': 'Jupyter',
  '.rs': 'Rust', '.go': 'Go',
  '.java': 'Java', '.kt': 'Kotlin', '.kts': 'Kotlin', '.scala': 'Scala',
  '.groovy': 'Groovy', '.clj': 'Clojure', '.cljs': 'Clojure', '.edn': 'Clojure data',
  '.c': 'C', '.h': 'C/C++ header',
  '.cpp': 'C++', '.cc': 'C++', '.cxx': 'C++', '.hpp': 'C++', '.hh': 'C++',
  '.cs': 'C#', '.fs': 'F#', '.vb': 'VB.NET',
  '.php': 'PHP', '.rb': 'Ruby', '.pl': 'Perl', '.pm': 'Perl',
  '.r': 'R', '.jl': 'Julia', '.lua': 'Lua',
  '.ex': 'Elixir', '.exs': 'Elixir', '.erl': 'Erlang', '.hrl': 'Erlang',
  '.hs': 'Haskell', '.lhs': 'Haskell', '.ml': 'OCaml', '.mli': 'OCaml',
  '.swift': 'Swift', '.m': 'Objective-C', '.mm': 'Objective-C++',
  '.dart': 'Dart', '.zig': 'Zig', '.nim': 'Nim', '.d': 'D', '.v': 'V',
  '.pas': 'Pascal', '.ada': 'Ada', '.f90': 'Fortran', '.f95': 'Fortran',
  '.sol': 'Solidity', '.move': 'Move',
  '.asm': 'assembly', '.s': 'assembly',
  // shell / scripting / query
  '.sh': 'shell', '.bash': 'shell', '.zsh': 'shell', '.fish': 'fish',
  '.ps1': 'PowerShell', '.psm1': 'PowerShell', '.bat': 'batch', '.cmd': 'batch',
  '.sql': 'SQL',
};

function langOf(ext: string): string {
  if (!ext) return 'other';
  return LANG_BY_EXT[ext] ?? ext.slice(1);
}

/** True when the path should never enter the digest (deps, build output, VCS, secrets). */
export function isSkippedPath(path: string): boolean {
  const parts = path.split('/');
  if (parts.some((p) => SKIP_DIRS.has(p))) return true;
  // Never touch real secrets: only the committed `.env.example` is safe.
  const base = parts[parts.length - 1] ?? '';
  if (base.startsWith('.env') && base !== '.env.example') return true;
  return parts.length > DIGEST_BUDGETS.maxTreeDepth + 1;
}

/** True when the extension marks the file as binary (listed, never read). */
export function isBinaryPath(path: string): boolean {
  return BINARY_EXTS.has(extOf(path));
}

/**
 * Content-based binary detection for files with unknown extensions: NUL
 * bytes or a meaningful share of control characters in the first chunk
 * almost always mean the file is not text.
 */
export function looksLikeBinary(content: string): boolean {
  if (!content) return false;
  const sample = content.slice(0, 1_000);
  if (sample.includes('\u0000')) return true;
  let control = 0;
  for (let i = 0; i < sample.length; i++) {
    const c = sample.charCodeAt(i);
    if (c < 9 || (c > 13 && c < 32)) control += 1;
  }
  return control / sample.length > 0.05;
}

function safeJsonParse(text: string): Record<string, unknown> | null {
  try {
    const v = JSON.parse(text) as unknown;
    return typeof v === 'object' && v !== null
      ? (v as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function summarizePackageJson(pkg: Record<string, unknown>): string[] {
  const lines: string[] = [];
  if (typeof pkg.name === 'string') lines.push(`name: ${pkg.name}`);
  const scripts = pkg.scripts;
  if (typeof scripts === 'object' && scripts !== null) {
    const names = Object.keys(scripts as Record<string, unknown>);
    if (names.length) lines.push(`scripts: ${names.join(', ')}`);
  }
  for (const key of ['dependencies', 'devDependencies'] as const) {
    const deps = pkg[key];
    if (typeof deps === 'object' && deps !== null) {
      const names = Object.keys(deps as Record<string, unknown>);
      if (names.length)
        lines.push(`${key} (${names.length}): ${names.slice(0, 25).join(', ')}${names.length > 25 ? ', …' : ''}`);
    }
  }
  return lines;
}

/** Languages that mark a directory as a software project when dominant. */
const CODE_LANGS = new Set([
  'TypeScript', 'JavaScript', 'Python', 'Rust', 'Go', 'Java', 'Kotlin',
  'Scala', 'Groovy', 'Clojure', 'C', 'C++', 'C#', 'F#', 'VB.NET', 'PHP',
  'Ruby', 'Perl', 'R', 'Julia', 'Lua', 'Elixir', 'Erlang', 'Haskell',
  'OCaml', 'Swift', 'Objective-C', 'Objective-C++', 'Dart', 'Zig', 'Nim',
  'D', 'V', 'Pascal', 'Ada', 'Fortran', 'Solidity', 'Move', 'Vue',
  'Svelte', 'Astro',
]);

/**
 * Build the digest text from a linked directory listing.
 * Deterministic, budget-capped, and safe for huge trees.
 *
 * Works for any directory: when the listing does not look like a software
 * project the digest says so, samples representative text files of any
 * kind, and adapts the closing task accordingly.
 */
export function buildProjectDigest(
  projectName: string,
  files: AnalyzedFile[],
): string {
  const usable = files
    .filter((f) => !isSkippedPath(f.path))
    .map((f) => ({
      ...f,
      isBinary:
        f.binary === true || isBinaryPath(f.path) || looksLikeBinary(f.content),
    }));
  const textFiles = usable.filter((f) => !f.isBinary);
  const byPath = new Map(textFiles.map((f) => [f.path, f]));
  const allPaths = new Set(usable.map((f) => f.path));

  const tree = usable
    .map((f) => f.path)
    .sort()
    .slice(0, DIGEST_BUDGETS.maxFilesInTree);
  const binaryPaths = new Set(
    usable.filter((f) => f.isBinary).map((f) => f.path),
  );

  const byLang = new Map<string, number>();
  for (const f of usable) {
    const lang = langOf(extOf(f.path));
    byLang.set(lang, (byLang.get(lang) ?? 0) + 1);
  }
  const langSummary = [...byLang.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([lang, n]) => `${lang} (${n})`)
    .join(', ');

  // Software project vs. any other directory: a known signal file or a
  // majority of code files tips the balance.
  const signalHit = SIGNAL_FILES.some((s) =>
    s.includes('/')
      ? [...allPaths].some((p) => p.startsWith(`${s}/`))
      : allPaths.has(s),
  );
  const codeCount = textFiles.filter((f) =>
    CODE_LANGS.has(langOf(extOf(f.path))),
  ).length;
  const isCodeProject =
    signalHit || codeCount >= Math.max(1, Math.ceil(textFiles.length / 2));

  const out: string[] = [];
  out.push(
    `${isCodeProject ? 'PROJECT' : 'DIRECTORY'} DIGEST — "${projectName}" (auto-generated, local analysis)`,
  );
  out.push(
    `Files analyzed: ${usable.length} (${textFiles.length} text, ${usable.length - textFiles.length} binary/listed-only). Languages & types: ${langSummary || 'n/a'}.`,
  );
  out.push('');
  out.push('STRUCTURE (capped):');
  for (const p of tree)
    out.push(`- ${p}${binaryPaths.has(p) ? ' [binary]' : ''}`);
  if (usable.length > tree.length)
    out.push(`- … and ${usable.length - tree.length} more files`);
  out.push('');

  const pkgFile = byPath.get('package.json');
  if (pkgFile) {
    const pkg = safeJsonParse(pkgFile.content);
    out.push('PACKAGE.JSON:');
    if (pkg) {
      const lines = summarizePackageJson(pkg);
      out.push(...(lines.length ? lines.map((l) => `- ${l}`) : ['- (unparseable)']));
    } else {
      out.push('- (unparseable)');
    }
    out.push('');
  }

  const signals: string[] = [];
  for (const s of SIGNAL_FILES) {
    if (s === 'package.json') continue;
    const hit = s.includes('/')
      ? [...allPaths].some((p) => p.startsWith(`${s}/`))
      : allPaths.has(s);
    signals.push(`${s}: ${hit ? 'yes' : 'no'}`);
  }
  const hasTests = [...allPaths].some((p) =>
    /(^|\/)(__tests__|tests?|spec|e2e)\//.test(p) ||
    /\.(test|spec)\.[a-z]+$/.test(p),
  );
  signals.push(`tests: ${hasTests ? 'yes' : 'no'}`);
  out.push(`SIGNALS: ${signals.join(' | ')}`);
  out.push('');

  // README in any common variant, anywhere in the tree (shallowest wins).
  const readme = [...byPath.values()]
    .filter((f) => /(^|\/)readme(\.(md|mdx|txt|rst))?$/i.test(f.path))
    .sort(
      (a, b) => a.path.split('/').length - b.path.split('/').length,
    )[0];
  if (readme?.content.trim()) {
    out.push('README (excerpt):');
    out.push(readme.content.trim().slice(0, DIGEST_BUDGETS.maxReadmeChars));
    out.push('');
  }

  // Key content: code-project configs first, then representative samples of
  // ANY other text file so non-code directories still carry real content.
  const configPriority = [
    'package.json',
    'tsconfig.json',
    'next.config.ts',
    'next.config.js',
    'Dockerfile',
    'docker-compose.yml',
    '.env.example',
  ];
  let budget = DIGEST_BUDGETS.maxContentChars;
  const included: string[] = [];
  const usedPaths = new Set<string>();
  for (const name of configPriority) {
    const f = byPath.get(name);
    if (!f?.content.trim() || budget <= 0) continue;
    const chunk = f.content.slice(0, budget);
    budget -= chunk.length;
    usedPaths.add(name);
    included.push(`--- ${name} ---\n${chunk}`);
  }
  if (budget > 0) {
    const samples = textFiles
      .filter(
        (f) =>
          !usedPaths.has(f.path) &&
          f.path !== readme?.path &&
          f.content.trim().length > 0,
      )
      .sort((a, b) => b.size - a.size)
      .slice(0, DIGEST_BUDGETS.maxSampleFiles);
    for (const f of samples) {
      if (budget <= 0) break;
      const chunk = f.content
        .slice(0, Math.min(budget, DIGEST_BUDGETS.maxSampleChars))
        .trimEnd();
      budget -= chunk.length;
      included.push(`--- ${f.path} ---\n${chunk}`);
    }
  }
  if (included.length) {
    out.push('KEY FILES:');
    out.push(...included);
    out.push('');
  }

  out.push(
    isCodeProject
      ? 'TASK: write the integral master prompt — everything this project needs ' +
        'to reach maximum refined professional production-ready level.'
      : 'TASK: write the integral master prompt — analyze this directory and its ' +
        'contents (it may not be a code project: documents, data, media, or mixed ' +
        'material) and describe everything it needs to reach maximum refined ' +
        'professional quality, organization, and usefulness.',
  );
  return out.join('\n');
}
