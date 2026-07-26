import { installEphemeralCacheStorage } from '../_cache-storage/install';

/**
 * Keep CacheStorage working, but only for as long as the tab lives: responses
 * are held as Blobs in memory under an LRU byte cap, and anything a previous
 * visit persisted to disk is swept on load.
 *
 * Use this where a site genuinely reads back what it wrote. Where it does not,
 * prefer `sukka-defuse-cache-storage`, which keeps nothing at all.
 */
(function sukkaEphemeralCacheStorage() {
  installEphemeralCacheStorage({ retain: true });
})();
