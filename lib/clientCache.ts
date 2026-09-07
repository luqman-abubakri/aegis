type CacheEntry<T> = {
  data: T;
  updatedAt: number;
};

const cache = new Map<string, CacheEntry<unknown>>();
const requests = new Map<string, Promise<unknown>>();

export const CLIENT_CACHE_TTL_MS = 5 * 60 * 1000;

export function getCached<T>(key: string): T | undefined {
  return cache.get(key)?.data as T | undefined;
}

export function isCacheFresh(
  key: string,
  ttl = CLIENT_CACHE_TTL_MS
): boolean {
  const entry = cache.get(key);
  return Boolean(entry && Date.now() - entry.updatedAt < ttl);
}

export function setCached<T>(key: string, data: T): T {
  cache.set(key, { data, updatedAt: Date.now() });
  return data;
}

export function invalidateCached(key: string): void {
  cache.delete(key);
}

export function invalidateCachedPrefix(prefix: string): void {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) {
      cache.delete(key);
    }
  }
}

export function clearClientCache(): void {
  cache.clear();
  requests.clear();
}

export async function fetchCached<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl = CLIENT_CACHE_TTL_MS
): Promise<T> {
  if (isCacheFresh(key, ttl)) {
    return getCached<T>(key) as T;
  }

  const existingRequest = requests.get(key) as Promise<T> | undefined;
  if (existingRequest) {
    return existingRequest;
  }

  const request = fetcher()
    .then((data) => setCached(key, data))
    .finally(() => {
      requests.delete(key);
    });

  requests.set(key, request);
  return request;
}
