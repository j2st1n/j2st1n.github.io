import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const projectRoot = new URL("../", import.meta.url);

function createLocalStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: key => values.get(key) ?? null,
    removeItem: key => values.delete(key),
    setItem: (key, value) => values.set(key, String(value)),
  };
}

async function loadQuickAddScript(relativePath, globals = {}) {
  const source = await readFile(new URL(relativePath, projectRoot), "utf8");
  const notices = [];
  const context = vm.createContext({
    URL,
    module: { exports: {} },
    Notice: function Notice(message) {
      notices.push(String(message));
    },
    ...globals,
  });
  vm.runInContext(source, context, { filename: relativePath });
  return { execute: context.module.exports, notices };
}

function createAIResponse(result) {
  return {
    ok: true,
    json: async () => ({
      choices: [{ message: { content: JSON.stringify(result) } }],
    }),
  };
}

test("AI configuration runs only once on first use without an active file", async () => {
  const prompts = [];
  const promptValues = ["sk-test", "https://api.deepseek.com", "deepseek-chat"];
  const { execute } = await loadQuickAddScript(
    "src/content/_scripts/ai-frontmatter.js",
    { localStorage: createLocalStorage() }
  );

  await execute({
    app: { workspace: { getActiveFile: () => null } },
    quickAddApi: {
      inputPrompt: async title => {
        prompts.push(title);
        return promptValues[prompts.length - 1];
      },
    },
  });

  assert.deepEqual(prompts, [
    "配置 AI (1/3) - API Key",
    "配置 AI (2/3) - Base URL",
    "配置 AI (3/3) - 模型名称",
  ]);
});

test("AI formatting separates prose while preserving Markdown structures", async () => {
  const activeFile = {
    name: "draft.md",
    parent: { path: "blog" },
    path: "blog/draft.md",
  };
  const sourceBody = [
    "第一段",
    "第二段提到 @config 参数",
    "",
    "A | B",
    "--- | ---",
    "1 | 2",
    "",
    "~~~js",
    "const value = 1;",
    "console.log(value);",
    "~~~",
    "",
    "<div>",
    "alpha",
    "beta",
    "</div>",
  ].join("\n");
  let written = null;
  const renameCalls = [];
  const prompts = [];
  const { execute } = await loadQuickAddScript(
    "src/content/_scripts/ai-frontmatter.js",
    {
      fetch: async () =>
        createAIResponse({
          title: "标题: #1",
          description: "摘要: #号",
          tags: ["博客"],
          slug: "safe-table-post",
        }),
      localStorage: createLocalStorage({ BINS_BLOG_AI_KEY: "sk-test" }),
    }
  );

  await execute({
    app: {
      fileManager: {
        renameFile: async (file, path) => {
          renameCalls.push(path);
          file.path = path;
        },
      },
      vault: {
        getAbstractFileByPath: () => null,
        modify: async (_file, content) => {
          written = content;
        },
        read: async () => sourceBody,
      },
      workspace: { getActiveFile: () => activeFile },
    },
    quickAddApi: {
      inputPrompt: async title => {
        prompts.push(title);
        return "";
      },
    },
  });

  assert.equal(prompts.length, 0, "inline @config text must not open config");
  assert.deepEqual(renameCalls, ["blog/safe-table-post.md"]);
  assert.match(written, /title: "标题: #1"/);
  assert.match(written, /description: "摘要: #号"/);
  assert.match(written, /第一段\n\n第二段提到 @config 参数/);
  assert.match(written, /A \| B\n--- \| ---\n1 \| 2/);
  assert.match(written, /~~~js\nconst value = 1;\nconsole\.log\(value\);\n~~~/);
  assert.match(written, /<div>\nalpha\nbeta\n<\/div>/);
});

