import { WINDOW_INSTANCE_LIST } from '../_utils';

/**
 * Some devtools detector will try to access `window.devtoolsFormatters`
 * We can defuse it by stop the setters of `window.devtoolsFormatters`
 */
export function patchDevtoolsFormatter() {
  WINDOW_INSTANCE_LIST.forEach(windowInstance => {
    try {
      Object.defineProperty(windowInstance, 'devtoolsFormatters', {
        configurable: false,
        enumerable: false,
        get() {
        // every time someone try to access window.devtoolsFormatters,
        // we will return a fresh empty array, so any mutation will be ignored
          return [];
        },
        set() {
        // noop
        // we ignore any attempt to set window.devtoolsFormatters
        }
      });
    } catch (e) {
      console.error('[sukka-defuse-devtools-detector]', 'Fail to overwrite devtoolsFormatters on', { windowInstance }, e);
    }
  });
}
