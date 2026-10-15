'use client';

import { useId } from 'react';
import { useRouter } from 'next/navigation';
import { Star } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { getGuestLimit } from '@/lib/guest';

interface DemoLimitModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DemoLimitModal({ isOpen, onClose }: DemoLimitModalProps) {
  const router = useRouter();
  const limit = getGuestLimit();
  const titleId = useId();

  return (
    <Modal isOpen={isOpen} onClose={onClose} titleId={titleId} maxWidthClass="max-w-md">
      <div className="mb-5">
        <div className="w-10 h-10 rounded-full bg-accent/15 flex items-center justify-center mb-4">
          <Star className="h-5 w-5 text-accent-text" fill="currentColor" aria-hidden />
        </div>
        <h2 id={titleId} className="text-[#E7E6D9] font-heading text-xl font-bold mb-2">
          You&apos;ve used all {limit} free optimizations
        </h2>
        <p className="text-[#B0B0B0] text-sm leading-relaxed">
          Sign up for a free account to get unlimited prompt optimizations, save your prompt library, and access your history across devices.
        </p>
      </div>

      <div className="space-y-2.5">
        <button
          type="button"
          onClick={() => router.push('/signup')}
          className="w-full bg-accent text-white py-2.5 rounded-lg font-heading font-semibold text-sm hover:bg-[#5B6CFF] transition-colors"
        >
          Sign Up Free
        </button>
        <button
          type="button"
          onClick={() => router.push('/login')}
          className="w-full bg-transparent text-accent-text border border-accent py-2.5 rounded-lg font-heading font-semibold text-sm hover:bg-[#5B6CFF]/10 transition-colors"
        >
          Already have an account? Log in
        </button>
        <button
          type="button"
          onClick={onClose}
          className="w-full text-[#8a8a8a] text-xs hover:text-[#B0B0B0] transition-colors py-2"
        >
          Maybe later
        </button>
      </div>
    </Modal>
  );
}
