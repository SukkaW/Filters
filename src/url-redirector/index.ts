import { identity } from 'foxts/identity';
import { literal } from 'foxts/literal';

export interface RedirectRule {
  base: string | string[],
  // String patterns are treated literally; shorthands like [subdomain], [version], and [semver] are expanded by the build script.
  from: string | RegExp,
  to: string,
  // Resource type options of the network filter. Defaults to ['all']; the build always appends '~xhr'.
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

function githubRawToJsdelivr(repo: string): RedirectRule {
  return identity<RedirectRule>({
    base: `||raw.githubusercontent.com/${repo}/`,
    from: `raw.githubusercontent.com/${repo}/[git_ref]/`,
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
    ...([
      '.slim.min.js',
      '.slim.js',
      '.min.js',
      '.js'
    ] as const).map(suffix => literal({
      base: [
        `||code.jquery.com/jquery-3.*${suffix}`,
        `||code.jquery.com/jquery-4.*${suffix}`
      ],
      from: `code.jquery.com/jquery-[jquery_version]${suffix}`,
      to: `cdn.jsdelivr.net/npm/jquery@$1/dist/jquery${suffix}`,
      tests: [
        [
          `https://code.jquery.com/jquery-3.7.1${suffix}`,
          `https://cdn.jsdelivr.net/npm/jquery@3.7.1/dist/jquery${suffix}`
        ],
        [
          `https://code.jquery.com/jquery-3.0.0-beta1${suffix}`,
          `https://cdn.jsdelivr.net/npm/jquery@3.0.0-beta1/dist/jquery${suffix}`
        ],
        [
          `https://code.jquery.com/jquery-4.0.0${suffix}`,
          `https://cdn.jsdelivr.net/npm/jquery@4.0.0/dist/jquery${suffix}`
        ],
        [
          `https://code.jquery.com/jquery-4.0.0-rc.2${suffix}`,
          `https://cdn.jsdelivr.net/npm/jquery@4.0.0-rc.2/dist/jquery${suffix}`
        ]
      ],
      excludeDomains: ['ui.com']
    })),
    ...([
      ['.slim.module.min.js', 'jquery.slim.module.min.js'],
      ['.slim.module.js', 'jquery.slim.module.js'],
      ['.module.min.js', 'jquery.module.min.js'],
      ['.module.js', 'jquery.module.js']
    ] as const).map(([suffix, npmFileName]) => literal({
      base: `||code.jquery.com/jquery-4.*${suffix}`,
      from: `code.jquery.com/jquery-[jquery_version]${suffix}`,
      to: `cdn.jsdelivr.net/npm/jquery@$1/dist-module/${npmFileName}`,
      tests: [
        [
          `https://code.jquery.com/jquery-4.0.0${suffix}`,
          `https://cdn.jsdelivr.net/npm/jquery@4.0.0/dist-module/${npmFileName}`
        ],
        [
          `https://code.jquery.com/jquery-4.0.0-beta.2${suffix}`,
          `https://cdn.jsdelivr.net/npm/jquery@4.0.0-beta.2/dist-module/${npmFileName}`
        ]
      ],
      excludeDomains: ['ui.com']
    })),
    ...([
      '.min.map',
      '.min.js',
      '.js'
    ] as const).map(suffix => literal({
      base: `||code.jquery.com/jquery-2.2.*${suffix}`,
      from: `code.jquery.com/jquery-[version]${suffix}`,
      to: `cdn.jsdelivr.net/npm/jquery@$1/dist/jquery${suffix}`,
      tests: [
        [
          `https://code.jquery.com/jquery-2.2.4${suffix}`,
          `https://cdn.jsdelivr.net/npm/jquery@2.2.4/dist/jquery${suffix}`
        ]
      ],
      excludeDomains: ['ui.com']
    })),
    {
      // jquery@2.1.x minified files and source maps differ from the code.jquery.com copies.
      base: '||code.jquery.com/jquery-2.1.*.js',
      from: 'code.jquery.com/jquery-[version].js',
      to: 'cdn.jsdelivr.net/npm/jquery@$1/dist/jquery.js',
      tests: [
        [
          'https://code.jquery.com/jquery-2.1.4.js',
          'https://cdn.jsdelivr.net/npm/jquery@2.1.4/dist/jquery.js'
        ]
      ],
      excludeDomains: ['ui.com']
    },
    // All jquery-migrate releases on code.jquery.com from 1.2.1 onward were also published on npm.
    // Some copies differ only in line endings, build metadata, or a source-map trailer.
    ...([
      '.min.js',
      '.js'
    ] as const).map(suffix => literal({
      base: [
        `||code.jquery.com/jquery-migrate-1.2.1${suffix}`,
        `||code.jquery.com/jquery-migrate-1.3.0${suffix}`,
        `||code.jquery.com/jquery-migrate-1.4.0${suffix}`,
        `||code.jquery.com/jquery-migrate-1.4.1${suffix}`,
        `||code.jquery.com/jquery-migrate-3.*${suffix}`,
        `||code.jquery.com/jquery-migrate-4.*${suffix}`
      ],
      from: `code.jquery.com/jquery-migrate-[jquery_version]${suffix}`,
      to: `cdn.jsdelivr.net/npm/jquery-migrate@$1/dist/jquery-migrate${suffix}`,
      tests: [
        [
          `https://code.jquery.com/jquery-migrate-1.2.1${suffix}`,
          `https://cdn.jsdelivr.net/npm/jquery-migrate@1.2.1/dist/jquery-migrate${suffix}`
        ],
        [
          `https://code.jquery.com/jquery-migrate-3.0.0-rc1${suffix}`,
          `https://cdn.jsdelivr.net/npm/jquery-migrate@3.0.0-rc1/dist/jquery-migrate${suffix}`
        ],
        [
          `https://code.jquery.com/jquery-migrate-4.0.0-beta.2${suffix}`,
          `https://cdn.jsdelivr.net/npm/jquery-migrate@4.0.0-beta.2/dist/jquery-migrate${suffix}`
        ]
      ],
      excludeDomains: ['ui.com']
    })),
    ...([
      '.module.min.js',
      '.module.js'
    ] as const).map(suffix => literal({
      base: `||code.jquery.com/jquery-migrate-4.0.2${suffix}`,
      from: `code.jquery.com/jquery-migrate-[jquery_version]${suffix}`,
      to: `cdn.jsdelivr.net/npm/jquery-migrate@$1/dist-module/jquery-migrate${suffix}`,
      tests: [
        [
          `https://code.jquery.com/jquery-migrate-4.0.2${suffix}`,
          `https://cdn.jsdelivr.net/npm/jquery-migrate@4.0.2/dist-module/jquery-migrate${suffix}`
        ]
      ],
      excludeDomains: ['ui.com']
    })),
    // Older releases and source maps that differ from the npm artifacts retain their original path.
    {
      base: [
        '||code.jquery.com/jquery-1*',
        '||code.jquery.com/jquery-2.0*',
        '||code.jquery.com/jquery-2.1.*.min.*',
        '||code.jquery.com/jquery-2.1.*-*',
        '||code.jquery.com/jquery-2.2.*-*',
        '||code.jquery.com/jquery-3.*.map',
        '||code.jquery.com/jquery-4.*.map',
        '||code.jquery.com/jquery-migrate-1.0*',
        '||code.jquery.com/jquery-migrate-1.1*',
        '||code.jquery.com/jquery-migrate-1.2.0*',
        '||code.jquery.com/jquery-migrate-3.*.map',
        '||code.jquery.com/jquery-migrate-4.*.map',
        '||code.jquery.com/jquery-migrate-git*',
        '||code.jquery.com/jquery-latest*'
      ],
      from: 'code.jquery.com/',
      to: 'cdn.jsdelivr.net/gh/jquery/codeorigin.jquery.com@main/cdn/',
      tests: [
        [
          'https://code.jquery.com/jquery-4.0.0.module.min.map',
          'https://cdn.jsdelivr.net/gh/jquery/codeorigin.jquery.com@main/cdn/jquery-4.0.0.module.min.map'
        ],
        [
          'https://code.jquery.com/jquery-1.3.2.pack.js',
          'https://cdn.jsdelivr.net/gh/jquery/codeorigin.jquery.com@main/cdn/jquery-1.3.2.pack.js'
        ],
        [
          'https://code.jquery.com/jquery-3.7.1.min.map',
          'https://cdn.jsdelivr.net/gh/jquery/codeorigin.jquery.com@main/cdn/jquery-3.7.1.min.map'
        ],
        [
          'https://code.jquery.com/jquery-2.1.4.min.js',
          'https://cdn.jsdelivr.net/gh/jquery/codeorigin.jquery.com@main/cdn/jquery-2.1.4.min.js'
        ],
        [
          'https://code.jquery.com/jquery-migrate-4.0.2.module.min.map',
          'https://cdn.jsdelivr.net/gh/jquery/codeorigin.jquery.com@main/cdn/jquery-migrate-4.0.2.module.min.map'
        ],
        [
          'https://code.jquery.com/jquery-migrate-1.2.0.min.js',
          'https://cdn.jsdelivr.net/gh/jquery/codeorigin.jquery.com@main/cdn/jquery-migrate-1.2.0.min.js'
        ],
        [
          'https://code.jquery.com/jquery-migrate-git.min.js',
          'https://cdn.jsdelivr.net/gh/jquery/codeorigin.jquery.com@main/cdn/jquery-migrate-git.min.js'
        ],
        [
          'https://code.jquery.com/jquery-latest.min.js',
          'https://cdn.jsdelivr.net/gh/jquery/codeorigin.jquery.com@main/cdn/jquery-latest.min.js'
        ]
      ],
      excludeDomains: ['ui.com']
    },
    // Other jQuery CDN projects retain their original paths in the official repository.
    {
      base: [
        '||code.jquery.com/color/',
        '||code.jquery.com/mobile/',
        '||code.jquery.com/pep/',
        '||code.jquery.com/qunit/',
        '||code.jquery.com/ui/'
      ],
      from: 'code.jquery.com/',
      to: 'cdn.jsdelivr.net/gh/jquery/codeorigin.jquery.com@main/cdn/',
      tests: [
        [
          'https://code.jquery.com/color/jquery.color-2.2.0.min.js',
          'https://cdn.jsdelivr.net/gh/jquery/codeorigin.jquery.com@main/cdn/color/jquery.color-2.2.0.min.js'
        ],
        [
          'https://code.jquery.com/mobile/1.4.5/jquery.mobile-1.4.5.min.js',
          'https://cdn.jsdelivr.net/gh/jquery/codeorigin.jquery.com@main/cdn/mobile/1.4.5/jquery.mobile-1.4.5.min.js'
        ],
        [
          'https://code.jquery.com/pep/0.4.3/pep.min.js',
          'https://cdn.jsdelivr.net/gh/jquery/codeorigin.jquery.com@main/cdn/pep/0.4.3/pep.min.js'
        ],
        [
          'https://code.jquery.com/qunit/qunit-1.0.0.css',
          'https://cdn.jsdelivr.net/gh/jquery/codeorigin.jquery.com@main/cdn/qunit/qunit-1.0.0.css'
        ],
        [
          'https://code.jquery.com/ui/1.11.4/jquery-ui.min.js',
          'https://cdn.jsdelivr.net/gh/jquery/codeorigin.jquery.com@main/cdn/ui/1.11.4/jquery-ui.min.js'
        ],
        [
          'https://code.jquery.com/ui/1.13.3/themes/base/jquery-ui.css',
          'https://cdn.jsdelivr.net/gh/jquery/codeorigin.jquery.com@main/cdn/ui/1.13.3/themes/base/jquery-ui.css'
        ],
        [
          'https://code.jquery.com/ui/1.13.3/themes/base/images/ui-icons_444444_256x240.png',
          'https://cdn.jsdelivr.net/gh/jquery/codeorigin.jquery.com@main/cdn/ui/1.13.3/themes/base/images/ui-icons_444444_256x240.png'
        ]
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
    {
      // anime-sama.store mirrors the Anime-Sama/IMG repo's `img` branch under /img/,
      // so the leading /img/ is consumed by the @img branch ref rather than carried over
      base: '||anime-sama.store/img/',
      from: 'anime-sama.store/img/',
      to: 'cdn.jsdelivr.net/gh/Anime-Sama/IMG@img/',
      tests: [
        [
          'https://anime-sama.store/img/autres/logo_banniere.png',
          'https://cdn.jsdelivr.net/gh/Anime-Sama/IMG@img/autres/logo_banniere.png'
        ],
        [
          'https://anime-sama.store/img/contenu/death-note.jpg',
          'https://cdn.jsdelivr.net/gh/Anime-Sama/IMG@img/contenu/death-note.jpg'
        ]
      ]
    },
    githubRawToJsdelivr('ProjectInfinity-X/official_devices'),
    githubRawToJsdelivr('Evolution-X/www_gitres'),
    {
      // generic GitHub RAW -> jsDelivr, everything except script/xhr/css: those may rely on
      // GitHub RAW's short TTL for freshness, which jsDelivr's 12h+ branch cache would break.
      // Negated-only type options compile to a typeless filter in uBO, so this also covers
      // direct navigation (`doc`/main_frame) -- intentional: both hosts force a non-HTML
      // content type with nosniff, so a redirected navigation cannot execute as a page.
      base: '||raw.githubusercontent.com^',
      from: 'raw.githubusercontent.com/[non_path_segment]/[non_path_segment]/[git_ref]/',
      to: 'cdn.jsdelivr.net/gh/$1/$2@$3/',
      modifiers: ['~script', '~xhr', '~css'],
      // NOTE: `domain=` matches the *document* hostname ($docHostname), and on a top-level
      // navigation the document IS the request -- so `~githubusercontent.com` also excludes
      // direct navigation to raw.githubusercontent.com, suppressing the `doc` coverage the
      // negated modifiers above are meant to enable. Narrow to the viewscreen subdomain that
      // the exclude was actually for, so only that embedder is exempt.
      // ($denyallow can't express this: it matches $requestHostname, i.e. the request URL --
      // always raw.githubusercontent.com here -- not the embedding page.)
      excludeDomains: ['github.com', 'npmjs.com', 'viewscreen.githubusercontent.com'],
      tests: [
        [
          'https://raw.githubusercontent.com/Anime-Sama/IMG/img/contenu/death-note.jpg',
          'https://cdn.jsdelivr.net/gh/Anime-Sama/IMG@img/contenu/death-note.jpg'
        ],
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
    },
    {
      base: '||github.com/*/raw/',
      from: 'github.com/[non_path_segment]/[non_path_segment]/raw/[git_ref]/',
      to: 'cdn.jsdelivr.net/gh/$1/$2@$3/',
      modifiers: ['~script', '~xhr', '~css'],
      excludeDomains: ['github.com', 'npmjs.com', 'viewscreen.githubusercontent.com'],
      tests: [
        [
          'https://github.com/artembobkin/ImmersiveMap/raw/main/Documentation/Assets/immersive-map-demo.gif',
          'https://cdn.jsdelivr.net/gh/artembobkin/ImmersiveMap@main/Documentation/Assets/immersive-map-demo.gif'
        ],
        [
          'https://github.com/artembobkin/ImmersiveMap/raw/refs/heads/main/Documentation/Assets/immersive-map-demo.gif',
          'https://cdn.jsdelivr.net/gh/artembobkin/ImmersiveMap@main/Documentation/Assets/immersive-map-demo.gif'
        ],
        [
          'https://github.com/foo/bar/raw/refs/tags/v1.2.3/logo.png',
          'https://cdn.jsdelivr.net/gh/foo/bar@v1.2.3/logo.png'
        ],
        // refs/pull/ has no jsDelivr equivalent, this test ensures it is left untouched
        [
          'https://github.com/foo/bar/raw/refs/pull/123/head/img.png',
          'https://github.com/foo/bar/raw/refs/pull/123/head/img.png'
        ]
      ]
    }
  ]),
  defineRules('Special Redirects', 'special', [
    {
      base: '||hembed.com',
      from: '[subdomain].hembed.com',
      to: 'download.lucaairport.qzz.io/https/$1.hembed.com',
      tests: [
        ['https://vdownload.hembed.com/example.html', 'https://download.lucaairport.qzz.io/https/vdownload.hembed.com/example.html'],
        ['https://vdownload-3.hembed.com/example.html', 'https://download.lucaairport.qzz.io/https/vdownload-3.hembed.com/example.html']
      ]
    },
    {
      base: '||wdfiles.com',
      modifiers: [ // excluding doc
        '~doc',
        '~frame'
      ],
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
      base: '||www.wikidot.com/avatar.php',
      from: 'www.wikidot.com/avatar.php',
      to: 'docs.lucaairport.qzz.io/https/www.wikidot.com/avatar.php',
      tests: [
        ['https://www.wikidot.com/avatar.php?userid=3396110', 'https://docs.lucaairport.qzz.io/https/www.wikidot.com/avatar.php?userid=3396110']
      ]
    },
    {
      base: '||wikidot.com/local--favicon/',
      from: '[subdomain].wikidot.com/local--favicon/',
      to: 'docs.lucaairport.qzz.io/https/$1.wikidot.com/local--favicon/',
      tests: [
        ['https://scp-wiki-cn.wikidot.com/local--favicon/favicon.gif', 'https://docs.lucaairport.qzz.io/https/scp-wiki-cn.wikidot.com/local--favicon/favicon.gif']
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
      ],
      excludeDomains: [
        'openstreetmap.org' // CSP
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

    // redirect
    ...([
      'node.windy.com',
      'imgproxy.windy.com'
    ] as const).map(host => ({
      base: '||' + host + (host.includes('/') ? '' : '^'),
      from: host,
      to: 'docs.lucaairport.qzz.io/https/' + host,
      tests: []
    })),
    // enforce XHR
    ...([
      'tiles.windy.com',
      'ims.windy.com',
      'sat.windy.com',
      'rdr.windy.com',
      'img.windy.com',
      'node.windy.com/citytile/',
      'www.windy.com/img/', // 1p request redirect should be safe
      'www.windy.com//img/', // typo in their code, CSS url(), typical bug

      'tiles.strava.com',
      'content-a.strava.com',
      'wre-assets.prod.mapping.strava.com',
      'web-assets.strava.com',
      'd3nn82uaxijpm6.cloudfront.net', // strava front-end assets
      'dgtzuqphqg23d.cloudfront.net', // strava ugc images
      'dgalywyr863hv.cloudfront.net', // strava avatar and challenges
      'd3o5xota0a1fcr.cloudfront.net' // strava activity preview maps
    ] as const).map(host => ({
      base: '||' + host + (host.includes('/') ? '' : '^'),
      from: host,
      to: 'docs.lucaairport.qzz.io/https/' + host,
      modifiers: ['all', 'xhr'],
      tests: []
    })),
    ...([
      'youjizz.com',
      'phncdn.com'
    ] as const).map(host => ({
      base: '||' + host + '^',
      from: '[subdomain].' + host,
      to: 'docs.lucaairport.qzz.io/https/$1.' + host,
      // include all subdomain is different then exact domain, we may be redirecting entire doc or frame, which we need to avoid
      modifiers: [ // excluding doc
        '~doc',
        '~frame',
        '~xhr'
      ],
      tests: []
    })),
    // full domain redirect
    ...([
      'youjizz.com',
      'phncdn.com'
    ] as const).map(host => ({
      base: '||' + host + '^',
      from: '[subdomain].' + host,
      to: 'docs.lucaairport.qzz.io/https/$1.' + host,
      // include all subdomain is different then exact domain, we may be redirecting entire doc or frame, which we need to avoid
      modifiers: [ // excluding doc
        '~doc',
        '~frame'
      ],
      tests: []
    }))
  ])
] satisfies RedirectRuleSet[];
