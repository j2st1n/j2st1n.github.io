# 摸鱼时刻 / bins.blog

这是 **[bins.blog](https://bins.blog/)** 的源码仓库。

一个用来放随笔、记录、观察与认真存档的小博客。
写的东西不一定都重要，但希望都是真实的、值得留下来的。

## 这是什么

这个项目是一个基于 **Astro** 的静态博客站点，主要用于：

- 发布博客文章
- 维护标签、归档、RSS、站内搜索
- 生成文章 OG 图
- 持续迭代站点样式与阅读体验

## 本地开发

```bash
pnpm install
pnpm run dev
```

默认本地开发服务会运行在 Astro 的标准端口上。

## 构建

```bash
pnpm run build
```

构建会执行：

- Astro 类型检查
- 静态站点构建
- Pagefind 站内搜索索引生成

## 技术栈

- [Astro](https://astro.build/)
- TypeScript
- Tailwind CSS
- Pagefind

## 致谢

这个博客基于 [Astro](https://astro.build/) 构建，
并在 [AstroPaper](https://github.com/satnaing/astro-paper) 主题的基础上进行了持续修改与定制。

感谢 Astro 社区，以及 AstroPaper 原作者与贡献者提供的优秀起点。
