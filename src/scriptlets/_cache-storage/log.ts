import { $console } from '../_utils';

const PREFIX = '[sukka-cache-storage]';

/**
 * Console methods are *bound*, not wrapped. A wrapper -- say
 * `warn(...args) { $console.warn(PREFIX, ...args); }` -- becomes the top JS frame
 * of every message, so DevTools blames this module: the source link on each line
 * lands here instead of on the code that logged, and `error()` stack traces carry
 * a useless extra frame. Binding a native method adds no frame, so the reported
 * call site stays the caller's.
 *
 * That is also why there is one fixed prefix rather than a per-scriptlet one: with
 * the call site reported correctly, DevTools already shows which bundle the line
 * came from -- `sukka-ephemeral-cache-storage.js` or
 * `sukka-defuse-cache-storage.js` -- so naming the scriptlet in the text too
 * would only restate it, at the cost of mutable module state.
 */
export const info = $console.info.bind($console, PREFIX);
export const log = $console.log.bind($console, PREFIX);
export const warn = $console.warn.bind($console, PREFIX);
export const error = $console.error.bind($console, PREFIX);
