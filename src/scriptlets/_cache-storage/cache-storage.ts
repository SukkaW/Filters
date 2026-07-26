import { ObjectDefineProperty } from '../_utils';
import { kInternal, SukkaCache } from './cache';

export class SukkaCacheStorage implements CacheStorage {
  /**
   * The spec calls this the "name to cache map" and defines it as an *ordered*
   * map, which is why `keys()` and `match()` iterate in cache creation order.
   */
  readonly #caches = new Map<string, SukkaCache>();

  /** False in blackhole mode; handed down to every cache this opens. */
  readonly #retain: boolean;

  constructor(token?: symbol, retain = true) {
    if (token !== kInternal) {
      throw new TypeError('Illegal constructor');
    }
    this.#retain = retain;
  }

  open(cacheName: string): Promise<Cache> {
    let cache = this.#caches.get(cacheName);
    if (!cache) {
      cache = new SukkaCache(kInternal, this.#retain);
      this.#caches.set(cacheName, cache);
    }
    return Promise.resolve(cache);
  }

  has(cacheName: string): Promise<boolean> {
    return Promise.resolve(this.#caches.has(cacheName));
  }

  keys(): Promise<string[]> {
    return Promise.resolve([...this.#caches.keys()]);
  }

  async delete(cacheName: string): Promise<boolean> {
    const cache = this.#caches.get(cacheName);
    if (!cache) {
      return false;
    }
    this.#caches.delete(cacheName);
    // Drop the entries through the public API so the global byte budget is
    // credited back; `ignoreVary` makes this an unconditional wipe.
    const requests = await cache.keys();
    await Promise.all(requests.map((request) => cache.delete(request, { ignoreVary: true })));
    return true;
  }

  async match(request: RequestInfo | URL, options?: MultiCacheQueryOptions): Promise<Response | undefined> {
    if (options?.cacheName !== undefined) {
      return this.#caches.get(options.cacheName)?.match(request, options);
    }
    // Deliberately sequential: the spec resolves with the first match in cache
    // creation order, so racing them could resolve with the wrong one.
    for (const cache of this.#caches.values()) {
      // eslint-disable-next-line no-await-in-loop -- see above
      const response = await cache.match(request, options);
      if (response) {
        return response;
      }
    }
    return undefined;
  }
}

ObjectDefineProperty(SukkaCacheStorage, 'name', { value: 'CacheStorage', configurable: true });
ObjectDefineProperty(SukkaCacheStorage.prototype, Symbol.toStringTag, { value: 'CacheStorage', configurable: true });
