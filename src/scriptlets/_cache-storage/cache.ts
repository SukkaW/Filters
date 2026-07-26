import { ObjectDefineProperty } from '../_utils';
import { admit, forget, touch } from './budget';
import type { StoredEntry } from './budget';
import { warn } from './log';
import { SukkaCachedResponse } from './response';

/** Gate the constructors so `new Cache()` throws like the real thing does. */
export const kInternal = Symbol('sukka');

function toRequest(input: RequestInfo | URL): Request {
  return input instanceof Request ? input : new Request(input);
}

function withoutFragment(url: string): string {
  const parsed = new URL(url);
  parsed.hash = '';
  return parsed.href;
}

function withoutSearch(url: string): string {
  const parsed = new URL(url);
  parsed.hash = '';
  parsed.search = '';
  return parsed.href;
}

/**
 * The spec's Request Matching Cache algorithm.
 * @see https://w3c.github.io/ServiceWorker/#request-matches-cached-item-algorithm
 */
function requestMatchesEntry(
  queryUrl: string,
  queryUrlWithoutSearch: string,
  queryHeaders: Headers,
  entry: StoredEntry,
  options?: CacheQueryOptions
): boolean {
  if (options?.ignoreSearch === true) {
    if (queryUrlWithoutSearch !== entry.urlWithoutSearch) {
      return false;
    }
  } else if (queryUrl !== entry.url) {
    return false;
  }

  if (options?.ignoreVary === true) {
    return true;
  }

  const vary = entry.headers.get('vary');
  if (vary === null) {
    return true;
  }

  for (const rawField of vary.split(',')) {
    const field = rawField.trim();
    if (field === '') {
      continue;
    }
    // `Vary: *` is rejected at put() time, so reaching it here means the entry
    // predates us somehow -- treat it as unmatchable rather than guessing.
    if (field === '*') {
      return false;
    }
    if (queryHeaders.get(field) !== entry.requestHeaders.get(field)) {
      return false;
    }
  }

  return true;
}

/** @see https://w3c.github.io/ServiceWorker/#cache-put (steps 4 and 6-9) */
function assertPuttableRequest(request: Request): void {
  const { protocol } = new URL(request.url);
  if (protocol !== 'http:' && protocol !== 'https:') {
    throw new TypeError(`Request scheme '${protocol.slice(0, -1)}' is unsupported`);
  }
  if (request.method !== 'GET') {
    throw new TypeError(`Request method '${request.method}' is unsupported`);
  }
}

function assertPuttableResponse(response: Response): void {
  if (response.status === 206) {
    throw new TypeError('Partial response (status code 206) is unsupported');
  }
  if (response.headers.get('vary')?.split(',').some((field) => field.trim() === '*') === true) {
    throw new TypeError('Vary header contains *');
  }
}

export class SukkaCache implements Cache {
  /** Insertion-ordered, which is the order `keys()` and `matchAll()` must use. */
  readonly #entries = new Set<StoredEntry>();

  /** False in blackhole mode: every write is accepted, nothing is kept. */
  readonly #retain: boolean;

  constructor(token?: symbol, retain = true) {
    if (token !== kInternal) {
      throw new TypeError('Illegal constructor');
    }
    this.#retain = retain;
  }

  match(request: RequestInfo | URL, options?: CacheQueryOptions): Promise<Response | undefined> {
    // Deliberately not `matchAll()[0]`: that would `touch()` every match while
    // returning one, promoting entries this call never handed back and shielding
    // them from eviction. `ignoreSearch` makes that easy to hit -- a single query
    // can span every stored variant of a URL.
    const entry = this.#queryFirst(request, options);
    if (entry === undefined) {
      return Promise.resolve(undefined);
    }
    touch(entry);
    return Promise.resolve(new SukkaCachedResponse(entry));
  }

