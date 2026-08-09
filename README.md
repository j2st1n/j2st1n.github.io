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
pnpm run check
pnpm run build
```

`check` 用于执行 Astro 与 TypeScript 诊断，`build` 只负责静态站点构建。CI 会依次完成检查和构建，部署流程只运行构建，避免重复解析内容。

首次构建会把自动生成的 OG 图片缓存到 `.cache/og-images/`。后续构建会按文章内容哈希复用缓存，只为新增或发生变化的文章重新生成图片，并在成功构建后清理不再使用的旧缓存。修改 OG 模板、字体或渲染规则时，请同步递增 `src/utils/getOgImageVersion.ts` 中的 `OG_TEMPLATE_VERSION`。

## 文章标签

标签使用 `src/content.config.ts` 中的受控词表。每篇文章必须使用 1–4 个标签；完整提取与新增规则维护在 Obsidian Wiki 的“博客发布工作流 → 博客文章标签规则”。发布时优先匹配已有标签，确实没有合适标签时按 Wiki 准入规则创建，并同步扩展 `BLOG_TAGS`。未填写标签、使用库外标签或重复标签都会导致内容检查失败。

## 技术栈

- [Astro](https://astro.build/)
- TypeScript
- Tailwind CSS

## 致谢

这个博客使用 [Astro](https://astro.build/) 构建，
源于 [AstroPaper](https://github.com/satnaing/astro-paper)，并根据个人喜好修改。

感谢 Astro 社区，以及 AstroPaper 原作者与贡献者提供的优秀起点。
