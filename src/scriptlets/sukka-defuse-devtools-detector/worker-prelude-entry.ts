/**
 * Entrypoint for the prelude that gets prepended to every intercepted Worker.
 *
 * This is NOT imported at runtime by the scriptlet. It is bundled separately by
 * `scripts/scriptlets.ts` into a standalone IIFE, and that bundle's text is
 * inlined into the scriptlet as the `WORKER_PRELUDE` string (see
 * `./worker-prelude.ts`, which the bundler generates).
 *
 * The point of the indirection is that a Worker is a separate realm and cannot
 * `import` from the page, yet every patch here is the *same module* the main
 * thread uses -- so there is exactly one implementation of each defuse, and the
 * worker can never drift out of sync with the document.
 *
 * That works because `_utils` resolves globals through `globalThis` rather than
 * `window`: in a document `GLOBAL_INSTANCE_LIST` is the window (plus `top`/`self`
 * when distinct), and in a worker it is the sole worker global.
 *
 * `patchWorker` is deliberately *not* included -- see below.
 */
import { patchConsole } from './patch-console';
import { patchDevtoolsFormatter } from './patch-devtoolsformatter';
import { patchFunction } from './patch-function';
import { patchTimer } from './patch-timer';
import { patchWorker } from './patch-worker';

(function sukkaDefuseDevToolsDetectorWorkerPrelude() {
  // Each patch is independently guarded: the prelude runs *before* the page's own
  // worker body, so a failure here must never prevent that body from running.
  const run = (fn: () => void) => {
    try {
      fn();
    } catch { }
  };

  run(patchConsole);
  run(patchDevtoolsFormatter);
  run(patchFunction);
  run(patchTimer);
  // Workers can spawn nested workers, so the interception has to be recursive --
  // otherwise a detector just moves its probe one realm deeper. `patchWorker`
  // itself embeds this same prelude, and because the bundle is generated once and
  // referenced by name there is no infinite expansion at build time.
  run(patchWorker);
})();
