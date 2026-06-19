import type { CartItemDto } from '@table-order/shared';

type Props = {
  item: CartItemDto;
  onIncrement: () => void;
  onDecrement: () => void;
  onRemove: () => void;
};

export function CartItemRow({ item, onIncrement, onDecrement, onRemove }: Props) {
  return (
    <div className="card cart-item" data-testid={`cart-item-${item.id}`}>
      <div className="info" style={{ flex: 1 }}>
        <div style={{ fontWeight: 600 }}>
          {item.menuName}{' '}
          {item.soldout && <span className="soldout-badge">품절</span>}
        </div>
        <div style={{ color: 'var(--muted)' }}>
          {item.unitPrice.toLocaleString()}원 × {item.quantity} = {(item.unitPrice * item.quantity).toLocaleString()}원
        </div>
      </div>
      <div className="qty-controls">
        <button data-testid={`cart-item-${item.id}-minus`} onClick={onDecrement} aria-label="수량 감소">−</button>
        <span>{item.quantity}</span>
        <button data-testid={`cart-item-${item.id}-plus`} onClick={onIncrement} aria-label="수량 증가">+</button>
        <button data-testid={`cart-item-${item.id}-remove`} onClick={onRemove} aria-label="삭제">🗑</button>
      </div>
    </div>
  );
}
