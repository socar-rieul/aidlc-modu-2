import { createContext, useCallback, useContext, useState } from 'react';

type Variant = 'info' | 'error';
type Toast = { id: number; text: string; variant: Variant };

const ToastCtx = createContext<{
  toasts: Toast[];
  showInfo: (text: string, ms?: number) => void;
  showError: (text: string, ms?: number) => void;
} | null>(null);

let counter = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const show = useCallback((text: string, variant: Variant, ms: number) => {
    const id = ++counter;
    setToasts((prev) => [...prev, { id, text, variant }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), ms);
  }, []);

  const showInfo = useCallback((text: string, ms = 2500) => show(text, 'info', ms), [show]);
  const showError = useCallback((text: string, ms = 4000) => show(text, 'error', ms), [show]);

  return (
    <ToastCtx.Provider value={{ toasts, showInfo, showError }}>
      {children}
      <div className="toast-container" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast is-${t.variant}`} data-testid={`toast-${t.variant}`}>
            {t.text}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error('useToast must be within ToastProvider');
  return ctx;
}
