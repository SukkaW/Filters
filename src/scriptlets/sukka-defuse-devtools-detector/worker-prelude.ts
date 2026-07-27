/**
 * The bundled worker prelude source, injected at build time.
 *
 * This module is a placeholder. `scripts/scriptlets.ts` bundles
 * `./worker-prelude-entry.ts` into a standalone IIFE and rewrites the two
 * declarations below -- which is why nothing here needs to (or should) duplicate
 * any patch logic.
 *
 * Why a placeholder instead of importing the entry directly: the prelude includes
 * `patchWorker`, and `patchWorker` needs the prelude, so the two form a cycle.
 * Bundling through this seam breaks it -- the prelude bundle refers to its own
 * source via a placeholder that the runtime resolves once the bundle text is
 * known (see `resolveSelfReference` in `patch-worker.ts`).
 */

/**
 * Marker the prelude bundle carries where its own source belongs, so a patched
 * worker can inject the same prelude into any nested worker it creates.
 *
 * Both declarations in this module are *substituted by the build*, never used
 * as written. In particular the value must not appear as a literal here: this
 * module is compiled into the prelude bundle too, and a literal copy would be
 * indistinguishable from the real injection site and get clobbered along with it.
 *
 * The `: string` annotation is load-bearing despite the literal initializer --
 * without it TypeScript infers the type `''`, and narrowing against the injected
 * value collapses every other branch to `never`.
 */
// eslint-disable-next-line @typescript-eslint/no-inferrable-types -- see above: widens `''` to string
export const WORKER_PRELUDE_SELF_TOKEN: string = '';

/**
 * Replaced wholesale at build time with the bundled prelude IIFE.
 *
 * Empty in an unbundled (e.g. test) context, which `patchWorker` treats as "no
 * prelude to inject" rather than silently rewriting workers with nothing.
 *
 * The `: string` annotation is load-bearing -- see `WORKER_PRELUDE_SELF_TOKEN`.
 */
// eslint-disable-next-line @typescript-eslint/no-inferrable-types -- see above: widens `''` to string
export const WORKER_PRELUDE: string = '';
