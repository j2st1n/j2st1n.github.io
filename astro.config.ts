import { defineConfig, envField, fontProviders } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import sitemap from "@astrojs/sitemap";
import { rehypeLazyImages } from "./src/utils/rehype/lazyImages";
import { getSitemapMetadata } from "./src/utils/getSitemapMetadata";
import { SITE } from "./src/config";

// The CDN keeps generated assets for 30 days, so isolate each deployment from stale files.
const deploymentId = (process.env.GITHUB_SHA ?? "local").slice(0, 8);
const sitemapMetadata = await getSitemapMetadata();

export default defineConfig({
  site: SITE.website,
  build: {
    assets: `_astro/${deploymentId}`,
  },
  integrations: [
    sitemap({
      lastmod: sitemapMetadata.latestUpdate,
      filter: page => {
        const pathname = new URL(page).pathname;
        if (pathname === "/search/") return false;
        return SITE.showArchives || !pathname.endsWith("/archives");
      },
      serialize: item => ({
        ...item,
        lastmod: sitemapMetadata.lastmodByUrl.get(item.url)?.toISOString(),
      }),
    }),
  ],
  markdown: {
    rehypePlugins: [rehypeLazyImages],
    shikiConfig: {
      themes: { light: "min-light", dark: "night-owl" },
      defaultColor: false,
      wrap: false,
    },
  },
  vite: {
    plugins: [tailwindcss()],
    optimizeDeps: {
      exclude: ["@resvg/resvg-js"],
    },
  },
  image: {
    responsiveStyles: true,
    layout: "constrained",
  },
  env: {
    schema: {
      PUBLIC_GOOGLE_SITE_VERIFICATION: envField.string({
        access: "public",
        context: "client",
        optional: true,
      }),
    },
  },
  experimental: {
    preserveScriptOrder: true,
    fonts: [
      {
        name: "Google Sans Code",
        cssVariable: "--font-google-sans-code",
        provider: fontProviders.google(),
        fallbacks: ["monospace"],
        weights: [300, 400, 500, 600, 700],
        styles: ["normal", "italic"],
      },
    ],
  },
});
