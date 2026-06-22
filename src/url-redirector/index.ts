import { identity } from 'foxts/identity';
import { literal } from 'foxts/literal';

export interface RedirectRule {
  base: string | string[],
  // String patterns are treated literally; shorthands like [subdomain], [version], and [semver] are expanded by the build script.
  from: string | RegExp,
  to: string,
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
      ]
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
        '||use.fontawesome.com/releases/v5',
        '||use.fontawesome.com/releases/v6',
        '||use.fontawesome.com/releases/v7'
      ],
      from: 'use.fontawesome.com/releases/v[version]/',
      to: 'cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@$1/',
      tests: [
        [
          'https://use.fontawesome.com/releases/v5.8.1/css/all.css',
          'https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@5.8.1/css/all.css'
        ],
        [
          'https://use.fontawesome.com/releases/v5.3.1/css/all.css',
          'https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@5.3.1/css/all.css'
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
    }
  ])
] as const;
