import { buildFilter } from './filters';
import { buildScriptlets } from './scriptlets';

(async () => {
  await buildFilter();
  await buildScriptlets();
})();
