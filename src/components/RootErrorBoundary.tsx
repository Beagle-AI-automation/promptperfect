"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode };

type State = { hasError: boolean };

export class RootErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[RootErrorBoundary]", error.message, errorInfo.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4 sm:p-6">
          <div className="w-full max-w-md rounded-2xl border border-[#252525] bg-gradient-to-b from-white/[0.07] to-white/[0.02] p-8 shadow-[0_24px_64px_-16px_rgba(0,0,0,0.9)] text-center">
            <h1 className="font-heading text-xl font-semibold text-[#E7E6D9]">
              Something went wrong
            </h1>
            <p className="mt-3 text-sm text-[#E7E6D9]/70">
              The app hit an unexpected error. You can reload the page to try again.
            </p>
            <button
              type="button"
              className="mt-6 w-full rounded-xl border border-[#353535] bg-white/[0.06] px-4 py-3 text-sm font-medium text-[#E7E6D9] transition hover:bg-white/[0.1]"
              onClick={() => window.location.reload()}
            >
              Reload page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
