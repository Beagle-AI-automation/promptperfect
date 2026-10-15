'use client';

import { useId } from 'react';
import Link from 'next/link';
import { Bookmark } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

interface SignInRequiredModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Which locked feature triggered the modal — used for copy. */
  feature?: string;
  /** Override the full modal title. When set, `feature` is ignored for the title. */
  title?: string;
}

export function SignInRequiredModal({
  isOpen,
  onClose,
  feature = 'this feature',
  title,
}: SignInRequiredModalProps) {
  const titleId = useId();

  return (
    <Modal isOpen={isOpen} onClose={onClose} titleId={titleId} maxWidthClass="max-w-sm">
      <div className="p-0">
        {/* Icon */}
        <div className="mb-5 flex flex-col items-center gap-3 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/10 ring-1 ring-accent/20">
            <Bookmark className="h-5 w-5 text-accent-text" strokeWidth={2} />
          </div>
          <div>
            <h2
              id={titleId}
              className="font-heading text-lg font-semibold text-[#E7E6D9]"
            >
              {title ?? `Sign in to use ${feature}`}
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-[#888]">
              Create a free account to save your prompt library, view history
              across devices, and unlock unlimited optimizations.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2.5">
          <Link href="/signup" onClick={onClose} className="block w-full">
            <Button className="w-full">Create free account</Button>
          </Link>
          <Link href="/login" onClick={onClose} className="block w-full">
            <Button className="w-full" variant="outline">
              Log in
            </Button>
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="mt-1 text-xs text-[#555] transition hover:text-[#888]"
          >
            Maybe later
          </button>
        </div>
      </div>
    </Modal>
  );
}
