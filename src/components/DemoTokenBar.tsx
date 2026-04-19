'use client';

import { getGuestCount, getGuestLimit } from '@/lib/guest';

interface DemoTokenBarProps {
  isAuthenticated: boolean;
}

export function DemoTokenBar({ isAuthenticated }: DemoTokenBarProps) {
  const limit = getGuestLimit();

  if (isAuthenticated) return null;

  const count = getGuestCount();
  const percentage = limit > 0 ? (count / limit) * 100 : 0;
  const remaining = Math.max(0, limit - count);

  return (
    <div className="mx-auto mb-4 w-full max-w-2xl">
      <p className="mb-1 text-center text-sm text-[#B0B0B0]">
        {count} of {limit} free optimizations used
      </p>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-sm text-[#B0B0B0]">
          {remaining > 0
            ? `${remaining} free optimization${remaining !== 1 ? 's' : ''} remaining`
            : 'Free limit reached — sign up for unlimited'}
        </span>
        <span className="text-xs text-[#71717A]">
          {count}/{limit}
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-[#252525]">
        <div
          className="h-1.5 rounded-full transition-all duration-500"
          style={{
            width: `${Math.min(100, percentage)}%`,
            backgroundColor:
              remaining > 2 ? '#4552FF' : remaining > 0 ? '#F59E0B' : '#EF4444',
          }}
        />
      </div>
    </div>
  );
}
