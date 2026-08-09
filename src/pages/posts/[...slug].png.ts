import type { APIRoute } from "astro";
import { getCollection, type CollectionEntry } from "astro:content";
import { SITE } from "@/config";
import { getCachedOgImageForPost } from "@/utils/ogImageCache";
import {
  getGeneratedOgImageFileName,
  getPostOgImageVersion,
} from "@/utils/getOgImageVersion";
import { getPath } from "@/utils/getPath";

export async function getStaticPaths() {
  if (!SITE.dynamicOgImage) {
    return [];
  }

  const posts = await getCollection("blog").then(p =>
    p.filter(({ data }) => !data.draft && !data.ogImage)
  );

  return posts.map(post => {
    const imageName = getGeneratedOgImageFileName(
      getPostOgImageVersion(post)
    ).replace(/\.png$/, "");

    return {
      params: {
        slug: `${getPath(post.id, post.filePath, false)}/${imageName}`,
      },
      props: post,
    };
  });
}

export const GET: APIRoute = async ({ props }) => {
  if (!SITE.dynamicOgImage) {
    return new Response(null, {
      status: 404,
      statusText: "Not found",
    });
  }

  const buffer = await getCachedOgImageForPost(
    props as CollectionEntry<"blog">
  );
  return new Response(new Uint8Array(buffer), {
    headers: { "Content-Type": "image/png" },
  });
};
