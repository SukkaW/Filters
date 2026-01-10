import { $console, $eval, argHasDebugger, defuseDebuggerInArg, FunctionPrototypeToString, ObjectDefineProperty, WINDOW_INSTANCE_LIST } from '../_utils';

/**
 * Some devtools detector will try to call debugger from eval(), some may simply call `Function('debugger')` instead of `eval('debugger')`,
 * or `new Function('debugger')`
 *
 * We can defuse it by proxy globalThis.Function
 */
export function patchFunction() {
  WINDOW_INSTANCE_LIST.forEach(([globalName, global]) => {
    try {
      global.Function = new Proxy(global.Function, {
        apply(target, thisArg, args: Parameters<typeof global.Function>) {
          args = args.map(arg => defuseDebuggerInArg(arg, logDefuseFunctionDebugger));
          return Reflect.apply(target, thisArg, args);
        },
        construct(target, args: ConstructorParameters<FunctionConstructor>, newTarget) {
          args = args.map(arg => defuseDebuggerInArg(arg, logDefuseNewFunctionDebugger));
          return Reflect.construct(target, args, newTarget);
        }
      });
    } catch (e) {
      $console.warn('[sukka-defuse-devtools-detector]', `Fail to proxy ${globalName}.Function!`, e);
    }
    try {
      global.eval = new Proxy(global.eval, {
        apply(target, thisArg, args: Parameters<typeof global.eval>) {
          // we know there is only one argument, so we can just use args[0]
          args[0] = defuseDebuggerInArg(args[0], logDefuseEvalDebugger);
          return Reflect.apply(target, thisArg, args);
        }
      });
    } catch (e) {
      $console.warn('[sukka-defuse-devtools-detector]', `Fail to proxy ${globalName}.eval!`, e);
    }
    try {
      ObjectDefineProperty(global.Function.prototype, 'constructor', {
        configurable: false,
        enumerable: true,
        writable: true, // some polyfill, like core-js, needs to overrite this for GeneratorFunction and AsyncFunction
        value: new Proxy(global.Function.prototype.constructor, {
          apply(target, thisArg, args) {
            args = args.map(arg => defuseDebuggerInArg(arg, logDefuseFunctionProrotypeConstructorDebugger));
            return Reflect.apply(target, thisArg, args);
          }
        })
      });
    } catch (e) {
      $console.warn('[sukka-defuse-devtools-detector]', `Fail to proxy ${globalName}.Function.prototype.constructor!`, e);
    }

    // Function.prototype.bind returns a function with "function () { [native code] }"
    // So we can't re-create this function using "eval". So instead we patch function from the origin

    // eslint-disable-next-line @typescript-eslint/unbound-method -- we only extract the method, not call it
    const originalFunctionPrototypeBind = global.Function.prototype.bind;
    const proxied = new Proxy(originalFunctionPrototypeBind, {
      apply(target, thisArg, args: Parameters<typeof global.Function.prototype.bind>) {
        const functionString = FunctionPrototypeToString.call(thisArg);
        if (argHasDebugger(functionString)) {
          // re-create the function using eval
          thisArg = $eval('(' + defuseDebuggerInArg(functionString, logDefuseFunctionBindDebugger) + ')');
        }

        return Reflect.apply(target, thisArg, args);
      }
    });

    try {
      ObjectDefineProperty(global.Function.prototype, 'bind', {
        configurable: false,
        enumerable: true,
        set(v) {
          $console.warn('[sukka-defuse-devtools-detector]', `detects written of ${globalName}.Function.prototype.bind, will re-apply the proxy!`, { v });
        },

        get() {
          return proxied;
        }
      });
    } catch (e) {
      $console.warn('[sukka-defuse-devtools-detector]', `Fail to proxy ${globalName}.Function.prototype.bind!`, e);
    }

    // TODO: `new Proxy(debuggerFn, {})` returns a function with "function () { [native code] }"
    // So we can't re-create this function directly using "eval".
    // This might be exploitable as some one could do:
    // setInterval(new Proxy(debuggerFn, {}), 300);
  });
}

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

function logDefuseFunctionBindDebugger(this: void) {
  $console.info('[sukka-defuse-devtools-detector] defused "debugger" from Function.prototype.bind');
}
