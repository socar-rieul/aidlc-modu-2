import { useState } from 'react';
import { markHelpCompleted } from '../hooks/useHelp';

const STEPS = [
  { title: '메뉴를 골라보세요', body: '카테고리를 탭하고, 마음에 드는 메뉴의 "담기"를 눌러보세요.' },
  { title: '공동 장바구니', body: '같은 테이블 일행과 장바구니를 함께 채워요. 변경은 실시간으로 반영돼요.' },
  { title: '주문 확정', body: '"주문 확정" → "주문하기"를 누르면 매장으로 주문이 전달돼요.' },
  { title: '주문 내역', body: '확정한 주문은 "주문 내역"에서 시간 역순으로 볼 수 있어요.' },
];

export function HelpOverlay({ onClose, asRoute = false }: { onClose?: () => void; asRoute?: boolean }) {
  const [idx, setIdx] = useState(0);
  const step = STEPS[idx];
  const isLast = idx === STEPS.length - 1;

  const finish = () => {
    markHelpCompleted();
    onClose?.();
  };

  return (
    <div className="help-overlay" role="dialog" aria-modal="true" data-testid="help-overlay">
      <div className="step">
        <strong style={{ color: 'var(--muted)' }}>
          {idx + 1} / {STEPS.length}
        </strong>
        <h2>{step.title}</h2>
        <p>{step.body}</p>
        <div className="actions" style={{ display: 'flex', gap: '0.5rem' }}>
          {!asRoute && idx === 0 && (
            <button
              className="cancel"
              style={{ flex: 1, background: 'var(--muted)' }}
              onClick={finish}
              data-testid="help-skip"
            >
              다시 보지 않기
            </button>
          )}
          {idx > 0 && (
            <button
              style={{ flex: 1, background: 'var(--muted)' }}
              onClick={() => setIdx((v) => v - 1)}
              data-testid="help-prev"
            >이전</button>
          )}
          {isLast ? (
            <button style={{ flex: 1 }} onClick={finish} data-testid="help-done">완료</button>
          ) : (
            <button style={{ flex: 1 }} onClick={() => setIdx((v) => v + 1)} data-testid="help-next">다음</button>
          )}
        </div>
      </div>
    </div>
  );
}

export function HelpRoutePage() {
  return <HelpOverlay asRoute />;
}
