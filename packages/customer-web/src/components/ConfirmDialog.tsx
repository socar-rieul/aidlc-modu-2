type Props = {
  open: boolean;
  title: string;
  body?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  testIdPrefix?: string;
};

export function ConfirmDialog({
  open, title, body, confirmLabel = '확인', cancelLabel = '취소', onConfirm, onCancel, testIdPrefix = 'confirm-dialog',
}: Props) {
  if (!open) return null;
  return (
    <div className="dialog-backdrop" role="dialog" aria-modal="true">
      <div className="dialog" data-testid={testIdPrefix}>
        <h2 style={{ fontSize: 'calc(1.25rem * var(--font-scale))' }}>{title}</h2>
        {body && <div>{body}</div>}
        <div className="actions">
          <button className="cancel" data-testid={`${testIdPrefix}-cancel`} onClick={onCancel}>{cancelLabel}</button>
          <button data-testid={`${testIdPrefix}-confirm`} onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
