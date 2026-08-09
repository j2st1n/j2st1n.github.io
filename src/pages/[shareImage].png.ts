import type { APIRoute } from "astro";
import { getCachedOgImageForSite } from "@/utils/ogImageCache";
import { getGeneratedOgImageFileName } from "@/utils/getOgImageVersion";

export function getStaticPaths() {
  return [
    {
      params: {
        shareImage: getGeneratedOgImageFileName().replace(/\.png$/, ""),
      },
    },
  ];
}

export const GET: APIRoute = async () => {
  const buffer = await getCachedOgImageForSite();
  return new Response(new Uint8Array(buffer), {
    headers: { "Content-Type": "image/png" },
  });
};
