import picocolors from 'picocolors';
import { $$fetch } from './_fetch-retry';
import type { ReadableStream } from 'node:stream/web';
import { TextDecoderStream } from 'node:stream/web';
import { nullthrow } from 'foxts/guard';
import fs from 'node:fs';
import path from 'node:path';
import { OUTPUT_FILTERS_DIR } from './_constants';
import { fastStringArrayJoin } from 'foxts/fast-string-array-join';
import { DebugStream, FilterMinifyStream } from './_utils';
import { TextLineStream } from 'foxts/text-line-stream';
import { pickOne } from 'foxts/pick-random';
import { pipeline } from 'node:stream/promises';
import { joinReadableStreams } from 'foxts/join-readablestreams';

const DATA_SOURCE = [
  {
    filename: 'sukka-collections-combined.txt',
    title: 'Sukka Collections Combined',
    sources: [
      'https://cdn.jsdelivr.net/gh/easylist/easylist@master/custom-lists/bing-with-no-copilt.txt',
      'https://cdn.jsdelivr.net/gh/easylist/easylist@master/custom-lists/facebook-combo-list.txt',
      'https://cdn.jsdelivr.net/gh/easylist/easylist@master/custom-lists/twitter-no-right-side-nags.txt',
      'https://cdn.jsdelivr.net/gh/easylist/easylist@master/custom-lists/youtube-combo-list.txt',
      'https://cdn.jsdelivr.net/gh/easylist/easylist@master/custom-lists/youtube-whatdoyoulikedoforfun.txt',
      'https://easylist-downloads.adblockplus.org/antiadblockfilters.txt',
      'https://gitflic.ru/project/magnolia1234/bypass-paywalls-clean-filters/blob/raw?file=bpc-paywall-filter.txt',
      'https://paulgb.github.io/BarbBlock/blacklists/ublock-origin.txt',
      'https://raw.githubusercontent.com/DandelionSprout/adfilt/master/AnnoyancesList',
      'https://cdn.jsdelivr.net/gh/DandelionSprout/adfilt@master/DailyMotionSimplicity.txt',
      'https://raw.githubusercontent.com/DandelionSprout/adfilt/master/Dandelion%20Sprout\'s%20Anti-Malware%20List.txt',
      'https://cdn.jsdelivr.net/gh/DandelionSprout/adfilt@master/AntiAdoptablesList.txt',
      'https://cdn.jsdelivr.net/gh/DandelionSprout/adfilt@master/AntiCelebBirthList.txt',
      'https://cdn.jsdelivr.net/gh/DandelionSprout/adfilt@master/AntiCorruptSportsList.txt',
      'https://cdn.jsdelivr.net/gh/DandelionSprout/adfilt@master/AntiFakeTransparentImagesList.txt',
      'https://cdn.jsdelivr.net/gh/DandelionSprout/adfilt@master/AntiFunctionalityRemovalList.txt',
      'https://cdn.jsdelivr.net/gh/DandelionSprout/adfilt@master/AntiNonNewsList.txt',
      'https://cdn.jsdelivr.net/gh/DandelionSprout/adfilt@master/AntiPinterestInSearchResultsList.txt',
      'https://cdn.jsdelivr.net/gh/DandelionSprout/adfilt@master/BrowseWebsitesWithoutLoggingIn.txt',
      'https://cdn.jsdelivr.net/gh/DandelionSprout/adfilt@master/Pro-LED%20List.txt',
      'https://cdn.jsdelivr.net/gh/DandelionSprout/adfilt@master/I%20Don\'t%20Want%20to%20Download%20Your%20Browser.txt',
      'https://raw.githubusercontent.com/DandelionSprout/adfilt/master/LegitimateURLShortener.txt',
      'https://cdn.jsdelivr.net/gh/DandelionSprout/adfilt@master/ImgurPureImageryExperience.txt',
      'https://cdn.jsdelivr.net/gh/DandelionSprout/adfilt@master/RedditTrashRemovalService.txt',
      'https://cdn.jsdelivr.net/gh/DandelionSprout/adfilt@master/WikiaPureBrowsingExperience.txt',
      'https://cdn.jsdelivr.net/gh/DandelionSprout/adfilt@master/stayingonbrowser/Staying%20On%20The%20Phone%20Browser',
      'https://cdn.jsdelivr.net/gh/DandelionSprout/adfilt@master/AdRemovalListForUnusualAds.txt',
      'https://cdn.jsdelivr.net/gh/DandelionSprout/adfilt@master/Anti-Elsagate%20List.txt',
      'https://cdn.jsdelivr.net/gh/DandelionSprout/adfilt@master/KnowYourMemePureBrowsingExperience.txt',
      'https://cdn.jsdelivr.net/gh/DandelionSprout/adfilt@master/Anti-\'Custom%20cursors\'%20List.txt',
      'https://cdn.jsdelivr.net/gh/DandelionSprout/adfilt@master/TwitchPureViewingExperience.txt',

      'https://cdn.jsdelivr.net/gh/hoshsadiq/adblock-nocoin-list@master/nocoin.txt',
      'https://ublockorigin.github.io/uAssets/filters/filters-mobile.txt',
      'https://raw.githubusercontent.com/cjx82630/cjxlist/master/cjx-ublock.txt'
    ]
  },
  {
    filename: 'sukka-ubo-missing.txt',
    title: 'Filters missing in uBO (but exist in AdGuard)',
    sources: [
      // --- Missing in uBO (Added in AdGuard):
      'https://filters.adtidy.org/extension/ublock/filters/3_optimized.txt', // AdGuard maintain its own data along side EasyPrivacy
      'https://raw.githubusercontent.com/cjx82630/cjxlist/master/cjx-annoyance.txt' // Available in AdGuard as an option
    ]
  },
  {
    filename: 'sukka-adguard-missing.txt',
    title: 'Filters missing in AdGuard (but exist in uBO)',
    sources: [
      // --- Missing in AdGuard (Added in uBO):
      'https://ublockorigin.pages.dev/filters/filters.min.txt',
      'https://ublockorigin.pages.dev/filters/badware.min.txt', // only exists in AdGuard for Safari
      'https://ublockorigin.pages.dev/filters/privacy.min.txt',
      'https://ublockorigin.pages.dev/filters/unbreak.min.txt',
      'https://ublockorigin.pages.dev/filters/quick-fixes.min.txt',
      'https://ublockorigin.pages.dev/filters/experimental.min.txt',
      'https://ublockorigin.pages.dev/filters/annoyances-cookies.txt',
      'https://ublockorigin.pages.dev/filters/annoyances.min.txt'
    ]
  }
] as const;

