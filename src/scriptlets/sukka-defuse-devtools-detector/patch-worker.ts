import { $console, $Proxy, argHasDebugger, defuseDebuggerInArg, ObjectDefineProperty, onlyCallOnce, GLOBAL_INSTANCE_LIST } from '../_utils';
import { WORKER_PRELUDE, WORKER_PRELUDE_SELF_TOKEN } from './worker-prelude';

function logDefuseWorker(this: void) {
  $console.info('[sukka-defuse-devtools-detector]', 'Injected defuse prelude into a Worker!');
}

function logDefuseWorkerDebugger(this: void, before: string, after: string) {
  $console.info('[sukka-defuse-devtools-detector] defused "debugger" from Worker script', { before, after });
}

/**
 * Blob URL -> the text the Blob was created from.
 *
 * We can not read a Blob back synchronously (`FileReader` and `Blob.text()` are
 * both async, and `new Worker()` is sync), so instead of reading the blob at
 * construction time we remember what went into `URL.createObjectURL`. Keyed by
 * the returned `blob:` URL string.
 *
 * A plain Map would leak every blob URL the page ever creates, so the entry is
 * dropped as soon as it is consumed by `new Worker()` or revoked, and both the
 * number of tracked URLs and the size of each retained string are capped.
 */
const blobUrlToSource = new Map<string, string>();

/**
 * Symbol used to stash the (string) parts a Blob was constructed from.
 *
 * Deliberately module-scoped rather than `Symbol.for` so page script can not
 * look it up and detect that we tampered with the Blob.
 */
const BLOB_PARTS = Symbol('blobParts');

/** Hard cap so a page spamming `createObjectURL` can not grow the map forever. */
const MAX_TRACKED_BLOB_URLS = 32;

/**
 * `Blob` parts are not necessarily strings, and stringifying a multi-megabyte
 * media blob would be both pointless and expensive. Only track all-string blobs
 * up to this size -- an inline worker script is small, while anything bigger is
 * overwhelmingly likely to be data rather than a script we want to rewrite.
 */
const MAX_TRACKED_BLOB_LENGTH = 512 * 1024;

/**
 * Blob URLs are used for far more than workers (images, video, downloads), and
 * we only want to retain text that could plausibly *be* a script. This is
 * deliberately loose: unlike the original console-probe-only heuristic, we now
 * inject the prelude into every worker we can read, because a worker whose whole
 * body is `debugger` matches no behavioural fingerprint at all.
 *
 * Blobs with an explicit non-script MIME type are skipped; everything else that
 * is plain text is treated as a possible script (`new Blob([src])` with no type
 * at all is exactly how the upstream detector builds its worker).
 */
function couldBeScript(this: void, type: unknown): boolean {
  if (typeof type !== 'string' || type === '') {
    return true;
  }
  const mime = type.toLowerCase();
  return mime.includes('javascript')
    || mime.includes('ecmascript')
    || mime === 'text/plain'
    || mime === 'application/octet-stream';
}

/**
 * The prelude, with its self-reference token replaced by its own source.
 *
 * The prelude bundle contains `patchWorker`, so a worker we patch will itself
 * want to inject the prelude into any nested worker it creates. It cannot contain
 * a literal copy of itself, so it carries `WORKER_PRELUDE_SELF_TOKEN` instead and
 * we substitute the real text here -- once, lazily.
 *
 * Substitution is single-level by design: the nested copy keeps the token as an
 * empty string, so a worker three realms deep stops receiving the prelude rather
 * than the string growing exponentially with depth.
 */
let resolvedPrelude: string | null = null;

function resolveSelfReference(this: void): string {
  if (resolvedPrelude === null) {
    if (WORKER_PRELUDE === '' || WORKER_PRELUDE_SELF_TOKEN === '') {
      // Unbundled context: nothing was injected, so there is no prelude at all.
      resolvedPrelude = '';
      return resolvedPrelude;
    }

    // The token sits in expression position (`WORKER_PRELUDE = <token>`), so every
    // replacement has to be a valid JS *expression*, never the empty string.
    //
    // Innermost level: an empty string literal, which terminates the recursion --
    // a worker at that depth sees `WORKER_PRELUDE === ''` and stops injecting,
    // rather than the text growing with each nesting level.
    const leaf = WORKER_PRELUDE.replaceAll(WORKER_PRELUDE_SELF_TOKEN, '\'\'');
    // One level up: a string literal holding `leaf`, which is what a patched
    // worker injects into any worker it creates in turn.
    resolvedPrelude = WORKER_PRELUDE.replaceAll(WORKER_PRELUDE_SELF_TOKEN, JSON.stringify(leaf));
  }
  return resolvedPrelude;
}

