import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AccessibilityProvider } from './hooks/useAccessibility';
import { ToastProvider } from './hooks/useToast';
import { RequireSession } from './routes/RequireSession';
import { QrEntryPage } from './pages/QrEntryPage';
import { MenuPage } from './pages/MenuPage';
import { CartPage } from './pages/CartPage';
import { OrderHistoryPage } from './pages/OrderHistoryPage';
import { HelpRoutePage } from './pages/HelpOverlay';
import { ErrorPage } from './pages/ErrorPage';

const qc = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, refetchOnWindowFocus: false, retry: 1 },
  },
});

export function App() {
  return (
    <QueryClientProvider client={qc}>
      <AccessibilityProvider>
        <ToastProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/qr/:token" element={<QrEntryPage />} />
              <Route path="/menu" element={<RequireSession><MenuPage /></RequireSession>} />
              <Route path="/cart" element={<RequireSession><CartPage /></RequireSession>} />
              <Route path="/orders" element={<RequireSession><OrderHistoryPage /></RequireSession>} />
              <Route path="/help" element={<RequireSession><HelpRoutePage /></RequireSession>} />
              <Route path="/error/:code" element={<ErrorPage />} />
              <Route path="/" element={<Navigate to="/error/no-session" replace />} />
              <Route path="*" element={<Navigate to="/error/no-session" replace />} />
            </Routes>
          </BrowserRouter>
        </ToastProvider>
      </AccessibilityProvider>
    </QueryClientProvider>
  );
}
