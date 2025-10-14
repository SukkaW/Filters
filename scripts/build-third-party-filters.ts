import picocolors from 'picocolors';
import { $$fetch } from './_fetch-retry';
import { ReadableStream } from 'node:stream/web';
import { TextDecoderStream } from 'node:stream/web';
import { nullthrow } from 'foxts/guard';
import fs from 'node:fs';
import path from 'node:path';
import { OUTPUT_FILTERS_DIR } from './_constants';
import { fastStringArrayJoin } from 'foxts/fast-string-array-join';
import { FilterMinifyStream } from './_utils';
import { TextLineStream } from 'foxts/text-line-stream';
import { pickOne } from 'foxts/pick-random';
import { pipeline } from 'node:stream/promises';

const DATA_SOURCE = [
  'https://cdn.jsdelivr.net/gh/easylist/easylist@master/custom-lists/bing-with-no-copilt.txt',
  'https://cdn.jsdelivr.net/gh/easylist/easylist@master/custom-lists/facebook-combo-list.txt',
  'https://cdn.jsdelivr.net/gh/easylist/easylist@master/custom-lists/twitter-no-right-side-nags.txt',
  'https://cdn.jsdelivr.net/gh/easylist/easylist@master/custom-lists/youtube-combo-list.txt',
  'https://cdn.jsdelivr.net/gh/easylist/easylist@master/custom-lists/youtube-whatdoyoulikedoforfun.txt',
  'https://easylist-downloads.adblockplus.org/antiadblockfilters.txt',
  'https://easylist.to/easylist/fanboy-social.txt',
  'https://filters.adtidy.org/extension/ublock/filters/20_optimized.txt',
  'https://filters.adtidy.org/extension/ublock/filters/3.txt',
  'https://gitflic.ru/project/magnolia1234/bypass-paywalls-clean-filters/blob/raw?file=bpc-paywall-filter.txt',
  // 'https://malware-filter.gitlab.io/pup-filter/pup-filter-agh.txt',
  'https://paulgb.github.io/BarbBlock/blacklists/ublock-origin.txt',
  'https://raw.githubusercontent.com/DandelionSprout/adfilt/master/AntiFakeTransparentImagesList.txt',
  'https://raw.githubusercontent.com/DandelionSprout/adfilt/master/ClearURLs%20for%20uBo/clear_urls_uboified.txt',
  'https://raw.githubusercontent.com/DandelionSprout/adfilt/master/LegitimateURLShortener.txt',
  'https://raw.githubusercontent.com/DandelionSprout/adfilt/master/RedditTrashRemovalService.txt',
  'https://raw.githubusercontent.com/DandelionSprout/adfilt/master/WikiaPureBrowsingExperience.txt',
  'https://raw.githubusercontent.com/DandelionSprout/adfilt/master/stayingonbrowser/Staying%20On%20The%20Phone%20Browser',
  'https://raw.githubusercontent.com/DandelionSprout/adfilt/refs/heads/master/AdRemovalListForUnusualAds.txt',
  'https://raw.githubusercontent.com/DandelionSprout/adfilt/refs/heads/master/Anti-Elsagate%20List.txt',
  'https://raw.githubusercontent.com/DandelionSprout/adfilt/refs/heads/master/AntiAmazonListForTwitch.txt',
  'https://raw.githubusercontent.com/DandelionSprout/adfilt/refs/heads/master/KnowYourMemePureBrowsingExperience.txt',
  'https://raw.githubusercontent.com/DandelionSprout/adfilt/refs/heads/master/TwitchPureViewingExperience.txt',
  'https://raw.githubusercontent.com/hoshsadiq/adblock-nocoin-list/master/nocoin.txt',
  'https://secure.fanboy.co.nz/fanboy-annoyance.txt',
  'https://ublockorigin.github.io/uAssets/filters/filters-mobile.txt',
  'https://www.i-dont-care-about-cookies.eu/abp/'
];

type CamelCase<S extends string> = S extends `${infer F} ${infer R}`
  ? `${Lowercase<F>}${Capitalize<CamelCase<R>>}`
  : S extends `${infer F}-${infer R}`
    ? `${Lowercase<F>}${Capitalize<CamelCase<R>>}`
    : Lowercase<S>;

