/**
 * Static code sample for /docs. Uses <figure> (never nested in <p>) and
 * suppressHydrationWarning on <pre> so browser extensions (Grammarly, etc.)
 * that wrap code blocks do not trigger hydration mismatches.
 */
export function DocsCodeBlock({ children }: { children: string }) {
  return (
    <figure className="not-prose mt-3">
      {/* WCAG 2.1.1: a horizontally scrollable region must be reachable by
          keyboard. tabIndex + role make the overflow-x-auto area focusable,
          and the label tells screen-reader users what the region is. */}
      <pre
        suppressHydrationWarning
        tabIndex={0}
        role="region"
        aria-label="Code sample"
        className="overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-left text-[12px] leading-relaxed text-zinc-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent sm:p-4 sm:text-[13px]"
      >
        <code suppressHydrationWarning className="font-mono whitespace-pre">
          {children}
        </code>
      </pre>
    </figure>
  );
}
