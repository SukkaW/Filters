import { identity } from 'foxts/identity';
import { literal } from 'foxts/literal';
import { escapeRegexp } from 'fast-escape-regexp';

export interface RedirectRule {
  base: string | string[],
  // String patterns are treated literally; shorthands like [subdomain], [version], and [semver] are expanded by the build script.
  from: string | RegExp,
  to: string,
  // resource type options of the network filter, defaults to ['all']
  modifiers?: string[],
  // exclude redirect on domains to prevent CSP
  excludeDomains?: string[],
  tests: Array<[original: string, redirected: string]>
}

export interface RedirectRuleSet {
  title: string,
  fileName: string,
  rules: RedirectRule[]
}

function defineRules(title: string, fileName: string, rules: RedirectRule[]): RedirectRuleSet {
  return identity<RedirectRuleSet>({
    title,
    fileName,
    rules
  });
}

// raw.githubusercontent.com serves both "/<ref>/" and "/refs/heads/<ref>/" (or "/refs/tags/<ref>/") URLs.
// The base filter is a prefix match and can't disambiguate the two forms, so a single rule with an
// optional group handles both. String-pattern shorthands can't express this, hence a RegExp.
function githubRawToJsdelivr(repo: string): RedirectRule {
  return identity<RedirectRule>({
    base: `||raw.githubusercontent.com/${repo}/`,
    from: new RegExp(String.raw`raw\.githubusercontent\.com/${escapeRegexp(repo, false)}/(?:refs/(?:heads|tags)/)?([^/]+)/`),
    to: `cdn.jsdelivr.net/gh/${repo}@$1/`,
    tests: [], /* testCases.flatMap(([ref, path]): Array<[string, string]> => {
      const redirected = `https://cdn.jsdelivr.net/gh/${repo}@${ref}/${path}`;
      return [
        [`https://raw.githubusercontent.com/${repo}/${ref}/${path}`, redirected],
        [`https://raw.githubusercontent.com/${repo}/refs/heads/${ref}/${path}`, redirected]
      ];
    }) */
    // CSP
    excludeDomains: ['github.com', 'npmjs.com', 'githubusercontent.com'/* viewscreen.githubusercontent.com */]
  });
}

