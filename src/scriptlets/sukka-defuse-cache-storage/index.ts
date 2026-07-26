import { installEphemeralCacheStorage } from '../_cache-storage/install';

/**
 * Neutralise CacheStorage outright: writes are accepted (and their bodies
 * consumed, as the spec requires) but nothing is kept, so every read is an
 * ordinary cache miss and the site simply refetches -- where the HTTP cache,
 * which does respect TTLs and eviction, can serve it properly. Anything a
 * previous visit persisted to disk is swept on load.
 *
 * Costs no memory at all, so this is the default choice. Sites that treat a miss
 * as fatal (a workbox `CacheOnly` strategy, or a `put()` immediately followed by
 * a `match()`) need `sukka-ephemeral-cache-storage` instead.
 */
(function sukkaDefuseCacheStorage() {
  installEphemeralCacheStorage({ retain: false });
})();
