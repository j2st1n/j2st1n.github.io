import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import type { CollectionEntry } from "astro:content";
import {
  generateOgImageForPost,
  generateOgImageForSite,
} from "./generateOgImages";
import { getOgImageVersion, getPostOgImageVersion } from "./getOgImageVersion";

const CACHE_DIR = resolve(".cache/og-images");
const PNG_SIGNATURE = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]);

function isPng(buffer: Uint8Array): boolean {
  return (
    buffer.byteLength >= PNG_SIGNATURE.byteLength &&
    PNG_SIGNATURE.every((byte, index) => buffer[index] === byte)
  );
}

async function readCachedImage(cachePath: string): Promise<Uint8Array | null> {
  try {
    const buffer = await readFile(cachePath);
    return isPng(buffer) ? buffer : null;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

async function cacheImage(
  cacheKey: string,
  generate: () => Promise<Uint8Array>
): Promise<Uint8Array> {
  const cachePath = join(CACHE_DIR, `${cacheKey}.png`);
  const cachedImage = await readCachedImage(cachePath);
  if (cachedImage) return cachedImage;

  const generatedImage = await generate();
  await mkdir(CACHE_DIR, { recursive: true });

  const temporaryPath = `${cachePath}.${randomUUID()}.tmp`;
  await writeFile(temporaryPath, generatedImage);
  await rename(temporaryPath, cachePath);

  return generatedImage;
}

export function getCachedOgImageForPost(
  post: CollectionEntry<"blog">
): Promise<Uint8Array> {
  return cacheImage(`post-${getPostOgImageVersion(post)}`, () =>
    generateOgImageForPost(post)
  );
}

export function getCachedOgImageForSite(): Promise<Uint8Array> {
  return cacheImage(`site-${getOgImageVersion()}`, generateOgImageForSite);
}
