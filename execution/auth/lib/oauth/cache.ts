interface CacheEntry<T> {
  value: T;
  expiry: number;
}

const cache = new Map<string, CacheEntry<any>>();

/**
 * Simple in-memory cache for PKCE verifiers and temporary auth state.
 */
export const AuthCache = {
  /**
   * Set a value in the cache with a time-to-live (TTL).
   * @param key Unique key
   * @param value Value to store
   * @param ttlSeconds Time to live in seconds
   */
  set: <T>(key: string, value: T, ttlSeconds: number): void => {
    const expiry = Date.now() + ttlSeconds * 1000;
    cache.set(key, { value, expiry });
    
    // Cleanup timeout (optional, allows lazy cleanup usually, but good for memory)
    setTimeout(() => {
      if (AuthCache.get(key) === null) {
        AuthCache.delete(key);
      }
    }, ttlSeconds * 1000 + 100);
  },

  /**
   * Get a value from the cache. Returns null if expired or not found.
   * @param key Unique key
   */
  get: <T>(key: string): T | null => {
    const entry = cache.get(key);
    
    if (!entry) {
      return null;
    }

    if (Date.now() > entry.expiry) {
      cache.delete(key);
      return null;
    }

    return entry.value as T;
  },

  /**
   * Delete a value from the cache.
   * @param key Unique key
   */
  delete: (key: string): void => {
    cache.delete(key);
  },
  
  /**
   * Clear entire cache
   */
  clear: (): void => {
    cache.clear();
  }
};
