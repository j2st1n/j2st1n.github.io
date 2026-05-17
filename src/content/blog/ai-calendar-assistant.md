---
title: 敲了个 AI 日程助手
author: J2
description: 之前用 TOKI 管日程，商业化后弃用了，干脆自己写了一个自部署的 AI 日程管理工具。
pubDatetime: 2026-05-17T19:55:00+08:00
tags:
  - AI
  - 日程管理
  - 自部署
  - 开源
draft: false
---

之前在 Telegram 上用过 TOKI，对话式管理日程，体验不错。后来商业化限制越来越多，弃用了。试了几个替代方案都不顺，干脆自己写了一个。

## 能干嘛

接入 Telegram 或 Discord，说一句话就能建日程：

```
你：明天下午 3 点和张三开会
Bot：✅ 已安排
      🕒 2026-05-15 15:00 - 16:00
      📌 和张三开会

你：改成 4 点
Bot：✅ 已更新 → 16:00 - 17:00
```

支持自然语言创建、修改、删除，回复消息即可改。发截图也能识别日程。日历通过 CalDAV 同步，兼容 iCloud、群晖。

AI 随便配——OpenAI、DeepSeek、Anthropic、Ollama 都行。

## 自部署

数据全在本地，Docker 一条命令起：

```bash
curl -O https://raw.githubusercontent.com/j2st1n/ai-calendar-assistant/main/docker-compose.yml
docker compose up -d
```

当前版本 v1.1.2，项目地址：[github.com/j2st1n/ai-calendar-assistant](https://github.com/j2st1n/ai-calendar-assistant)
