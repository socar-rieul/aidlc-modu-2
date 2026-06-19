import { getSessionToken, clearSession } from '../hooks/useSessionToken';

export class ApiError extends Error {
  constructor(public statusCode: number, public errorCode: string, message: string, public details?: unknown) {
    super(message);
  }
}

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  const token = getSessionToken();
  const res = await fetch(path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'X-Session-Token': token } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 || res.status === 403) {
    clearSession();
    if (window.location.pathname !== '/error/session-ended') {
      window.location.href = '/error/session-ended';
    }
    throw new ApiError(res.status, 'UNAUTHENTICATED', '세션이 만료되었습니다.');
  }

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new ApiError(
      res.status,
      (data as any).errorCode ?? `HTTP_${res.status}`,
      (data as any).message ?? '오류가 발생했어요.',
      (data as any).details,
    );
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string) => call<T>('GET', path),
  post: <T>(path: string, body?: unknown) => call<T>('POST', path, body),
  patch: <T>(path: string, body?: unknown) => call<T>('PATCH', path, body),
  del: <T>(path: string) => call<T>('DELETE', path),
};
