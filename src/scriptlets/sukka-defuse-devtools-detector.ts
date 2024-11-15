/* eslint-disable no-console -- scriptlets */

import { noop, onlyCallOnce } from './_utils';

/// sukka-defuse-devtools-detector.js
(function sukkaDefuseDevToolsDetector() {
  const LOGGER = {
    defuseEvalDebugger(this: void) {
      console.info('[sukka-defuse-devtools-detector] defused "debugger" from eval() / new Function() / Function()');
    },
    defuseConsoleClear(this: void) {
      console.info('[sukka-defuse-devtools-detector]', 'Detect someone want to console.clear()!');
    },
    defuseConsoleHtmlElement(this: void) {
      console.info('[sukka-defuse-devtools-detector]', 'Detect someone want to log an HTMLElement!');
    },
    defuseConsoleRegExp(this: void) {
      console.info('[sukka-defuse-devtools-detector]', 'Detect someone want to log a RegExp!');
    },
    defuseConsoleDate(this: void) {
      console.info('[sukka-defuse-devtools-detector]', 'Detect someone want to log a Date!');
    },
    defuseConsoleFunction(this: void) {
      console.info('[sukka-defuse-devtools-detector]', 'Detect someone want to log a Function!');
    },
    defuseConsoleLargeArray(this: void) {
      console.info('[sukka-defuse-devtools-detector]', 'Detect someone want to log a large Array!');
    },
    defuseConsoleLargeObject(this: void) {
      console.info('[sukka-defuse-devtools-detector]', 'Detect someone want to log a large Object!');
    }
  };

  const WINDOW_INSTANCE_LIST = (() => {
    const set = new Set<(Window & typeof globalThis) | undefined>();
    try {
      set.add(window);
    } catch { }
    try {
      if (window.top) {
        set.add(window.top as any);
      }
    } catch { }
    try {
      set.add(window.self);
    } catch { }

    return set;
  })();

  const CONSOLE_INSTANCE_LIST = (() => {
    const set = new Set<Console | undefined>();
    WINDOW_INSTANCE_LIST.forEach(window => {
      if (window) {
        try {
          set.add(window.console);
        } catch { }
      }
    });

    return set;
  })();

  /**
   * Some devtools detector will try to call debugger from eval()
   * We can defuse it by patching Function.prototype.constructor
   */
  ((contructor) => {
    // eslint-disable-next-line sukka/class-prototype, no-extend-native -- scriptlets defuse
    Function.prototype.constructor = function (s: string | null | undefined) {
      if (s === 'debugger' || s?.includes('debugger')) {
        onlyCallOnce(LOGGER.defuseEvalDebugger);
        return noop;
      }
      return contructor.call(this, s);
    };
  })(Function.prototype.constructor);

  /**
   * Some may simply call `Function('debugger')` instead of `eval('debugger')` or `new Function('debugger')`
   * We can defuse it by patching globalThis.Function
   */
  ((CachedFunction) => {
    const PatchedFunction = function (...args: any[]) {
      if (args.some((arg) => typeof arg === 'string' && arg.includes('debugger'))) {
        onlyCallOnce(LOGGER.defuseEvalDebugger);
        return noop;
      }
      return Reflect.apply(CachedFunction, globalThis, args);
    };

    // hookup static methods
    Object.setPrototypeOf(PatchedFunction, CachedFunction);
    // hookup instance properties
    Object.setPrototypeOf(PatchedFunction.prototype, CachedFunction.prototype);

    Object.defineProperty(
      globalThis,
      'Function',
      {
        value: PatchedFunction
      }
    );
  })(globalThis.Function);

  /**
   * When logging specific objects, Chrome DevTools will attempt to call `toString()` method
   * Some devtools detector will try to override the `toString()` method to detect devtools
   * We can defuse it by patching console methods
   */
  CONSOLE_INSTANCE_LIST.forEach((consoleInstance) => {
    if (consoleInstance) {
      // eslint-disable-next-line guard-for-in -- delibarately do not guard against hidden properties
      for (const _k in consoleInstance) {
        const k = _k as keyof Console;
        try {
          const cachedMethod = consoleInstance[k];
          if (Object.getOwnPropertyDescriptor(consoleInstance, k)?.writable === true && typeof cachedMethod === 'function') {
            Object.defineProperty(consoleInstance, k, {
              enumerable: false,
              configurable: false,
              writable: false,
              value(...args: any[]) {
                if (k === 'clear') {
                  onlyCallOnce(LOGGER.defuseConsoleClear);
                  return Reflect.apply(noop, window, args);
                }
                if (args.some(checkArg)) {
                  return Reflect.apply(noop, window, args);
                }

                if (typeof cachedMethod === 'function') {
                  return Reflect.apply(cachedMethod, window, args);
                }
              }
            });
          } else {
            console.info('[sukka-defuse-devtools-detector]', `${k} of console instance is not writable!`);
          }
        } catch (e) {
          console.error('[sukka-defuse-devtools-detector]', `Can't overwrite console.${k}!`, e);
        }
      }
      try {
        Object.freeze(consoleInstance);
      } catch (e) {
        console.error('[sukka-defuse-devtools-detector]', 'Fail to freeze console instance!', e);
      }
    }
  });

  function checkArg(arg: unknown): boolean {
    if (arg instanceof HTMLElement) {
      onlyCallOnce(LOGGER.defuseConsoleHtmlElement);
      return true;
    }
    if (arg instanceof RegExp) {
      onlyCallOnce(LOGGER.defuseConsoleRegExp);
      return true;
    }
    if (arg instanceof Date) {
      onlyCallOnce(LOGGER.defuseConsoleDate);
      return true;
    }
    if (typeof arg === 'function') {
      onlyCallOnce(LOGGER.defuseConsoleFunction);
      return true;
    }
    /**
     * Some devtools detector will try to log/table large array to see if it is slow
     * https://github.com/AEPKILL/devtools-detector/blob/bb2b2ebd488b0f7169be0755ea3b19c788e91cd1/src/checkers/performance.checker.ts#L13
     *
     * We can defuse it by checking if the argument contains large array
     */
    if (Array.isArray(arg)) {
      if (arg.length > 100) {
        onlyCallOnce(LOGGER.defuseConsoleLargeArray);
        return true;
      }
      return arg.map(checkArg).some(Boolean);
    }
    if (typeof arg === 'object' && arg) {
      try {
        // object size check
        if (Object(arg) === arg && Object.keys(arg).length > 100) {
          onlyCallOnce(LOGGER.defuseConsoleLargeObject);
          return true;
        }
      } catch { }
      return Object.values(arg).map(checkArg).some(Boolean);
    }
    return false;
  }

  /**
   * Some devtools detector will try to access `window.devtoolsFormatters`
   * We can defuse it by stop the setters of `window.devtoolsFormatters`
   */
  WINDOW_INSTANCE_LIST.forEach(windowInstance => {
    Object.defineProperty(windowInstance, 'devtoolsFormatters', {
      configurable: false,
      enumerable: false,
      get() {
        // every time someone try to access window.devtoolsFormatters,
        // we will return a fresh empty array, so any mutation will be ignored
        return [];
      },
      set() {
        // noop
        // we ignore any attempt to set window.devtoolsFormatters
      }
    });
  });
}());
