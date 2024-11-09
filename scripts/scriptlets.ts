import { rollup } from 'rollup';
import type { RollupOptions } from 'rollup';
import { swc } from 'rollup-plugin-swc3';

function createRollupOpt(preamble: string): RollupOptions {
  return {
    plugins: [
      swc({
        jsc: {
          target: 'es2021',
          minify: {
            compress: true,
            mangle: true,
            module: true,
            format: {
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
  const bundle1 = await rollup({
    input: './src/scriptlets/sukka-defuse-devtools-detector.ts',
    ...createRollupOpt('/// sukka-defuse-devtools-detector.js\n')
  });
  await bundle1.write({
    file: './public/scriptlets/sukka-defuse-devtools-detector.js',
    format: 'iife',
    interop: 'auto'
  });
}

if (require.main === module) {
  buildScriptlets().catch(console.error);
}
