import { describe, it, expect } from 'vitest';
import { getBlockingA11yViolations } from '@/test/axe';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { SegmentedToggle } from '@/components/ui/SegmentedToggle';
import { FeedbackButtons } from '@/components/FeedbackButtons';
import { Inbox } from 'lucide-react';

describe('accessibility (axe)', () => {
  it('Button variants have no critical/serious violations', async () => {
    const violations = await getBlockingA11yViolations(
      <div>
        <Button>Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="outline">Outline</Button>
        <Button size="icon" aria-label="Icon button" />
        <Button disabled>Disabled</Button>
      </div>,
    );
    expect(violations).toEqual([]);
  });

  it('EmptyState with an action has no critical/serious violations', async () => {
    const violations = await getBlockingA11yViolations(
      <EmptyState
        icon={Inbox}
        title="Nothing here"
        description="Add something to get started."
        action={<Button size="sm">Add</Button>}
      />,
    );
    expect(violations).toEqual([]);
  });

  it('SegmentedToggle exposes named, pressable options', async () => {
    const violations = await getBlockingA11yViolations(
      <SegmentedToggle
        aria-label="View"
        value="a"
        onChange={() => {}}
        options={[
          { value: 'a', label: 'Alpha' },
          { value: 'b', label: 'Beta' },
        ]}
      />,
    );
    expect(violations).toEqual([]);
  });

  it('FeedbackButtons (icon-only) expose accessible names', async () => {
    const violations = await getBlockingA11yViolations(
      <FeedbackButtons
        sessionId={null}
        mode="better"
        provider="gemini"
        inputLength={10}
        outputLength={50}
        disabled={false}
      />,
    );
    expect(violations).toEqual([]);
  });

  it('harness catches a known violation (icon-only button without a name)', async () => {
    const violations = await getBlockingA11yViolations(
      <button type="button">
        <span aria-hidden>*</span>
      </button>,
    );
    expect(violations.map((v) => v.id)).toContain('button-name');
  });
});
