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
      base: '||vdownload.hembed.com',
      from: 'vdownload.hembed.com',
      to: 'docs.lucaairport.qzz.io/https/vdownload.hembed.com',
      tests: [
        ['https://vdownload.hembed.com/example.html', 'https://docs.lucaairport.qzz.io/https/vdownload.hembed.com/example.html']
      ]
    },
    {
      base: '||wdfiles.com',
      from: '[subdomain].wdfiles.com',
      to: 'docs.lucaairport.qzz.io/https/$1.wdfiles.com',
      tests: [
        ['https://subdomain.wdfiles.com/file/abc', 'https://docs.lucaairport.qzz.io/https/subdomain.wdfiles.com/file/abc']
      ]
    }
  ])
] as const;
