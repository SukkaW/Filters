import { rollup } from 'rollup';
import type { RollupOptions } from 'rollup';
import { swc } from 'rollup-plugin-swc3';
import fsp from 'node:fs/promises';

function createRollupOpt(preamble: string): RollupOptions {
  return {
    plugins: [
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

export async function buildScriptlets() {
  for await (const dirent of await fsp.opendir('./src/scriptlets')) {
    if (dirent.isDirectory()) {
      await (await rollup({
        input: `./src/scriptlets/${dirent.name}/index.ts`,
        ...createRollupOpt(`/// ${dirent.name}.js\n`)
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
