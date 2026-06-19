type Props = {
  open: boolean;
  title: string;
  body?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  testIdPrefix?: string;
};

export function ConfirmDialog({
  open, title, body, confirmLabel = '확인', cancelLabel = '취소', danger, onConfirm, onCancel, testIdPrefix = 'confirm',
}: Props) {
  if (!open) return null;
  return (
    <div className="dialog-backdrop" role="dialog" aria-modal="true">
      <div className="dialog" data-testid={testIdPrefix}>
        <h2 style={{ fontSize: '1.25rem' }}>{title}</h2>
        {body && <div>{body}</div>}
        <div className="actions">
          <button className="secondary" data-testid={`${testIdPrefix}-cancel`} onClick={onCancel}>{cancelLabel}</button>
          <button
            className={danger ? 'danger' : ''}
            data-testid={`${testIdPrefix}-confirm`}
            onClick={onConfirm}
          >{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