export default [
  defineRules('URL Redirector', 'index', [
    {
      base: '||necolas.github.io/normalize.css/*/normalize.css',
      from: 'necolas.github.io/normalize.css/[version]/normalize.css',
      to: 'cdn.jsdelivr.net/npm/normalize.css@$1/normalize.css',
      tests: [
        ['https://necolas.github.io/normalize.css/8.0.1/normalize.css', 'https://cdn.jsdelivr.net/npm/normalize.css@8.0.1/normalize.css']
      ]
    },
    {
      base: '||necolas.github.io/normalize.css/latest/normalize.css',
      from: 'necolas.github.io/normalize.css/latest/normalize.css',
      to: 'cdn.jsdelivr.net/npm/normalize.css@latest/normalize.css',
      tests: [
        ['https://necolas.github.io/normalize.css/latest/normalize.css', 'https://cdn.jsdelivr.net/npm/normalize.css@latest/normalize.css']
      ]
    },

    {
      base: '://gravatar.com/avatar/',
      from: 'gravatar.com',
      to: 'secure.gravatar.com',
      tests: [
        ['https://gravatar.com/avatar/abc', 'https://secure.gravatar.com/avatar/abc']
      ]
    },
    ...([
      '0.gravatar.com',
      '1.gravatar.com',
      '2.gravatar.com',
      '3.gravatar.com',
      's.gravatar.com',
      'www.gravatar.com',
      'cn.gravatar.com',
      'en.gravatar.com'
    ] as const).flatMap(domain => literal({
      base: `||${domain}/avatar/`,
      from: domain,
      to: 'secure.gravatar.com',
      tests: [
        [`https://${domain}/avatar/abc`, 'https://secure.gravatar.com/avatar/abc']
      ],
      excludeDomains: ['planetscale.com']
    })),

    // ajax.googleapis.com
    {
      base: '||ajax.googleapis.com/ajax/libs/jquery',
      from: 'ajax.googleapis.com/ajax/libs/jquery/[version_major]/',
      to: 'cdn.jsdelivr.net/npm/jquery@$1/dist/',
      tests: [
        [
          'https://ajax.googleapis.com/ajax/libs/jquery/3.7.1/jquery.min.js',
          'https://cdn.jsdelivr.net/npm/jquery@3/dist/jquery.min.js'
        ],
        [
          'https://ajax.googleapis.com/ajax/libs/jquery/1.12.4/jquery.min.js',
          'https://cdn.jsdelivr.net/npm/jquery@1/dist/jquery.min.js'
        ]
      ]
    },
    {
      base: '||ajax.googleapis.com/ajax/libs/bootstrap',
      from: 'ajax.googleapis.com/ajax/libs/bootstrap/[version_major]/',
      to: 'cdn.jsdelivr.net/npm/bootstrap@$1/dist/',
      tests: [
        [
          'https://ajax.googleapis.com/ajax/libs/bootstrap/5.3.3/js/bootstrap.min.js',
          'https://cdn.jsdelivr.net/npm/bootstrap@5/dist/js/bootstrap.min.js'
        ]
      ]
    },
    {
      base: '||ajax.googleapis.com/ajax/libs/d3js/',
      from: 'ajax.googleapis.com/ajax/libs/d3js/[version]/',
      to: 'cdn.jsdelivr.net/npm/d3@$1/dist/',
      tests: [
        [
          'https://ajax.googleapis.com/ajax/libs/d3js/7.9.0/d3.min.js',
          'https://cdn.jsdelivr.net/npm/d3@7.9.0/dist/d3.min.js'
        ],
        [
          'https://ajax.googleapis.com/ajax/libs/d3js/5.16.0/d3.min.js',
          'https://cdn.jsdelivr.net/npm/d3@5.16.0/dist/d3.min.js'
        ]
      ]
    },
    {
      base: '||ajax.googleapis.com/ajax/libs/hammerjs/',
      from: 'ajax.googleapis.com/ajax/libs/hammerjs/[version]/',
      to: 'cdn.jsdelivr.net/npm/hammerjs@$1/',
      tests: [
        [
          'https://ajax.googleapis.com/ajax/libs/hammerjs/2.0.8/hammer.min.js',
          'https://cdn.jsdelivr.net/npm/hammerjs@2.0.8/hammer.min.js'
        ]
      ]
    },
    {
      base: '||ajax.googleapis.com/ajax/libs/indefinite-observable/',
      from: 'ajax.googleapis.com/ajax/libs/indefinite-observable/[version]/',
      to: 'cdn.jsdelivr.net/npm/indefinite-observable@$1/dist/',
      tests: [
        [
          'https://ajax.googleapis.com/ajax/libs/indefinite-observable/2.0.1/indefinite-observable.min.js',
          'https://cdn.jsdelivr.net/npm/indefinite-observable@2.0.1/dist/indefinite-observable.min.js'
        ]
      ]
    },
    {
      base: '||ajax.googleapis.com/ajax/libs/jqueryui/*.js',
      from: 'ajax.googleapis.com/ajax/libs/jqueryui/[version]/',
      to: 'cdn.jsdelivr.net/npm/jquery-ui-dist@$1/',
      tests: [
        [
          'https://ajax.googleapis.com/ajax/libs/jqueryui/1.13.3/jquery-ui.min.js',
          'https://cdn.jsdelivr.net/npm/jquery-ui-dist@1.13.3/jquery-ui.min.js'
        ]
      ]
    },
    // npm missing 1.2.1 version
    // {
    //   base: '||ajax.googleapis.com/ajax/libs/myanmar-tools/',
    //   from: 'ajax.googleapis.com/ajax/libs/myanmar-tools/[version]/',
    //   to: 'cdn.jsdelivr.net/npm/myanmar-tools@$1/build_node/',
    //   tests: [
    //     [
    //       'https://ajax.googleapis.com/ajax/libs/myanmar-tools/1.2.1/zawgyi_detector.min.js',
    //       'https://cdn.jsdelivr.net/npm/myanmar-tools@1.2.1/build_node/zawgyi_detector.min.js'
    //     ],
    //     [
    //       'https://ajax.googleapis.com/ajax/libs/myanmar-tools/1.2.1/zawgyi_converter.min.js',
    //       'https://cdn.jsdelivr.net/npm/myanmar-tools@1.2.1/build_node/zawgyi_converter.min.js'
    //     ]
    //   ]
    // },
    {
      base: '||ajax.googleapis.com/ajax/libs/shaka-player/',
      from: 'ajax.googleapis.com/ajax/libs/shaka-player/[version]/',
      to: 'cdn.jsdelivr.net/npm/shaka-player@$1/dist/',
      tests: [
        [
          'https://ajax.googleapis.com/ajax/libs/shaka-player/5.1.7/shaka-player.compiled.js',
          'https://cdn.jsdelivr.net/npm/shaka-player@5.1.7/dist/shaka-player.compiled.js'
        ],
        [
          'https://ajax.googleapis.com/ajax/libs/shaka-player/5.1.7/shaka-player.ui.js',
          'https://cdn.jsdelivr.net/npm/shaka-player@5.1.7/dist/shaka-player.ui.js'
        ],
        [
          'https://ajax.googleapis.com/ajax/libs/shaka-player/5.1.7/controls.css',
          'https://cdn.jsdelivr.net/npm/shaka-player@5.1.7/dist/controls.css'
        ]
      ]
    },
    {
      base: '||ajax.googleapis.com/ajax/libs/spf/',
      from: 'ajax.googleapis.com/ajax/libs/spf/[version]/',
      to: 'cdn.jsdelivr.net/npm/spf@$1/dist/',
      tests: [
        [
          'https://ajax.googleapis.com/ajax/libs/spf/2.4.0/spf.js',
          'https://cdn.jsdelivr.net/npm/spf@2.4.0/dist/spf.js'
        ]
      ]
    },
    // swf object only has two non-standard versions, we map them individually
    ...(['2.1', '2.2'] as const).flatMap(ver => literal({
      base: `||ajax.googleapis.com/ajax/libs/swfobject/${ver}/`,
      from: `ajax.googleapis.com/ajax/libs/swfobject/${ver}/`,
      to: `cdn.jsdelivr.net/gh/swfobject/swfobject@${ver}/`,
      tests: [
        [
          `https://ajax.googleapis.com/ajax/libs/swfobject/${ver}/swfobject.js`,
          `https://cdn.jsdelivr.net/gh/swfobject/swfobject@${ver}/swfobject.js`
        ]
      ]
    })),
    {
      // threejs uses r{N} versioning on Google, mapped to 0.N.0 on npm
      base: '||ajax.googleapis.com/ajax/libs/threejs/',
      from: /https?:\/\/ajax\.googleapis\.com\/ajax\/libs\/threejs\/r(\d+)\/(.+)/,
      to: 'https://cdn.jsdelivr.net/npm/three@0.$1.0/build/$2',
      tests: [
        [
          'https://ajax.googleapis.com/ajax/libs/threejs/r84/three.min.js',
          'https://cdn.jsdelivr.net/npm/three@0.84.0/build/three.min.js'
        ],
        [
          'https://ajax.googleapis.com/ajax/libs/threejs/r49/three.js',
          'https://cdn.jsdelivr.net/npm/three@0.49.0/build/three.js'
        ]
      ]
    },
    {
      base: '||ajax.googleapis.com/ajax/libs/webfont/*/webfont.js',
      from: 'ajax.googleapis.com/ajax/libs/webfont/[version]/webfont.js',
      to: 'cdn.jsdelivr.net/npm/webfontloader@$1/webfontloader.js',
      tests: [
        [
          'https://ajax.googleapis.com/ajax/libs/webfont/1.6.26/webfont.js',
          'https://cdn.jsdelivr.net/npm/webfontloader@1.6.26/webfontloader.js'
        ]
      ]
    },

    // bootstrapcdn.com
    {
      base: '||bootstrapcdn.com/bootstrap/',
      from: '[subdomain].bootstrapcdn.com/bootstrap/[version]/',
      to: 'cdn.jsdelivr.net/npm/bootstrap@$2/dist/',
      tests: [
        [
          'https://stackpath.bootstrapcdn.com/bootstrap/3.4.1/css/bootstrap.min.css',
          'https://cdn.jsdelivr.net/npm/bootstrap@3.4.1/dist/css/bootstrap.min.css'
        ]
      ]
    },
    {
      base: '||bootstrapcdn.com/font-awesome/',
      from: '[subdomain].bootstrapcdn.com/font-awesome/[version_major]/',
      to: 'cdn.jsdelivr.net/npm/font-awesome@$2/',
      tests: [
        [
          'https://netdna.bootstrapcdn.com/font-awesome/4.7.0/css/font-awesome.css',
          'https://cdn.jsdelivr.net/npm/font-awesome@4/css/font-awesome.css'
        ],
        [
          'https://maxcdn.bootstrapcdn.com/font-awesome/4.3.0/css/font-awesome.min.css',
          'https://cdn.jsdelivr.net/npm/font-awesome@4/css/font-awesome.min.css'
        ],
        [
          'https://netdna.bootstrapcdn.com/font-awesome/3.1.1/css/font-awesome.css',
          'https://cdn.jsdelivr.net/npm/font-awesome@3/css/font-awesome.css'
        ]
      ]
    },

    // use.fontawesome.com
    {
      base: [
        '||use.fontawesome.com/releases/v5*/css/',
        '||use.fontawesome.com/releases/v6*/css/',
        '||use.fontawesome.com/releases/v7*/css/',
        '||use.fontawesome.com/releases/v5*/js/',
        '||use.fontawesome.com/releases/v6*/js/',
        '||use.fontawesome.com/releases/v7*/js/'
      ],
      from: 'use.fontawesome.com/releases/v[version]/[non_path_segment]/[filename_basename_1_extname_2]',
      to: 'cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@$1/$2/$3.min.$4',
      tests: [
        [
          'https://use.fontawesome.com/releases/v5.8.1/css/all.css',
          'https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@5.8.1/css/all.min.css'
        ],
        [
          'https://use.fontawesome.com/releases/v5.3.1/css/all.css',
          'https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@5.3.1/css/all.min.css'
        ]
      ]
    },
    {
      base: [
        '||use.fontawesome.com/releases/v5*/webfonts/',
        '||use.fontawesome.com/releases/v6*/webfonts/',
        '||use.fontawesome.com/releases/v7*/webfonts/'
      ],
      from: 'use.fontawesome.com/releases/v[version]/webfonts/',
      to: 'cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@$1/webfonts/',
      tests: [
        [
          'https://use.fontawesome.com/releases/v5.3.1/webfonts/fa-solid-900.woff2',
          'https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@5.3.1/webfonts/fa-solid-900.woff2'
        ]
      ]
    },
    {
      base: '||use.fontawesome.com/releases/v4',
      from: 'use.fontawesome.com/releases/v[version]/css/font-awesome-css.min.css',
      to: 'cdn.jsdelivr.net/npm/font-awesome@$1/css/font-awesome.min.css',
      tests: [
        [
          'https://use.fontawesome.com/releases/v4.7.0/css/font-awesome-css.min.css',
          'https://cdn.jsdelivr.net/npm/font-awesome@4.7.0/css/font-awesome.min.css'
        ]
      ]
    },
    {
      base: '||use.fontawesome.com/releases/v4',
      from: 'use.fontawesome.com/releases/v[version]/fonts/',
      to: 'cdn.jsdelivr.net/npm/font-awesome@$1/fonts/',
      tests: [
        [
          'https://use.fontawesome.com/releases/v4.7.0/fonts/fontawesome-webfont.woff2',
          'https://cdn.jsdelivr.net/npm/font-awesome@4.7.0/fonts/fontawesome-webfont.woff2'
        ]
      ]
    },

    // code.jquery.com
    // Many websites using code.jquery.com have CSP, so we need to match exact version
    {
      base: '||code.jquery.com/jquery-*.slim.min.js',
      from: 'code.jquery.com/jquery-[version].slim.min.js',
      to: 'cdn.jsdelivr.net/npm/jquery@$1/dist/jquery.slim.min.js',
      tests: [
        ['https://code.jquery.com/jquery-1.10.2.slim.min.js', 'https://cdn.jsdelivr.net/npm/jquery@1.10.2/dist/jquery.slim.min.js'],
        ['https://code.jquery.com/jquery-3.4.1.slim.min.js', 'https://cdn.jsdelivr.net/npm/jquery@3.4.1/dist/jquery.slim.min.js']
      ],
      excludeDomains: ['ui.com']
    },
    {
      base: '||code.jquery.com/jquery-*.min.js',
      from: 'code.jquery.com/jquery-[version].min.js',
      to: 'cdn.jsdelivr.net/npm/jquery@$1/dist/jquery.min.js',
      tests: [
        ['https://code.jquery.com/jquery-1.10.2.min.js', 'https://cdn.jsdelivr.net/npm/jquery@1.10.2/dist/jquery.min.js'],
        // this should only match previous rule, this test is to ensure that
        ['https://code.jquery.com/jquery-1.10.2.slim.min.js', 'https://code.jquery.com/jquery-1.10.2.slim.min.js']

      ],
      excludeDomains: ['ui.com']
    },
    // jqeury-ui is very outdated and we can ignore CSP here
    {
      base: '||code.jquery.com/ui/*/jquery-ui.min.js',
      from: 'code.jquery.com/ui/[version_major]/jquery-ui.min.js',
      to: 'cdn.jsdelivr.net/npm/jquery-ui@$1/dist/jquery-ui.min.js',
      tests: [
        ['https://code.jquery.com/ui/1.11.4/jquery-ui.min.js', 'https://cdn.jsdelivr.net/npm/jquery-ui@1/dist/jquery-ui.min.js']
      ],
      excludeDomains: ['ui.com']
    },

    // misc
    {
      base: '||sigma9.scpwikicn.com',
      from: 'sigma9.scpwikicn.com',
      to: 'cdn.jsdelivr.net/gh/SCP-CN-Tech/sigma9@gh-pages',
      tests: [
        ['https://sigma9.scpwikicn.com/cn/cn/sigma9_ch.min.css', 'https://cdn.jsdelivr.net/gh/SCP-CN-Tech/sigma9@gh-pages/cn/cn/sigma9_ch.min.css']
      ]
    },
    {
      base: '||bhl.scpwikicn.com',
      from: 'bhl.scpwikicn.com',
      to: 'cdn.jsdelivr.net/gh/SCP-CN-Tech/Black-Highlighter@gh-pages',
      tests: [
        ['https://bhl.scpwikicn.com/img/logo.svg', 'https://cdn.jsdelivr.net/gh/SCP-CN-Tech/Black-Highlighter@gh-pages/img/logo.svg']
      ]
    },
    githubRawToJsdelivr('ProjectInfinity-X/official_devices'),
    githubRawToJsdelivr('Evolution-X/www_gitres'),
    {
      // generic GitHub RAW -> jsDelivr, static asset types only: scripts/styles/xhr may rely on
      // GitHub RAW's short TTL for freshness, which jsDelivr's 12h+ branch cache would break.
      // (?!refs/) skips refs namespaces that have no jsDelivr equivalent (e.g. refs/pull/)
      base: '||raw.githubusercontent.com^',
      from: /raw\.githubusercontent\.com\/([^/]+)\/([^/]+)\/(?:refs\/(?:heads|tags)\/)?((?!refs\/)[^/]+)\//,
      to: 'cdn.jsdelivr.net/gh/$1/$2@$3/',
      modifiers: ['image', 'font', 'media', 'object'],
      excludeDomains: ['github.com', 'npmjs.com', 'githubusercontent.com'/* viewscreen.githubusercontent.com */],
      tests: [
        [
          'https://raw.githubusercontent.com/Evolution-X/www_gitres/refs/heads/main/devices/images/PL2.webp',
          'https://cdn.jsdelivr.net/gh/Evolution-X/www_gitres@main/devices/images/PL2.webp'
        ],
        [
          'https://raw.githubusercontent.com/ProjectInfinity-X/official_devices/16/deviceimages/a25x.webp',
          'https://cdn.jsdelivr.net/gh/ProjectInfinity-X/official_devices@16/deviceimages/a25x.webp'
        ],
        [
          'https://raw.githubusercontent.com/foo/bar/refs/tags/v1.2.3/logo.png',
          'https://cdn.jsdelivr.net/gh/foo/bar@v1.2.3/logo.png'
        ],
        [
          'https://raw.githubusercontent.com/foo/bar/a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2/img/x.svg',
          'https://cdn.jsdelivr.net/gh/foo/bar@a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2/img/x.svg'
        ],
        // refs/pull/ has no jsDelivr equivalent, this test ensures it is left untouched
        [
          'https://raw.githubusercontent.com/foo/bar/refs/pull/123/head/img.png',
          'https://raw.githubusercontent.com/foo/bar/refs/pull/123/head/img.png'
        ]
      ]
    }
  ]),
  defineRules('Special Redirects', 'special', [
    {
      base: '||hembed.com',
      from: '[subdomain].hembed.com',
      to: 'docs.lucaairport.qzz.io/https/$1.hembed.com',
      tests: [
        ['https://vdownload.hembed.com/example.html', 'https://docs.lucaairport.qzz.io/https/vdownload.hembed.com/example.html'],
        ['https://vdownload-3.hembed.com/example.html', 'https://docs.lucaairport.qzz.io/https/vdownload-3.hembed.com/example.html']
      ]
    },
    {
      base: '||wdfiles.com',
      from: '[subdomain].wdfiles.com',
      to: 'docs.lucaairport.qzz.io/https/$1.wdfiles.com',
      tests: [
        ['https://subdomain.wdfiles.com/file/abc', 'https://docs.lucaairport.qzz.io/https/subdomain.wdfiles.com/file/abc']
      ]
    },
    {
      base: '||wikidot.com/local--files/',
      from: '[subdomain].wikidot.com/local--files/',
      to: 'docs.lucaairport.qzz.io/https/$1.wikidot.com/local--files/',
      tests: [
        ['https://a.wikidot.com/local--files/example.jpg', 'https://docs.lucaairport.qzz.io/https/a.wikidot.com/local--files/example.jpg']
      ]
    },
    {
      base: '||cdn.scpwiki.com',
      from: 'cdn.scpwiki.com',
      to: 'docs.lucaairport.qzz.io/https/cdn.scpwiki.com',
      tests: [
        [
          'https://cdn.scpwiki.com/theme/en/basalt/basalt-bedrock-min.css',
          'https://docs.lucaairport.qzz.io/https/cdn.scpwiki.com/theme/en/basalt/basalt-bedrock-min.css'
        ]
      ]
    },
    {
      base: '||scp-wiki-cdn.nyc3.cdn.digitaloceanspaces.com',
      from: 'scp-wiki-cdn.nyc3.cdn.digitaloceanspaces.com',
      to: 'docs.lucaairport.qzz.io/https/scp-wiki-cdn.nyc3.cdn.digitaloceanspaces.com',
      tests: [
        [
          'https://scp-wiki-cdn.nyc3.cdn.digitaloceanspaces.com/theme/en/basalt/basalt-bedrock-min.css',
          'https://docs.lucaairport.qzz.io/https/scp-wiki-cdn.nyc3.cdn.digitaloceanspaces.com/theme/en/basalt/basalt-bedrock-min.css'
        ]
      ]
    },
    {
      base: '||www.wikidot.com/userkarma.php',
      from: 'www.wikidot.com/userkarma.php',
      to: 'docs.lucaairport.qzz.io/https/www.wikidot.com/userkarma.php',
      tests: [
        ['https://www.wikidot.com/userkarma.php?u=114514', 'https://docs.lucaairport.qzz.io/https/www.wikidot.com/userkarma.php?u=114514']
      ]
    },
    {
      // {s}.tile.openstreetmap.org variants are collapsed onto the apex host so the
      // proxy's CDN cache key is identical regardless of which mirror the page picked
      base: '||tile.openstreetmap.org^',
      from: /(?:[^./]+\.)*tile\.openstreetmap\.org/,
      to: 'docs.lucaairport.qzz.io/https/tile.openstreetmap.org',
      tests: [
        ['https://tile.openstreetmap.org/12/2177/1436.png', 'https://docs.lucaairport.qzz.io/https/tile.openstreetmap.org/12/2177/1436.png'],
        ['https://a.tile.openstreetmap.org/12/2177/1436.png', 'https://docs.lucaairport.qzz.io/https/tile.openstreetmap.org/12/2177/1436.png'],
        ['https://b.tile.openstreetmap.org/12/2177/1436.png', 'https://docs.lucaairport.qzz.io/https/tile.openstreetmap.org/12/2177/1436.png'],
        ['https://c.tile.openstreetmap.org/12/2177/1436.png', 'https://docs.lucaairport.qzz.io/https/tile.openstreetmap.org/12/2177/1436.png']
      ]
    },
    {
      base: '||github.com/*/releases/download',
      from: 'github.com/',
      to: 'download.lucaairport.qzz.io/https/github.com/',
      tests: [
        [
          'https://github.com/bggRGjQaUbCoE/PiliPlus/releases/download/2.1.0/PiliPlus_android_2.1.0-c1aeaca09+5109_arm64-v8a.apk',
          'https://download.lucaairport.qzz.io/https/github.com/bggRGjQaUbCoE/PiliPlus/releases/download/2.1.0/PiliPlus_android_2.1.0-c1aeaca09+5109_arm64-v8a.apk'
        ]
      ]
    },
    ...([
      'tiles.windy.com',
      'ims.windy.com',
      'sat.windy.com',
      'rdr.windy.com',

      'fourhoi.com',

      'tiles.strava.com'
    ] as const).map(host => ({
      base: '||' + host + '^',
      from: host,
      to: 'docs.lucaairport.qzz.io/https/' + host,
      tests: []
    }))
  ])
] as const;
