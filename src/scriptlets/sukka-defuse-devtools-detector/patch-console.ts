import { onlyCallOnce, WINDOW_INSTANCE_LIST } from '../_utils';

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
  const consoleProxyCache = new WeakMap<Console[keyof Console], Console[keyof Console]>();

  WINDOW_INSTANCE_LIST.forEach((windowInstance) => {
    if (!windowInstance) return;

    windowInstance.console = new Proxy(windowInstance.console, {
      get(target, p, receiver) {
        if (p === 'clear') {
          return new Proxy(Reflect.get(target, p, receiver), {
            apply(_target, _thisArg, _args) {
              onlyCallOnce(logDefuseConsoleClear);
            }
          });
        }

        const consoleMethod = Reflect.get(
          target,
          // This enables the type infer for Reflect.get
          p as keyof Console,
          receiver
        );

        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- we need to check if consoleMethod is undefined
        if (consoleMethod == null) {
          return consoleMethod;
        }

        if (consoleProxyCache.has(consoleMethod)) {
          return consoleProxyCache.get(consoleMethod)!;
        }

        console.info('[sukka-defuse-devtools-detector]', 'Patching console method', p);

        if (typeof consoleMethod !== 'function') {
          console.info('[sukka-defuse-devtools-detector]', `${p.toString()} of console is not a function!`);
          consoleProxyCache.set(consoleMethod, consoleMethod);
          return consoleMethod;
        }

        const proxy = new Proxy(consoleMethod, {
          apply(target, thisArg, args) {
            if (args.some(checkArg)) {
              return;
            }

            return Reflect.apply(target, thisArg, args);
          }
        });

        consoleProxyCache.set(consoleMethod, proxy);

        return proxy;
      }
    });
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
