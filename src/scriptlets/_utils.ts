const fnWs = new WeakSet();
export function onlyCallOnce(fn: () => void) {
  if (fnWs.has(fn)) {
    return;
  }
  fnWs.add(fn);
  fn();
}

export const WINDOW_INSTANCE_LIST = (() => {
  const set = new Set<Window & typeof globalThis>();
  const array = new Array<[string, Window & typeof globalThis]>();

  try {
    if (window && !set.has(window)) {
      set.add(window);
      array.push(['window', window]);
    }
  } catch { }
  try {
    if (window.top && !set.has(window.top as Window & typeof globalThis)) {
      set.add(window.top as Window & typeof globalThis);
      array.push(['window.top', window.top as Window & typeof globalThis]);
    }
  } catch { }
  try {
    if (window.self && !set.has(window.self)) {
      set.add(window.self);
      array.push(['window.self', window.self]);
    }
  } catch { }

  return array;
})();

export const $console = {
  info: window.console.info,
  log: window.console.log,
  warn: window.console.warn,
  error: window.console.error
};

const rDebugger = /([^\w.])debugger([^\w()[\]])/g;

function debuggerReplacer(_: string, group1?: string, group2?: string): string {
  if (typeof group1 === 'string' && typeof group2 === 'string') {
    return group1 + ';' + group2; // remove debugger from function string
  }
  $console.warn('[sukka-defuse-devtools-detector]', 'Unexpected debugger replacer call!', { _, group1, group2 });
  return _;
};

/**
 * Curried version of defuseDebuggerInArg.
 */
export function defuseDebuggerInArg(loggerFn: () => void): ((arg: string) => string);
export function defuseDebuggerInArg(arg: string, loggerFn: () => void): string;
export function defuseDebuggerInArg(arg: string | (() => void), loggerFn?: () => void): string | ((arg: string) => string) {
  if (typeof arg === 'function') {
    return (newArg: string) => {
      // if we have more than 3 arguments, we might just use curry() util directly
      // we can also recursive call defuseDebuggerInArg here to reduce code duplication
      // but this is a simple function, besides we dont want many stacks causing overflow
      // return defuseDebuggerInArg(newArg, loggerFn);

      if (typeof newArg === 'string' && newArg.includes('debugger')) {
        onlyCallOnce(arg);
        return defuseFunctionString(newArg);
      }
      return newArg;
    };
  }
  if (typeof arg === 'string' && arg.includes('debugger')) {
    if (typeof loggerFn === 'function') {
      onlyCallOnce(loggerFn);
    }
    return defuseFunctionString(arg);
  }
  return arg;
}

function defuseFunctionString(arg: string): string {
  const before = arg;

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

  $console.info('[sukka-defuse-devtools-detector]', 'defuse "debugger"', { before, after: arg });

  return arg;
}

// eslint-disable-next-line @typescript-eslint/unbound-method -- cache native method to prevent overwrite
export const FunctionPrototypeToString = Function.prototype.toString;

let $eval: typeof window.eval | null = null;

export function setSafeEval(evalFn: typeof window.eval): void {
  $eval = evalFn;
}
export function getSafeEval(): typeof window.eval {
  if ($eval !== null) {
    return $eval;
  }
  throw new Error('[sukka-defuse-devtools-detector] getSafeEval() called before initialization!');
}
