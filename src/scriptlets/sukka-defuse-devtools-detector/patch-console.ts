import { CONSOLE_INSTANCE_LIST, onlyCallOnce } from '../_utils';

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
        // trap console.clear
        if (k === 'clear') {
          consoleInstance.clear = new Proxy(consoleInstance.clear, {
            apply(target, thisArg, args) {
              onlyCallOnce(logDefuseConsoleClear);
              return Reflect.apply(target, thisArg, args);
            }
          });

          continue;
        }
        // trap other console methods
        try {
          const cachedMethod = consoleInstance[k];
          if (Object.getOwnPropertyDescriptor(consoleInstance, k)?.writable === true && typeof cachedMethod === 'function') {
            Object.defineProperty(consoleInstance, k, {
              enumerable: false,
              configurable: false,
              writable: false,
              value: new Proxy(consoleInstance[k], {
                apply(target, thisArg, args) {
                  if (args.some(checkArg)) {
                    return;
                  }

                  return Reflect.apply(target, thisArg, args);
                }
              })
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

function checkArg(this: void, arg: unknown): boolean {
  if (isHTMLElement(arg) /* && nonNativeToString(arg) */) {
    onlyCallOnce(logDefuseConsoleHtmlElement);
    return true;
  }
  if (isRegExp(arg)) {
    onlyCallOnce(logDefuseConsoleRegExp);
    return true;
  }
  if (isDate(arg)) {
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
    return arg.some(checkArg);
  }
  if (typeof arg === 'object' && arg) {
    try {
      // object size check
      if (Object(arg) === arg && Object.keys(arg).length > 100) {
        onlyCallOnce(logDefuseConsoleLargeObject);
        return true;
      }
    } catch { }
    return Object.values(arg).some(checkArg);
  }
  return false;
}

// function nonNativeToString(this: void, target: HTMLElement): boolean {
//   return !target.toString.toString().includes('[native code]');
// }

function isHTMLElement(el: unknown): el is HTMLElement {
  if (typeof el !== 'object' || el === null) {
    return false;
  }
  return (
    'tagName' in el
    && typeof (el as HTMLElement).tagName === 'string'
  );
}

function isRegExp(re: unknown): re is RegExp {
  if (typeof re !== 'object' || re === null) {
    return false;
  }
  return (
    'source' in re
    && typeof (re as RegExp).source === 'string'
    && 'flags' in re
    && typeof (re as RegExp).flags === 'string'
  );
}

function isDate(d: unknown): d is Date {
  if (typeof d !== 'object' || d === null) {
    return false;
  }

  return (
    'toISOString' in d
    && typeof (d as Date).toISOString === 'function'
    && 'getTime' in d
    && typeof (d as Date).getTime === 'function'
  );
}
