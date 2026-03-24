---
author: J2
title: 微信接入龙虾，Agent 入口战争开始了
slug: weixin-clawbot-launch
description: 微信正式推出 ClawBot 插件，支持接入 OpenClaw（龙虾）；更新微信、启用插件、扫码绑定后，即可在微信里直接和自己的助手对话。
pubDatetime: 2026-03-22T16:45:00+08:00
tags:
  - 微信
  - Agent
  - OpenClaw
  - 龙虾
featured: false
draft: false
ogImage: https://img.bins.blog/2026-03-22/weixin-clawbot-launch/file_4---215898f1-e278-41f4-aaeb-97cd7d8ca92d.jpg
---

微信今天正式放出 **ClawBot 插件**，支持把 OpenClaw（龙虾）接到微信里。
从公开信息和实测截图看，入口已经很清晰：在微信插件页可直接看到「微信ClawBot」，并提供 OpenClaw 侧安装指令。

![](https://img.bins.blog/2026-03-22/weixin-clawbot-launch/file_4---215898f1-e278-41f4-aaeb-97cd7d8ca92d.jpg)

> 微信插件页已出现微信ClawBot入口

**操作步骤（建议先把微信更新到最新版本）：**
1. 打开微信：`我 → 设置 → 插件`，进入 **微信ClawBot**。
2. 在 OpenClaw 设备侧执行：`npx -y @tencent-weixin/openclaw-weixin-cli@latest install`
3. 按页面提示扫码绑定，完成后即可在微信里和自己的 OpenClaw 收发消息。

![](https://img.bins.blog/2026-03-22/weixin-clawbot-launch/file_5---7099d647-7702-4bf7-b6fc-7e51efa47fd9.jpg)

> 插件详情页已提供安装指令与扫码绑定流程

这件事最大的价值，不是“技术上能不能连”，而是接入路径被压缩到了普通用户可直接上手的程度：更新微信、启用插件、执行命令、扫码绑定，几分钟内就能跑通。入口一旦进入微信这种国民级场景，Agent 的使用频率和覆盖人群都会明显提升。

对行业来说，这也是一个很明确的信号：Agent 正在从圈内工具走向大众基础能力。接下来竞争的核心，会从“谁会做演示”转向“谁能稳定解决真实问题”。真正有持续价值的产品，会在这波入口普及里加速跑出来。

## 参考链接
- 新浪财经：https://finance.sina.com.cn/roll/2026-03-22/doc-inhrwckv4926331.shtml
- 凤凰网 / 智东西：https://tech.ifeng.com/c/8rhSaM7A2iy
