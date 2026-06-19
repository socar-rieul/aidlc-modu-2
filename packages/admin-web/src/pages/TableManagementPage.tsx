import { useState } from 'react';
import type { TableDto } from '@table-order/shared';
import { AdminHeader } from '../components/AdminHeader';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useQrDownload, useTableMutations, useTablesQuery } from '../hooks/queries';
import { useToast } from '../hooks/useToast';
import { ApiError } from '../api/client';

export function TableManagementPage() {
  const { data: tables, isLoading } = useTablesQuery();
  const { create, regenerateQr, closeSession } = useTableMutations();
  const qrDownload = useQrDownload();
  const { showInfo, showError } = useToast();
  const [number, setNumber] = useState(6);
  const [askRegen, setAskRegen] = useState<TableDto | null>(null);
  const [askClose, setAskClose] = useState<TableDto | null>(null);

  const onCreate = (e: React.FormEvent) => {
    e.preventDefault();
    create.mutate({ number }, {
      onSuccess: () => { showInfo(`테이블 ${number}번을 등록했어요.`); setNumber(number + 1); },
      onError: (e: ApiError | any) => {
        if (e?.errorCode === 'TABLE_NUMBER_DUPLICATE') showError('이미 같은 번호의 테이블이 있습니다.');
        else showError(e?.message ?? '실패');
      },
    });
  };

  return (
    <div className="shell">
      <AdminHeader />
      <h2 style={{ marginTop: '1rem' }}>테이블 관리</h2>

      <form className="table-form card" onSubmit={onCreate} data-testid="table-form">
        <label>
          새 테이블 번호
          <input
            type="number"
            min={1}
            data-testid="table-form-number"
            value={number}
            onChange={(e) => setNumber(Number(e.target.value))}
            required
          />
        </label>
        <button type="submit" data-testid="table-form-submit">+ 테이블 추가 + QR 발급</button>
      </form>

      {isLoading ? (
        <p>불러오는 중…</p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>번호</th>
              <th>QR 토큰</th>
              <th>QR 다운로드</th>
              <th>액션</th>
            </tr>
          </thead>
          <tbody>
            {tables?.map((t) => (
              <tr key={t.id} data-testid={`table-row-${t.id}`}>
                <td>{t.number}</td>
                <td style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{t.qrToken.slice(0, 12)}…</td>
                <td>
                  <button
                    className="secondary"
                    data-testid={`qr-download-${t.id}-png`}
                    onClick={() =>
                      qrDownload.mutate({ tableId: t.id, format: 'png' }, {
                        onError: (e: any) => showError(e?.message ?? '다운로드 실패'),
                      })
                    }
                  >PNG</button>{' '}
                  <button
                    className="secondary"
                    data-testid={`qr-download-${t.id}-svg`}
                    onClick={() =>
                      qrDownload.mutate({ tableId: t.id, format: 'svg' }, {
                        onError: (e: any) => showError(e?.message ?? '다운로드 실패'),
                      })
                    }
                  >SVG</button>
                </td>
                <td>
                  <button
                    className="secondary"
                    data-testid={`qr-regenerate-${t.id}`}
                    onClick={() => setAskRegen(t)}
                  >QR 재발급</button>{' '}
                  <button
                    className="danger"
                    data-testid={`table-${t.id}-close`}
                    onClick={() => setAskClose(t)}
                  >세션 종료</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <ConfirmDialog
        open={!!askRegen}
        title={`테이블 ${askRegen?.number}번 QR을 재발급할까요?`}
        body="외부 노출이 의심될 때 사용하세요. 진행 중 세션이 즉시 종료되고 새 QR이 발급됩니다."
        confirmLabel="재발급"
        danger
        onCancel={() => setAskRegen(null)}
        onConfirm={() => {
          const t = askRegen!;
          setAskRegen(null);
          regenerateQr.mutate(t.id, {
            onSuccess: () => showInfo('새 QR이 발급됐어요. 다운로드해서 부착해주세요.'),
            onError: (e: any) => showError(e?.message ?? '실패'),
          });
        }}
        testIdPrefix="qr-regen-confirm"
      />

      <ConfirmDialog
        open={!!askClose}
        title={`테이블 ${askClose?.number}번 세션을 종료할까요?`}
        body="진행 중 주문은 정산 내역으로 이동합니다."
        confirmLabel="종료"
        danger
        onCancel={() => setAskClose(null)}
        onConfirm={() => {
          const t = askClose!;
          setAskClose(null);
          closeSession.mutate(t.id, {
            onSuccess: (data) =>
              showInfo(
                data.movedOrders > 0
                  ? `주문 ${data.movedOrders}건이 정산 내역으로 이동됐어요.`
                  : '활성 세션을 종료했어요.',
              ),
            onError: (e: any) => {
              if (e?.errorCode === 'SESSION_INACTIVE') showError('종료할 활성 세션이 없습니다.');
              else showError(e?.message ?? '실패');
            },
          });
        }}
        testIdPrefix="table-close-confirm"
      />
    </div>
  );
}
