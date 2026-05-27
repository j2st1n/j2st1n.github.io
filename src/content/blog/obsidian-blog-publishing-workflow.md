---
title: 我把 Obsidian 接上了自己的博客
author: J2
description: 用 Obsidian 管理 Astro 博客文章，Wiki 做知识仓库，Reasonix 协助取材——一条完整的写作流跑通了。
pubDatetime: 2026-05-26T23:30:00+08:00
tags:
  - Obsidian
  - 博客
  - 工具
  - 工作流
draft: false
---

折腾了一晚上，把 Obsidian 和博客的发布管道接上了。

## 之前的问题

我的博客是 Astro 架的，文章全部是 `src/content/blog/` 下的 Markdown 文件，GitHub Pages 自动部署。写了快 50 篇，基本都是通过龙虾或者Hermes来写的，不算真正的写作。

想着做一个CMS，在折腾完karpathy大神的wiki之后，ob成了天然的内容输入口。

## 现在的方案

整个链路是这样的：

```
Obsidian（blog vault）写文章
  ↓ 粘贴图片 → 自动上传 R2
  ↓ Git 插件一键推送
GitHub → Astro 构建 → bins.blog 上线
```

当需要深入写某个话题时，还可以从我的 Wiki vault 里取材：

```
Wiki vault（知识仓库）
  ↓ 搜索相关 entity / concept / source
Reasonix 或其他 AI 工具帮我提炼素材
  ↓ 生成初稿到 blog vault
Obsidian 调整 → Git push
```

## 具体怎么做的

### 1. Obsidian vault 只暴露文章目录

把 vault 根目录直接设在 `src/content/blog/` 的话，会多出一堆 `.astro`、`.ts`、`node_modules` 噪音。后来改成打开 `src/content/` 作为 vault 根，文章都在 `blog/` 子目录下，干净多了。

### 2. Dataview 看板

45 篇文章在文件列表里是按字母排序的，完全没章法。装了个 Dataview 插件，建了 `_dashboard.md` 看板——按发布时间倒序排列，还能看到草稿区、标签分布。文件名前面加了下划线，Astro 构建时会自动跳过，不会生成页面。

### 3. 图片上传自动化

装了个叫「Image Uploader to API」的社区插件，粘贴图片自动 POST 到 Cloudflare Worker → 写入 R2 → 返回 URL → 替换成标准 Markdown 图片语法。
![](https://img.bins.blog/2026/05/uploads/image---70a86c71.png)
<center>图为用Dateview建立的Blog看板</center>

### 4. Git 发布

Obsidian Git 插件，配了个 `custom base path = "../../"`（因为 vault 根在 `src/content/` 里，`.git` 在上面两层）。写完文章 `Cmd+P` → `Git: Commit and push`，一分钟内上线。

### 5. 踩了个坑

装完 Obsidian Git 插件后它有自动备份功能，把 `.obsidian/` 目录（包含插件的配置文件）一起 commit 上去了。里面有图床的 API token 明文。幸好发现得早，删历史 + 轮换 token + 加 `.gitignore`，也顺便提醒自己：**先配 gitignore，再装 Git 插件**。

## 两条写作路线

现在日常写博客有两条路：

- **自己写**：Obsidian 里起稿 → Reasonix 润色 → 定稿 → push
- **Wiki 取材**：告诉 Reasonix「根据 Wiki 写篇关于 X 的博客」→ 它搜索我的知识库 → 生成初稿 → 我改 → push

第二条路刚跑通，后面打算试试把 Wiki 里积累的那些对比分析（比如 AI 搜索服务对比）转成博客。

## 总结

核心改动没几样：vault 目录选对、三个插件（Dataview + Image Uploader to API + Obsidian Git）、一个看板页面。但整个体验从"写博客是件需要切工具的事"变成了"Obsidian 写着写着顺手就发了"。

下一步大概是把 Wiki 里的知识持续转化成博客输出。
