import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider } from './hooks/useToast';
import { RequireAuth } from './routes/RequireAuth';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { MenuManagementPage } from './pages/MenuManagementPage';
import { TableManagementPage } from './pages/TableManagementPage';
import { OrderHistoryPage } from './pages/OrderHistoryPage';

const qc = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: false, retry: 1 } },
});

export function App() {
  return (
    <QueryClientProvider client={qc}>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<RequireAuth><DashboardPage /></RequireAuth>} />
            <Route path="/menus" element={<RequireAuth><MenuManagementPage /></RequireAuth>} />
            <Route path="/tables" element={<RequireAuth><TableManagementPage /></RequireAuth>} />
            <Route path="/history" element={<RequireAuth><OrderHistoryPage /></RequireAuth>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </QueryClientProvider>
  );
}
