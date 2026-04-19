import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GUEST_LIMIT } from '@/lib/guest';
import { DemoLimitModal } from './DemoLimitModal';

const push = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));

describe('DemoLimitModal', () => {
  it('renders nothing when closed', () => {
    const { container } = render(
      <DemoLimitModal open={false} onClose={() => {}} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('shows headline and CTAs when open', () => {
    render(<DemoLimitModal open onClose={() => {}} />);
    expect(
      screen.getByRole('heading', {
        name: new RegExp(
          `You've used all ${GUEST_LIMIT} free optimizations`,
          'i',
        ),
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sign Up Free/i })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Already have an account/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Maybe later/i })).toBeInTheDocument();
  });

  it('calls onClose for Maybe later', () => {
    const onClose = vi.fn();
    render(<DemoLimitModal open onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: /Maybe later/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('navigates to signup and login', () => {
    push.mockClear();
    render(<DemoLimitModal open onClose={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /Sign Up Free/i }));
    expect(push).toHaveBeenCalledWith('/signup');
    fireEvent.click(screen.getByRole('button', { name: /Already have an account/i }));
    expect(push).toHaveBeenCalledWith('/login');
  });
});
