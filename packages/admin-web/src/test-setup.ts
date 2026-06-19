import '@testing-library/jest-dom/vitest';

// Node 25 + jsdom 25 localStorage 비호환 — 인메모리 polyfill
const memStore = new Map<string, string>();
const memStorage: Storage = {
  get length() { return memStore.size; },
  clear: () => memStore.clear(),
  getItem: (k) => (memStore.has(k) ? memStore.get(k)! : null),
  key: (i) => Array.from(memStore.keys())[i] ?? null,
  removeItem: (k) => void memStore.delete(k),
  setItem: (k, v) => void memStore.set(k, String(v)),
};
Object.defineProperty(window, 'localStorage', { value: memStorage, configurable: true });
Object.defineProperty(globalThis, 'localStorage', { value: memStorage, configurable: true });
