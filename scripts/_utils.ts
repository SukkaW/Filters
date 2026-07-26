import { falseFn } from 'foxts/noop';
import { createRetrieKeywordFilter } from 'foxts/retrie';
// import { HostnameSmolTrie } from 'hntrie/smol';
// import { getHostname } from 'tldts';

const isComplexFilter = createRetrieKeywordFilter(['#', '+', '@', '=', '(', 'redirect']);

// const tldtsOpt = { allowIcannDomains: true, allowPrivateDomains: true, validateHostname: true };

// const THIRD_PARTY_SUFFIX = '^$third-party';

export class FilterMinifyStream extends TransformStream<string, string> {
  // private __buf = '';
  // private readonly trie = new HostnameSmolTrie();
  // private readonly thirdPartyTrie = new HostnameSmolTrie();

  private metaWritten = false;

  constructor(
    filterName = 'unknown filter',
    sharedKwFilter: (line: string) => boolean = falseFn,
    private readonly whitelistFilterLines: Set<string> = new Set()
  ) {
    super({
      transform: (line, controller) => {
        if (!this.metaWritten) {
          controller.enqueue(`! ${filterName}\n`);
          this.metaWritten = true;
        }

        if (
          line.length === 0 // ignore empty lines
          || (
            line[0] === '#' // ignore comments
            && (line[1] !== '#' && line[1] !== '@') // but keep ## and #@#
          )
          || (line[0] === '[' && line[line.length - 1] === ']')
        ) {
          return;
        }

        if (
          line[0] === '!' // ignore comments
          // && line[1] !== '#' // do not ignore lines for !#if and !#endif
        ) {
          return;
        }

        // Special handling of Dandelion Sprout's Anti-Malware List.txt
        if (line.includes('$ipaddress') || line.includes(',ipaddress=')) {
          return;
        }

        if (!isComplexFilter(line) && sharedKwFilter(line)) {
          return;
        }

        if (this.whitelistFilterLines.has(line)) {
          // console.log('deduped!', line);
          return;
        }
        this.whitelistFilterLines.add(line);

        // Pure hostname rules (`||example.com^` / `||example.com^$third-party`) can be
        // collected into tries instead of being emitted here, so that redundant
        // subdomains get pruned away and re-emitted during flush. Disabled for now:
        // measured against the current sources it barely dedupes anything, and it costs
        // a full buffering of every hostname rule until flush.
        // if (line.startsWith('||')) {
        //   if (line.endsWith(THIRD_PARTY_SUFFIX)) {
        //     const hostname = getHostname(line.slice(2, -THIRD_PARTY_SUFFIX.length), tldtsOpt);
        //     if (hostname) {
        //       this.thirdPartyTrie.add(hostname);
        //       return;
        //     }
        //   } else if (line.endsWith('^')) {
        //     const hostname = getHostname(line.slice(2, -1), tldtsOpt);
        //     if (hostname) {
        //       this.trie.add(hostname);
        //       return;
        //     }
        //   }
        // }

        if (line.endsWith('$third-party')) {
          line = line.replace('$third-party', '$3p');
        }

        controller.enqueue(line);
        controller.enqueue('\n');
      }
      // flush: (controller) => {
      //   this.trie.dump((domain, includeAllSubdomain) => {
      //     // if included in primary trie, there is no need to be included in other tries
      //     this.thirdPartyTrie.whitelist(includeAllSubdomain ? '.' + domain : domain);

      //     controller.enqueue('||' + domain + '^');
      //     controller.enqueue('\n');
      //   });
      //   this.thirdPartyTrie.dump((domain) => {
      //     controller.enqueue('||' + domain + '^$3p');
      //     controller.enqueue('\n');
      //   });
      // }
    });
  }
}

export class DebugStream extends TransformStream<string, string> {
  constructor(textToFind?: string | null, meta?: string) {
    const transform = textToFind
      ? (chunk: string, controller: TransformStreamDefaultController<string>) => {
        if (chunk.includes(textToFind)) {
          console.log(`found (${meta || 'unknown source'}):`, chunk);
        }
        controller.enqueue(chunk);
      }
      : (chunk: string, controller: TransformStreamDefaultController<string>) => {
        controller.enqueue(chunk);
      };

    super({
      transform
    });
  }
}
