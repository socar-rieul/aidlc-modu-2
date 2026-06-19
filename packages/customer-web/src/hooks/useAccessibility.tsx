import { createContext, useCallback, useContext, useEffect, useState } from 'react';

type Ctx = {
  largeText: boolean;
  highContrast: boolean;
  toggleLargeText: () => void;
  toggleHighContrast: () => void;
};

const AccessibilityCtx = createContext<Ctx | null>(null);

export function AccessibilityProvider({ children }: { children: React.ReactNode }) {
  const [largeText, setLT] = useState(() => localStorage.getItem('tableOrder.a11y.largeText') === '1');
  const [highContrast, setHC] = useState(() => localStorage.getItem('tableOrder.a11y.highContrast') === '1');

  useEffect(() => {
    document.documentElement.classList.toggle('large-text', largeText);
    localStorage.setItem('tableOrder.a11y.largeText', largeText ? '1' : '');
  }, [largeText]);

  useEffect(() => {
    document.documentElement.classList.toggle('high-contrast', highContrast);
    localStorage.setItem('tableOrder.a11y.highContrast', highContrast ? '1' : '');
  }, [highContrast]);

  const toggleLargeText = useCallback(() => setLT((v) => !v), []);
  const toggleHighContrast = useCallback(() => setHC((v) => !v), []);

  return (
    <AccessibilityCtx.Provider value={{ largeText, highContrast, toggleLargeText, toggleHighContrast }}>
      {children}
    </AccessibilityCtx.Provider>
  );
}

export function useAccessibility(): Ctx {
  const ctx = useContext(AccessibilityCtx);
  if (!ctx) throw new Error('useAccessibility must be used within AccessibilityProvider');
  return ctx;
}