(async () => {
  fs.mkdirSync(OUTPUT_FILTERS_DIR, { recursive: true });

  const destFile = path.join(OUTPUT_FILTERS_DIR, 'sukka-collections-combined.txt');

  const topUserAgents = (await (await $$fetch('https://cdn.jsdelivr.net/npm/top-user-agents@2.1.75/src/desktop.json')).json()) as string[];

  fs.writeFileSync(destFile, fastStringArrayJoin(
    [
      '! Title: [sukka] Sukka Collections Combined',
      `! Last modified: ${new Date().toUTCString()}`,
      '! Expires: 8 hours',
      '! Description: Some third party filter lists collected and combined by Sukka',
      '! License: https://github.com/SukkaW/Filters/blob/master/LICENSE',
      '! Homepage: https://github.com/SukkaW/Filters',
      '! --------------------------------------------------------------',
      '! Included filters:'
    ],
    '\n'
  ));

  const filterStreams: Array<ReadableStream<string | undefined>> = [];

  for (const url of DATA_SOURCE) {
    console.log(picocolors.green('[fetch]'), url);

    // eslint-disable-next-line no-await-in-loop -- fetch one by one
    const resp = await $$fetch(url, { headers: { 'User-Agent': pickOne(topUserAgents) } });

    const lineStreams = nullthrow(resp.body, `${picocolors.red('[fetch] missing body')} - ${url}`)
      .pipeThrough(new TextDecoderStream());

    // Tee the stream to read metadata from one branch and pipe the full stream to FilterMinifyStream from the other
    const [metadataStream, fullStream] = lineStreams.tee();

    filterStreams.push(
      // @ts-expect-error -- @types/node stream/web is broken
      fullStream.pipeThrough(new TextLineStream({ skipEmptyLines: true }))
    );

    // Read first 30 lines for metadata from the metadata branch
    let rawContent = '';
    const reader = metadataStream.getReader();
    try {
      while (rawContent.length < 1024) { // Limit to first 1 KB
        // eslint-disable-next-line no-await-in-loop -- read by sequential
        const { done, value } = await reader.read();
        if (done) break;
        if (value == null) continue;
        rawContent += value; // Add newline for proper content reconstruction if needed
      }
    } finally {
      reader.releaseLock(); // Release the reader to allow the stream to be used elsewhere if needed
    }

    const metadata = extractMetadataFromList(rawContent, [
      'Title', 'Homepage', 'Version', 'Last modified', 'Licence'
    ]);

    const appendOutputMeta: string[] = [];
    if (metadata.title) {
      appendOutputMeta.push(
        '! * ' + metadata.title,
        '!   - URL: ' + url
      );
    } else {
      appendOutputMeta.push(
        '! * ' + url
      );
    }
    if (metadata.version) {
      appendOutputMeta.push('!   - Version: ' + metadata.version);
    }
    if (metadata.homepage) {
      appendOutputMeta.push('!   - Homepage: ' + metadata.homepage);
    }
    if (metadata.licence) {
      appendOutputMeta.push('!   - Licence: ' + metadata.licence);
    }
    if (metadata.lastModified) {
      appendOutputMeta.push('!   - Last modified: ' + metadata.lastModified);
    }

    fs.appendFileSync(destFile, '\n' + fastStringArrayJoin(appendOutputMeta, '\n'));
  }

  fs.appendFileSync(destFile, '\n! --------------------------------------------------------------\n');

  const outputWriteStream = fs.createWriteStream(destFile, { flags: 'a' });

  await pipeline(
    mergeStreams(filterStreams).pipeThrough(new FilterMinifyStream()),
    outputWriteStream
  );

  return new Promise<void>((resolve) => {
    outputWriteStream.end(resolve);
  });
})();

// https://github.com/gorhill/uBlock/blob/ede6b17060210e983aedafc6486859e77be51a26/src/js/assets.js#L67
// extractMetadataFromList(raw, [ 'Title', 'Homepage' ]);
function extractMetadataFromList<T extends string>(content: string, fields: T[]) {
  const out = {} as Record<CamelCase<T>, string | undefined>;
  const head = content.slice(0, 1024);
  for (const field of fields) {
    let fieldKey = field.replaceAll(/\s+/g, '-');
    const re = new RegExp(`^(?:! *|# +)${fieldKey.replaceAll('-', '(?: +|-)')}: *(.+)$`, 'im');
    const match = re.exec(head);
    let value = match?.[1].trim();
    if (value?.startsWith('%')) {
      value = undefined;
    }
    fieldKey = fieldKey.toLowerCase().replaceAll(
      /-[a-z]/g, s => s.charAt(1).toUpperCase()
    );
    out[fieldKey as CamelCase<T>] = value;
  }
  // Pre-process known fields
  // if ('lastModified' in out) {
  //   out.lastModified = (new Date(out.lastModified)).getTime() || 0;
  // }
  // if (out.expires) {
  //   out.expires = parseExpires(out.expires);
  // }
  // if (out.diffExpires) {
  //   out.diffExpires = parseExpires(out.diffExpires);
  // }
  return out;
}

function mergeStreams<T>(streams: Array<ReadableStream<T>>): ReadableStream<T> {
  return new ReadableStream({
    async start(controller) {
      for (const stream of streams) {
        const reader = stream.getReader();
        try {
          while (true) {
            // eslint-disable-next-line no-await-in-loop -- read chunk
            const { done, value } = await reader.read();
            if (done) break;
            controller.enqueue(value);
          }
        } finally {
          reader.releaseLock();
        }
      }
      controller.close();
    }
  });
}
