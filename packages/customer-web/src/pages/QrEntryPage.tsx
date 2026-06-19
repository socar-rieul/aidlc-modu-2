import { useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { QrScanResponse } from '@table-order/shared';
import { api, ApiError } from '../api/client';
import { setSession } from '../hooks/useSessionToken';

export function QrEntryPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const ran = useRef(false);

  useEffect(() => {
    if (!token || ran.current) return;
    ran.current = true;
    (async () => {
      try {
        const data = await api.post<QrScanResponse>(`/qr/scan/${token}`);
        setSession({
          sessionToken: data.sessionToken,
          sessionId: data.sessionId,
          storeId: data.storeId,
          storeName: data.storeName,
          tableNumber: data.tableNumber,
        });
        navigate('/menu', { replace: true });
      } catch (err) {
        const code = err instanceof ApiError ? err.errorCode : 'SCAN_FAILED';
        navigate(`/error/scan-failed?code=${encodeURIComponent(code)}`, { replace: true });
      }
    })();
  }, [token, navigate]);

  return (
    <div className="app-shell" data-testid="qr-entry">
      <p style={{ marginTop: '2rem', textAlign: 'center' }}>QR을 확인하는 중…</p>
    </div>
  );
}
