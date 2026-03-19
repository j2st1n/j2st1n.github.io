---
author: J2
title: 嚯，昨天的大哥又来串门啦？
titleEn: "The Guy From Yesterday Came Back Again?"
slug: traffic-peak-not-readers
description: 上午看见一个小峰值，差点以为新文章有动静了。拆开才发现，里面混着监控请求、正常访问，还有昨天那位又来拧门把手的大哥。
pubDatetime: 2026-03-19T14:35:00+08:00
tags:
  - Cloudflare
  - 安全
  - 博客
  - 随便写写
featured: false
draft: false
ogImage: https://img.bins.blog/2026-03-19/traffic-peak-not-readers/door-handle.webp
---

嚯，昨天的大哥又来串门啦？

今天上午看了一眼博客流量，突然冒出来一个小峰值。
第一反应还挺朴素：不会吧，刚发的新文章这么快就有动静了？

结果拆开一看，熟悉的味道又回来了。

里面当然不是完全没人看，正常访问有，首页监控也有，但最扎眼的还是那批老朋友：一串莫名其妙的 `.php`、`wp-login.php`、`xmlrpc.php`，还有各种一看就不是给我这个小博客准备的路径。

说白了，就是昨天那位到处拧门把手的大哥，今天又顺路过来看看我家门锁换好没有。

这么一拆，那个峰值也就没那么令人激动了。它不是“文章突然火了”，更像是**监控、真人访问，再加上一点扫描流量，刚好堆在了同一个小时里**。

不过也不是坏消息。

前两天加的 Cloudflare 防护，这次多少算是交了作业。上午那一波里，已经有一部分请求被挡在边缘层，说明这些规则至少没白配。它未必能让世界彻底清净，但起码能让这种低质量探测少进来一点，也少恶心人一点。

这两天看下来，我越来越觉得，小站刚上线时最容易犯的错，不是没人看，而是**太容易把“热闹”误认成“读者”**。

你看到 requests 涨了，不一定是内容被看见；你看到有个峰值，也不一定是什么值得庆祝的事。
有时候，只是昨天那位大哥，又回来试了试门。

![](https://img.bins.blog/2026-03-19/traffic-peak-not-readers/door-handle.webp)

## 版权 / 授权说明

- 配图：door handle photo
- 来源：Unsplash（摄影师页面待补）
- 说明：本文配图用于“有人又来拧门把手”的生活化隐喻
