import { useParams, useSearchParams } from 'react-router-dom';

const MESSAGES: Record<string, string> = {
  'no-session': 'QR을 다시 스캔해주세요.',
  'scan-failed': 'QR 스캔에 실패했어요. 직원을 호출해주세요.',
  'session-ended': '이용이 종료되었습니다. 감사합니다.',
};

export function ErrorPage() {
  const { code } = useParams<{ code: string }>();
  const [search] = useSearchParams();
  const reason = search.get('code');
  const msg = MESSAGES[code ?? ''] ?? '알 수 없는 오류';
  return (
    <div className="app-shell" data-testid={`error-${code}`} style={{ paddingTop: '2rem', textAlign: 'center' }}>
      <h1 style={{ marginBottom: '1rem' }}>{msg}</h1>
      {reason && <p style={{ color: 'var(--muted)' }}>코드: {reason}</p>}
    </div>
  );
}
