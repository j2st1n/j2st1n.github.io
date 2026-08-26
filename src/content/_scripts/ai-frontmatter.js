/**
 * QuickAdd Script: 自动为 bins.blog 文章生成 Kami 规范 Frontmatter 与标准段落排版 (安全无Key版)
 */

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

const BLOCK_HTML_TAGS = new Set([
  "address",
  "article",
  "aside",
  "blockquote",
  "details",
  "dialog",
  "div",
  "dl",
  "fieldset",
  "figcaption",
  "figure",
  "footer",
  "form",
  "header",
  "hgroup",
  "main",
  "nav",
  "ol",
  "pre",
  "script",
  "section",
  "style",
  "table",
  "ul",
]);

function getErrorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

function normalizeApiBase(value) {
  const normalized = value.trim().replace(/\/+$/, "");
  const url = new URL(normalized);
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("Base URL 只支持 http:// 或 https:// 地址");
  }
  return normalized;
}

function parseAIResponse(data) {
  const rawContent = data?.choices?.[0]?.message?.content;
  if (typeof rawContent !== "string" || !rawContent.trim()) {
    throw new Error("AI 返回中缺少可解析的消息内容");
  }

  const cleanJson = rawContent
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
  return JSON.parse(cleanJson);
}

function normalizeAIResult(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("AI 返回格式不正确：期望得到 JSON 对象");
  }

  const title = typeof value.title === "string" ? value.title.trim() : "";
  let description =
    typeof value.description === "string" ? value.description.trim() : "";
  const slug = typeof value.slug === "string" ? value.slug.trim() : "";
  const tags = Array.isArray(value.tags)
    ? [...new Set(value.tags.map(tag => String(tag).trim()).filter(Boolean))]
    : [];

  if (!title) throw new Error("AI 返回的 title 为空");
  if (!description) throw new Error("AI 返回的 description 为空");

  // 严格执行 Astro Schema 30~90 字符约束，超出时自动安全截断，防止 CI 报错
  if (description.length > 90) {
    description = description.slice(0, 88).replace(/[，、；,;。.]+$/, "") + "。";
  }
  if (description.length < 30) {
    throw new Error(`AI 返回的 description 过短（${description.length} 字），必须在 30~90 字符之间`);
  }

  if (tags.length < 1 || tags.length > 3) {
    throw new Error("AI 返回的 tags 必须包含 1～3 个标签");
  }

  const invalidTags = tags.filter(tag => !BLOG_TAGS.includes(tag));
  if (invalidTags.length > 0) {
    throw new Error(`AI 返回了白名单外标签：${invalidTags.join(" / ")}`);
  }

  if (!/^[a-z0-9]+(?:-[a-z0-9]+){1,4}$/.test(slug)) {
    throw new Error(
      "AI 返回的 slug 必须是由 2～5 个小写英文或数字组成的 kebab-case"
    );
  }

  return { title, description, tags, slug };
}

