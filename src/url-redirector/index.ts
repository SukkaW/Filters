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
        'bootstrapcdn.com/bootstrap/([^/]+)/',
        'cdn.jsdelivr.net/npm/bootstrap@$1/dist/'
      ],
      [
        'bootstrapcdn.com/font-awesome/4.*/',
        'cdn.jsdelivr.net/npm/font-awesome@4.7.0/'
      ],
      [
        'bootstrapcdn.com/font-awesome/5.*/',
        'https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@5.15.4/'
      ]
    ]
  }
] satisfies RedirectRule[];
