import { $console, argHasDebugger, defuseDebuggerInArg, FunctionPrototypeToString, $eval, WINDOW_INSTANCE_LIST, $Proxy } from '../_utils';

/**
 * Some anti-devtools try to call debugger inside setTimeout and setInterval
 * We can defuse it by patching window.setTimeout and window.setInterval
 */
export function patchTimer() {
  WINDOW_INSTANCE_LIST.forEach(([globalName, global]) => {
    try {
      global.setInterval = new $Proxy(global.setInterval, {
        apply(target, thisArg, args: Parameters<typeof setInterval>) {
          // Do not use String(args[0]) here. String() respects the toString() which might be overridden
          // Function.prototype.toString is much safer, and usually you can't override this (every polyfills out there will panic)
          const args_0_string = FunctionPrototypeToString.call(args[0]);
          // we do not re-create callback when there is no debugger anyway
          if (argHasDebugger(args_0_string)) {
            args[0] = $eval('(' + defuseDebuggerInArg(args_0_string, logDefuseSetIntervalDebugger) + ')');
          }

          return Reflect.apply(target, thisArg, args);
        }
      });
    } catch (e) {
      $console.warn('[sukka-defuse-devtools-detector]', `Fail to proxy ${globalName}.setInterval!`, e);
    }
    try {
      global.setTimeout = new $Proxy(global.setTimeout, {
        apply(target, thisArg, args: Parameters<typeof setTimeout>) {
          // Do not use String(args[0]) here. String() respects the toString() which might be overridden
          // Function.prototype.toString is much safer, and usually you can't override this (every polyfills out there will panic)
          const args_0_string = FunctionPrototypeToString.call(args[0]);
          // we do not re-create callback when there is no debugger anyway
          if (argHasDebugger(args_0_string)) {
            args[0] = $eval('(' + defuseDebuggerInArg(args_0_string, logDefuseSetTimeoutDebugger) + ')');
          }

          return Reflect.apply(target, thisArg, args);
        }
      });
    } catch (e) {
      $console.warn('[sukka-defuse-devtools-detector]', `Fail to proxy ${globalName}.setTimeout!`, e);
    }
  });
}

function logDefuseSetIntervalDebugger(this: void, before: string, after: string) {
  $console.info('[sukka-defuse-devtools-detector] defused "debugger" from setInterval()', { before, after });
};
function logDefuseSetTimeoutDebugger(this: void, before: string, after: string) {
  $console.info('[sukka-defuse-devtools-detector] defused "debugger" from setTimeout()', { before, after });
}
