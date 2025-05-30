import { $console, onlyCallOnce } from '../_utils';

/**
 * Some anti-devtools try to call debugger inside setTimeout and setInterval
 * We can defuse it by patching window.setTimeout and window.setInterval
 */
export function patchTimer() {
  globalThis.setInterval = new Proxy(globalThis.setInterval, {
    apply(target, thisArg, args: Parameters<typeof setInterval>) {
      // Do not use String(args[0]) here. String() respects the toString() which might be overridden
      // Function.prototype.toString is much safer, and usually you can't override this (every polyfills out there will panic)
      const cbStr = Function.prototype.toString.call(args[0]);

      if (cbStr.includes('debugger')) {
        onlyCallOnce(logDefuseSetIntervalDebugger);

        // eslint-disable-next-line no-eval -- patching callback
        args[0] = eval('(' + cbStr.replaceAll('debugger', '') + ')');
      }

      return target.apply(thisArg, args);
    }
  });
  globalThis.setTimeout = new Proxy(globalThis.setTimeout, {
    apply(target, thisArg, args: Parameters<typeof setTimeout>) {
      // Do not use String(args[0]) here. String() respects the toString() which might be overridden
      // Function.prototype.toString is much safer, and usually you can't override this (every polyfills out there will panic)
      const cbStr = Function.prototype.toString.call(args[0]);

      if (cbStr.includes('debugger')) {
        onlyCallOnce(logDefuseSetTimeoutDebugger);

        // eslint-disable-next-line no-eval -- patching callback
        args[0] = eval('(' + cbStr.replaceAll('debugger', '') + ')');
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
