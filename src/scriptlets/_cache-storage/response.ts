import { ObjectDefineProperty } from '../_utils';
import type { StoredEntry } from './budget';

/** The Response constructor refuses a body for these, so pass `null` instead. */
const NULL_BODY_STATUS: ReadonlySet<number> = new Set([204, 205, 304]);

/**
 * `url`, `type` and `redirected` are prototype getters backed by internal slots
 * that a constructed Response cannot populate -- a plain `new Response()` always
 * reports `url === ''` and `type === 'default'`. Sites do read `response.url`,
 * so shadow all three with own accessors replaying what was actually stored.
 *
 * Subclassing (rather than patching a plain Response instance) exists purely so
 * we can override `clone()`: `Response.prototype.clone()` does not respect the
 * subclass and hands back a native Response, which would silently drop the
 * faked `url` again. Because the body is always retained as a Blob we can just
 * rebuild from the entry instead of teeing a stream.
 */
export class SukkaCachedResponse extends Response {
  readonly #entry: StoredEntry;

  constructor(entry: StoredEntry) {
    super(NULL_BODY_STATUS.has(entry.status) ? null : entry.body, {
      status: entry.status,
      statusText: entry.statusText,
      headers: entry.headers
    });

    this.#entry = entry;

    ObjectDefineProperty(this, 'url', {
      get: () => entry.responseUrl,
      enumerable: true,
      configurable: true
    });
    ObjectDefineProperty(this, 'type', {
      get: () => entry.responseType,
      enumerable: true,
      configurable: true
    });
    ObjectDefineProperty(this, 'redirected', {
      get: () => entry.redirected,
      enumerable: true,
      configurable: true
    });
  }

  override clone(): Response {
    if (this.bodyUsed || this.body?.locked === true) {
      throw new TypeError('Failed to execute \'clone\' on \'Response\': Response body is already used');
    }
    return new SukkaCachedResponse(this.#entry);
  }
}
