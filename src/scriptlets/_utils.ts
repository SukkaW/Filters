export function noop() {
  // noop
}

const fnWs = new WeakSet();
export function onlyCallOnce(fn: () => void) {
  if (fnWs.has(fn)) {
    return;
  }
  fnWs.add(fn);
  fn();
}

export const EMPTY_ARRAY = Object.freeze([]);
