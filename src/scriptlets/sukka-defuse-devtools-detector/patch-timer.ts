import { $console, noop, onlyCallOnce } from '../_utils';

/**
 * Some anti-devtools try to call debugger inside setTimeout and setInterval
 * We can defuse it by patching window.setTimeout and window.setInterval
 */
export function patchTimer() {
  globalThis.setInterval = new Proxy(globalThis.setInterval, {
    apply(target, thisArg, args: Parameters<typeof setInterval>) {
      const cb = args[0];
      const ms = args[1];

      const cbStr = cb.toString();

      if (cbStr.includes('debugger')) {
        onlyCallOnce(logDefuseSetIntervalDebugger);
        return target.call(thisArg, noop, ms);
      }

      return Reflect.apply(target, thisArg, args);
    }
  });
  globalThis.setTimeout = new Proxy(globalThis.setTimeout, {
    apply(target, thisArg, args: Parameters<typeof setTimeout>) {
      const cb = args[0];
      const ms = args[1];

      const cbStr = cb.toString();

      if (cbStr.includes('debugger')) {
        onlyCallOnce(logDefuseSetTimeoutDebugger);
        return target.call(thisArg, noop, ms);
      }

      return Reflect.apply(target, thisArg, args);
    }
  });
}

function logDefuseSetIntervalDebugger(this: void) {
  $console.info('[sukka-defuse-devtools-detector] defused "debugger" from setInterval()');
};
function logDefuseSetTimeoutDebugger(this: void) {
  $console.info('[sukka-defuse-devtools-detector] defused "debugger" from setInterval()');
}
