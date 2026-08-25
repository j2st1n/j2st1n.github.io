import { existsSync } from "node:fs";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const projectRoot = new URL("../", import.meta.url);
const distDirectory = path.join(projectRoot.pathname, "dist");

async function getFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(entry => {
      const entryPath = path.join(directory, entry.name);
      return entry.isDirectory()
        ? getFiles(entryPath)
        : Promise.resolve([entryPath]);
    })
  );
  return files.flat();
}

function decodeHtml(value) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replace(/&#(\d+);/g, (_, codePoint) =>
      String.fromCodePoint(Number(codePoint))
    );
}

function textContent(value) {
  return decodeHtml(value.replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function getAttribute(html, pattern, label, file) {
  const value = html.match(pattern)?.[1];
  if (!value) throw new Error(`${file} 缺少 ${label}`);
  return decodeHtml(value);
}

const htmlFiles = (await getFiles(distDirectory)).filter(file =>
  file.endsWith(".html")
);
const titles = new Map();
const canonicals = new Map();
const redirectingLinks = new Map();
const emptyAltPages = [];
let articleCount = 0;

for (const file of htmlFiles) {
  const html = await readFile(file, "utf8");
  const relativeFile = path.relative(distDirectory, file);
  const title = getAttribute(
    html,
    /<title>([^<]+)<\/title>/i,
    "title",
    relativeFile
  );
  const canonical = getAttribute(
    html,
    /<link rel="canonical" href="([^"]+)"/i,
    "canonical",
    relativeFile
  );

  getAttribute(
    html,
    /<meta name="description" content="([^"]+)"/i,
    "description",
    relativeFile
  );

  const h1Matches = [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)];
  if (h1Matches.length !== 1) {
    throw new Error(`${relativeFile} 应有且仅有一个 H1`);
  }

  const existingTitle = titles.get(title);
  if (existingTitle) {
    throw new Error(
      `重复 title：${title}（${existingTitle}、${relativeFile}）`
    );
  }
  titles.set(title, relativeFile);

  const existingCanonical = canonicals.get(canonical);
  if (existingCanonical) {
    throw new Error(
      `重复 canonical：${canonical}（${existingCanonical}、${relativeFile}）`
    );
  }
  canonicals.set(canonical, relativeFile);

  if (/<img\b[^>]*\balt=""/i.test(html)) emptyAltPages.push(relativeFile);

  for (const [, href] of html.matchAll(/<a\b[^>]*href="([^"]+)"/gi)) {
    if (
      !href.startsWith("/") ||
      href.startsWith("//") ||
      href.endsWith("/") ||
      href.includes("#") ||
      href.includes("?") ||
      /\.[a-z0-9]+$/i.test(href)
    ) {
      continue;
    }

    if (existsSync(path.join(distDirectory, href, "index.html"))) {
      const pages = redirectingLinks.get(href) ?? new Set();
      pages.add(relativeFile);
      redirectingLinks.set(href, pages);
    }
  }

  if (/<meta property="og:type" content="article"/i.test(html)) {
    articleCount += 1;
    const jsonLdSource = html.match(
      /<script type="application\/ld\+json">([\s\S]*?)<\/script>/i
    )?.[1];
    if (!jsonLdSource) throw new Error(`${relativeFile} 缺少文章 JSON-LD`);

    const jsonLd = JSON.parse(decodeHtml(jsonLdSource));
    const headline = textContent(h1Matches[0][1]);
    if (jsonLd.headline !== headline) {
      throw new Error(
        `${relativeFile} 的 JSON-LD headline 与 H1 不一致：${jsonLd.headline}`
      );
    }
    if (!jsonLd.publisher?.name || !jsonLd.publisher?.logo?.url) {
      throw new Error(`${relativeFile} 的 JSON-LD 缺少 publisher 信息`);
    }
  }
}

if (emptyAltPages.length > 0) {
  throw new Error(`以下页面存在空图片说明：${emptyAltPages.join("、")}`);
}

if (redirectingLinks.size > 0) {
  const details = [...redirectingLinks]
    .map(([href, pages]) => `${href}（${pages.size} 个页面）`)
    .join("、");
  throw new Error(`站内链接未直接指向 canonical：${details}`);
}

const sitemap = await readFile(
  path.join(distDirectory, "sitemap-0.xml"),
  "utf8"
);
const sitemapURLs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(
  match => match[1]
);
const sitemapDates = [...sitemap.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)].map(
  match => match[1]
);

if (sitemapURLs.length !== sitemapDates.length) {
  throw new Error(
    `sitemap 的 URL 与 lastmod 数量不一致：${sitemapURLs.length}/${sitemapDates.length}`
  );
}

for (const date of sitemapDates) {
  if (Number.isNaN(Date.parse(date))) {
    throw new Error(`sitemap 包含无效 lastmod：${date}`);
  }
}

process.stdout.write(
  `SEO build check passed: ${htmlFiles.length} pages, ${articleCount} articles, ${sitemapURLs.length} sitemap URLs\n`
);
