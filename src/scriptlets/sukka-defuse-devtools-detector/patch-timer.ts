import { $console, onlyCallOnce } from '../_utils';
import { noop } from 'foxts/noop';

/**
 * Some anti-devtools try to call debugger inside setTimeout and setInterval
 * We can defuse it by patching window.setTimeout and window.setInterval
 */
export function patchTimer() {
  globalThis.setInterval = new Proxy(globalThis.setInterval, {
    apply(target, thisArg, args: Parameters<typeof setInterval>) {
      const cbStr = String(args[0]);

      if (cbStr.includes('debugger')) {
        onlyCallOnce(logDefuseSetIntervalDebugger);
        args[0] = noop;
      }

      return target.apply(thisArg, args);
    }
  });
  globalThis.setTimeout = new Proxy(globalThis.setTimeout, {
    apply(target, thisArg, args: Parameters<typeof setTimeout>) {
      const cbStr = String(args[0]);

      if (cbStr.includes('debugger')) {
        onlyCallOnce(logDefuseSetTimeoutDebugger);
        args[0] = noop;
      }

      return target.apply(thisArg, args);
    }
  });
}

function logDefuseSetIntervalDebugger(this: void) {
  $console.info('[sukka-defuse-devtools-detector] defused "debugger" from setInterval()');
};
function logDefuseSetTimeoutDebugger(this: void) {
  $console.info('[sukka-defuse-devtools-detector] defused "debugger" from setInterval()');
}
