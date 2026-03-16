import type { Props } from "astro";
import IconMail from "@/assets/icons/IconMail.svg";
import IconGitHub from "@/assets/icons/IconGitHub.svg";
import IconBrandX from "@/assets/icons/IconBrandX.svg";
import IconLinkedin from "@/assets/icons/IconLinkedin.svg";
import IconFacebook from "@/assets/icons/IconFacebook.svg";
import IconTelegram from "@/assets/icons/IconTelegram.svg";
import IconWeChat from "@/assets/icons/IconWeChat.svg";
import IconWeibo from "@/assets/icons/IconWeibo.svg";
import { SITE } from "@/config";

interface Social {
  name: string;
  href: string;
  linkTitle: string;
  icon: (_props: Props) => Element;
}

// Footer socials (if you ever enable them)
export const SOCIALS: Social[] = [
  {
    name: "GitHub",
    href: "https://github.com/j2st1n",
    linkTitle: `在 GitHub 上查看 ${SITE.title}`,
    icon: IconGitHub,
  },
] as const;

// Share buttons on post page
export const SHARE_LINKS: Social[] = [
  // 国内平台：因为微信/朋友圈没有官方 Web 分享 URL，这里提供“复制链接”式的分享提示。
  // 微博可用标准 share 链接。
  {
    name: "Weibo",
    href: "https://service.weibo.com/share/share.php?url=",
    linkTitle: `分享到微博（直达）`,
    icon: IconWeibo,
  },
  {
    name: "WeChat",
    href: "#wechat-share",
    linkTitle: `分享到微信/朋友圈（复制链接）`,
    icon: IconWeChat,
  },

  // 国际平台（保留常用）
  {
    name: "Facebook",
    href: "https://www.facebook.com/sharer.php?u=",
    linkTitle: `分享到 Facebook`,
    icon: IconFacebook,
  },
  {
    name: "X",
    href: "https://x.com/intent/post?url=",
    linkTitle: `分享到 X`,
    icon: IconBrandX,
  },
  {
    name: "Telegram",
    href: "https://t.me/share/url?url=",
    linkTitle: `分享到 Telegram`,
    icon: IconTelegram,
  },
  {
    name: "Mail",
    href: "mailto:?subject=See%20this%20post&body=",
    linkTitle: `通过邮件分享本文`,
    icon: IconMail,
  },
] as const;
