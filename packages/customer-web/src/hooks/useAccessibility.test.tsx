import { describe, it, expect, beforeEach } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { AccessibilityProvider, useAccessibility } from './useAccessibility';

function ToggleProbe() {
  const { largeText, toggleLargeText } = useAccessibility();
  return (
    <button data-testid="probe" onClick={toggleLargeText}>
      {largeText ? 'on' : 'off'}
    </button>
  );
}

describe('useAccessibility', () => {
  beforeEach(() => {
    for (const k of ['tableOrder.a11y.largeText', 'tableOrder.a11y.highContrast']) {
      try { localStorage.removeItem(k); } catch {}
    }
    document.documentElement.className = '';
  });

  it('큰 글자 토글 → html classList + localStorage 영속', () => {
    render(
      <AccessibilityProvider>
        <ToggleProbe />
      </AccessibilityProvider>,
    );
    const btn = screen.getByTestId('probe');
    expect(btn.textContent).toBe('off');
    expect(document.documentElement.classList.contains('large-text')).toBe(false);

    act(() => btn.click());
    expect(btn.textContent).toBe('on');
    expect(document.documentElement.classList.contains('large-text')).toBe(true);
    expect(localStorage.getItem('tableOrder.a11y.largeText')).toBe('1');
  });
});
