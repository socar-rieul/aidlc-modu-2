import { useNavigate } from 'react-router-dom';
import { useSessionToken } from '../hooks/useSessionToken';
import { useAccessibility } from '../hooks/useAccessibility';

export function PageHeader({ title }: { title?: string }) {
  const { storeName, tableNumber } = useSessionToken();
  const { largeText, highContrast, toggleLargeText, toggleHighContrast } = useAccessibility();
  const navigate = useNavigate();
  return (
    <header className="page-header">
      <h1>{title ?? `${storeName ?? ''} ${tableNumber ? `${tableNumber}번` : ''}`.trim()}</h1>
      <button
        data-testid="large-text-toggle"
        onClick={toggleLargeText}
        aria-pressed={largeText}
        title="글자 크기"
      >
        가
      </button>
      <button
        data-testid="high-contrast-toggle"
        onClick={toggleHighContrast}
        aria-pressed={highContrast}
        title="고대비"
      >
        ◐
      </button>
      <button data-testid="help-button" onClick={() => navigate('/help')} title="도움말">
        ?
      </button>
    </header>
  );
}
