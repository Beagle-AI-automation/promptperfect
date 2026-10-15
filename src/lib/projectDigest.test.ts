import { describe, it, expect } from "vitest";
import {
  buildProjectDigest,
  isBinaryPath,
  isSkippedPath,
  looksLikeBinary,
  type AnalyzedFile,
} from "./projectDigest";

function file(path: string, content = "x"): AnalyzedFile {
  return { path, content, size: content.length };
}

describe("isSkippedPath", () => {
  it("skips deps, build output and vcs — but never binaries or media", () => {
    expect(isSkippedPath("node_modules/react/index.js")).toBe(true);
    expect(isSkippedPath(".git/config")).toBe(true);
    expect(isSkippedPath("dist/bundle.js")).toBe(true);
    // Binaries are part of the structure: listed in the tree, just not read.
    expect(isSkippedPath("logo.png")).toBe(false);
    expect(isSkippedPath("photos/raw/IMG_0001.CR2".toLowerCase())).toBe(false);
    expect(isSkippedPath("docs/report.pdf")).toBe(false);
    expect(isSkippedPath("src/app/page.tsx")).toBe(false);
  });

  it("never touches real env files, only .env.example", () => {
    expect(isSkippedPath(".env.local")).toBe(true);
    expect(isSkippedPath(".env")).toBe(true);
    expect(isSkippedPath("api/.env.production")).toBe(true);
    expect(isSkippedPath(".env.example")).toBe(false);
  });

  it("caps depth", () => {
    expect(isSkippedPath("a/b/c/d/e/f/g/h/i/j.ts")).toBe(true);
    expect(isSkippedPath("a/b/c/d/e/f/g/h.ts")).toBe(false);
    expect(isSkippedPath("a/b/c.ts")).toBe(false);
  });
});

describe("isBinaryPath", () => {
  it("flags known binary extensions of any kind", () => {
    for (const p of [
      "logo.png",
      "photo.dng",
      "clip.mp4",
      "song.flac",
      "backup.zip",
      "report.pdf",
      "slides.pptx",
      "font.woff2",
      "app.exe",
      "model.wasm",
      "data.sqlite",
      "design.fig",
    ]) {
      expect(isBinaryPath(p)).toBe(true);
    }
  });

  it("treats text formats — including svg — as readable", () => {
    for (const p of ["icon.svg", "notes.txt", "data.csv", "main.rs", "doc.md"]) {
      expect(isBinaryPath(p)).toBe(false);
    }
  });
});

describe("looksLikeBinary", () => {
  it("detects NUL bytes and control-char soup", () => {
    expect(looksLikeBinary("abc\u0000def")).toBe(true);
    expect(looksLikeBinary("\x01\x02\x03\x04\x05\x06\x07".repeat(20))).toBe(true);
  });

  it("accepts plain, unicode and empty text", () => {
    expect(looksLikeBinary("hello world\n")).toBe(false);
    expect(looksLikeBinary("úñïçødé — texto con acentos\t\n")).toBe(false);
    expect(looksLikeBinary("")).toBe(false);
  });
});

