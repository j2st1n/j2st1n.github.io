import type {
  LicenseConfig,
  NavBarConfig,
  ProfileConfig,
  SiteConfig,
} from './types/config'
import { LinkPreset } from './types/config'

export const siteConfig: SiteConfig = {
  title: 'j2\'s blog',
  subtitle: 'keep on reading&thinking',
  lang: 'en',
  themeHue: 250,
  banner: {
    enable: false,
    src: 'assets/images/demo-banner.png',
  },
}

export const navBarConfig: NavBarConfig = {
  links: [
    LinkPreset.Home,
    LinkPreset.Archive,
    LinkPreset.About,
  /*  {
      name: 'GitHub',
      url: 'https://github.com/saicaca/fuwari',
      external: true,
    },*/
  ],
}

export const profileConfig: ProfileConfig = {
  avatar: 'assets/images/1.jpg',
  name: 'j2\'s reading...',
  bio: '以书为镜·以思为砺',
  links: [
    {
      name: 'Telegram',
      icon: 'fa6-brands:telegram',
      url: 'https://t.me/j2st1n2',
    },
    {
      name: 'Mail',
      icon: 'material-symbols:mail',
      url: 'mailto:info@3313107.xyz',
    },
  /*  {
      name: 'GitHub',
      icon: 'fa6-brands:github',
      url: 'https://github.com/saicaca/fuwari',
    }, */
  ],
}

export const licenseConfig: LicenseConfig = {
  enable: true,
  name: 'CC BY-NC-SA 4.0',
  url: 'https://creativecommons.org/licenses/by-nc-sa/4.0/',
}
