type Entry = { data: unknown; exp: number };

const store = new Map<string, Entry>();

export const clientCache = {
  get<T>(key: string): T | null {
    const e = store.get(key);
    if (!e) return null;
    if (Date.now() > e.exp) {
      store.delete(key);
      return null;
    }
    return e.data as T;
  },

  set<T>(key: string, data: T, ttlMs = 5 * 60_000): void {
    store.set(key, { data, exp: Date.now() + ttlMs });
  },

  invalidate(...keys: string[]): void {
    for (const k of keys) store.delete(k);
  },
};
