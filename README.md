# bins.blog

> 随便写写，认真存档。

这是 **[bins.blog](https://bins.blog/)** 的源码仓库。
一个放随笔、日常观察和技术折腾的小博客。写的东西不一定都重要，但希望都是真实的、值得留下来的。

[文章归档](https://bins.blog/archives/) · [留言簿](https://bins.blog/notes/) · [友邻](https://bins.blog/links/) · [RSS](https://bins.blog/rss.xml)

## 内容与功能

- 博客文章、归档、标签、站内搜索与 RSS。
- 纸感排版、明暗主题、中文字体按需加载。
- 自动生成文章分享图（OG），支持划选文字生成文摘卡片。
- 文章摸鱼计数、先审后发的留言簿、友情链接。

## 本地开发

准备好 Node.js 与 Corepack，pnpm 版本由 [package.json](package.json) 的 `packageManager` 字段锁定。

```bash
corepack pnpm install --frozen-lockfile
corepack pnpm dev
```

默认开发地址为 <http://localhost:4321/>。

## 日常维护

| 内容                 | 位置                                           |
| -------------------- | ---------------------------------------------- |
| 博客文章             | [src/content/blog/](src/content/blog/)         |
| 文章字段与标签词表   | [src/content.config.ts](src/content.config.ts) |
| 友链名单             | [src/data/friends.ts](src/data/friends.ts)     |
| 站点标题、描述与时区 | [src/config.ts](src/config.ts)                 |
| 页面与路由           | [src/pages/](src/pages/)                       |
| 页面布局与组件       | [src/themes/quiet/](src/themes/quiet/)         |
| 全局样式与配色       | [src/styles/global.css](src/styles/global.css) |
| 点赞与留言服务       | [workers/claps/](workers/claps/)               |

文章文件使用英文小写与连字符命名，中文标题写在 frontmatter 中。必填字段为 `title`、`description`、`pubDatetime` 和 `tags`；摘要为 30–90 个字符，标签为受控词表中的 1–4 项，且不能重复。`draft: true` 的文章不发布。完整标签提取与新增规则维护在个人 Obsidian Wiki 的“博客发布工作流 → 博客文章标签规则”。

友链在 `src/data/friends.ts` 中按顺序维护 `name`、HTTPS `url` 与 `description`，页面会按名单顺序展示。

## 检查与构建

| 命令                         | 用途                                                |
| ---------------------------- | --------------------------------------------------- |
| `corepack pnpm lint`         | ESLint 代码检查                                     |
| `corepack pnpm format:check` | Prettier 格式检查                                   |
| `corepack pnpm check`        | Astro 与 TypeScript 诊断                            |
| `corepack pnpm test`         | 运行项目测试                                        |
| `corepack pnpm build`        | 构建静态站点，校验 SEO 与字体产物，清理过期 OG 缓存 |
| `corepack pnpm preview`      | 本地预览 `dist/` 中的构建产物                       |

这些命令独立执行。`build` 中的产物校验与 lint、格式、类型检查和测试分别运行。

## 发布流程

静态站点托管在 GitHub Pages，域名通过 EdgeOne 加速。点赞与留言由独立的 Cloudflare Worker 提供服务。

- **Pull Request**：运行 [CI](.github/workflows/ci.yml)，依次执行 lint、格式检查、类型检查、测试与构建。
- **推送 main 或手动运行部署工作流**：运行 [GitHub Pages 部署](.github/workflows/deploy.yml)，安装依赖、构建并发布。构建包含 SEO 与字体产物校验；部署工作流目前没有调用 PR 的整套检查。

## 图片缓存与字体

自动生成的 OG 图片缓存位于 `.cache/og-images/`，按内容与模板版本复用，成功构建后清理过期文件。修改 OG 模板、字体或渲染规则时，同步更新 [getOgImageVersion.ts](src/utils/getOgImageVersion.ts) 中的 `OG_TEMPLATE_VERSION`。

中文字体使用固定分包与基础包预加载。普通开发、CI 和发布直接使用已提交的字体产物；重新生成方法与授权说明见 [字体文档](public/fonts/README.md)。

## 技术与致谢

基于 [Astro](https://astro.build/)、TypeScript 与 Tailwind CSS 构建，源于 [AstroPaper](https://github.com/satnaing/astro-paper)。视觉与中文排版参考 [Kami 紙](https://kami.tw93.fun/)，并按个人阅读习惯调整。

感谢 Astro 社区、AstroPaper 原作者与贡献者，以及 Kami 设计系统。
