/**
 * QuickAdd Script: 自动为 bins.blog 文章生成 Kami 规范 Frontmatter (安全无Key版)
 */
module.exports = async params => {
  const { app, quickAddApi } = params;

  // 1. 安全读取设备本地存储的 Key (不在代码中硬编码，防 Git 泄露)
  let apiKey = localStorage.getItem("BINS_BLOG_DEEPSEEK_KEY");
  if (!apiKey) {
    apiKey = await quickAddApi.inputPrompt(
      "首次使用配置",
      "请输入 DeepSeek API Key (仅保存在本设备沙箱中，绝不上传 Git):"
    );
    if (!apiKey || !apiKey.trim()) {
      new Notice("❌ 未提供 API Key，操作已取消。");
      return;
    }
    apiKey = apiKey.trim();
    localStorage.setItem("BINS_BLOG_DEEPSEEK_KEY", apiKey);
  }

  // 2. 32 个受控标签白名单
  const BLOG_TAGS = [
    "AI",
    "Agent",
    "Cloudflare",
    "Linux.do",
    "Obsidian",
    "OpenClaw",
    "安全",
    "博客",
    "出差",
    "读书",
    "公共领域",
    "工作流",
    "观察",
    "家庭",
    "健身",
    "教育",
    "科技",
    "历史",
    "旅行",
    "南渡北归",
    "生活",
    "生图",
    "社会",
    "赛里木湖",
    "思考",
    "随笔",
    "图床",
    "微信",
    "微信公众号",
    "新疆",
    "伊宁",
    "职场",
  ];

  // 3. 获取当前活跃笔记
  const activeFile = app.workspace.getActiveFile();
  if (!activeFile) {
    new Notice("❌ 请先打开一篇要处理的文章！");
    return;
  }

  const content = await app.vault.read(activeFile);
  if (!content.trim()) {
    new Notice("❌ 当前笔记内容为空！");
    return;
  }

  // 剥离已有的 Frontmatter，获取纯正文
  const bodyContent = content.replace(/^---\n[\s\S]*?\n---\n/, "").trim();

  new Notice("⏳ DeepSeek 正在分析正文并生成 Frontmatter...");

  // 4. 调用 DeepSeek API
  const prompt = `你是一个个人独立博客（bins.blog）的编辑助手。博客风格为随笔、生活思考、技术折腾，语言风格自然、克制、真实。
请阅读下面的博客正文草稿，为其提炼并输出以下字段（必须输出严格的 JSON格式）：
1. title: 文章标题（简练有韵味，不超过20字，不要浓重的公文腔或营销腔）
2. description: 一句话摘要（40~80字，概括核心生活切片或思考，不要套话）
3. tags: 从以下受控标签中挑选 1~3 个最相关的标签（严禁使用名单外的词！）：
[${BLOG_TAGS.join(", ")}]
4. slug: 纯小写英文 kebab-case 格式的文件名标识（如 rainy-day-coffee），2~5个词。

正文内容：
${bodyContent.slice(0, 3000)}

必须仅输出如下格式的纯 JSON，不要包含任何 markdown 围栏或额外文字：
{"title": "...", "description": "...", "tags": ["..."], "slug": "..."}`;

  try {
    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem("BINS_BLOG_DEEPSEEK_KEY"); // Key 无效时清除缓存
        throw new Error("API Key 无效或过期，已重置，请再次点击重新输入！");
      }
      throw new Error(`API 报错: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const result = JSON.parse(data.choices[0].message.content);

    // 5. 计算当前带时区的 ISO 北京时间 (YYYY-MM-DDTHH:mm:ss+08:00)
    const now = new Date();
    const tzOffset = 8 * 60; // UTC+8
    const localTime = new Date(
      now.getTime() + (tzOffset + now.getTimezoneOffset()) * 60000
    );
    const pad = n => String(n).padStart(2, "0");
    const pubDatetime = `${localTime.getFullYear()}-${pad(localTime.getMonth() + 1)}-${pad(localTime.getDate())}T${pad(localTime.getHours())}:${pad(localTime.getMinutes())}:${pad(localTime.getSeconds())}+08:00`;

    // 6. 拼装标准的 YAML Frontmatter
    const tagsYaml = result.tags.map(t => `  - ${t}`).join("\n");
    const newFrontmatter = `---
title: ${result.title}
description: ${result.description}
pubDatetime: ${pubDatetime}
author: J2
tags:
${tagsYaml}
featured: false
draft: false
---

`;

    // 7. 将 Frontmatter 写回文件顶部
    const updatedContent = newFrontmatter + bodyContent;
    await app.vault.modify(activeFile, updatedContent);

    // 8. 自动将笔记重命名为英文 Slug（若在根目录则自动归入 blog/ 文件夹）
    if (result.slug) {
      const parentPath = activeFile.parent ? activeFile.parent.path : "";
      const targetFolder =
        parentPath === "" || parentPath === "/" ? "blog" : parentPath;
      const targetPath = `${targetFolder}/${result.slug}.md`;

      if (targetPath !== activeFile.path) {
        await app.fileManager.renameFile(activeFile, targetPath);
      }
    }

    new Notice(
      `✅ 成功生成并重命名！\n标题：《${result.title}》\n文件：${result.slug}.md\n标签：${result.tags.join(" / ")}`,
      6000
    );
  } catch (err) {
    new Notice(`❌ ${err.message}`, 5000);
  }
};