  matchAll(request?: RequestInfo | URL, options?: CacheQueryOptions): Promise<readonly Response[]> {
    return Promise.resolve(Object.freeze(this.#queryAll(request, options).map((entry) => {
      touch(entry);
      return new SukkaCachedResponse(entry);
    })));
  }

  async add(request: RequestInfo | URL): Promise<void> {
    return this.addAll([request]);
  }

  async addAll(requests: Iterable<RequestInfo | URL>): Promise<void> {
    const list = Array.from(requests, (request) => toRequest(request));
    list.forEach(assertPuttableRequest);

    const seen = new Set<string>();
    for (const request of list) {
      const key = withoutFragment(request.url);
      if (seen.has(key)) {
        throw new DOMException(`Duplicate request ${request.url}`, 'InvalidStateError');
      }
      seen.add(key);
    }

    const fetched = await Promise.all(list.map(async (request) => {
      const response = await fetch(request);
      // addAll is stricter than put only in rejecting error and non-ok responses.
      // 206 is *within* the ok range, so it is not caught here -- the shared
      // assertion below owns both 206 and `Vary: *`, for addAll and put alike.
      if (response.type === 'error' || !response.ok) {
        throw new TypeError(`Request failed for ${request.url}`);
      }
      assertPuttableResponse(response);
      return [request, response] as const;
    }));

    await Promise.all(fetched.map(([request, response]) => this.#store(request, response)));
  }

  async put(request: RequestInfo | URL, response: Response): Promise<void> {
    const normalized = toRequest(request);
    assertPuttableRequest(normalized);
    assertPuttableResponse(response);
    if (response.bodyUsed) {
      throw new TypeError('Response body is already used');
    }
    return this.#store(normalized, response);
  }

  delete(request: RequestInfo | URL, options?: CacheQueryOptions): Promise<boolean> {
    const victims = this.#queryAll(request, options);
    victims.forEach(forget);
    return Promise.resolve(victims.length > 0);
  }

  keys(request?: RequestInfo | URL, options?: CacheQueryOptions): Promise<readonly Request[]> {
    return Promise.resolve(Object.freeze(this.#queryAll(request, options).map(
      (entry) => new Request(entry.url, { headers: entry.requestHeaders })
    )));
  }

  /**
   * Compiles the request-independent half of the spec's Query Cache algorithm --
   * URL normalisation and the method check -- into a predicate over entries.
   * `null` means nothing in this cache can match.
   *
   * Shared by both query methods so the normalisation cannot drift between them.
   */
  #queryMatcher(
    request: RequestInfo | URL,
    options?: CacheQueryOptions
  ): ((entry: StoredEntry) => boolean) | null {
    const normalized = toRequest(request);
    if (normalized.method !== 'GET' && options?.ignoreMethod !== true) {
      return null;
    }

    const url = withoutFragment(normalized.url);
    const urlWithoutSearch = options?.ignoreSearch === true ? withoutSearch(normalized.url) : url;

    return (entry) => requestMatchesEntry(url, urlWithoutSearch, normalized.headers, entry, options);
  }

  /** For `match()`, which returns -- and so may only promote -- a single entry. */
  #queryFirst(request: RequestInfo | URL, options?: CacheQueryOptions): StoredEntry | undefined {
    const matches = this.#queryMatcher(request, options);
    if (matches === null) {
      return undefined;
    }

    for (const entry of this.#entries) {
      if (matches(entry)) {
        return entry;
      }
    }
    return undefined;
  }

  /**
   * For every other caller. `delete()` and the replace step of `put()` depend on
   * getting *all* matches -- unlinking only the first would leave the rest
   * stranded and double-counted against the byte budget.
   */
  #queryAll(request?: RequestInfo | URL, options?: CacheQueryOptions): StoredEntry[] {
    // matchAll() and keys() may be called with no request at all, which selects
    // every entry in insertion order.
    if (request === undefined) {
      return [...this.#entries];
    }

    const matches = this.#queryMatcher(request, options);
    if (matches === null) {
      return [];
    }

    const found: StoredEntry[] = [];
    for (const entry of this.#entries) {
      if (matches(entry)) {
        found.push(entry);
      }
    }
    return found;
  }

  async #store(request: Request, response: Response): Promise<void> {
    const isOpaque = response.type === 'opaque' || response.type === 'opaqueredirect';

    // Consume the body even when we are about to discard it -- put() disturbs
    // the caller's response, and a response that stays readable afterwards is
    // observably different from the real thing.
    let body: Blob;
    try {
      body = await response.blob();
    } catch (e) {
      throw new TypeError(`Failed to read response body for ${request.url}`, { cause: e });
    }

    // put() replaces whatever already matched this request -- all of it.
    this.#queryAll(request).forEach(forget);

    // Blackhole mode: the write is accepted (and the body consumed) but nothing
    // is kept, so every later read is an ordinary cache miss.
    if (!this.#retain) {
      return;
    }

    if (isOpaque) {
      // Opaque bodies are unreadable from JS, so the blob above is zero bytes.
      // Retaining that would hand the page silently corrupt data on some later
      // read; reporting a miss instead drops it onto its own first-visit path,
      // which every correct consumer already handles. Skipping keys() too, so
      // a keys()-then-match() sweep (workbox precache cleanup does exactly
      // this) sees a consistent "never stored" rather than a phantom entry.
      warn('not retaining opaque response, Cache.match() will report a miss:', request.url);
      return;
    }

    admit({
      url: withoutFragment(request.url),
      urlWithoutSearch: withoutSearch(request.url),
      requestHeaders: new Headers(request.headers),
      body,
      status: response.status,
      statusText: response.statusText,
      headers: new Headers(response.headers),
      responseUrl: response.url,
      responseType: response.type,
      redirected: response.redirected,
      bytes: body.size,
      owner: this.#entries
    });
  }
}

ObjectDefineProperty(SukkaCache, 'name', { value: 'Cache', configurable: true });
ObjectDefineProperty(SukkaCache.prototype, Symbol.toStringTag, { value: 'Cache', configurable: true });
