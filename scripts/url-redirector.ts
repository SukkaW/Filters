import path from 'node:path';
import redirectRules from '../src/url-redirector';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import { OUTPUT_URL_REDIRECTOR_DIR } from './_constants';
import { buildScriptlets } from './scriptlets';

export async function buildUrlRedirector() {
  fs.mkdirSync(OUTPUT_URL_REDIRECTOR_DIR, { recursive: true });
  return Promise.all(
    redirectRules.map(async (rule) => {
      const basename = rule.basename;
      const result = JSON.stringify({
        version: '1.0',
        createdAt: new Date().toISOString(),
        rules: rule.rules.map(r => [
          {
            description: r[2] || '',
            origin: r[0],
            exclude: null,
            methods: [],
            types: [],
            target: r[1],
            enable: true
          }
        ])
      });

      return fsp.writeFile(
        path.join(
          OUTPUT_URL_REDIRECTOR_DIR,
          `${basename}.json`
        ),
        result
      );
    })
  );
}

if (require.main === module) {
  buildScriptlets().catch(console.error);
}
