export interface RedirectRule {
  basename: string,
  rules: Array<[
    origin: string,
    destination: string,
    comment?: string
  ]>
}

export default [
  // DOMESTIC_REDIRECT_RULES
  {
    basename: 'domestic-redirect',
    rules: [
      [
        'sigma9.scpwikicn.com',
        'cdn.jsdelivr.net/gh/SCP-CN-Tech/sigma9@gh-pages'
      ],
      [
        'interwiki.scpwikicn.com',
        'cdn.jsdelivr.net/gh/SCP-CN-Tech/Interwiki@gh-pages'
      ],
      [
        'bhl.scpwikicn.com',
        'cdn.jsdelivr.net/gh/SCP-CN-Tech/Black-Highlighter@gh-pages'
      ],
      [
        'use.fontawesome.com/releases/v5.3.1/css/all.css',
        'cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@5.3.1/css/all.min.css'
      ],
      [
        'fonts.googleapis.com',
        'fonts.googleapis.cn',
        ''
      ],
      [
        'maxcdn.bootstrapcdn.com/font-awesome/4.3.0/css/font-awesome.min.css',
        'cdn.jsdelivr.net/npm/font-awesome@4.3.0/css/font-awesome.min.css'
      ],
      [
        'scp-zhtr.github.io',
        'cdn.jsdelivr.net/gh/SCP-ZHTR/SCP-ZHTR.github.io@main'
      ]
    ]
  },
  // HOSTED_PUBLIC_CDN_REDIRECT
  {
    basename: 'redirect-public-cdn',
    rules: [
      [
        'polyfill-fastly.net',
        'cdnjs.cloudflare.com/polyfill'
      ],
      [
        'ajax.googleapis.com/ajax/libs/bootstrap/([^/]+)/',
        'cdn.jsdelivr.net/npm/bootstrap@$1/dist/'
      ],
      [
        'ajax.googleapis.com/ajax/libs/jquery/([^/]+)/',
        'cdn.jsdelivr.net/npm/jquery@$1/dist/'
      ]
    ]
  }
] satisfies RedirectRule[];
