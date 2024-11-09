import path from 'node:path';
import fs from 'node:fs';
import { OUTPUT_FILTERS_DIR, SRC_FILTERS_DIR } from './_constants';
import { Transform } from 'node:stream';
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

class TextLineMinify extends Transform {
  constructor(allowCR = false) {
    let __buf = '';
    let chunkIndex = 0;

    const decoder = new TextDecoder();

    super({
      transform(incoming, _, callback) {
        let result = '';

        let tmp = '';

        const chunk = __buf + decoder.decode(incoming);
        chunkIndex = 0;

        for (; ;) {
          const lfIndex = chunk.indexOf('\n', chunkIndex);

          if (allowCR) {
            const crIndex = chunk.indexOf('\r', chunkIndex);

            if (
              crIndex !== -1 && crIndex !== (chunk.length - 1)
              && (lfIndex === -1 || (lfIndex - 1) > crIndex)
            ) {
              tmp = chunk.slice(chunkIndex, crIndex);

              if (
                tmp.length > 0 // ignore empty line
                && tmp[0] !== '!' // ignore comment line
                && tmp[0] !== '#' // ignore comment line
              ) {
                result += tmp;
                result += '\n';
              }

              chunkIndex = crIndex + 1;
              continue;
            }
          }

          if (lfIndex === -1) {
            // we can no longer find a line break in the chunk, break the current loop
            break;
          }

          // enqueue current line, and loop again to find next line
          let crOrLfIndex = lfIndex;
          if (chunk[lfIndex - 1] === '\r') {
            crOrLfIndex--;
          }
          tmp = chunk.slice(chunkIndex, crOrLfIndex);
          if (
            tmp.length > 0 // ignore empty line
            && tmp[0] !== '!' // ignore comment line
            && tmp[0] !== '#' // ignore comment line
          ) {
            result += tmp;
            result += '\n';
          }

          chunkIndex = lfIndex + 1;
          continue;
        }

        // Last chunk to be processed later
        __buf = chunk.slice(chunkIndex);

        callback(null, result);
      },
      flush(callback) {
        if (__buf.length > 0) {
          // eslint-disable-next-line sukka/string/prefer-string-starts-ends-with -- performance
          if (allowCR && __buf[__buf.length - 1] === '\r') {
            callback(null, __buf.slice(0, -1));
          } else {
            callback(null, __buf);
          }
        }
      }
    });
  }
}

const srcFile = path.resolve(SRC_FILTERS_DIR, 'index.txt');
const destFile = path.join(OUTPUT_FILTERS_DIR, 'index.txt');

export async function buildFilter() {
  fs.mkdirSync(OUTPUT_FILTERS_DIR, { recursive: true });

  fs.writeFileSync(destFile, templates(new Date().toUTCString()).join('\n'));

  await pipeline(
    fs.createReadStream(srcFile, { encoding: 'utf-8' }),
    new TextLineMinify(),
    fs.createWriteStream(destFile, { flags: 'a', encoding: 'utf-8' })
  );
}

if (require.main === module) {
  buildFilter().catch(console.error);
}
