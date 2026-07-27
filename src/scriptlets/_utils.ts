const fnWs = new WeakSet();

export function onlyCallOnce(fn: () => void): void;
export function onlyCallOnce<Args extends any[]>(fn: (...args: Args) => void, args: Args): void;
export function onlyCallOnce(fn: Function, args?: any[]) {
  if (fnWs.has(fn)) {
    return;
  }
  fnWs.add(fn);

  if (args) {
    fn(...args);
  } else {
    fn();
  }
}

/**
 * The realm we are running in. A scriptlet is injected into a document, but the
 * same patches are also bundled into a prelude that runs inside a Worker (see
 * `sukka-defuse-devtools-detector/worker-prelude`), where `window` does not
 * exist. Everything below therefore goes through `globalThis` rather than
 * `window`, so a single implementation serves both realms.
 */
const $globalThis = globalThis as unknown as Window & typeof globalThis;

/**
 * Every global object we should patch.
 *
 * In a document that is `window` plus `window.top`/`window.self` when they are
 * distinct and reachable; in a worker there is only the one global.
 */
export const GLOBAL_INSTANCE_LIST = (() => {
  const set = new Set<Window & typeof globalThis>();
  const array = new Array<[string, Window & typeof globalThis]>();

  const add = (name: string, value: unknown) => {
    try {
      // Not trusted to be non-nullish: `top`/`self` are absent in a worker, and
      // a cross-origin `top` can throw on access.
      const global = value as (Window & typeof globalThis) | null | undefined;
      if (global && !set.has(global)) {
        // Reading a *reference* to a cross-origin `top`/`self` is allowed, but
        // touching any property on it throws a SecurityError. If we added such a
        // frame here, every patch below would blow up the moment it reached for
        // `global.console` / `global.Function` / etc. Probe one property now,
        // inside this try/catch, so an unreachable frame is skipped instead.
        void global.console;
        set.add(global);
        array.push([name, global]);
      }
    } catch { }
  };

  add('globalThis', $globalThis);
  // `top`/`self` only exist on a window; in a worker these are simply absent.
  try {
    add('window.top', $globalThis.top);
  } catch { }
  try {
    add('window.self', $globalThis.self);
  } catch { }

  return array;
})();

export const $console = {
  info: $globalThis.console.info,
  log: $globalThis.console.log,
  warn: $globalThis.console.warn,
  error: $globalThis.console.error
};

/**
 * Kept as a source string (rather than only a literal) so the worker prelude,
 * which is a standalone program evaluated in another realm and therefore can not
 * import from this module, can rebuild the exact same regex instead of keeping a
 * second copy that would silently drift.
 *
 * @see ./sukka-defuse-devtools-detector/worker-prelude.ts
 */
export const R_DEBUGGER_SOURCE = String.raw`([^\w.])debugger([^\w()[\]])`;

const rDebugger = new RegExp(R_DEBUGGER_SOURCE, 'g');

function debuggerReplacer(_: string, group1?: string, group2?: string): string {
  if (typeof group1 === 'string' && typeof group2 === 'string') {
    return group1 + ';' + group2; // remove debugger from function string
  }
  $console.warn('[sukka-defuse-devtools-detector]', 'Unexpected debugger replacer call!', { _, group1, group2 });
  return _;
};

export function argHasDebugger(arg: unknown): arg is string {
  return typeof arg === 'string' && arg.includes('debugger');
}

export function defuseDebuggerInArg(arg: string, loggerFn: (before: string, after: string) => void): string {
  if (argHasDebugger(arg)) {
    const before = arg;
    arg = defuseFunctionString(arg);

    onlyCallOnce(loggerFn, [before, arg]);

    // $console.info('[sukka-defuse-devtools-detector]', 'defuse "debugger" in arg', { before, after: arg });
    return arg;
  }
  return arg;
}

function defuseFunctionString(arg: string): string {
  arg = arg.trim();

  if (arg.startsWith('debugger')) {
    arg = arg.slice(8).trim();
  }
  if (arg.endsWith('debugger')) {
    arg = arg.slice(0, -8).trim();
  }

  if (arg.includes('debugger')) {
    arg = arg.replaceAll(rDebugger, debuggerReplacer); // remove debugger from function string
  }

  return arg;
}

// eslint-disable-next-line @typescript-eslint/unbound-method -- cache native method to prevent overwrite
export const FunctionPrototypeToString = Function.prototype.toString;
export const $eval = $globalThis.eval;
export const $Proxy = $globalThis.Proxy;

export const ObjectDefineProperty = Object.defineProperty;
