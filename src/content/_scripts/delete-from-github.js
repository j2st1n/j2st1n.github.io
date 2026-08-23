/**
 * QuickAdd Script: 从 GitHub 远程下架并删除当前文章 (安全无Key版)
 */
module.exports = async params => {
  const { app, quickAddApi } = params;

  // 1. 先锁定删除范围，只允许当前 Vault 中 blog/ 下的 Markdown 文章。
  const activeFile = app.workspace.getActiveFile();
  if (!activeFile) {
    new Notice("❌ 请先打开一篇要下架删除的文章！");
    return;
  }

  const normalizedPath = activeFile.path.replace(/^\/+/, "");
  const blogPathMatch = normalizedPath.match(
    /^(?:src\/content\/)?blog\/(.+\.md)$/i
  );
  if (!blogPathMatch) {
    new Notice("❌ 为防止误删，只能下架 blog/ 目录中的 Markdown 文章！", 6000);
    return;
  }

  const relativeBlogPath = blogPathMatch[1];
  const pathSegments = relativeBlogPath.split("/");
  if (
    pathSegments.some(
      segment => !segment || segment === "." || segment === ".."
    )
  ) {
    new Notice("❌ 文章路径不合法，操作已取消。", 6000);
    return;
  }

  const fileName = activeFile.name;
  const repoOwner = "j2st1n";
  const repoName = "j2st1n.github.io";
  const filePath = `src/content/blog/${relativeBlogPath}`;
  const encodedFilePath = filePath
    .split("/")
    .map(segment => encodeURIComponent(segment))
    .join("/");
  const apiUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${encodedFilePath}`;

  // 2. 安全读取设备本地存储的 GitHub Token (防 Git 泄露)
  let githubToken = localStorage.getItem("BINS_BLOG_GITHUB_TOKEN");
  if (!githubToken) {
    githubToken = await quickAddApi.inputPrompt(
      "首次使用配置",
      "请输入你的 GitHub Personal Access Token (ghp_...，仅保存在本设备沙箱中):"
    );
    if (!githubToken || !githubToken.trim()) {
      new Notice("❌ 未提供 GitHub Token，操作已取消。");
      return;
    }
    githubToken = githubToken.trim();
    localStorage.setItem("BINS_BLOG_GITHUB_TOKEN", githubToken);
  }

  // 3. 安全二次确认弹窗
  const confirmed = await quickAddApi.yesNoPrompt(
    "⚠️ 危险操作确认",
    `确定要从 GitHub 远程全网下架并删除《${relativeBlogPath}》吗？\n（此操作将同时把本地笔记移入废纸篓）`
  );
  if (!confirmed) {
    new Notice("已取消下架操作。");
    return;
  }

  new Notice(`⏳ 正在查询《${relativeBlogPath}》在 GitHub 上的状态...`);

  try {
    // 4. 查询 GitHub 远端该文件的 SHA
    let sha = null;
    const getRes = await fetch(apiUrl, {
      method: "GET",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${githubToken}`,
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });

    if (getRes.ok) {
      const fileInfo = await getRes.json();
      sha = fileInfo.sha;
    } else if (getRes.status === 404) {
      new Notice(`ℹ️ 该文章在 GitHub 远端不存在，直接删除本地文件...`, 4000);
    } else if (getRes.status === 401) {
      localStorage.removeItem("BINS_BLOG_GITHUB_TOKEN");
      throw new Error("GitHub Token 无效或过期，已重置，请重试！");
    } else {
      const errJson = await getRes.json().catch(() => ({}));
      throw new Error(
        `查询远端失败 (${getRes.status}): ${errJson.message || getRes.statusText}`
      );
    }

    // 5. 如果远端存在，调用 DELETE API 远程删除
    if (sha) {
      new Notice(`⏳ 正在向 GitHub 发送删除请求...`);
      const deleteRes = await fetch(apiUrl, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${githubToken}`,
          "X-GitHub-Api-Version": "2022-11-28",
        },
        body: JSON.stringify({
          message: `feat(blog): delete post '${fileName}' via mobile direct unpublish`,
          sha: sha,
          branch: "main",
        }),
      });

      if (!deleteRes.ok) {
        const errJson = await deleteRes.json().catch(() => ({}));
        throw new Error(
          `远程删除失败 (${deleteRes.status}): ${errJson.message || deleteRes.statusText}`
        );
      }
    }

    // 6. 将本地笔记安全移入 Obsidian 系统废纸篓
    await app.fileManager.trashFile(activeFile);

    new Notice(
      `🗑️ 下架删除成功！\n文章《${fileName}》已从 GitHub 移除并在本地移入废纸篓。\nGitHub Actions 正在重新构建全网下架！`,
      8000
    );
  } catch (err) {
    new Notice(`❌ 下架失败: ${err.message}`, 6000);
  }
};
