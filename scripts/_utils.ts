import { TransformStream } from 'node:stream/web';

import { HostnameSmolTrie } from './_trie';
import { getHostname } from 'tldts';

const tldtsOpt = { allowIcannDomains: true, allowPrivateDomains: true, validateHostname: true };

export class FilterMinifyStream extends TransformStream<string, string> {
  // private __buf = '';
  private readonly set = new Set<string>();
  private readonly trie = new HostnameSmolTrie();
  private readonly thirdPartyTrie = new HostnameSmolTrie();

  constructor() {
    super({
      transform: (line, controller) => {
        if (
          line.length === 0 // ignore empty lines
          || line[0] === '!' // ignore comments
          || (
            line[0] === '#' // ignore comments
            && (line[1] !== '#' && line[1] !== '@') // but keep ## and #@#
          )
          || (line[0] === '[' && line[line.length - 1] === ']')
        ) {
          return;
        }

        if (line.startsWith('||')) {
          if (line.endsWith('^$third-party')) {
            const hostname = getHostname(line.slice(2, -13), tldtsOpt);
            if (hostname) {
              this.thirdPartyTrie.add(hostname);
              return;
            }
          } else if (line.endsWith('^')) {
            const hostname = getHostname(line.slice(2, -1), tldtsOpt);
            if (hostname) {
              this.trie.add(hostname);
              return;
            }
          }
        }

        if (this.set.has(line)) {
          // console.log('deduped!', line);
          return;
        }
        this.set.add(line);

        controller.enqueue(line);
        controller.enqueue('\n');
      },
      flush: (controller) => {
        this.trie.dumpWithoutDot((domain, includeAllSubdomain) => {
          // if included in primary trie, there is no need to be included in other tries
          this.thirdPartyTrie.whitelist(domain, includeAllSubdomain);

          controller.enqueue('||' + domain + '^');
          controller.enqueue('\n');
        });
        this.thirdPartyTrie.dumpWithoutDot((domain) => {
          controller.enqueue('||' + domain + '^$third-party');
          controller.enqueue('\n');
        });
      }
    });
  }
}
