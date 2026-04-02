'use client';

import { useRouter } from 'next/navigation';

interface DemoLimitModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DemoLimitModal({ isOpen, onClose }: DemoLimitModalProps) {
  const router = useRouter();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0A0A0A] border border-[#252525] rounded-xl p-8 max-w-md w-full shadow-2xl">
        <div className="mb-5">
          <div className="w-10 h-10 rounded-full bg-[#4552FF]/15 flex items-center justify-center mb-4">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M10 2L12.39 7.26L18 8.27L14 12.14L14.76 18L10 15.27L5.24 18L6 12.14L2 8.27L7.61 7.26L10 2Z" fill="#4552FF"/>
            </svg>
          </div>
          <h2 className="text-[#E7E6D9] font-heading text-xl font-bold mb-2">
            You&apos;ve used all 5 free optimizations
          </h2>
          <p className="text-[#B0B0B0] text-sm leading-relaxed">
            Sign up for a free account to get unlimited prompt optimizations, save your prompt library, and access your history across devices.
          </p>
        </div>

        <div className="space-y-2.5">
          <button
            type="button"
            onClick={() => router.push('/signup')}
            className="w-full bg-[#4552FF] text-white py-2.5 rounded-lg font-heading font-semibold text-sm hover:bg-[#5B6CFF] transition-colors"
          >
            Sign Up Free
          </button>
          <button
            type="button"
            onClick={() => router.push('/login')}
            className="w-full bg-transparent text-[#4552FF] border border-[#4552FF] py-2.5 rounded-lg font-heading font-semibold text-sm hover:bg-[#4552FF]/10 transition-colors"
          >
            Already have an account? Log in
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full text-[#71717A] text-xs hover:text-[#B0B0B0] transition-colors py-2"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}
