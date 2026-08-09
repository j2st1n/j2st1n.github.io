import { readFile, readdir, rm } from "node:fs/promises";
import { join, resolve } from "node:path";

const cacheDir = resolve(".cache/og-images");
const distDir = resolve("dist");

async function listFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(entry => {
      const path = join(directory, entry.name);
      return entry.isDirectory() ? listFiles(path) : path;
    })
  );

  return files.flat();
}

async function pruneOgImageCache() {
  const distFiles = await listFiles(distDir);
  const htmlFiles = distFiles.filter(path => path.endsWith(".html"));
  const htmlDocuments = await Promise.all(
    htmlFiles.map(path => readFile(path, "utf8"))
  );
  const activeVersions = new Set(
    htmlDocuments.flatMap(document =>
      Array.from(
        document.matchAll(/share-([a-f0-9]{12})\.png/g),
        match => match[1]
      )
    )
  );

  let cacheFiles;
  try {
    cacheFiles = await readdir(cacheDir);
  } catch (error) {
    if (error.code === "ENOENT") return;
    throw error;
  }

  const staleFiles = cacheFiles.filter(file => {
    const version = file.match(/^(?:post|site)-([a-f0-9]{12})\.png$/)?.[1];
    return !version || !activeVersions.has(version);
  });

  await Promise.all(staleFiles.map(file => rm(join(cacheDir, file))));
}

await pruneOgImageCache();
