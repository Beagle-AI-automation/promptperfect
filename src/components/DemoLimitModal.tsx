'use client';

import Link from 'next/link';

interface DemoLimitModalProps {
  open: boolean;
  onClose: () => void;
  isGuest: boolean;
  message: string;
}

export function DemoLimitModal({
  open,
  onClose,
  isGuest,
  message,
}: DemoLimitModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-xl border border-zinc-700 bg-zinc-900 p-6 shadow-xl">
        <p className="text-lg text-[#ECECEC]">{message}</p>
        <div className="mt-6 flex gap-3">
          {isGuest ? (
            <Link
              href="/signup"
              className="flex-1 rounded-lg bg-[#4552FF] py-2.5 text-center text-sm font-semibold text-white hover:opacity-90"
            >
              Sign Up
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => {
                onClose();
                document.dispatchEvent(new CustomEvent('open-settings'));
              }}
              className="flex-1 rounded-lg bg-[#4552FF] py-2.5 text-sm font-semibold text-white hover:opacity-90"
            >
              Open Settings
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-zinc-600 px-4 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
