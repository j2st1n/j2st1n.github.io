/**
 * QuickAdd Script: 重置或修改 bins.blog 的 AI 接口配置 (API Key / Base URL)
 */
module.exports = async params => {
  const { quickAddApi } = params;

  const currentKey = localStorage.getItem("BINS_BLOG_DEEPSEEK_KEY") || "";
  const currentBase =
    localStorage.getItem("BINS_BLOG_AI_BASE_URL") || "https://api.deepseek.com";

  // 1. 输入新的 API Key
  const maskedKey = currentKey
    ? `${currentKey.slice(0, 4)}...${currentKey.slice(-4)}`
    : "未设置";
  const newKey = await quickAddApi.inputPrompt(
    "配置 AI API Key",
    `当前 Key: ${maskedKey}\n请输入新的 API Key (留空保持不变):`,
    ""
  );

  if (newKey && newKey.trim()) {
    localStorage.setItem("BINS_BLOG_DEEPSEEK_KEY", newKey.trim());
  }

  // 2. 输入新的 Base URL
  const newBase = await quickAddApi.inputPrompt(
    "配置 AI API 端点 (Base URL)",
    "支持官方或中转地址 (如 https://api.deepseek.com 或 https://api.openai.com/v1):",
    currentBase
  );

  if (newBase && newBase.trim()) {
    const cleanBase = newBase.trim().replace(/\/+$/, "");
    localStorage.setItem("BINS_BLOG_AI_BASE_URL", cleanBase);
  }

  new Notice(
    `✅ AI 配置已更新！\n端点: ${localStorage.getItem("BINS_BLOG_AI_BASE_URL") || currentBase}`,
    5000
  );
};
