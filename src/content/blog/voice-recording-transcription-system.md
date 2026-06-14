---
title: "用 AI 构建录音转录管理系统：Obsidian + Whisper + OpenCode"
description: "如何用 Obsidian、Whisper 和 OpenCode 构建一个完整的录音转录、摘要、检索系统，实现语音到知识的自动化处理。"
pubDatetime: 2026-06-12T14:11:47+08:00
author: J2
tags: [AI, Whisper, Obsidian, 自动化, 录音转录]
featured: true
draft: false
---

## 为什么需要这个系统？

在日常工作中，我们经常需要处理各种录音：电话会议、客户沟通、语音备忘录。这些录音往往包含重要信息，但检索困难、整理繁琐。

我想要一个系统，能够：

1. **自动转录**：语音转文字，支持中文
2. **智能摘要**：AI 理解内容，生成结构化摘要
3. **便捷检索**：按联系人、时间、标签快速查找
4. **隐私安全**：全部本地处理，数据不上传

最终，我用三个工具搭建了这个系统：**Obsidian**（笔记管理）、**Whisper**（语音转文字）、**OpenCode**（AI 对话）。

---

## 系统架构

```
录音文件 → Whisper 转录 → AI 生成摘要 → Obsidian 归档 → 智能检索
```

![录音转录管理系统架构图](https://img.bins.blog/2026/06/uploads/system-architecture-cn-20260612_221846---358cfb93.png)

### 核心组件

| 组件           | 用途                      |
| -------------- | ------------------------- |
| Python 3.10+   | Whisper 运行环境          |
| OpenAI Whisper | 语音转文字（medium 模型） |
| FFmpeg         | 音频格式处理              |
| Obsidian       | 笔记管理和检索            |
| Dataview 插件  | 动态视图生成              |
| OpenCode       | AI 对话和摘要生成         |

---

## 工作流程

### 触发方式

在 OpenCode 对话中输入自然语言指令：

```
用户: "处理近期录音"
```

### 执行流程

1. **扫描目录**：扫描 `recordings/` 目录，计算 SHA256，对比缓存
2. **校验去重**：已处理文件跳过，新文件继续处理
3. **语音转录**：调用 Whisper 转录音频，输出转录文本
4. **AI 生成摘要**：AI 理解转录内容，生成结构化摘要
5. **写入文件**：保存原始转录和结构化摘要，更新缓存
6. **记录日志**：更新操作日志，记录处理结果
7. **返回结果**：告知用户处理完成

---

## 目录结构

```
bins_record/
├── AGENTS.md               # 规范（OpenCode 自动读取）
├── templates/              # 模板文件
│   ├── raw.md              # 原始转录模板
│   ├── summary.md          # 摘要模板
│   └── contact.md          # 联系人模板
├── recordings/             # 原录音文件
│   ├── phone/
│   ├── wechat/
│   ├── meeting/
│   └── others/
├── vault/                  # Obsidian vault
│   ├── raw/                # 原始转录
│   ├── summary/            # 关键摘要
│   ├── contacts/           # 联系人页面
│   └── dashboard.md        # 总览
├── models/                 # Whisper 模型
└── log.md                  # 操作日志
```

---

## 关键技术点

### 1. Whisper 语音转录

Whisper 是 OpenAI 开源的语音识别模型，支持多种语言，中文识别效果优秀。

```bash
# 安装
pip3 install openai-whisper

# 模型选择
# tiny: 39M，快速测试
# medium: 769M，推荐
# large: 1.5G，高要求
```

**注意事项**：

- Apple Silicon 不支持 MPS 加速，使用 CPU 模式
- medium 模型需要约 5GB 内存
- 首次运行会自动下载模型

### 2. AI 摘要生成

摘要必须由 AI 生成，不能用模板填充。

**正确流程**：

1. Whisper 转录音频
2. AI 读取转录内容
3. AI 理解内容并生成结构化摘要
4. 按模板格式写入文件

**摘要格式**：

```markdown
## 📌 一句话总结

[30字以内的总结]

## 🎯 主要议题

1. [议题一]
2. [议题二]

## 💡 关键信息

- [关键信息1]
- [关键信息2]

## 🏷️ 标签

#标签1 #标签2
```

### 3. 去重机制

使用 SHA256 哈希进行文件去重：

```json
{
  "recordings/phone/ZhangSan/call_20260610.mp3": {
    "sha256": "abc123...",
    "processed_at": "2026-06-10T15:30:00",
    "raw_file": "vault/raw/20260610_ZhangSan.md",
    "summary_file": "vault/summary/20260610_ZhangSan.md"
  }
}
```

### 4. 联系人匹配

系统通过多种方式匹配联系人：

1. 文件夹名称匹配联系人页面名
2. 文件名中包含手机号
3. 文件路径包含微信ID
4. 未匹配 → 归类为 "Others"

---

## 使用示例

### 场景1：处理近期录音

```
用户: "处理近期录音"

OpenCode:
扫描到 5 个录音文件
- 3 个已处理（跳过）
- 2 个新文件
处理这 2 个文件？

用户: "是"

OpenCode:
已完成：
- call_20260610.mp3 → raw/20260610_ZhangSan.md + summary/20260610_ZhangSan.md
- call_20260611.mp3 → raw/20260611_LiSi.md + summary/20260611_LiSi.md
```

### 场景2：检索录音

在 Obsidian 中使用 Dataview 查询：

```dataview
TABLE contact as "联系人", date as "时间", summary_text as "摘要"
FROM "summary"
WHERE contains(tags, "客户")
SORT date DESC
```

---

## 总结

这个系统实现了从录音到知识的自动化处理：

1. **自动化**：语音转文字、AI 摘要、智能归档
2. **可扩展**：通过 MCP 集成各种工具
3. **隐私安全**：全部本地处理，数据不上传
4. **易于使用**：自然语言指令，无需复杂操作

如果你也有录音处理的需求，不妨试试这个方案。

---

_本文由 AI 辅助生成，内容经过人工审核和修改。_
