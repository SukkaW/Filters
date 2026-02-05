/// sukka-defuse-devtools-detector.js
import { patchConsole } from './patch-console';
import { patchDevtoolsFormatter } from './patch-devtoolsformatter';
import { patchFunction } from './patch-function';
import { patchTimer } from './patch-timer';

(function sukkaDefuseDevToolsDetector() {
  patchConsole();
  patchDevtoolsFormatter();
  patchFunction();
  patchTimer();
})();
