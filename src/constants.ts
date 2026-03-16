import type { Props } from "astro";
import IconMail from "@/assets/icons/IconMail.svg";
import IconGitHub from "@/assets/icons/IconGitHub.svg";
import IconBrandX from "@/assets/icons/IconBrandX.svg";
import IconFacebook from "@/assets/icons/IconFacebook.svg";
import IconTelegram from "@/assets/icons/IconTelegram.svg";
import IconShare from "@/assets/icons/IconShare.svg";
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
  // 通用分享：优先走系统分享面板（navigator.share），不支持则复制链接
  {
    name: "Share",
    href: "#native-share",
    linkTitle: `分享（系统面板/复制链接）`,
    icon: IconShare,
  },

  // 其它平台按钮
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
