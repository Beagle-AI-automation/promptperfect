'use client';

import { useRouter } from 'next/navigation';
import { GUEST_LIMIT } from '@/lib/guest';

interface DemoLimitModalProps {
  open: boolean;
  onClose: () => void;
}

export function DemoLimitModal({ open, onClose }: DemoLimitModalProps) {
  const router = useRouter();

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-[#252525] bg-[#0A0A0A] p-8">
        <h2 className="mb-4 font-heading text-2xl font-bold text-[#E7E6D9]">
          You&apos;ve used all {GUEST_LIMIT} free optimizations
        </h2>
        <p className="mb-6 text-[#B0B0B0]">
          Sign up for a free account to get unlimited prompt optimizations, save
          your prompt library, and access your history across devices.
        </p>

        <div className="space-y-3">
          <button
            type="button"
            onClick={() => router.push('/signup')}
            className="w-full rounded-lg bg-[#4552FF] py-3 font-heading font-semibold text-white transition hover:bg-[#5B6CFF]"
          >
            Sign Up Free
          </button>
          <button
            type="button"
            onClick={() => router.push('/login')}
            className="w-full rounded-lg border border-[#4552FF] bg-transparent py-3 font-heading font-semibold text-[#4552FF] transition hover:bg-[#4552FF]/10"
          >
            Already have an account? Log in
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 text-sm text-[#71717A] transition hover:text-[#B0B0B0]"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}
