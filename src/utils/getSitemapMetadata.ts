import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SITE } from "../config";
import { slugifyStr } from "./slugify";

const blogDirectory = fileURLToPath(
  new URL("../content/blog/", import.meta.url)
);

type SitemapMetadata = {
  lastmodByUrl: Map<string, Date>;
  latestUpdate?: Date;
};

function stripYamlScalar(value: string) {
  const trimmed = value.trim();
  const first = trimmed.at(0);
  const last = trimmed.at(-1);

  if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
}

function getScalar(frontmatter: string, key: string) {
  const match = frontmatter.match(new RegExp(`^${key}:\\s*(.+)$`, "m"));
  return match ? stripYamlScalar(match[1]) : undefined;
}

function getTags(frontmatter: string) {
  const inlineTags = frontmatter.match(/^tags:\s*\[([^\]]*)\]\s*$/m);
  if (inlineTags) {
    return inlineTags[1].split(",").map(stripYamlScalar).filter(Boolean);
  }

  const tagBlock = frontmatter.match(/^tags:\s*\n((?:\s+-\s+.*(?:\n|$))*)/m);

  return [...(tagBlock?.[1] ?? "").matchAll(/^\s+-\s+(.+)$/gm)]
    .map(match => stripYamlScalar(match[1]))
    .filter(Boolean);
}

function parseDate(value: string | undefined) {
  if (!value) return undefined;

  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? undefined : date;
}

async function getMarkdownFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(entry => {
      const entryPath = path.join(directory, entry.name);
      return entry.isDirectory()
        ? getMarkdownFiles(entryPath)
        : Promise.resolve(entryPath.endsWith(".md") ? [entryPath] : []);
    })
  );

  return files.flat();
}

function setNewestDate(map: Map<string, Date>, url: string, date: Date) {
  const current = map.get(url);
  if (!current || date > current) map.set(url, date);
}

export async function getSitemapMetadata(): Promise<SitemapMetadata> {
  const lastmodByUrl = new Map<string, Date>();
  const tagLastmod = new Map<string, Date>();
  let latestUpdate: Date | undefined;

  for (const file of await getMarkdownFiles(blogDirectory)) {
    const source = await readFile(file, "utf8");
    const frontmatter = source.match(/^---\s*\n([\s\S]*?)\n---/)?.[1];
    if (!frontmatter || getScalar(frontmatter, "draft") === "true") continue;

    const published = parseDate(getScalar(frontmatter, "pubDatetime"));
    if (!published || published > new Date()) continue;

    const lastmod =
      parseDate(getScalar(frontmatter, "modDatetime")) ?? published;
    const relativePath = path
      .relative(blogDirectory, file)
      .replace(/\.md$/i, "");
    const postPath = relativePath
      .split(path.sep)
      .map(segment => slugifyStr(segment))
      .join("/");
    const postURL = new URL(`/posts/${postPath}/`, SITE.website).href;

    lastmodByUrl.set(postURL, lastmod);
    if (!latestUpdate || lastmod > latestUpdate) latestUpdate = lastmod;

    for (const tag of getTags(frontmatter)) {
      const tagURL = new URL(`/tags/${slugifyStr(tag)}/`, SITE.website).href;
      setNewestDate(tagLastmod, tagURL, lastmod);
    }
  }

  if (latestUpdate) {
    for (const page of ["/", "/archives/", "/posts/", "/tags/"]) {
      lastmodByUrl.set(new URL(page, SITE.website).href, latestUpdate);
    }
  }

  for (const [url, lastmod] of tagLastmod) {
    lastmodByUrl.set(url, lastmod);
  }

  return { lastmodByUrl, latestUpdate };
}
