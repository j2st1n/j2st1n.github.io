---
author: J2
title: 新站被扫第二回：别把 requests 当访问量，做点“低误伤”防护就够了
titleEn: "The Second Wave of Scans: Don’t Confuse Requests with Real Traffic"
slug: fr-scan-second-wave
description: 扫描不是一次性事件：第二波又来了。这篇记录我怎么读 Cloudflare 指标、怎么判断“噪音 vs 读者”，以及怎么用低误伤策略把扫描流量压下去（不公开具体规则）。
pubDatetime: 2026-03-18T09:45:00+08:00
tags:
  - Cloudflare
  - 安全
  - 运维
  - 随便写写
featured: false
draft: false
ogImage: https://img.bins.blog/2026-03-18/fr-scan-second-wave/nsoc-1985.webp
---

昨天写完《刚开张的博客，就被互联网“打招呼”了》，我以为“打招呼”到此为止。

结果事实证明：互联网真不讲武德。

结果今天早上看一眼：**第二波又来了**。

我看了一眼 Cloudflare：大概 **18 小时 6k+ requests**，而且绝大多数不是正常读者行为。

这篇不打算做“安全教程”，也不会公开任何可被复用的具体规则表达式；就讲三件事：**怎么读指标、怎么判断是不是扫描、怎么做低误伤防护**。

![](https://img.bins.blog/2026-03-18/fr-scan-second-wave/nsoc-1985.webp)

> National Security Operations Center photo (c. 1985) — CC0  
> Source: https://commons.wikimedia.org/w/index.php?curid=27095683

## 1) 先把心态摆正：扫描不是事故，是常态

只要你的站是公开的：

- 你会被扫
- 你会被撞常见路径
- 你会看到各种 404/403

这不是针对你，是“互联网后台任务”。

## 2) 别用 requests 吓自己：看 pageViews / 4xx / threats

这波的典型特征依旧是：

- **requests 很高**，但 **pageViews 没按比例增长**
- **403/404 占比很高**（撞路径、被拦截）
- **threats 明显上升**（WAF 命中）

所以如果你只盯着 requests，会以为“站火了”；

但从 pageViews + 状态码结构看，它更像是：**扫描噪音 + 少量真实访问**。

## 3) 我做的防护策略：低误伤、可回滚、分层拦截

我给自己的原则是：

- **优先低误伤**（别因为防护把正常读者挡外面）
- **优先可回滚**（出问题立刻撤）
- **分层处理**（明显扫描直接挡；可疑的先 challenge；剩下的交给缓存和静态站去扛）

具体做法（不公开规则细节，只说方向）：

### 3.1 静态站“该放的就放”：只需要 GET/HEAD

静态博客通常只需要 GET/HEAD。

把其它 method 的噪音请求直接拒绝，可以立刻少掉一大坨无意义的探测。

### 3.2 “像扫描的行为”先 challenge，而不是一刀切 block

对一些高度可疑但又不想误伤的流量：

- 先用 **managed challenge** 让它付出成本
- 通过了再说

人类浏览器多数时候是无感通过；脚本/扫描器会卡住。

### 3.3 已经确认的恶意来源：再做更硬的拦截

当某些来源反复在峰值时段出现、并且命中大量探测特征时，才考虑更硬的策略（例如更直接的拦截或更精确的来源范围封堵）。

### 3.4 最后：不要忘了“观察”

防护不是加完就结束。

我会关注这些指标是否变好：

- 403/404 是否下降（或至少不再持续攀升）
- threats 是否从“常态噪音”回落
- pageViews 是否保持正常，不被误伤

## 小结：新站生存指南

- **扫描会反复来**，别焦虑
- **requests 不等于访问量**，别自嗨/别自吓
- 用 **低误伤 + 分层** 的策略，成本很低，效果很好

***

最后一句：别慌。静态站 + 缓存 + 基础防护，扫就扫吧——该写博客写博客。
