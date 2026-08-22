/**
 * QuickAdd Script: 自动为 bins.blog 文章生成 Kami 规范 Frontmatter 与标准段落排版 (安全无Key版)
 */
module.exports = async params => {
  const { app, quickAddApi } = params;

  // 1. 本地存储三要素 (API Key / Base URL / Model)
  let apiKey =
    localStorage.getItem("BINS_BLOG_AI_KEY") ||
    localStorage.getItem("BINS_BLOG_DEEPSEEK_KEY");
  let apiBase =
    localStorage.getItem("BINS_BLOG_AI_BASE") || "https://api.deepseek.com";
  let apiModel = localStorage.getItem("BINS_BLOG_AI_MODEL") || "deepseek-chat";

  // 配置向导函数
  async function promptConfigGuide() {
    const maskedKey = apiKey
      ? `${apiKey.slice(0, 4)}...${apiKey.slice(-4)}`
      : "未设置";

    // 1. API Key
    const inputKey = await quickAddApi.inputPrompt(
      "配置 AI (1/3) - API Key",
      `当前 Key: ${maskedKey}\n请输入 API Key (留空保持当前设置):`,
      ""
    );
    if (inputKey && inputKey.trim()) {
      apiKey = inputKey.trim();
      localStorage.setItem("BINS_BLOG_AI_KEY", apiKey);
      localStorage.setItem("BINS_BLOG_DEEPSEEK_KEY", apiKey); // 向下兼容
    } else if (!apiKey) {
      new Notice("❌ 未设置 API Key，操作已取消。");
      return false;
    }

    // 2. Base URL
    const inputBase = await quickAddApi.inputPrompt(
      "配置 AI (2/3) - Base URL",
      "支持官方或中转端点 (如 https://api.deepseek.com 或 https://api.openai.com/v1):",
      apiBase
    );
    if (inputBase && inputBase.trim()) {
      apiBase = inputBase.trim().replace(/\/+$/, "");
      localStorage.setItem("BINS_BLOG_AI_BASE", apiBase);
    }

    // 3. Model Name
    const inputModel = await quickAddApi.inputPrompt(
      "配置 AI (3/3) - 模型名称",
      "请输入调用的模型名 (如 deepseek-chat, gpt-4o-mini, claude-3-5-sonnet 等):",
      apiModel
    );
    if (inputModel && inputModel.trim()) {
      apiModel = inputModel.trim();
      localStorage.setItem("BINS_BLOG_AI_MODEL", apiModel);
    }

    new Notice(`✅ AI 配置已更新！\n端点: ${apiBase}\n模型: ${apiModel}`, 5000);
    return true;
  }

  // 首次使用引导
  if (!apiKey) {
    const ok = await promptConfigGuide();
    if (!ok) return;
  }

  // 2. 获取当前活跃笔记
  const activeFile = app.workspace.getActiveFile();
  if (!activeFile) {
    // 若未打开笔记时点击，作为纯配置入口触发
    await promptConfigGuide();
    return;
  }

  let content = await app.vault.read(activeFile);
  if (!content.trim()) {
    new Notice("❌ 当前笔记内容为空！");
    return;
  }

  // 3. 检查正文中是否含有显式配置标记 @config
  if (content.includes("@config")) {
    const ok = await promptConfigGuide();
    if (!ok) return;
    // 配置完成后自动清除 @config 标记并写回
    content = content.replace(/@config\s*/g, "");
    await app.vault.modify(activeFile, content);
    if (!content.trim()) return;
  }

  // 4. 32 个受控标签白名单
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

  // 剥离已有的 Frontmatter，获取纯正文
  const bodyContent = content.replace(/^---\n[\s\S]*?\n---\n/, "").trim();

  new Notice(`⏳ [${apiModel}] 正在分析正文并提炼元数据...`);

  // 5. 组装 Prompt
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

  const endpoint = `${apiBase.replace(/\/+$/, "")}/chat/completions`;

  // 6. 调用 AI API (带失败自愈引导)
  async function callAI() {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: apiModel,
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      throw new Error(
        `API 报错: HTTP ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();
    try {
      return JSON.parse(data.choices[0].message.content);
    } catch {
      const cleanJson = data.choices[0].message.content
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();
      return JSON.parse(cleanJson);
    }
  }

  let result;
  try {
    result = await callAI();
  } catch (err) {
    // 报错容错向导
    const shouldReconfig = await quickAddApi.yesNoPrompt(
      "❌ AI 调用失败",
      `错误详情: ${err.message}\n\n是否立即重新配置 API Key、端点或模型名？`
    );
    if (shouldReconfig) {
      const ok = await promptConfigGuide();
      if (ok) {
        new Notice("🔄 配置已更新，请再次运行命令以提取元数据！");
      }
    }
    return;
  }

  // 7. 计算当前带时区的 ISO 北京时间 (YYYY-MM-DDTHH:mm:ss+08:00)
  const now = new Date();
  const tzOffset = 8 * 60; // UTC+8
  const localTime = new Date(
    now.getTime() + (tzOffset + now.getTimezoneOffset()) * 60000
  );
  const pad = n => String(n).padStart(2, "0");
  const pubDatetime = `${localTime.getFullYear()}-${pad(localTime.getMonth() + 1)}-${pad(localTime.getDate())}T${pad(localTime.getHours())}:${pad(localTime.getMinutes())}:${pad(localTime.getSeconds())}+08:00`;

  // 8. 拼装标准的 YAML Frontmatter
  const tagsYaml = result.tags.map(t => `  - ${t}`).join("\n");
  const newFrontmatter = `---\ntitle: ${result.title}\ndescription: ${result.description}\npubDatetime: ${pubDatetime}\nauthor: J2\ntags:\n${tagsYaml}\nfeatured: false\ndraft: false\n---\n\n`;

  // 9. 智能规范化正文段落排版 (为手打单次回车段落自动补全标准 Markdown 空行，智能保护代码块/列表)
  function formatMarkdownParagraphs(text) {
    const lines = text.split("\n");
    const formatted = [];
    let inCodeBlock = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // 代码块识别
      if (trimmed.startsWith("```")) {
        inCodeBlock = !inCodeBlock;
        formatted.push(line);
        continue;
      }

      // 代码块内部保持原样
      if (inCodeBlock) {
        formatted.push(line);
        continue;
      }

      // 遇到已有空行保持
      if (trimmed === "") {
        formatted.push("");
        continue;
      }

      formatted.push(line);

      // 如果下一行不是空行，也不是代码块、列表、引用或标题，自动插入空行实现标准 Astro/Markdown 段落分段
      if (i < lines.length - 1) {
        const nextLine = lines[i + 1];
        const nextTrimmed = nextLine.trim();

        const isCurrentBlock =
          trimmed.startsWith("- ") ||
          trimmed.startsWith("* ") ||
          trimmed.startsWith("> ") ||
          trimmed.startsWith("#") ||
          /^\d+\.\s/.test(trimmed);

        const isNextBlock =
          nextTrimmed.startsWith("- ") ||
          nextTrimmed.startsWith("* ") ||
          nextTrimmed.startsWith("> ") ||
          nextTrimmed.startsWith("#") ||
          nextTrimmed.startsWith("```") ||
          /^\d+\.\s/.test(nextTrimmed);

        if (
          nextTrimmed !== "" &&
          !inCodeBlock &&
          !isCurrentBlock &&
          !isNextBlock
        ) {
          formatted.push("");
        }
      }
    }

    return formatted.join("\n");
  }

  const formattedBody = formatMarkdownParagraphs(bodyContent);

  // 10. 写回文件
  const updatedContent = newFrontmatter + formattedBody;
  await app.vault.modify(activeFile, updatedContent);

  // 11. 自动重命名为英文 Slug
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
    `✅ 成功生成元信息并规范排版！\n标题：《${result.title}》\n文件：${result.slug}.md\n标签：${result.tags.join(" / ")}`,
    6000
  );
};
