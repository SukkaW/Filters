import { CONSOLE_INSTANCE_LIST, noop, onlyCallOnce } from '../_utils';

function logDefuseConsoleClear(this: void) {
  console.info('[sukka-defuse-devtools-detector]', 'Detect someone want to console.clear()!');
};
function logDefuseConsoleHtmlElement(this: void) {
  console.info('[sukka-defuse-devtools-detector]', 'Detect someone want to log an HTMLElement!');
};
function logDefuseConsoleRegExp(this: void) {
  console.info('[sukka-defuse-devtools-detector]', 'Detect someone want to log a RegExp!');
};
function logDefuseConsoleDate(this: void) {
  console.info('[sukka-defuse-devtools-detector]', 'Detect someone want to log a Date!');
};
function logDefuseConsoleFunction(this: void) {
  console.info('[sukka-defuse-devtools-detector]', 'Detect someone want to log a Function!');
};
function logDefuseConsoleLargeArray(this: void) {
  console.info('[sukka-defuse-devtools-detector]', 'Detect someone want to log a large Array!');
};
function logDefuseConsoleLargeObject(this: void) {
  console.info('[sukka-defuse-devtools-detector]', 'Detect someone want to log a large Object!');
};

/**
 * When logging specific objects, Chrome DevTools will attempt to call `toString()` method
 * Some devtools detector will try to override the `toString()` method to detect devtools
 * We can defuse it by patching console methods
 */
export function patchConsole() {
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
                  onlyCallOnce(logDefuseConsoleClear);
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
}

function checkArg(arg: unknown): boolean {
  if (arg instanceof HTMLElement) {
    onlyCallOnce(logDefuseConsoleHtmlElement);
    return true;
  }
  if (arg instanceof RegExp) {
    onlyCallOnce(logDefuseConsoleRegExp);
    return true;
  }
  if (arg instanceof Date) {
    onlyCallOnce(logDefuseConsoleDate);
    return true;
  }
  if (typeof arg === 'function') {
    onlyCallOnce(logDefuseConsoleFunction);
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
      onlyCallOnce(logDefuseConsoleLargeArray);
      return true;
    }
    return arg.map(checkArg).some(Boolean);
  }
  if (typeof arg === 'object' && arg) {
    try {
      // object size check
      if (Object(arg) === arg && Object.keys(arg).length > 100) {
        onlyCallOnce(logDefuseConsoleLargeObject);
        return true;
      }
    } catch { }
    return Object.values(arg).map(checkArg).some(Boolean);
  }
  return false;
}
