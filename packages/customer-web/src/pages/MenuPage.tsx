import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { MenuDto } from '@table-order/shared';
import { PageHeader } from '../components/PageHeader';
import { MenuCard } from '../components/MenuCard';
import { AdBanner } from '../components/AdBanner';
import { useMenuQuery, useAdsQuery, useCartMutations, useCartQuery } from '../hooks/queries';
import { useSessionToken } from '../hooks/useSessionToken';
import { useSseChannel } from '../hooks/useSseChannel';
import { useToast } from '../hooks/useToast';
import { isHelpCompleted } from '../hooks/useHelp';
import { ApiError } from '../api/client';
import { HelpOverlay } from './HelpOverlay';

export function MenuPage() {
  const { sessionId } = useSessionToken();
  const navigate = useNavigate();
  const { data: menus, isLoading } = useMenuQuery();
  const { data: topAds } = useAdsQuery('menu_top');
  const { data: bottomAds } = useAdsQuery('menu_bottom');
  const { data: cart } = useCartQuery(sessionId);
  const { add } = useCartMutations(sessionId ?? '');
  const { showInfo, showError } = useToast();
  const [showHelp, setShowHelp] = useState(() => !isHelpCompleted());
  const [activeCat, setActiveCat] = useState<string | null>(null);

  useSseChannel(sessionId, () => navigate('/error/session-ended', { replace: true }));

  const categories = useMemo(() => {
    if (!menus) return [];
    const map = new Map<string, string>();
    for (const m of menus) map.set(m.categoryId, m.categoryName);
    return Array.from(map, ([id, name]) => ({ id, name }));
  }, [menus]);

  const filtered = useMemo(() => {
    if (!menus) return [];
    return activeCat ? menus.filter((m) => m.categoryId === activeCat) : menus;
  }, [menus, activeCat]);

  const handleAdd = (menu: MenuDto) => {
    add.mutate({ menuId: menu.id, quantity: 1 }, {
      onSuccess: () => showInfo(`${menu.name} 담았어요`),
      onError: (e) => {
        if (e instanceof ApiError && e.errorCode === 'MENU_SOLDOUT') showError('품절된 메뉴입니다.');
        else if (e instanceof ApiError) showError(e.message);
        else showError('네트워크 오류가 발생했어요.');
      },
    });
  };

  if (isLoading) return <div className="app-shell">메뉴를 불러오는 중…</div>;
  return (
    <div className="app-shell" data-testid="menu-page">
      <PageHeader />
      {topAds?.[0] && <AdBanner ad={topAds[0]} />}

      <div className="category-chips">
        <button
          className={activeCat === null ? 'is-active' : ''}
          onClick={() => setActiveCat(null)}
          data-testid="category-all"
        >전체</button>
        {categories.map((c) => (
          <button
            key={c.id}
            className={activeCat === c.id ? 'is-active' : ''}
            onClick={() => setActiveCat(c.id)}
            data-testid={`category-${c.id}`}
          >{c.name}</button>
        ))}
      </div>

      {filtered.map((m) => (
        <MenuCard key={m.id} menu={m} onAdd={handleAdd} />
      ))}

      {bottomAds?.[0] && <AdBanner ad={bottomAds[0]} />}

      <div className="bottom-bar">
        <div className="total">
          장바구니 {cart?.items.length ?? 0}개 · {(cart?.total ?? 0).toLocaleString()}원
        </div>
        <button data-testid="go-to-cart" onClick={() => navigate('/cart')}>
          장바구니
        </button>
      </div>

      {showHelp && <HelpOverlay onClose={() => setShowHelp(false)} />}
    </div>
  );
}
