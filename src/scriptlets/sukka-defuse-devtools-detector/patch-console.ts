import { $console, ObjectDefineProperty, onlyCallOnce, WINDOW_INSTANCE_LIST } from '../_utils';

function logDefuseConsoleClear(this: void) {
  $console.info('[sukka-defuse-devtools-detector]', 'Detect someone want to console.clear()!');
};
function logDefuseConsoleHtmlElement(this: void) {
  $console.info('[sukka-defuse-devtools-detector]', 'Detect someone want to log an Element!');
};
function logDefuseConsoleRegExp(this: void) {
  $console.info('[sukka-defuse-devtools-detector]', 'Detect someone want to log a RegExp!');
};
function logDefuseConsoleDate(this: void) {
  $console.info('[sukka-defuse-devtools-detector]', 'Detect someone want to log a Date!');
};
function logDefuseConsoleFunction(this: void) {
  $console.info('[sukka-defuse-devtools-detector]', 'Detect someone want to log a Function!');
};
function logDefuseConsoleLargeArray(this: void) {
  $console.info('[sukka-defuse-devtools-detector]', 'Detect someone want to log a large Array!');
};
function logDefuseConsoleLargeObject(this: void) {
  $console.info('[sukka-defuse-devtools-detector]', 'Detect someone want to log a large Object!');
};

/**
 * When logging specific objects, Chrome DevTools will attempt to call `toString()` method
 * Some devtools detector will try to override the `toString()` method to detect devtools
 * We can defuse it by patching console methods
 */
export function patchConsole() {
  WINDOW_INSTANCE_LIST.forEach(([globalName, global]) => {
    // eslint-disable-next-line guard-for-in -- deliberately loop through all keys
    for (const _key in global.console) {
      const key = _key as keyof Console;

      const descriptor = Object.getOwnPropertyDescriptor(global.console, key);
      if (!descriptor) {
        $console.warn('[sukka-defuse-devtools-detector]', `Fail to get descriptor of ${globalName}.console.${key}`);
        continue;
      }
      if (!descriptor.writable) {
        $console.warn('[sukka-defuse-devtools-detector]', `${globalName}.console.${key}`, 'is not writable');
        continue;
      }
      if (typeof descriptor.value !== 'function') {
        $console.warn('[sukka-defuse-devtools-detector]', `${globalName}.console.${key}`, 'is not a function');
        continue;
      }

      try {
        if (key === 'clear') {
          ObjectDefineProperty(global.console, key, {
            configurable: false,
            enumerable: true,
            writable: true,
            value() {
              onlyCallOnce(logDefuseConsoleClear);
            }
          });
          continue;
        }

        ObjectDefineProperty(global.console, key, {
          configurable: false,
          enumerable: true,
          writable: true,
          value: new Proxy(global.console[key], {
            apply(target, thisArg, args) {
              if (args.some(checkArg)) {
                return;
              }
              return Reflect.apply(target, thisArg, args);
            }
          })
        });
      } catch (e) {
        $console.error('[sukka-defuse-devtools-detector]', `Fail to overwrite ${globalName}.console.${key}`, e);
      }
    }
  });
}

function checkArg(this: void, arg: unknown): boolean {
  if (isElement(arg) /* && nonNativeToString(arg) */) {
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

function isElement(el: unknown): el is Element {
  if (typeof el !== 'object' || el === null) {
    return false;
  }
  return (
    'tagName' in el
    && typeof (el as Element).tagName === 'string'
    && 'nodeName' in el
    && typeof (el as Element).nodeName === 'string'
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
