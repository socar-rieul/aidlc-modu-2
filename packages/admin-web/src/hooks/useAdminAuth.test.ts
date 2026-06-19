import { describe, it, expect, beforeEach } from 'vitest';
import { clearAuth, decodeStoreId, getJwt, setAuth } from './useAdminAuth';

describe('useAdminAuth', () => {
  beforeEach(() => {
    for (const k of ['tableOrder.admin.jwt', 'tableOrder.admin.expiresAt']) {
      try { localStorage.removeItem(k); } catch {}
    }
  });

  it('setAuth → getJwt 가 토큰 반환', () => {
    setAuth({ jwt: 'abc.def.ghi', expiresAt: new Date(Date.now() + 86400_000).toISOString() });
    expect(getJwt()).toBe('abc.def.ghi');
  });

  it('만료 후엔 getJwt가 null + 자동 폐기', () => {
    setAuth({ jwt: 'abc.def.ghi', expiresAt: new Date(Date.now() - 1000).toISOString() });
    expect(getJwt()).toBeNull();
    expect(localStorage.getItem('tableOrder.admin.jwt')).toBeNull();
  });

  it('clearAuth로 양쪽 키 모두 폐기', () => {
    setAuth({ jwt: 'a', expiresAt: new Date(Date.now() + 1000).toISOString() });
    clearAuth();
    expect(getJwt()).toBeNull();
  });

  it('decodeStoreId — payload base64 디코드', () => {
    const payload = { storeId: '00000000-0000-0000-0000-000000000001', userId: 'u1' };
    const jwt = `head.${btoa(JSON.stringify(payload))}.sig`;
    expect(decodeStoreId(jwt)).toBe(payload.storeId);
  });
});
