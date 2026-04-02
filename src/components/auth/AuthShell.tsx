import type { ReactNode } from 'react'

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md rounded-2xl border border-[#252525] bg-gradient-to-b from-white/[0.07] to-white/[0.02] p-8 shadow-[0_24px_64px_-16px_rgba(0,0,0,0.9)]">
        <div className="font-sans text-[#E7E6D9] antialiased">{children}</div>
      </div>
    </div>
  )
}
