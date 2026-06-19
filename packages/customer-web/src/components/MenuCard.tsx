import type { MenuDto } from '@table-order/shared';

type Props = { menu: MenuDto; onAdd: (menu: MenuDto) => void };

export function MenuCard({ menu, onAdd }: Props) {
  return (
    <div
      className={`card menu-card ${menu.soldout ? 'is-soldout' : ''}`}
      data-testid={`menu-card-${menu.id}`}
    >
      <div className="info">
        <div style={{ fontWeight: 600 }}>
          {menu.name}{' '}
          {menu.soldout && <span className="soldout-badge">품절</span>}
        </div>
        <div style={{ color: 'var(--muted)' }}>{menu.price.toLocaleString()}원</div>
        {menu.description && <div style={{ fontSize: '0.875em', color: 'var(--muted)' }}>{menu.description}</div>}
      </div>
      <button
        data-testid={`menu-card-${menu.id}-add`}
        disabled={menu.soldout}
        onClick={() => onAdd(menu)}
      >
        담기
      </button>
    </div>
  );
}
