import path from 'node:path';
import fs from 'node:fs';
import { OUTPUT_FILTERS_DIR, SRC_FILTERS_DIR } from './_constants';
import { Readable } from 'node:stream';
import { TextDecoderStream } from 'node:stream/web';
import { FilterMinifyStream, TextLineStream } from './_utils';
import { pipeline } from 'node:stream/promises';

const date = new Date().toUTCString();

function templates(title: string) {
  return [
    `! Title: [sukka] ${title}`,
    `! Last modified: ${date}`,
    '! Expires: 1 hours',
    '! Description: The filters from Sukka',
    '! License: https://github.com/SukkaW/Filters/blob/master/LICENSE',
    '! Homepage: https://github.com/SukkaW/Filters',
    ''
  ];
}

const builds = [
  ['Sukka Filters', 'index'],
  ['Sukka AdGuardHome Rewrites', 'adgh-dns-rewrites']
] as const;

export async function buildFilter() {
  fs.mkdirSync(OUTPUT_FILTERS_DIR, { recursive: true });

  await Promise.all(builds.map(async ([title, fileName]) => {
    const destFile = path.join(OUTPUT_FILTERS_DIR, fileName + '.txt');

    fs.writeFileSync(destFile, templates(
      title
    ).join('\n'));

    return pipeline(
      Readable.toWeb(fs.createReadStream(path.resolve(SRC_FILTERS_DIR, fileName, 'index.txt')))
        .pipeThrough(new TextDecoderStream())
        .pipeThrough(new TextLineStream())
        .pipeThrough(new FilterMinifyStream()),
      fs.createWriteStream(destFile, { flags: 'a' })
    );
  }));
}

if (require.main === module) {
  buildFilter().catch(console.error);
}
