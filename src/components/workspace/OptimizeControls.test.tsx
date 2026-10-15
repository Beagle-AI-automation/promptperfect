'use client';

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { OptimizeControls } from './OptimizeControls';

describe('OptimizeControls', () => {
  it('disables Optimize without input and shows the loading state', () => {
    const onOptimize = vi.fn();
    const { rerender } = render(
      <OptimizeControls
        selectedMode="better"
        onModeChange={() => {}}
        disabled={false}
        canOptimize={false}
        isLoading={false}
        onOptimize={onOptimize}
        onDigest={() => {}}
        guestUsageVersion={0}
        isAuthenticated={false}
      />,
    );
    const btn = screen.getByRole('button', { name: 'Optimize' });
    expect(btn).toBeDisabled();
    fireEvent.click(btn);
    expect(onOptimize).not.toHaveBeenCalled();

    rerender(
      <OptimizeControls
        selectedMode="better"
        onModeChange={() => {}}
        disabled={false}
        canOptimize={true}
        isLoading={false}
        onOptimize={onOptimize}
        onDigest={() => {}}
        guestUsageVersion={0}
        isAuthenticated={false}
      />,
    );
    const enabled = screen.getByRole('button', { name: 'Optimize' });
    expect(enabled).toBeEnabled();
    fireEvent.click(enabled);
    expect(onOptimize).toHaveBeenCalledTimes(1);
  });

  it('shows Optimizing… while loading and forwards mode changes', () => {
    const onModeChange = vi.fn();
    render(
      <OptimizeControls
        selectedMode="better"
        onModeChange={onModeChange}
        disabled={true}
        canOptimize={true}
        isLoading={true}
        onOptimize={() => {}}
        onDigest={() => {}}
        guestUsageVersion={3}
        isAuthenticated={true}
      />,
    );
    expect(screen.getByRole('button', { name: 'Optimizing…' })).toBeDisabled();
  });
});
