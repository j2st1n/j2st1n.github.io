---
title: 给 DSH 装了个 agent-teams 插件
description: 给 DSH 装上了 dsh-agent-teams 插件，看多个 subagent 分工干活；回顾从 CLI 到 Harness 的演进，保持好奇与学习。
pubDatetime: 2026-09-06T13:11:01+08:00
author: J2
tags:
  - 随笔
  - AI
  - Agent
featured: false
draft: false
---

今天给 DSH 装了一个插件 [dsh-agent-teams](https://github.com/NanmiCoder/dsh-agent-teams)。配置好跑起来的时候，看着终端和界面里几个 subagent 同时被唤醒，各自认领任务并开始分工干活，那种感觉挺奇妙的，甚至有种甩手掌柜看着团队开工的轻松感。从实际效果来看，确实比我自己单轮单句和大模型来回对话要好不少。它把任务拆解、角色分工与执行验收做成了预设的工程流程，几个 agent 配合起来，很多原本容易在长上下文里漏掉的细节都能被兜住。

算下来，从这几年 AI 兴起开始，几乎每隔一段时间就会有新的热点和工具形态冒出来。我自己一路跟着折腾，从最开始纯粹的 CLI 命令行工具，到单体 Agent，再到 OpenClaw 和 Hermes，直到现在的 Harness 架构，能明显感觉到工具和框架的能力越来越扎实。前段时间 ChatGPT-6 发布，大家都在聊 AIGC 与具身智能，普通人和前沿技术的物理距离好像正在被迅速抹平，AI 介入现实工作的深度也远超最初的想象。

技术跑得这么快，跟着折腾就好。看着屏幕上一行行跳动的 agent 日志，自己也觉得挺有意思。遇到新东西就装上试试，好呀，保持学习。
