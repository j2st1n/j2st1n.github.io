import type { APIRoute } from "astro";
import { generateOgImageForSite } from "@/utils/generateOgImages";
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
  const buffer = await generateOgImageForSite();
  return new Response(new Uint8Array(buffer), {
    headers: { "Content-Type": "image/png" },
  });
};