function markProtectedMarkdownLines(lines) {
  const protectedLines = lines.map(() => false);
  const tableDelimiter = /^\s*\|?\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)+\|?\s*$/;

  // 先整体标记表格，兼容有无首尾竖线的写法。
  for (let i = 0; i < lines.length; i++) {
    if (!tableDelimiter.test(lines[i])) continue;

    let start = i;
    if (i > 0 && lines[i - 1].includes("|") && lines[i - 1].trim()) {
      start = i - 1;
    }
    let end = i;
    while (
      end + 1 < lines.length &&
      lines[end + 1].trim() &&
      lines[end + 1].includes("|")
    ) {
      end += 1;
    }
    for (let lineIndex = start; lineIndex <= end; lineIndex++) {
      protectedLines[lineIndex] = true;
    }
  }

  let fence = null;
  let inMathBlock = false;
  let inHtmlComment = false;
  let htmlEndTag = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (inHtmlComment) {
      protectedLines[i] = true;
      if (trimmed.includes("-->")) inHtmlComment = false;
      continue;
    }

    if (htmlEndTag) {
      protectedLines[i] = true;
      if (new RegExp(`</${htmlEndTag}\\s*>`, "i").test(trimmed)) {
        htmlEndTag = null;
      }
      continue;
    }

    const fenceMatch = trimmed.match(/^(`{3,}|~{3,})/);
    if (fence) {
      protectedLines[i] = true;
      if (
        fenceMatch &&
        fenceMatch[1][0] === fence.character &&
        fenceMatch[1].length >= fence.length
      ) {
        fence = null;
      }
      continue;
    }
    if (fenceMatch) {
      protectedLines[i] = true;
      fence = {
        character: fenceMatch[1][0],
        length: fenceMatch[1].length,
      };
      continue;
    }

    if (trimmed === "$$") {
      protectedLines[i] = true;
      inMathBlock = !inMathBlock;
      continue;
    }
    if (inMathBlock) {
      protectedLines[i] = true;
      continue;
    }

    if (trimmed.startsWith("<!--")) {
      protectedLines[i] = true;
      inHtmlComment = !trimmed.includes("-->");
      continue;
    }

    const htmlStart = trimmed.match(/^<([a-z][\w-]*)(?:\s[^>]*)?>/i);
    if (htmlStart && BLOCK_HTML_TAGS.has(htmlStart[1].toLowerCase())) {
      protectedLines[i] = true;
      const tag = htmlStart[1].toLowerCase();
      if (!trimmed.includes(`</${tag}>`) && !trimmed.endsWith("/>")) {
        htmlEndTag = tag;
      }
      continue;
    }

    const isStructuralLine =
      trimmed === "" ||
      /^(?:#{1,6})(?:\s|$)/.test(trimmed) ||
      /^(?:[-+*]|\d+[.)])\s+/.test(trimmed) ||
      /^>/.test(trimmed) ||
      /^(?:[-*_]\s*){3,}$/.test(trimmed) ||
      /^\[[^\]]+\]:/.test(trimmed) ||
      /^\[\^[^\]]+\]:/.test(trimmed) ||
      /^!\[[^\]]*\]\([^)]*\)\s*$/.test(trimmed) ||
      /^<\/?[a-z!][^>]*>/i.test(trimmed) ||
      /^:::+/.test(trimmed) ||
      /^(?: {4}|\t)/.test(line);

    if (isStructuralLine) protectedLines[i] = true;

    // Setext 标题的文字行与下划线必须保持相邻。
    if (/^(?:=+|-+)\s*$/.test(trimmed) && i > 0) {
      protectedLines[i] = true;
      protectedLines[i - 1] = true;
    }
  }

  return protectedLines;
}

function formatMarkdownParagraphs(text) {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const protectedLines = markProtectedMarkdownLines(lines);
  const formatted = [];

  for (let i = 0; i < lines.length; i++) {
    formatted.push(lines[i]);
    if (i === lines.length - 1) continue;

    const currentIsProse = lines[i].trim() && !protectedLines[i];
    const nextIsProse = lines[i + 1].trim() && !protectedLines[i + 1];
    if (currentIsProse && nextIsProse) formatted.push("");
  }

  return formatted.join("\n");
}

function yamlString(value) {
  return JSON.stringify(String(value));
}

module.exports = async params => {
  const { app, quickAddApi } = params;

  let apiKey =
    localStorage.getItem("BINS_BLOG_AI_KEY") ||
    localStorage.getItem("BINS_BLOG_DEEPSEEK_KEY");
  let apiBase =
    localStorage.getItem("BINS_BLOG_AI_BASE") || "https://api.deepseek.com";
  let apiModel = localStorage.getItem("BINS_BLOG_AI_MODEL") || "deepseek-chat";

  async function promptConfigGuide() {
    const maskedKey = apiKey
      ? apiKey.length <= 8
        ? `***${apiKey.slice(-4)}`
        : `${apiKey.slice(0, 4)}...${apiKey.slice(-4)}`
      : "未设置";

    const inputKey = await quickAddApi.inputPrompt(
      "配置 AI (1/3) - API Key",
      `当前 Key: ${maskedKey}\n请输入 API Key (留空保持当前设置):`,
      ""
    );
    if (inputKey && inputKey.trim()) {
      apiKey = inputKey.trim();
      localStorage.setItem("BINS_BLOG_AI_KEY", apiKey);
      localStorage.setItem("BINS_BLOG_DEEPSEEK_KEY", apiKey);
    } else if (!apiKey) {
      new Notice("❌ 未设置 API Key，操作已取消。");
      return false;
    }

    const inputBase = await quickAddApi.inputPrompt(
      "配置 AI (2/3) - Base URL",
      "请输入 OpenAI 兼容端点 (如 https://api.deepseek.com 或 https://api.openai.com/v1):",
      apiBase
    );
    if (inputBase && inputBase.trim()) {
      try {
        apiBase = normalizeApiBase(inputBase);
      } catch (error) {
        new Notice(`❌ ${getErrorMessage(error)}`);
        return false;
      }
      localStorage.setItem("BINS_BLOG_AI_BASE", apiBase);
    }

    const inputModel = await quickAddApi.inputPrompt(
      "配置 AI (3/3) - 模型名称",
      "请输入 OpenAI 兼容接口使用的模型名 (如 deepseek-chat、gpt-4o-mini):",
      apiModel
    );
    if (inputModel && inputModel.trim()) {
      apiModel = inputModel.trim();
      localStorage.setItem("BINS_BLOG_AI_MODEL", apiModel);
    }

    new Notice(`✅ AI 配置已更新！\n端点: ${apiBase}\n模型: ${apiModel}`, 5000);
    return true;
  }

  let configuredThisRun = false;
  if (!apiKey) {
    const ok = await promptConfigGuide();
    if (!ok) return;
    configuredThisRun = true;
  }

  const activeFile = app.workspace.getActiveFile();
  if (!activeFile) {
    if (!configuredThisRun) await promptConfigGuide();
    return;
  }

  let content = await app.vault.read(activeFile);
  if (!content.trim()) {
    new Notice("❌ 当前笔记内容为空！");
    return;
  }

  const hasConfigDirective = /^[\t ]*@config[\t ]*$/m.test(content);
  if (hasConfigDirective) {
    if (!configuredThisRun) {
      const ok = await promptConfigGuide();
      if (!ok) return;
    }
    content = content.replace(/^[\t ]*@config[\t ]*(?:\r?\n|$)/gm, "");
  }

  const bodyContent = content
    .replace(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/, "")
    .trim();
  if (!bodyContent) {
    new Notice("❌ 当前笔记没有可处理的正文！");
    return;
  }

  new Notice(`⏳ [${apiModel}] 正在分析正文并提炼元数据...`);

  const prompt = `你是一个个人独立博客（bins.blog）的编辑助手。博客风格为随笔、生活思考、技术折腾，语言风格自然、克制、真实。
请阅读下面的博客正文草稿，为其提炼并输出以下字段（必须输出严格的 JSON格式）：
1. title: 文章标题（简练有韵味，不超过20字，不要浓重的公文腔或营销腔）
2. description: 一句话摘要（严格控制在 35~75 字之间，绝对不能超过 90 个字符，概括核心生活切片或思考，不要套话）
3. tags: 从以下受控标签中挑选 1~3 个最相关的标签（严禁使用名单外的词！）：
[${BLOG_TAGS.join(", ")}]
4. slug: 纯小写英文 kebab-case 格式的文件名标识（如 rainy-day-coffee），2~5个词。

正文内容：
${bodyContent.slice(0, 3000)}

必须仅输出如下格式的纯 JSON，不要包含任何 markdown 围栏或额外文字：
{"title": "...", "description": "...", "tags": ["..."], "slug": "..."}`;

  async function callAI() {
    const endpoint = `${apiBase.replace(/\/+$/, "")}/chat/completions`;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: apiModel,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      throw new Error(
        `API 报错: HTTP ${response.status} ${response.statusText}`
      );
    }
    return parseAIResponse(await response.json());
  }

  let rawResult;
  try {
    rawResult = await callAI();
  } catch (error) {
    const shouldReconfig = await quickAddApi.yesNoPrompt(
      "❌ AI 调用失败",
      `错误详情: ${getErrorMessage(error)}\n\n是否立即重新配置 API Key、端点或模型名？`
    );
    if (shouldReconfig) {
      const ok = await promptConfigGuide();
      if (ok) new Notice("🔄 配置已更新，请再次运行命令以提取元数据！");
    }
    return;
  }

  let renamed = false;
  const originalPath = activeFile.path;
  try {
    const result = normalizeAIResult(rawResult);
    const now = new Date();
    const tzOffset = 8 * 60;
    const localTime = new Date(
      now.getTime() + (tzOffset + now.getTimezoneOffset()) * 60000
    );
    const pad = number => String(number).padStart(2, "0");
    const pubDatetime = `${localTime.getFullYear()}-${pad(localTime.getMonth() + 1)}-${pad(localTime.getDate())}T${pad(localTime.getHours())}:${pad(localTime.getMinutes())}:${pad(localTime.getSeconds())}+08:00`;

    const tagsYaml = result.tags
      .map(tag => `  - ${yamlString(tag)}`)
      .join("\n");
    const newFrontmatter = `---\ntitle: ${yamlString(result.title)}\ndescription: ${yamlString(result.description)}\npubDatetime: ${pubDatetime}\ntags:\n${tagsYaml}\nfeatured: false\ndraft: false\n---\n\n`;
    const updatedContent =
      newFrontmatter + formatMarkdownParagraphs(bodyContent);

    const parentPath = activeFile.parent ? activeFile.parent.path : "";
    const targetFolder =
      parentPath === "" || parentPath === "/" ? "blog" : parentPath;
    const targetPath = `${targetFolder}/${result.slug}.md`;
    const existingTarget = app.vault.getAbstractFileByPath?.(targetPath);
    if (existingTarget && existingTarget !== activeFile) {
      throw new Error(`目标文件已存在：${targetPath}`);
    }

    if (targetPath !== originalPath) {
      await app.fileManager.renameFile(activeFile, targetPath);
      renamed = true;
    }
    await app.vault.modify(activeFile, updatedContent);

    new Notice(
      `✅ 成功生成元信息并规范排版！\n标题：《${result.title}》\n文件：${result.slug}.md\n标签：${result.tags.join(" / ")}`,
      6000
    );
  } catch (error) {
    let rollbackMessage = "";
    if (renamed) {
      try {
        await app.fileManager.renameFile(activeFile, originalPath);
      } catch (rollbackError) {
        rollbackMessage = `\n文件名回滚失败：${getErrorMessage(rollbackError)}`;
      }
    }
    new Notice(
      `❌ 元信息处理失败：${getErrorMessage(error)}${rollbackMessage}`,
      7000
    );
  }
};