// 'https://malware-filter.gitlab.io/pup-filter/pup-filter-agh.txt', No longer updates
// 'https://easylist.to/easylist/fanboy-social.txt', included both in uBO & AdGuard's Social set
// 'https://secure.fanboy.co.nz/fanboy-annoyance.txt', included both in uBO & AdGuard's Annoyances set
// 'https://filters.adtidy.org/extension/ublock/filters/20_optimized.txt', included both in uBO & AdGuard's Annoyances set

type CamelCase<S extends string> = S extends `${infer F} ${infer R}`
  ? `${Lowercase<F>}${Capitalize<CamelCase<R>>}`
  : S extends `${infer F}-${infer R}`
    ? `${Lowercase<F>}${Capitalize<CamelCase<R>>}`
    : Lowercase<S>;

(async () => {
  fs.mkdirSync(OUTPUT_FILTERS_DIR, { recursive: true });
  const topUserAgents = (await (await $$fetch('https://cdn.jsdelivr.net/npm/top-user-agents@2.1.75/src/desktop.json')).json()) as string[];

  const date = new Date().toUTCString();

  for (const dataSource of DATA_SOURCE) {
    const destFile = path.join(OUTPUT_FILTERS_DIR, dataSource.filename);

    fs.writeFileSync(destFile, fastStringArrayJoin(
      [
        `! Title: [sukka] ${dataSource.title}`,
        `! Last modified: ${date}`,
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

    for (const url of dataSource.sources) {
      console.log(picocolors.green('[fetch]'), url);

      // eslint-disable-next-line no-await-in-loop -- fetch one by one
      const resp = await $$fetch(url, {
        headers: {
          'User-Agent': pickOne(topUserAgents),
          Referer: url
        }
      });

      const lineStreams = nullthrow(resp.body, `${picocolors.red('[fetch] missing body')} - ${url}`)
        .pipeThrough(new TextDecoderStream());

      // Tee the stream to read metadata from one branch and pipe the full stream to FilterMinifyStream from the other
      const [metadataStream, fullStream] = lineStreams.tee();

      // Read first 30 lines for metadata from the metadata branch
      let rawContent = '';
      const reader = metadataStream.getReader();
      try {
        while (rawContent.length < 1024) { // Limit to first 1 KB
          // eslint-disable-next-line no-await-in-loop -- read by sequential
          const { done, value } = await reader.read();
          if (done) break;
          if (!value) continue;
          rawContent += value; // Add newline for proper content reconstruction if needed
        }
      } finally {
        reader.releaseLock(); // Release the reader to allow the stream to be used elsewhere if needed
      }

      const metadata = extractMetadataFromList(rawContent, [
        'Title', 'Homepage', 'Version', 'Last modified', 'Licence'
      ]);

      filterStreams.push(fullStream
        // @ts-expect-error -- @types/node stream/web is broken
        .pipeThrough(new TextLineStream({ skipEmptyLines: true }))
        .pipeThrough(
          // @ts-expect-error -- @types/node stream/web is broken
          new DebugStream('async/folsrch', url)
        )
        // @ts-expect-error -- @types/node stream/web is broken
        .pipeThrough(new FilterMinifyStream(metadata.title + ' ' + url)));

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

    // eslint-disable-next-line no-await-in-loop -- pipe in sequential
    await pipeline(
      // @ts-expect-error -- @types/node stream/web is broken
      joinReadableStreams(filterStreams),
      outputWriteStream
    );

    // eslint-disable-next-line no-await-in-loop -- end file stream in sequential
    await new Promise<void>((resolve) => {
      outputWriteStream.end(resolve);
    });
  }
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
