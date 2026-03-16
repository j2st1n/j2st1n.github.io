---
author: J2
title: 刚开张的博客，就被互联网“打招呼”了
titleEn: "A New Blog, and the Internet Immediately Said Hello"
slug: new-blog-got-scanned
description: 刚把博客搭好，第二天 Cloudflare 就出现一波异常扫描：404/405 暴涨、来自 FR 的请求占比极高。记录一次“新站必经的洗礼”，以及我做了哪些低误伤防护。
pubDatetime: 2026-03-17T07:05:00+08:00
tags:
  - 随便写写
  - 博客
  - Cloudflare
  - 安全
featured: false
draft: false
ogImage: https://img.bins.blog/2026-03-17/new-blog-got-scanned/nsoc-1975.webp
---

博客刚开张的时候，我以为自己面对的是“读者”。

结果第二天一看 Cloudflare：先来的不是人类，是互联网的自动化“打招呼”——爬虫、扫描器、撞库脚本、以及各种你根本不想认识的东西。

这篇就当做一次小记录：**新站被扫是常态**，但你可以用很小的成本，把噪音压下去，还不误伤正常访问。

## TL;DR

- 新站上线第二天就被扫：requests 暴涨，但 pageViews 增幅没那么夸张。
- 典型特征：404/405/403 多、来源国家集中、峰值小时明显。
- 处理思路：先上“低误伤”的 Cloudflare 规则（静态站只放 GET/HEAD + 扫描路径挑战）。

## 发生了什么：requests 爆了，但 pageViews 没跟着爆

按北京时间整天对比：

- **3/15**：347 requests / 23 pageViews / 3 threats
- **3/16**：5289 requests / 277 pageViews / 63 threats

最关键的信号是：**requests 暴涨 15 倍，但 pageViews 只涨到 277**。

如果你把 requests 当成“访问量”，那就会被吓到；但从 pageViews 看，更像是“人类访问 + 大量非人类噪音”。

## 这波流量为什么像扫描？

几个特别明显的特征：

1) **状态码很不正常**

3/16 的 Top 状态码里：

- 404（大量探测不存在的路径）
- 405（用不该用的方法乱打，比如对静态站发 OPTIONS/POST 等）
- 403（被挡）

这类组合基本就是：**在扫**。

2) **来源国家集中**

3/16 的请求里，来自 **FR** 的占比非常高（还贡献了绝大多数 threats）。

这不等于“法国人很坏”，而是说明：这波扫描器的出口在那边。

3) **峰值集中在一个小时**

3/16 下午有一个小时请求量特别高（典型脚本行为），不像真实读者的自然波动。

## 我做了什么：两条低误伤的 Cloudflare 规则

我没有上来就搞很激进的封禁（容易误伤），而是先做两条**对静态博客很友好**的硬化：

### 规则 1：Block 非 GET/HEAD

静态博客正常只需要 GET/HEAD。

把其它 method（POST/PUT/DELETE/OPTIONS…）直接挡掉，能立刻减少一大堆 405 噪音来源。

### 规则 2：对“常见扫描路径”做 Managed Challenge

比如：

- `.php`
- `/wp-...`
- `/xmlrpc`
- `/administrator`
- `/admin`

这类路径对静态站来说基本没有意义，但对扫描器来说是“常规动作”。

我让 Cloudflare 对这些命中做 **managed challenge**：

- 正常人几乎不会走到这些路径
- 扫描器会被挑战/拖慢

## 小结：新站被扫不是事故，是仪式

“才开张就被扫”其实挺正常的：

- 互联网上有大量自动化脚本在持续扫描
- 你只要有一个公开域名，就会被路过

真正要做的是：

- **不要用 requests 吓自己**（更看 pageViews、以及是否有异常 4xx/5xx）
- 先上**低误伤**的规则，把明显的噪音关掉
- 让自己心态稳定：该写博客写博客

## 配图（合规可引用：CC0）

![](https://img.bins.blog/2026-03-17/new-blog-got-scanned/nsoc-1975.webp)

- 文件页（Wikimedia Commons）：https://commons.wikimedia.org/wiki/File:National_Security_Operations_Center_photograph,_c._1975_-_National_Cryptologic_Museum_-_DSC07658.JPG
- 授权：CC0（无需署名，但我还是放了来源链接）
