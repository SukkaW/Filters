import { rollup } from 'rollup';
import type { Plugin, RollupOptions } from 'rollup';
import { swc } from 'rollup-plugin-swc3';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import fsp from 'node:fs/promises';
import path from 'node:path';

const WORKER_PRELUDE_MODULE = path.resolve('./src/scriptlets/sukka-defuse-devtools-detector/worker-prelude.ts');
const WORKER_PRELUDE_ENTRY = './src/scriptlets/sukka-defuse-devtools-detector/worker-prelude-entry.ts';

/** The placeholder declarations in `worker-prelude.ts` that we swap at build time. */
const WORKER_PRELUDE_PLACEHOLDER = 'export const WORKER_PRELUDE: string = \'\';';
const WORKER_PRELUDE_SELF_TOKEN_PLACEHOLDER = 'export const WORKER_PRELUDE_SELF_TOKEN: string = \'\';';

/**
 * Stands in for the prelude's own source inside the prelude bundle.
 *
 * Injected *bare* (not as a string literal) on the prelude pass, so it occupies an
 * expression position that `resolveSelfReference` can later fill with a quoted
 * literal. It deliberately never appears as a literal in any source file -- see
 * the note in `worker-prelude.ts`.
 */
const SELF_TOKEN = '__SUKKA_WORKER_PRELUDE_SELF__';

/**
 * Supplies the body of `worker-prelude.ts`, whose checked-in source is only a
 * placeholder.
 *
 * A Worker is a separate realm and cannot import from the page, so the patches
 * that run inside it have to arrive as source text. Rather than hand-maintaining a
 * second copy of every patch, we bundle the real modules into a standalone IIFE
 * and inline *that* -- so `patch-console`, `patch-function`, `patch-timer` and
 * `patch-devtoolsformatter` each have exactly one implementation, shared by the
 * document and every worker.
 *
 * Two passes use this, and they inject different things:
 *
 * - Building the prelude itself (`selfPass`), which cannot embed a literal copy of
 *   its own output: `WORKER_PRELUDE` becomes the bare `SELF_TOKEN`, leaving a hole
 *   that `resolveSelfReference` fills in at runtime.
 * - Building a scriptlet: `WORKER_PRELUDE` becomes the finished prelude text, and
 *   `WORKER_PRELUDE_SELF_TOKEN` becomes the token *as a string* so `patch-worker`
 *   can find that hole.
 *
 * The token is only ever a literal on the scriptlet pass. If it were also one on
 * the prelude pass, the prelude bundle would contain two indistinguishable
 * occurrences and substitution would corrupt the quoted one.
 */
function injectWorkerPrelude(preludeSource: string, selfPass: boolean): Plugin {
  return {
    name: 'sukka-inject-worker-prelude',
    // `transform` rather than `load` so the placeholder still type-checks and
    // lints as ordinary TypeScript.
    transform(code, id) {
      if (path.resolve(id) !== WORKER_PRELUDE_MODULE) {
        return null;
      }
      // Failing loudly matters: a silent no-op would ship a scriptlet whose
      // workers are never patched, with nothing to indicate it.
      if (!code.includes(WORKER_PRELUDE_PLACEHOLDER) || !code.includes(WORKER_PRELUDE_SELF_TOKEN_PLACEHOLDER)) {
        this.error('worker-prelude.ts no longer contains the expected placeholder declarations');
      }

      return {
        code: code
          .replace(
            WORKER_PRELUDE_PLACEHOLDER,
            // Bare on the prelude pass so it sits in expression position.
            `export const WORKER_PRELUDE: string = ${selfPass ? SELF_TOKEN : JSON.stringify(preludeSource)};`
          )
          .replace(
            WORKER_PRELUDE_SELF_TOKEN_PLACEHOLDER,
            // On the prelude pass this stays a placeholder: `resolveSelfReference`
            // running *inside* a worker must not try to substitute anything, and
            // an empty needle would otherwise match at every position.
            `export const WORKER_PRELUDE_SELF_TOKEN: string = ${selfPass ? '\'\'' : JSON.stringify(SELF_TOKEN)};`
          ),
        map: null
      };
    }
  };
}

function createRollupOpt(preamble: string, preludeSource: string, selfPass = false): RollupOptions {
  return {
    plugins: [
      nodeResolve(),
      injectWorkerPrelude(preludeSource, selfPass),
      swc({
        jsc: {
          target: 'es2022',
          minify: {
            compress: {
              ecma: 2022,
              module: false,
              negate_iife: false,
              unsafe: true
            },
            mangle: true,
            module: false,
            format: {
              ecma: 2022,
              preamble
            }
          }
        },
        minify: true
      })
    ]
  };
}

/**
 * Bundle the worker prelude to a string.
 *
 * Built with the self-reference token in place of its own source, so a patched
 * worker can inject the same prelude into a nested worker (resolved at runtime by
 * `resolveSelfReference`).
 */
async function buildWorkerPrelude(): Promise<string> {
  const bundle = await rollup({
    input: WORKER_PRELUDE_ENTRY,
    // `preludeSource` is unused on this pass -- the self token is injected instead.
    ...createRollupOpt('', '', true)
  });
  const { output } = await bundle.generate({
    format: 'iife',
    interop: 'auto',
    compact: true,
    strict: true
  });
  await bundle.close();

  return output[0].code;
}

export async function buildScriptlets() {
  const workerPrelude = await buildWorkerPrelude();

  for await (const dirent of await fsp.opendir('./src/scriptlets')) {
    // `_`-prefixed directories hold code shared between scriptlets (and files at
    // the root, like `_utils.ts`, do the same) -- they are not scriptlets.
    if (dirent.isDirectory() && dirent.name[0] !== '_') {
      await (await rollup({
        input: `./src/scriptlets/${dirent.name}/index.ts`,
        ...createRollupOpt(`/// ${dirent.name}.js\n`, workerPrelude)
      })).write({
        file: `./public/scriptlets/${dirent.name}.js`,
        format: 'iife',
        interop: 'auto',
        compact: true,
        strict: true
      });
    }
  }
}

if (require.main === module) {
  buildScriptlets().catch(console.error);
}
