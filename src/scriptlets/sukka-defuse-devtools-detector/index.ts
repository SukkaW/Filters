/// sukka-defuse-devtools-detector.js
import { patchConsole } from './patch-console';
import { patchDevtoolsFormatter } from './patch-devtoolsformatter';
import { patchFunction } from './patch-function';
import { patchTimer } from './patch-timer';
import { patchWorker } from './patch-worker';

(function sukkaDefuseDevToolsDetector() {
  patchConsole();
  patchDevtoolsFormatter();
  patchFunction();
  patchTimer();
  patchWorker();
})();
