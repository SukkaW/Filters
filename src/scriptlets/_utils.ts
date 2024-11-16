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

export const WINDOW_INSTANCE_LIST = (() => {
  const set = new Set<(Window & typeof globalThis) | undefined>();
  try {
    set.add(window);
  } catch { }
  try {
    if (window.top) {
      set.add(window.top as any);
    }
  } catch { }
  try {
    set.add(window.self);
  } catch { }

  return set;
})();
