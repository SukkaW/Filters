import path from 'node:path';
import { buildFilter } from './filters';
import { buildScriptlets } from './scriptlets';
import fs from 'node:fs';
import { PUBLIC_DIR } from './_constants';

(async () => {
  await buildFilter();
  await buildScriptlets();

  fs.writeFileSync(
    path.join(PUBLIC_DIR, '404.html'),
    [
      '# <pre>',
      '#########################################',
      '# Sukka\'s Filters - 404 Not Found',
      '# Homepage: https://github.com/SukkaW/Filters',
      '# License: MIT',
      '################## EOF ##################',
      '</pre>',
      ''
    ].join('\n')
  );
})();
