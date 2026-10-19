export type Friend = {
  name: string;
  url: `https://${string}`;
  description: string;
};

// 友链在这里维护，按列表顺序展示。
export const friends: Friend[] = [
  {
    name: "博客大联盟",
    url: "https://bo.ke/",
    description: "发现中文独立博客，阅读与订阅最新文章。",
  },
];
