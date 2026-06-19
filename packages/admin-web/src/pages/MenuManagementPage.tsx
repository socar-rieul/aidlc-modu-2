import { useMemo, useState } from 'react';
import type { CreateMenuDto, MenuDto, UpdateMenuDto } from '@table-order/shared';
import { AdminHeader } from '../components/AdminHeader';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useAdminMenusQuery, useMenuMutations } from '../hooks/queries';
import { useToast } from '../hooks/useToast';
import { ApiError } from '../api/client';

export function MenuManagementPage() {
  const { data: menus, isLoading } = useAdminMenusQuery();
  const { create, update, remove, toggleSoldout } = useMenuMutations();
  const { showInfo, showError } = useToast();
  const [editing, setEditing] = useState<MenuDto | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [askDelete, setAskDelete] = useState<MenuDto | null>(null);

  const categories = useMemo(() => {
    if (!menus) return [];
    const map = new Map<string, string>();
    menus.forEach((m) => map.set(m.categoryId, m.categoryName));
    return Array.from(map, ([id, name]) => ({ id, name }));
  }, [menus]);

  const onSubmitForm = (dto: CreateMenuDto | UpdateMenuDto, isEdit: boolean) => {
    if (isEdit && editing) {
      update.mutate({ id: editing.id, dto: dto as UpdateMenuDto }, {
        onSuccess: () => {
          showInfo('메뉴를 수정했어요.');
          setShowForm(false);
          setEditing(null);
        },
        onError: (e: any) => showError(e.errorCode === 'MENU_PRICE_INVALID' ? '가격은 1원 이상이어야 합니다.' : e.message),
      });
    } else {
      create.mutate(dto as CreateMenuDto, {
        onSuccess: () => {
          showInfo('메뉴를 등록했어요.');
          setShowForm(false);
        },
        onError: (e: any) => showError(e.errorCode === 'MENU_PRICE_INVALID' ? '가격은 1원 이상이어야 합니다.' : e.message),
      });
    }
  };

  return (
    <div className="shell">
      <AdminHeader />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
        <h2>메뉴 관리</h2>
        <button data-testid="menu-add" onClick={() => { setEditing(null); setShowForm(true); }}>+ 새 메뉴</button>
      </div>

      {isLoading ? (
        <p>불러오는 중…</p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>카테고리</th>
              <th>이름</th>
              <th>가격</th>
              <th>품절</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {menus?.map((m) => (
              <tr key={m.id} data-testid={`menu-row-${m.id}`}>
                <td>{m.categoryName}</td>
                <td>{m.name}</td>
                <td>{m.price.toLocaleString()}원</td>
                <td>
                  <input
                    type="checkbox"
                    data-testid={`menu-row-${m.id}-soldout`}
                    checked={m.soldout}
                    onChange={() =>
                      toggleSoldout.mutate(
                        { id: m.id, dto: { soldout: !m.soldout } },
                        {
                          onSuccess: () => showInfo(`${m.name} ${!m.soldout ? '품절' : '판매 재개'}`),
                          onError: (e: any) => showError(e.message),
                        },
                      )
                    }
                  />
                </td>
                <td>
                  <button
                    className="secondary"
                    data-testid={`menu-row-${m.id}-edit`}
                    onClick={() => { setEditing(m); setShowForm(true); }}
                  >수정</button>{' '}
                  <button
                    className="danger"
                    data-testid={`menu-row-${m.id}-delete`}
                    onClick={() => setAskDelete(m)}
                  >삭제</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {showForm && (
        <MenuFormDialog
          categories={categories}
          editing={editing}
          onCancel={() => { setShowForm(false); setEditing(null); }}
          onSubmit={onSubmitForm}
        />
      )}

      <ConfirmDialog
        open={!!askDelete}
        title={`${askDelete?.name}을(를) 삭제할까요?`}
        body="과거 주문 스냅샷은 유지돼요."
        confirmLabel="삭제"
        danger
        onCancel={() => setAskDelete(null)}
        onConfirm={() => {
          const m = askDelete!;
          setAskDelete(null);
          remove.mutate(m.id, {
            onSuccess: () => showInfo('메뉴를 삭제했어요.'),
            onError: (e: ApiError | any) => {
              if (e?.errorCode === 'MENU_IN_CART') {
                showError('이 메뉴는 손님 카트에 담겨 있어요. 손님이 비울 때까지 삭제할 수 없습니다.');
              } else {
                showError(e?.message ?? '실패');
              }
            },
          });
        }}
        testIdPrefix="menu-delete-confirm"
      />
    </div>
  );
}

function MenuFormDialog({
  categories,
  editing,
  onCancel,
  onSubmit,
}: {
  categories: { id: string; name: string }[];
  editing: MenuDto | null;
  onCancel: () => void;
  onSubmit: (dto: CreateMenuDto | UpdateMenuDto, isEdit: boolean) => void;
}) {
  const [name, setName] = useState(editing?.name ?? '');
  const [price, setPrice] = useState(editing?.price ?? 1000);
  const [categoryId, setCategoryId] = useState(editing?.categoryId ?? categories[0]?.id ?? '');
  const [description, setDescription] = useState(editing?.description ?? '');

  return (
    <div className="dialog-backdrop">
      <div className="dialog">
        <h2>{editing ? '메뉴 수정' : '새 메뉴 등록'}</h2>
        <form
          className="menu-form"
          data-testid="menu-form"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit(
              {
                categoryId,
                name,
                price,
                description: description || undefined,
              },
              !!editing,
            );
          }}
        >
          <label>
            카테고리
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} required>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </label>
          <label>
            이름
            <input data-testid="menu-form-name" value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
          <label>
            가격 (KRW)
            <input
              data-testid="menu-form-price"
              type="number"
              min={1}
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
              required
            />
          </label>
          <label>
            설명 (선택)
            <input value={description ?? ''} onChange={(e) => setDescription(e.target.value)} />
          </label>
          <div className="actions">
            <button type="button" className="secondary" onClick={onCancel}>취소</button>
            <button type="submit" data-testid="menu-form-submit">저장</button>
          </div>
        </form>
      </div>
    </div>
  );
}
