/**
 * QuickAdd Script: 一键将当前文章通过 GitHub API 直发上线 (安全无Key版)
 */
module.exports = async params => {
  const { app, quickAddApi } = params;

  // 1. 安全读取设备本地存储的 GitHub Token (防 Git 泄露)
  let githubToken = localStorage.getItem("BINS_BLOG_GITHUB_TOKEN");
  if (!githubToken) {
    githubToken = await quickAddApi.inputPrompt(
      "首次使用配置",
      "请输入你的 GitHub Personal Access Token (ghp_...，仅保存在本设备沙箱中):"
    );
    if (!githubToken || !githubToken.trim()) {
      new Notice("❌ 未提供 GitHub Token，发布已取消。");
      return;
    }
    githubToken = githubToken.trim();
    localStorage.setItem("BINS_BLOG_GITHUB_TOKEN", githubToken);
  }

  // 2. 获取当前活跃笔记
  const activeFile = app.workspace.getActiveFile();
  if (!activeFile) {
    new Notice("❌ 请先打开一篇要发布的文章！");
    return;
  }

  const content = await app.vault.read(activeFile);
  if (!content.trim()) {
    new Notice("❌ 当前笔记内容为空，无法发布！");
    return;
  }

  // 检查是否有 frontmatter
  if (!content.startsWith("---")) {
    new Notice(
      "⚠️ 提示：当前文章未检测到 Frontmatter，建议先运行「AI生成博客元信息」！",
      5000
    );
  }

  const fileName = activeFile.name; // 如 my-first-post.md
  const repoOwner = "j2st1n";
  const repoName = "j2st1n.github.io";
  const filePath = `src/content/blog/${fileName}`;
  const apiUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${filePath}`;

  new Notice(`⏳ 正在将《${fileName}》直连发布到 GitHub...`);

  try {
    // 3. 查询 GitHub 远端是否已存在该文件 (获取 sha 用于更新覆盖)
    let sha = null;
    try {
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
      }
    } catch {
      // 忽略探测异常
    }

    // 4. 将内容进行 UTF-8 兼容的 Base64 编码
    const utf8Bytes = new TextEncoder().encode(content);
    let binary = "";
    for (let i = 0; i < utf8Bytes.byteLength; i++) {
      binary += String.fromCharCode(utf8Bytes[i]);
    }
    const base64Content = btoa(binary);

    // 5. 组装 PUT 请求体
    const bodyData = {
      message: sha
        ? `feat(blog): update post '${fileName}' via mobile direct publish`
        : `feat(blog): publish post '${fileName}' via mobile direct publish`,
      content: base64Content,
      branch: "main",
    };
    if (sha) {
      bodyData.sha = sha;
    }

    // 6. 发起 PUT 提交
    const putRes = await fetch(apiUrl, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${githubToken}`,
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: JSON.stringify(bodyData),
    });

    if (!putRes.ok) {
      if (putRes.status === 401) {
        localStorage.removeItem("BINS_BLOG_GITHUB_TOKEN");
        throw new Error(
          "GitHub Token 无效或过期，已重置，请再次点击重新输入！"
        );
      }
      const errJson = await putRes.json().catch(() => ({}));
      throw new Error(
        `GitHub API 报错 (${putRes.status}): ${errJson.message || putRes.statusText}`
      );
    }

    new Notice(
      `🎉 发布成功！\n文件：${fileName}\nGitHub Actions 正在自动构建，约 30 秒后全网生效！`,
      8000
    );
  } catch (err) {
    new Notice(`❌ 发布失败: ${err.message}`, 6000);
  }
};
