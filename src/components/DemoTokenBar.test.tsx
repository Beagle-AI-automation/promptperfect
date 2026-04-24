import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DemoTokenBar } from './DemoTokenBar';

vi.mock('@/lib/guest', () => ({
  getGuestCount: vi.fn(() => 2),
  getGuestLimit: vi.fn(() => 5),
}));

describe('DemoTokenBar', () => {
  it('renders nothing for authenticated users', () => {
    const { container } = render(<DemoTokenBar isAuthenticated />);
    expect(container.firstChild).toBeNull();
  });

  it('shows remaining count for guests', () => {
    render(<DemoTokenBar isAuthenticated={false} />);
    expect(screen.getAllByText(/free optimization/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/2 of 5 free optimizations used/i)).toBeTruthy();
    expect(screen.getByText(/3 free optimizations remaining/i)).toBeTruthy();
  });
});
