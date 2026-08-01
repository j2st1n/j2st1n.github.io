import type { APIRoute } from "astro";
import { getCollection, type CollectionEntry } from "astro:content";
import { SITE } from "@/config";
import { getGeneratedOgImageFileName } from "@/utils/getOgImageVersion";
import { getPath } from "@/utils/getPath";
import { generateOgImageForPost } from "@/utils/generateOgImages";

export async function getStaticPaths() {
  if (!SITE.dynamicOgImage) {
    return [];
  }

  const imageName = getGeneratedOgImageFileName().replace(/\.png$/, "");
  const posts = await getCollection("blog").then(p =>
    p.filter(({ data }) => !data.draft)
  );

  return posts.map(post => ({
    params: { slug: `${getPath(post.id, post.filePath, false)}/${imageName}` },
    props: post,
  }));
}

export const GET: APIRoute = async ({ props }) => {
  if (!SITE.dynamicOgImage) {
    return new Response(null, {
      status: 404,
      statusText: "Not found",
    });
  }

  const buffer = await generateOgImageForPost(props as CollectionEntry<"blog">);
  return new Response(new Uint8Array(buffer), {
    headers: { "Content-Type": "image/png" },
  });
};
