import { $console, defuseDebuggerInArg, FunctionPrototypeToString, getSafeEval, WINDOW_INSTANCE_LIST } from '../_utils';

/**
 * Some anti-devtools try to call debugger inside setTimeout and setInterval
 * We can defuse it by patching window.setTimeout and window.setInterval
 */
export function patchTimer() {
  WINDOW_INSTANCE_LIST.forEach(([globalName, global]) => {
    try {
      global.setInterval = new Proxy(global.setInterval, {
        apply(target, thisArg, args: Parameters<typeof setInterval>) {
          // Do not use String(args[0]) here. String() respects the toString() which might be overridden
          // Function.prototype.toString is much safer, and usually you can't override this (every polyfills out there will panic)
          args[0] = getSafeEval()('(' + defuseDebuggerInArg(FunctionPrototypeToString.call(args[0]), logDefuseSetIntervalDebugger) + ')');

          return Reflect.apply(target, thisArg, args);
        }
      });
    } catch (e) {
      $console.warn('[sukka-defuse-devtools-detector]', `Fail to proxy ${globalName}.setInterval!`, e);
    }
    try {
      global.setTimeout = new Proxy(global.setTimeout, {
        apply(target, thisArg, args: Parameters<typeof setTimeout>) {
          // Do not use String(args[0]) here. String() respects the toString() which might be overridden
          // Function.prototype.toString is much safer, and usually you can't override this (every polyfills out there will panic)
          args[0] = getSafeEval()('(' + defuseDebuggerInArg(FunctionPrototypeToString.call(args[0]), logDefuseSetTimeoutDebugger) + ')');

          return Reflect.apply(target, thisArg, args);
        }
      });
    } catch (e) {
      $console.warn('[sukka-defuse-devtools-detector]', `Fail to proxy ${globalName}.setTimeout!`, e);
    }
  });
}

function logDefuseSetIntervalDebugger(this: void) {
  $console.info('[sukka-defuse-devtools-detector] defused "debugger" from setInterval()');
};
function logDefuseSetTimeoutDebugger(this: void) {
  $console.info('[sukka-defuse-devtools-detector] defused "debugger" from setTimeout()');
}