/**
 * Strip `debugger` statements out of a worker's source text.
 *
 * The runtime hooks in the prelude cover `debugger` that arrives through
 * `Function`, `eval`, `Function.prototype.bind`, `Proxy` or a timer callback --
 * but a `debugger` sitting directly in the worker's top-level body (or in a
 * plain function declaration inside it) never passes through any of those, so
 * the only place to catch it is the source itself.
 *
 * Reuses the shared `_utils` implementation so main thread and worker stay
 * consistent.
 */
function defuseWorkerSource(this: void, source: string): string {
  if (!argHasDebugger(source)) {
    return source;
  }
  return defuseDebuggerInArg(source, logDefuseWorkerDebugger);
}

/** Turn the parts passed to `new Blob([...])` into a string, or `null` if we should not care. */
function stringifyBlobParts(this: void, parts: unknown): string | null {
  if (!Array.isArray(parts)) {
    return null;
  }

  let total = 0;
  for (const part of parts) {
    if (typeof part !== 'string') {
      return null;
    }
    total += part.length;
    if (total > MAX_TRACKED_BLOB_LENGTH) {
      return null;
    }
  }

  return parts.join('');
}

/** `data:text/javascript;base64,...` and friends, decoded back to source text. */
function decodeDataUrl(this: void, url: string, global: Window & typeof globalThis): string | null {
  const comma = url.indexOf(',');
  if (comma === -1) {
    return null;
  }

  const meta = url.slice(0, comma);
  const body = url.slice(comma + 1);

  try {
    if (meta.endsWith(';base64')) {
      return global.atob(body);
    }
    return decodeURIComponent(body);
  } catch {
    return null;
  }
}

/**
 * Re-publish `source` as a URL the `Worker` constructor will accept.
 *
 * Prefer a fresh Blob URL: it inherits the page's origin, so the rewritten
 * worker keeps behaving like the original (a `data:` worker is opaque-origin and
 * would break any worker that does same-origin `fetch`). Fall back to `data:`
 * only if Blob URLs are unavailable.
 */
function republish(
  this: void,
  source: string,
  global: Window & typeof globalThis,
  nativeCreateObjectURL: typeof URL.createObjectURL,
  NativeBlob: typeof Blob
): string | null {
  try {
    // Use the *native* Blob and createObjectURL so we do not re-enter our own
    // proxies and re-track (or re-rewrite) the blob we just produced.
    return nativeCreateObjectURL.call(global.URL, new NativeBlob([source], { type: 'text/javascript' }));
  } catch { }

  try {
    return 'data:text/javascript;base64,' + global.btoa(source);
  } catch {
    return null;
  }
}

/**
 * A Worker runs in its own realm, so *every* main-thread patch in this scriptlet
 * has a worker-shaped bypass: the worker gets a fresh `console` (defeating
 * `patch-console`), a fresh `Function`/`eval` (defeating `patch-function`), fresh
 * timers (defeating `patch-timer`) and its own global (defeating
 * `patch-devtoolsformatter`).
 *
 * We defuse all of them at once by intercepting worker creation and prepending
 * `WORKER_PRELUDE`, which re-applies the equivalent patches inside the worker,
 * and by stripping `debugger` out of the worker's source text on the way through
 * (a top-level `debugger` passes through no interceptable API at all).
 *
 * The worker still runs the page's own code afterwards, so legitimate workers
 * keep working.
 */
