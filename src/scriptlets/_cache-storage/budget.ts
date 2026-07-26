import { log } from './log';

/**
 * Blobs are NOT reliably paged to disk by the browser: Chromium keeps blob bytes
 * resident until an aggregate ~2GiB (desktop) ceiling, and WebKit appears never
 * to spill them at all. Only Gecko pages fetch-derived blobs over ~1MB to an
 * anonymous temp file. So this cap -- not the Blob container -- is what keeps a
 * site that precaches wasm blobs or model weights from OOMing the tab.
 */
const MAX_BYTES = 64 * 1024 * 1024;

export interface StoredEntry {
  /** Request URL with the fragment stripped, as used for key comparison. */
  readonly url: string,
  /** Same as {@link url} but with the query stripped, for `ignoreSearch`. */
  readonly urlWithoutSearch: string,
  /** Snapshot of the request headers, required to replay `Vary` matching. */
  readonly requestHeaders: Headers,

  readonly body: Blob,
  readonly status: number,
  readonly statusText: string,
  readonly headers: Headers,
  /** Real `Response.url`, which a reconstructed Response cannot carry. */
  readonly responseUrl: string,
  readonly responseType: ResponseType,
  readonly redirected: boolean,

  readonly bytes: number,
  /**
   * Back-pointer to the owning cache's entry set. That set holds *insertion*
   * order, which is what `keys()` and `matchAll()` must report; the links below
   * hold *recency* order. Two different orderings over the same entries, hence
   * both.
   */
  readonly owner: Set<StoredEntry>,

  /** Towards the least-recently-used end. `null` at {@link head}. */
  lruPrev: StoredEntry | null,
  /** Towards the most-recently-used end. `null` at {@link tail}. */
  lruNext: StoredEntry | null,
  /**
   * Whether this entry is currently in the list. Required rather than inferred:
   * `forget()` runs from several paths (an explicit `delete()`, a `put()` that
   * replaces a match, a whole-cache wipe) and has to be idempotent, or a second
   * call would subtract `bytes` twice and let the store overrun its budget.
   */
  linked: boolean
}

/** What a caller supplies; the list fields are ours to initialise. */
export type NewStoredEntry = Omit<StoredEntry, 'lruPrev' | 'lruNext' | 'linked'>;

/**
 * An intrusive doubly-linked list, threaded through the entries themselves. The
 * byte budget is global rather than per-cache, because the storage quota it
 * stands in for is per-origin.
 *
 * Intrusive rather than a `Map`/`Set`-based LRU because entries are not uniquely
 * keyed -- one URL holds several of them under `Vary`, and `ignoreSearch` has to
 * match a query against a differing stored query -- so lookup is a scan through
 * the owning cache either way. Keeping the links on the entry means recency
 * updates need no key, no second index to desync, and no allocation.
 */

/** Least-recently-used end: the next entry to be evicted. */
let head: StoredEntry | null = null;
/** Most-recently-used end. */
let tail: StoredEntry | null = null;

let usedBytes = 0;

function unlink(entry: StoredEntry): void {
  const { lruPrev, lruNext } = entry;

  if (lruPrev === null) {
    head = lruNext;
  } else {
    lruPrev.lruNext = lruNext;
  }

  if (lruNext === null) {
    tail = lruPrev;
  } else {
    lruNext.lruPrev = lruPrev;
  }

  entry.lruPrev = null;
  entry.lruNext = null;
  entry.linked = false;
}

function appendToTail(entry: StoredEntry): void {
  entry.lruPrev = tail;
  entry.lruNext = null;

  if (tail === null) {
    head = entry;
  } else {
    tail.lruNext = entry;
  }

  tail = entry;
  entry.linked = true;
}

export function touch(entry: StoredEntry): void {
  // Re-reading the most recent entry is the common case, and already correct.
  if (!entry.linked || tail === entry) {
    return;
  }
  unlink(entry);
  appendToTail(entry);
}

export function forget(entry: StoredEntry): void {
  if (entry.linked) {
    unlink(entry);
    usedBytes -= entry.bytes;
  }
  entry.owner.delete(entry);
}

export function admit(data: NewStoredEntry): void {
  if (data.bytes > MAX_BYTES) {
    // Rejecting a single oversized response is spec-legal, and well-behaved
    // sites already handle it -- unlike an eviction they cannot observe.
    throw new DOMException(
      `Response of ${data.bytes} bytes exceeds the ${MAX_BYTES} byte in-memory cache budget`,
      'QuotaExceededError'
    );
  }

  // `forget` unlinks the head, which advances it, so this terminates.
  while (head !== null && usedBytes + data.bytes > MAX_BYTES) {
    log('evicting to stay under budget:', head.url);
    forget(head);
  }

  const entry: StoredEntry = { ...data, lruPrev: null, lruNext: null, linked: false };
  entry.owner.add(entry);
  appendToTail(entry);
  usedBytes += entry.bytes;
}
