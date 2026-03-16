"use client";

import ReactDiffViewer from "react-diff-viewer-continued";
import { useTheme } from "@/components/ThemeProvider";

export interface DiffViewProps {
  original: string;
  optimized: string;
}

export function DiffView({ original, optimized }: DiffViewProps) {
  const { theme } = useTheme();
  const useDarkTheme = theme === "dark";

  return (
    <div className="min-h-[200px] overflow-auto rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 [&_.diff]:!font-mono [&_.diff]:!text-sm">
      <ReactDiffViewer
        oldValue={original}
        newValue={optimized}
        splitView
        useDarkTheme={useDarkTheme}
        showDiffOnly={false}
      />
    </div>
  );
}
