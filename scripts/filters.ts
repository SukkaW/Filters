import path from 'node:path';
import fs from 'node:fs';
import { OUTPUT_FILTERS_DIR, SRC_FILTERS_DIR } from './_constants';
import { Readable } from 'node:stream';
import { TextDecoderStream } from 'node:stream/web';
import { FilterMinifyStream, TextLineStream } from './_utils';
import { pipeline } from 'node:stream/promises';

function templates(date: string) {
  return [
    '! Title: Sukka Filters',
    `! Last modified: ${date}`,
    '! Expires: 1 hours',
    '! Description: The filters from Sukka',
    '! License: https://github.com/SukkaW/Filters/blob/master/LICENSE',
    '! Homepage: https://github.com/SukkaW/Filters',
    ''
  ];
}

const srcFile = path.resolve(SRC_FILTERS_DIR, 'index.txt');
const destFile = path.join(OUTPUT_FILTERS_DIR, 'index.txt');

export function buildFilter() {
  fs.mkdirSync(OUTPUT_FILTERS_DIR, { recursive: true });

  fs.writeFileSync(destFile, templates(new Date().toUTCString()).join('\n'));

  return pipeline(
    Readable.fromWeb(
      Readable.toWeb(fs.createReadStream(srcFile))
        .pipeThrough(new TextDecoderStream())
        .pipeThrough(new TextLineStream())
        .pipeThrough(new FilterMinifyStream())
    ),
    fs.createWriteStream(destFile, { flags: 'a' })
  );
}

if (require.main === module) {
  buildFilter().catch(console.error);
}
