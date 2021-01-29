/** @type {import('@docusaurus/types').DocusaurusConfig} */
module.exports = {
  title: 'WebHooks',
  tagline: 'WebHooks are easy!',
  url: 'https://bmiddha.github.io/webhooks',
  baseUrl: '/webhooks/',
  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',
  favicon: 'img/favicon.ico',
  organizationName: 'bmiddha',
  projectName: 'webhooks',
  plugins: [
    [
      'docusaurus-plugin-typedoc',
      {
        entryPoints: ['../src/index.ts'],
        tsconfig: '../tsconfig.json',
        out: ''
      },
    ],
  ],
  themeConfig: {
    navbar: {
      title: 'WebHooks',
      logo: {
        alt: 'WebHooks Logo',
        src: 'img/logo.svg',
      },
      items: [
        {
          href: 'https://github.com/bmiddha/webhooks',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      copyright: `Copyright © ${new Date().getFullYear()} Bharat Middha. Built with Docusaurus.`,
    },
  },
  presets: [
    [
      '@docusaurus/preset-classic',
      {
        docs: {
          sidebarPath: require.resolve('./sidebars.js'),
          editUrl:
            'https://github.com/bmiddha/webhooks/edit/main/website/',
          routeBasePath: '/',
        },
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
      },
    ],
  ],
};