describe("buildProjectDigest", () => {
  const files = [
    file("package.json", JSON.stringify({
      name: "demo",
      scripts: { dev: "next dev", build: "next build" },
      dependencies: { next: "16.0.0", react: "19.0.0" },
    })),
    file("src/app/page.tsx", "export default function Page() {}"),
    file("src/app/api/route.ts", "export async function GET() {}"),
    file("src/lib/util.test.ts", "it('works', () => {})"),
    file("node_modules/foo/index.js", "ignored"),
    file("README.md", "# Demo\nA demo project."),
    file("Dockerfile", "FROM node:22"),
  ];

  it("summarizes structure, stack, signals and key files", () => {
    const digest = buildProjectDigest("demo", files);
    expect(digest).toContain('PROJECT DIGEST — "demo"');
    expect(digest).toContain("- src/app/page.tsx");
    expect(digest).not.toContain("node_modules");
    expect(digest).toContain("scripts: dev, build");
    expect(digest).toContain("dependencies (2): next, react");
    expect(digest).toContain("Dockerfile: yes");
    expect(digest).toContain("tests: yes");
    expect(digest).toContain("--- package.json ---");
    expect(digest).toContain("README (excerpt):");
    expect(digest).toContain("TASK: write the integral master prompt");
  });

  it("lists binary-only directories in the tree without reading them", () => {
    const digest = buildProjectDigest("empty", [file("a.png", "")]);
    expect(digest).toContain('DIRECTORY DIGEST — "empty"');
    expect(digest).toContain("Files analyzed: 1 (0 text, 1 binary/listed-only)");
    expect(digest).toContain("- a.png [binary]");
    expect(digest).toContain("TASK:");
  });

  it("analyzes non-project directories: any structure, any language", () => {
    const digest = buildProjectDigest("misc", [
      file("docs/README.txt", "Field notes archive."),
      file("notes.txt", "ideas worth keeping"),
      file("data/measurements.csv", "date,value\n2026-01-01,42"),
      file("scripts/organize.sh", "#!/bin/sh\nls"),
      file("photos/cat.png", ""),
      file("video/clip.mp4", ""),
      file("weird/data.po", 'msgid "hello"'),
    ]);
    expect(digest).toContain('DIRECTORY DIGEST — "misc"');
    expect(digest).toContain("Files analyzed: 7 (5 text, 2 binary/listed-only)");
    // every file appears in the structure, binaries marked
    expect(digest).toContain("- photos/cat.png [binary]");
    expect(digest).toContain("- video/clip.mp4 [binary]");
    expect(digest).toContain("- notes.txt");
    // readme variant found at depth; representative text content sampled
    expect(digest).toContain("README (excerpt):");
    expect(digest).toContain("Field notes archive.");
    expect(digest).toContain("KEY FILES:");
    expect(digest).toContain("--- notes.txt ---");
    expect(digest).toContain("--- data/measurements.csv ---");
    // unknown extension keeps its real label instead of "other"
    expect(digest).toContain("po (1)");
    // the task adapts to non-code material
    expect(digest).toContain("it may not be a code project");
  });

  it("still detects code projects without a package.json", () => {
    const digest = buildProjectDigest("scripts", [
      file("main.py", "print('hi')"),
      file("lib/util.py", "def f(): pass"),
      file("run.sh", "#!/bin/sh"),
    ]);
    expect(digest).toContain('PROJECT DIGEST — "scripts"');
    expect(digest).toContain("Python (2)");
  });

  it("reads svg and other text formats as content", () => {
    const digest = buildProjectDigest("assets", [
      file("icon.svg", "<svg xmlns=\"http://www.w3.org/2000/svg\"/>"),
      file("data.json", "{}"),
    ]);
    expect(digest).toContain("SVG (1)");
    expect(digest).toContain("--- icon.svg ---");
  });

  it("caps the tree for huge repos", () => {
    const many = Array.from({ length: 500 }, (_, i) => file(`src/f${i}.ts`, "x"));
    const digest = buildProjectDigest("big", many);
    expect(digest).toContain("and 200 more files");
  });

  it("labels every supported language and extensionless files", () => {
    // The language summary keeps the top 8, so split across digests.
    const first = buildProjectDigest(
      "langs-1",
      ["a.js", "e.py", "f.rs", "g.go", "h.mdx", "i.css", "k.html", "l.yml"].map(
        (p) => file(p),
      ),
    );
    for (const label of [
      "JavaScript",
      "Python",
      "Rust",
      "Go",
      "Markdown",
      "CSS",
      "HTML",
      "YAML",
    ]) {
      expect(first).toContain(label);
    }
    const second = buildProjectDigest(
      "langs-2",
      ["b.jsx", "c.mjs", "d.cjs", "j.scss", "m.yaml", "n.toml", "o.sql"].map(
        (p) => file(p),
      ),
    );
    for (const label of ["JavaScript", "CSS", "YAML", "TOML", "SQL"]) {
      expect(second).toContain(label);
    }
    const third = buildProjectDigest(
      "langs-3",
      ["LICENSE", ".hidden"].map((p) => file(p)),
    );
    expect(third).toContain("other");
  });

  it("marks unparseable package.json without throwing", () => {
    const digest = buildProjectDigest("bad", [
      file("package.json", "not json{{{"),
    ]);
    expect(digest).toContain("PACKAGE.JSON:");
    expect(digest).toContain("- (unparseable)");
  });

  it("marks valid but empty package.json as unparseable", () => {
    const digest = buildProjectDigest("empty-pkg", [file("package.json", "{}")]);
    expect(digest).toContain("- (unparseable)");
  });

  it("marks non-object package.json as unparseable", () => {
    const digest = buildProjectDigest("str-pkg", [
      file("package.json", '"just a string"'),
    ]);
    expect(digest).toContain("- (unparseable)");
  });

  it("truncates long dependency lists and skips empty scripts", () => {
    const deps = Object.fromEntries(
      Array.from({ length: 30 }, (_, i) => [`dep-${i}`, "1.0.0"]),
    );
    const digest = buildProjectDigest("many-deps", [
      file("package.json", JSON.stringify({ scripts: {}, dependencies: deps })),
    ]);
    expect(digest).toContain("dependencies (30):");
    expect(digest).toContain("…");
    expect(digest).not.toContain("scripts:");
  });

  it("detects workflow dirs and test dirs as signals", () => {
    const digest = buildProjectDigest("signals", [
      file(".github/workflows/ci.yml", "jobs: {}"),
      file("tests/unit/a.ts", "x"),
    ]);
    expect(digest).toContain(".github/workflows: yes");
    expect(digest).toContain("tests: yes");
  });

  it("stops including key files once the content budget is spent", () => {
    const digest = buildProjectDigest("budget", [
      file("package.json", "x".repeat(45_000)),
      file("tsconfig.json", '{"compilerOptions": {}}'),
    ]);
    expect(digest).toContain("--- package.json ---");
    expect(digest).not.toContain("--- tsconfig.json ---");
  });

  it("skips empty readme and empty configs", () => {
    const digest = buildProjectDigest("empty-content", [
      file("README.md", ""),
      file("tsconfig.json", "   "),
      file("src/a.ts", ""),
    ]);
    expect(digest).not.toContain("README (excerpt):");
    expect(digest).not.toContain("KEY FILES:");
  });
});
