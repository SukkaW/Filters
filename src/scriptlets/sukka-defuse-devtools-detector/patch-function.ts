import { onlyCallOnce, noop, $console } from '../_utils';

function logDefuseFunctionDebugger(this: void) {
  $console.info('[sukka-defuse-devtools-detector] defused "debugger" from Function()');
}

function logDefuseFunctionProrotypeConstructorDebugger(this: void) {
  $console.info('[sukka-defuse-devtools-detector] defused "debugger" from Function.prototype.constructor');
}

function logDefuseNewFunctionDebugger(this: void) {
  $console.info('[sukka-defuse-devtools-detector] defused "debugger" from new Function()');
}

function logDefuseEvalDebugger(this: void) {
  $console.info('[sukka-defuse-devtools-detector] defused "debugger" from eval()');
}

/**
 * Some devtools detector will try to call debugger from eval(), some may simply call `Function('debugger')` instead of `eval('debugger')`,
 * or `new Function('debugger')`
 *
 * We can defuse it by proxy globalThis.Function
 */
export function patchFunction() {
  try {
    globalThis.Function = new Proxy(globalThis.Function, {
      apply(target, thisArg, args: Parameters<typeof globalThis.Function>) {
        if (args.some((arg) => typeof arg === 'string' && arg.includes('debugger'))) {
          onlyCallOnce(logDefuseFunctionDebugger);
          return noop;
        }
        return Reflect.apply(target, thisArg, args);
      },
      construct(target, args: ConstructorParameters<FunctionConstructor>, newTarget) {
        if (args.some((arg) => typeof arg === 'string' && arg.includes('debugger'))) {
          onlyCallOnce(logDefuseNewFunctionDebugger);
          return noop;
        }
        return Reflect.construct(target, args, newTarget);
      }
    });
  } catch (e) {
    $console.warn('[sukka-defuse-devtools-detector]', 'Fail to proxy globalThis.Function!', e);
  }
  try {
    // eslint-disable-next-line no-eval -- we are patching eval to prevent harmful debugger
    globalThis.eval = new Proxy(globalThis.eval, {
      apply(target, thisArg, args: Parameters<typeof globalThis.eval>) {
        if (typeof args[0] === 'string' && args[0].includes('debugger')) {
          onlyCallOnce(logDefuseEvalDebugger);
          return;
        }
        return Reflect.apply(target, thisArg, args);
      }
    });
  } catch (e) {
    $console.warn('[sukka-defuse-devtools-detector]', 'Fail to proxy globalThis.eval!', e);
  }
  try {
    // eslint-disable-next-line no-extend-native -- we are patching Function.prototype.constructor to prevent harmful debugger
    Object.defineProperty(Function.prototype, 'constructor', {
      configurable: false,
      enumerable: true,
      writable: false,
      value: new Proxy(Function.prototype.constructor, {
        apply(target, thisArg, args) {
          if (args.some((arg) => typeof arg === 'string' && arg.includes('debugger'))) {
            onlyCallOnce(logDefuseFunctionProrotypeConstructorDebugger);
            return noop;
          }
          return Reflect.apply(target, thisArg, args);
        }
      })
    });
  } catch (e) {
    $console.warn('[sukka-defuse-devtools-detector]', 'Fail to proxy Function.prototype.constructor!', e);
  }
}
