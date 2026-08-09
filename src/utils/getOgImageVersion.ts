import { createHash } from "node:crypto";
import type { CollectionEntry } from "astro:content";
import { SITE } from "@/config";

// Increment this when the OG templates, fonts, or rendering rules change.
const OG_TEMPLATE_VERSION = "quiet-square-v1";

function shortHash(value: unknown): string {
  return createHash("sha256")
    .update(JSON.stringify(value))
    .digest("hex")
    .slice(0, 12);
}

export function getOgImageVersion() {
  return shortHash({
    template: OG_TEMPLATE_VERSION,
    title: SITE.title,
    description: SITE.desc,
    author: SITE.author,
    website: SITE.website,
  });
}

export function getPostOgImageVersion(post: CollectionEntry<"blog">) {
  const { author, description, pubDatetime, tags, title } = post.data;

  return shortHash({
    template: OG_TEMPLATE_VERSION,
    title,
    description,
    author,
    pubDatetime: pubDatetime.toISOString(),
    tags,
    siteTitle: SITE.title,
    website: SITE.website,
  });
}

export function getGeneratedOgImageFileName(version = getOgImageVersion()) {
  return `share-${version}.png`;
}
