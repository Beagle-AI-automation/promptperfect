'use client';

import { Copy } from 'lucide-react';
import { useCopy } from '@/lib/clipboard';
import { Button } from '@/components/ui/Button';

interface CopyButtonProps {
  text: string;
  label?: string;
  disabled?: boolean;
}

export function CopyButton({ text, label = 'Copy', disabled }: CopyButtonProps) {
  const { copied, copy } = useCopy(900);
  const canCopy = Boolean(text.trim()) && !disabled;

  return (
    <Button
      size="sm"
      variant="outline"
      disabled={!canCopy}
      onClick={() => {
        if (canCopy) void copy(text);
      }}
    >
      <Copy className="h-4 w-4" />
      {copied ? 'Copied' : label}
    </Button>
  );
}


