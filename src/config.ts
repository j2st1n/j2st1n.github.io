export const SITE = {
  website: "https://j2st1n.github.io/", // replace this with your deployed domain
  author: "J2",
  profile: "https://github.com/j2st1n",
  desc: "J2的摸鱼小博客｜随便写写，认真存档",
  title: "J2's Blog",
  ogImage: "astropaper-og.jpg",
  lightAndDarkMode: true,
  postPerIndex: 6,
  postPerPage: 6,
  scheduledPostMargin: 15 * 60 * 1000, // 15 minutes
  showArchives: true,
  showBackButton: true, // show back button in post detail
  editPost: {
    enabled: false,
    text: "Edit page",
    url: "https://github.com/j2st1n/j2st1n.github.io/edit/main/",
  },
  dynamicOgImage: true,
  dir: "ltr", // "rtl" | "auto"
  lang: "zh-CN", // html lang code.
  timezone: "Asia/Shanghai", // Default global timezone (IANA format)
} as const;
