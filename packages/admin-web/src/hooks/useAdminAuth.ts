import type { LoginResponse } from '@table-order/shared';

const KEYS = {
  jwt: 'tableOrder.admin.jwt',
  exp: 'tableOrder.admin.expiresAt',
} as const;

export function getJwt(): string | null {
  const exp = localStorage.getItem(KEYS.exp);
  if (exp && new Date(exp) <= new Date()) {
    localStorage.removeItem(KEYS.jwt);
    localStorage.removeItem(KEYS.exp);
    return null;
  }
  return localStorage.getItem(KEYS.jwt);
}

export function setAuth(data: LoginResponse): void {
  localStorage.setItem(KEYS.jwt, data.jwt);
  localStorage.setItem(KEYS.exp, data.expiresAt);
}

export function clearAuth(): void {
  localStorage.removeItem(KEYS.jwt);
  localStorage.removeItem(KEYS.exp);
}

export function decodeStoreId(jwt: string): string | null {
  try {
    const [, payload] = jwt.split('.');
    const body = JSON.parse(atob(payload));
    return (body as { storeId?: string }).storeId ?? null;
  } catch {
    return null;
  }
}

export function useAdminAuth() {
  const jwt = getJwt();
  return {
    jwt,
    storeId: jwt ? decodeStoreId(jwt) : null,
    setAuth,
    clearAuth,
  };
}
