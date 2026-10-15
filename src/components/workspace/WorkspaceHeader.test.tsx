'use client';

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WorkspaceHeader } from './WorkspaceHeader';

vi.mock('@/lib/client/userProfile', () => ({
  fetchProfileFromApi: vi.fn(async () => null),
}));

const USER = { id: 'u-1', name: 'Ada', email: 'ada@x.com', provider: 'gemini', model: 'm' };

describe('WorkspaceHeader', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('renders account controls for signed-in users', () => {
    const onOpenSettings = vi.fn();
    const onLogout = vi.fn();
    render(
      <WorkspaceHeader
        user={USER}
        signingOut={false}
        onOpenSettings={onOpenSettings}
        onRequireSignIn={() => {}}
        onLogout={onLogout}
      />,
    );
    expect(screen.getByRole('link', { name: 'Library' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    expect(onOpenSettings).toHaveBeenCalledTimes(1);
    // Icon-only account trigger must expose an accessible name.
    expect(
      screen.getByRole('button', { name: /account menu/i })
    ).toBeInTheDocument();
  });

  it('renders guest auth links and gates the library', () => {
    const onRequireSignIn = vi.fn();
    render(
      <WorkspaceHeader
        user={null}
        signingOut={false}
        onOpenSettings={() => {}}
        onRequireSignIn={onRequireSignIn}
        onLogout={() => {}}
      />,
    );
    expect(screen.getByRole('link', { name: 'Log in' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sign up' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Library' }));
    expect(onRequireSignIn).toHaveBeenCalledTimes(1);
  });

  it('links guests straight to the library in unlimited mode', () => {
    vi.stubEnv('NEXT_PUBLIC_UNLIMITED_MODE', 'true');
    render(
      <WorkspaceHeader
        user={null}
        signingOut={false}
        onOpenSettings={() => {}}
        onRequireSignIn={() => {
          throw new Error('must not gate in unlimited mode');
        }}
        onLogout={() => {}}
      />,
    );
    expect(screen.getByRole('link', { name: 'Library' })).toHaveAttribute('href', '/library');
  });
});
