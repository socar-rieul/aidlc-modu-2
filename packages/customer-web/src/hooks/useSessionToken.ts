const KEYS = {
  token: 'tableOrder.sessionToken',
  sid: 'tableOrder.sessionId',
  storeId: 'tableOrder.storeId',
  storeName: 'tableOrder.storeName',
  tableNumber: 'tableOrder.tableNumber',
} as const;

export function getSessionToken(): string | null {
  return localStorage.getItem(KEYS.token);
}

export function getSessionId(): string | null {
  return localStorage.getItem(KEYS.sid);
}

export type SessionMeta = {
  sessionToken: string;
  sessionId: string;
  storeId: string;
  storeName: string;
  tableNumber: number;
};

export function setSession(data: SessionMeta): void {
  localStorage.setItem(KEYS.token, data.sessionToken);
  localStorage.setItem(KEYS.sid, data.sessionId);
  localStorage.setItem(KEYS.storeId, data.storeId);
  localStorage.setItem(KEYS.storeName, data.storeName);
  localStorage.setItem(KEYS.tableNumber, String(data.tableNumber));
}

export function clearSession(): void {
  for (const k of Object.values(KEYS)) localStorage.removeItem(k);
  localStorage.removeItem('tableOrder.help.completedAt');
}

export function useSessionToken() {
  return {
    token: getSessionToken(),
    sessionId: getSessionId(),
    storeId: localStorage.getItem(KEYS.storeId),
    storeName: localStorage.getItem(KEYS.storeName),
    tableNumber: Number(localStorage.getItem(KEYS.tableNumber) ?? 0),
    setSession,
    clear: clearSession,
  };
}