test("invalid AI metadata does not rename or overwrite the note", async () => {
  const activeFile = {
    name: "draft.md",
    parent: { path: "blog" },
    path: "blog/draft.md",
  };
  let modified = false;
  let renamed = false;
  const { execute, notices } = await loadQuickAddScript(
    "src/content/_scripts/ai-frontmatter.js",
    {
      fetch: async () =>
        createAIResponse({
          title: "测试",
          description: "测试摘要",
          tags: ["白名单外"],
          slug: "valid-slug",
        }),
      localStorage: createLocalStorage({ BINS_BLOG_AI_KEY: "sk-test" }),
    }
  );

  await execute({
    app: {
      fileManager: { renameFile: async () => (renamed = true) },
      vault: {
        getAbstractFileByPath: () => null,
        modify: async () => (modified = true),
        read: async () => "正文",
      },
      workspace: { getActiveFile: () => activeFile },
    },
    quickAddApi: {},
  });

  assert.equal(renamed, false);
  assert.equal(modified, false);
  assert.ok(notices.some(message => message.includes("白名单外标签")));
});

test("a failed write rolls the AI rename back", async () => {
  const activeFile = {
    name: "draft.md",
    parent: { path: "blog" },
    path: "blog/draft.md",
  };
  const renameCalls = [];
  const { execute, notices } = await loadQuickAddScript(
    "src/content/_scripts/ai-frontmatter.js",
    {
      fetch: async () =>
        createAIResponse({
          title: "测试",
          description: "测试摘要",
          tags: ["博客"],
          slug: "rollback-post",
        }),
      localStorage: createLocalStorage({ BINS_BLOG_AI_KEY: "sk-test" }),
    }
  );

  await execute({
    app: {
      fileManager: {
        renameFile: async (file, path) => {
          renameCalls.push(path);
          file.path = path;
        },
      },
      vault: {
        getAbstractFileByPath: () => null,
        modify: async () => {
          throw new Error("write failed");
        },
        read: async () => "正文",
      },
      workspace: { getActiveFile: () => activeFile },
    },
    quickAddApi: {},
  });

  assert.deepEqual(renameCalls, ["blog/rollback-post.md", "blog/draft.md"]);
  assert.ok(notices.some(message => message.includes("write failed")));
});

test("delete workflow rejects notes outside blog before any remote action", async () => {
  let fetched = false;
  let prompted = false;
  let trashed = false;
  const { execute, notices } = await loadQuickAddScript(
    "src/content/_scripts/delete-from-github.js",
    {
      fetch: async () => (fetched = true),
      localStorage: createLocalStorage(),
    }
  );

  await execute({
    app: {
      fileManager: { trashFile: async () => (trashed = true) },
      workspace: {
        getActiveFile: () => ({
          name: "private.md",
          path: "private/private.md",
        }),
      },
    },
    quickAddApi: {
      inputPrompt: async () => (prompted = true),
      yesNoPrompt: async () => (prompted = true),
    },
  });

  assert.equal(fetched, false);
  assert.equal(prompted, false);
  assert.equal(trashed, false);
  assert.ok(notices.some(message => message.includes("只能下架 blog/")));
});

test("delete workflow preserves and encodes a nested blog path", async () => {
  let requestedUrl = "";
  let trashedPath = "";
  const activeFile = {
    name: "草稿.md",
    path: "blog/旅行/草稿.md",
  };
  const { execute } = await loadQuickAddScript(
    "src/content/_scripts/delete-from-github.js",
    {
      fetch: async url => {
        requestedUrl = url;
        return { ok: false, status: 404 };
      },
      localStorage: createLocalStorage({
        BINS_BLOG_GITHUB_TOKEN: "github-token",
      }),
    }
  );

  await execute({
    app: {
      fileManager: {
        trashFile: async file => {
          trashedPath = file.path;
        },
      },
      workspace: { getActiveFile: () => activeFile },
    },
    quickAddApi: { yesNoPrompt: async () => true },
  });

  assert.match(
    requestedUrl,
    /src\/content\/blog\/%E6%97%85%E8%A1%8C\/%E8%8D%89%E7%A8%BF\.md$/
  );
  assert.equal(trashedPath, "blog/旅行/草稿.md");
});

test("QuoteShare declares idempotent lifecycle hooks for ClientRouter", async () => {
  const source = await readFile(
    new URL("public/scripts/quote-share.js", projectRoot),
    "utf8"
  );
  assert.match(source, /__binsQuoteShareState/);
  assert.match(source, /astro:page-load/);
  assert.match(source, /astro:before-swap/);
  assert.match(source, /new AbortController\(\)/);
  assert.match(source, /controller\.abort\(\)/);
  assert.match(source, /initializeCurrentQuoteShare\(\s*root,/);
});
