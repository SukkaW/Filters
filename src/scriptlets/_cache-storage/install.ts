import { ObjectDefineProperty } from '../_utils';
import { kInternal, SukkaCache } from './cache';
import { SukkaCacheStorage } from './cache-storage';
import { error, info, log, warn } from './log';

export interface CacheStorageOptions {
  /**
   * `true` keeps responses in an in-memory, Blob-backed, LRU-capped store that
   * dies with the tab. `false` accepts every write and keeps nothing.
   */
  readonly retain: boolean
}

export function installEphemeralCacheStorage({ retain }: CacheStorageOptions): void {
  // `caches` is only exposed in secure contexts. Never define it where the page
  // could not already see it -- doing so on an insecure origin would flip
  // feature detection and light up code paths that were dormant.
  if (!window.isSecureContext || !('caches' in window)) {
    return;
  }

  // uBO keeps one copy of the function declaration but emits a call site per
  // matching filter rule, so we can be invoked more than once per document.
  //
  // Do NOT test this with `hasOwnProperty(window, 'caches')`: WebIDL puts the
  // members of a [Global] interface on the global object itself rather than on
  // Window.prototype, so `caches` is *already* an own accessor before we touch
  // anything. Ask whether the getter is still the native one instead, which also
  // means we leave no marker property for a page to fingerprint.
  // eslint-disable-next-line @typescript-eslint/unbound-method -- only ever stringified, never called
  const nativeGetter = Object.getOwnPropertyDescriptor(window, 'caches')?.get;
  if (!nativeGetter) {
    return;
  }

  // Capture the natives BEFORE installing the mock -- the sweep below has to
  // reach the real CacheStorage to reclaim what is already on disk.
  const nativeCaches = window.caches;
  // eslint-disable-next-line @typescript-eslint/unbound-method -- cache native method to prevent overwrite
  const nativeKeys = window.CacheStorage.prototype.keys;
  // eslint-disable-next-line @typescript-eslint/unbound-method -- cache native method to prevent overwrite
  const nativeDelete = window.CacheStorage.prototype.delete;

  // No GLOBAL_INSTANCE_LIST here: uBO injects into every frame separately, so
  // each frame gets its own store no matter what we do. Real CacheStorage is
  // shared per-origin; that difference is unfixable from a scriptlet, and
  // reaching into window.top would only mock the parent's realm twice.
  try {
    const storage = new SukkaCacheStorage(kInternal, retain);
    // Redefining, not shadowing -- see the [Global] note above. The native
    // descriptor is `{ get, enumerable: true, configurable: true }`, so match it.
    ObjectDefineProperty(window, 'caches', {
      get: () => storage,
      enumerable: true,
      configurable: true
    });
    // Override the interface objects too, otherwise `caches instanceof
    // CacheStorage` starts returning false.
    window.CacheStorage = SukkaCacheStorage;
    window.Cache = SukkaCache;

    info(retain
      ? 'CacheStorage is now in-memory only and dies with this tab'
      : 'CacheStorage now accepts writes and keeps nothing');
  } catch (e) {
    error('failed to install the CacheStorage mock:', e);
    return;
  }

  const sweep = async () => {
    try {
      const names = await nativeKeys.call(nativeCaches);
      if (names.length === 0) {
        return;
      }

      log('sweeping persisted caches:', names);

      await Promise.all(names.map(async (cacheName) => {
        try {
          if (await nativeDelete.call(nativeCaches, cacheName)) {
            log('deleted persisted cache:', cacheName);
          } else {
            warn('could not delete persisted cache:', cacheName);
          }
        } catch (e) {
          warn('error while deleting persisted cache:', cacheName, e);
        }
      }));
    } catch (e) {
      error('failed to enumerate persisted caches:', e);
    }
  };

  // Keep the sweep out of the critical path. The mock is already installed
  // synchronously, so this only ever has to reclaim *historical* data -- what a
  // previous visit wrote before this scriptlet applied, or what another frame or
  // tab wrote without it. That also makes it idempotent.
  //
  // `sweep` never rejects (it try/catches throughout), so the `catch` below only
  // exists to keep the promise from floating.
  const startSweep = () => {
    sweep().catch((e: unknown) => error('sweep failed:', e));
  };

  if (typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(startSweep, { timeout: 5000 });
  } else {
    window.setTimeout(startSweep, 2000);
  }

  // A page that gets persistent storage granted is exempted from quota
  // eviction, which is the exact opposite of what we want.
  try {
    const storageManager = navigator.storage;
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- not available in every browser
    if (storageManager) {
      ObjectDefineProperty(storageManager, 'persist', {
        value: (() => {
          log('denied navigator.storage.persist()');
          return Promise.resolve(false);
        }) satisfies typeof navigator.storage.persist,
        writable: true,
        configurable: true
      });
      ObjectDefineProperty(storageManager, 'persisted', {
        value: (() => Promise.resolve(false)) satisfies typeof navigator.storage.persisted,
        writable: true,
        configurable: true
      });
    }
  } catch (e) {
    error('failed to deny persistent storage:', e);
  }
}