export function patchWorker() {
  GLOBAL_INSTANCE_LIST.forEach(([globalName, global]) => {
    // Captured before we install any proxy, so our own calls below never
    // re-enter the interceptors.
    // eslint-disable-next-line @typescript-eslint/unbound-method -- cache native method to prevent overwrite
    const nativeCreateObjectURL = global.URL.createObjectURL;
    // eslint-disable-next-line @typescript-eslint/unbound-method -- cache native method to prevent overwrite
    const nativeRevokeObjectURL = global.URL.revokeObjectURL;
    const nativeBlob = global.Blob;

    try {
      global.URL.createObjectURL = new $Proxy(nativeCreateObjectURL, {
        apply(target, thisArg, args: Parameters<typeof URL.createObjectURL>) {
          const url: string = Reflect.apply(target, thisArg, args);

          try {
            // Page script can call this with anything, so do not trust the
            // declared `Blob` type here.
            const blob = args[0] as { [BLOB_PARTS]?: unknown } | null | undefined;
            // The parts are stashed by our Blob proxy below -- the spec gives us
            // no way to read them back out of a constructed Blob.
            const source = blob == null ? null : stringifyBlobParts(blob[BLOB_PARTS]);

            if (source !== null) {
              if (blobUrlToSource.size >= MAX_TRACKED_BLOB_URLS) {
                // Drop the oldest entry (Map preserves insertion order).
                const oldest = blobUrlToSource.keys().next();
                if (!oldest.done) {
                  blobUrlToSource.delete(oldest.value);
                }
              }
              blobUrlToSource.set(url, source);
            }
          } catch { }

          return url;
        }
      });
    } catch (e) {
      $console.warn('[sukka-defuse-devtools-detector]', `Fail to proxy ${globalName}.URL.createObjectURL!`, e);
    }

    try {
      global.URL.revokeObjectURL = new $Proxy(nativeRevokeObjectURL, {
        apply(target, thisArg, args: Parameters<typeof URL.revokeObjectURL>) {
          try {
            blobUrlToSource.delete(args[0]);
          } catch { }
          return Reflect.apply(target, thisArg, args);
        }
      });
    } catch (e) {
      $console.warn('[sukka-defuse-devtools-detector]', `Fail to proxy ${globalName}.URL.revokeObjectURL!`, e);
    }

    // Remember what each Blob was built from, so `createObjectURL` above can
    // recover the worker source. Stored on the Blob itself under a symbol so it
    // dies with the Blob instead of pinning it in a side table.
    try {
      global.Blob = new $Proxy(global.Blob, {
        construct(target, args: ConstructorParameters<typeof Blob>, newTarget) {
          const blob: Blob = Reflect.construct(target, args, newTarget);

          try {
            // Skip blobs whose MIME type says they are not script, so image and
            // media blobs are never retained.
            const source = couldBeScript(args[1]?.type) ? stringifyBlobParts(args[0]) : null;
            if (source !== null) {
              ObjectDefineProperty(blob, BLOB_PARTS, {
                configurable: true,
                enumerable: false,
                writable: false,
                value: [source]
              });
            }
          } catch { }

          return blob;
        }
      });
    } catch (e) {
      $console.warn('[sukka-defuse-devtools-detector]', `Fail to proxy ${globalName}.Blob!`, e);
    }

    const patchWorkerConstructor = (ctorName: 'Worker' | 'SharedWorker') => {
      const originalCtor = global[ctorName];
      if (typeof originalCtor !== 'function') {
        return;
      }

      try {
        // @ts-expect-error -- assigning a Proxy over the constructor
        global[ctorName] = new $Proxy(originalCtor, {
          construct(target, args: [string | URL, ...unknown[]], newTarget) {
            try {
              const rewritten = rewriteWorkerUrl(args[0], global, nativeCreateObjectURL, nativeBlob);
              if (rewritten !== null) {
                onlyCallOnce(logDefuseWorker);
                args = [rewritten, ...args.slice(1)] as [string | URL, ...unknown[]];
              }
            } catch (e) {
              $console.warn('[sukka-defuse-devtools-detector]', `Fail to inspect ${globalName}.${ctorName} script!`, e);
            }

            return Reflect.construct(target, args, newTarget);
          }
        });
      } catch (e) {
        $console.warn('[sukka-defuse-devtools-detector]', `Fail to proxy ${globalName}.${ctorName}!`, e);
      }
    };

    patchWorkerConstructor('Worker');
    patchWorkerConstructor('SharedWorker');
  });
}

/**
 * Given whatever was passed as the first argument to `new Worker()`, return a
 * replacement URL with the prelude prepended -- or `null` to leave it alone.
 *
 * Only `blob:` URLs we tracked and inline `data:` URLs are rewritten. A worker
 * loaded from a real network URL is left untouched: we can not read it
 * synchronously, and rewriting it would mean blocking on a sync XHR.
 */
function rewriteWorkerUrl(
  this: void,
  scriptUrl: unknown,
  global: Window & typeof globalThis,
  nativeCreateObjectURL: typeof URL.createObjectURL,
  nativeBlob: typeof Blob
): string | null {
  const prelude = resolveSelfReference();
  if (prelude === '') {
    // Unbundled context -- nothing to inject, so leave the worker alone rather
    // than pointlessly republishing it under a new URL.
    return null;
  }

  const url = typeof scriptUrl === 'string'
    ? scriptUrl
    : (scriptUrl instanceof global.URL ? scriptUrl.href : null);

  if (url === null) {
    return null;
  }

  let source: string | null = null;

  if (url.startsWith('blob:')) {
    source = blobUrlToSource.get(url) ?? null;
    // One-shot: the page is consuming this blob URL now.
    blobUrlToSource.delete(url);
  } else if (url.startsWith('data:')) {
    source = decodeDataUrl(url, global);
  }

  if (source === null) {
    return null;
  }

  // Strip static `debugger` from the body, then prepend the prelude so the
  // runtime hooks are installed before the page's code runs.
  return republish(prelude + defuseWorkerSource(source), global, nativeCreateObjectURL, nativeBlob);
}
