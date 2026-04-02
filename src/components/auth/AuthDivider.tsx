export function AuthDivider() {
  return (
    <div className="flex items-center gap-4 py-1" role="separator" aria-hidden>
      <div className="h-px flex-1 bg-[#252525]" />
      <span className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#71717A]">
        or
      </span>
      <div className="h-px flex-1 bg-[#252525]" />
    </div>
  )
}
