'use client';

import { getGuestLimit } from '@/lib/guest';

interface DemoTokenBarProps {
  count: number;
}

export function DemoTokenBar({ count }: DemoTokenBarProps) {
  const limit = getGuestLimit();
  const remaining = Math.max(0, limit - count);
  const percentage = Math.min(100, (count / limit) * 100);

  const barColor =
    remaining === 0
      ? '#EF4444'
      : remaining === 1
        ? '#F59E0B'
        : '#4552FF';

  return (
    <div className="w-full max-w-[300px] mx-auto mt-3">
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-[#B0B0B0] text-xs font-body">
          {remaining > 0
            ? `${count} of ${limit} free optimizations used`
            : 'Free limit reached — sign up for unlimited'}
        </span>
        <span className="text-[#71717A] text-xs">{remaining} left</span>
      </div>
      <div className="w-full bg-[#252525] rounded-full h-1">
        <div
          className="h-1 rounded-full transition-all duration-500"
          style={{ width: `${percentage}%`, backgroundColor: barColor }}
        />
      </div>
    </div>
  );
}
