import { defineConfig, envField, fontProviders } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import sitemap from "@astrojs/sitemap";
import remarkToc from "remark-toc";
import remarkCollapse from "remark-collapse";
import {
  transformerNotationDiff,
  transformerNotationHighlight,
  transformerNotationWordHighlight,
} from "@shikijs/transformers";
import { transformerFileName } from "./src/utils/transformers/fileName";
import { rehypeLazyImages } from "./src/utils/rehype/lazyImages";
import { SITE } from "./src/config";

export default defineConfig({
  site: SITE.website,
  integrations: [
    sitemap({
      filter: page =>
        SITE.showArchives || !new URL(page).pathname.endsWith("/archives"),
    }),
  ],
  markdown: {
    remarkPlugins: [remarkToc, [remarkCollapse, { test: "Table of contents" }]],
    rehypePlugins: [rehypeLazyImages],
    shikiConfig: {
      themes: { light: "min-light", dark: "night-owl" },
      defaultColor: false,
      wrap: false,
      transformers: [
        transformerFileName({ style: "v2", hideDot: false }),
        transformerNotationHighlight(),
        transformerNotationWordHighlight(),
        transformerNotationDiff({ matchAlgorithm: "v3" }),
      ],
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
      PUBLIC_GISCUS_REPO: envField.string({
        access: "public",
        context: "client",
        optional: true,
      }),
      PUBLIC_GISCUS_REPO_ID: envField.string({
        access: "public",
        context: "client",
        optional: true,
      }),
      PUBLIC_GISCUS_CATEGORY: envField.string({
        access: "public",
        context: "client",
        optional: true,
      }),
      PUBLIC_GISCUS_CATEGORY_ID: envField.string({
        access: "public",
        context: "client",
        optional: true,
      }),
      PUBLIC_GISCUS_MAPPING: envField.string({
        access: "public",
        context: "client",
        optional: true,
      }),
      PUBLIC_GISCUS_STRICT: envField.string({
        access: "public",
        context: "client",
        optional: true,
      }),
      PUBLIC_GISCUS_REACTIONS_ENABLED: envField.string({
        access: "public",
        context: "client",
        optional: true,
      }),
      PUBLIC_GISCUS_INPUT_POSITION: envField.string({
        access: "public",
        context: "client",
        optional: true,
      }),
      PUBLIC_GISCUS_LANG: envField.string({
        access: "public",
        context: "client",
        optional: true,
      }),
      PUBLIC_GISCUS_LOADING: envField.string({
        access: "public",
        context: "client",
        optional: true,
      }),
      PUBLIC_GISCUS_ORIGIN: envField.string({
        access: "public",
        context: "client",
        optional: true,
      }),
      PUBLIC_GISCUS_EMIT_METADATA: envField.string({
        access: "public",
        context: "client",
        optional: true,
      }),
      PUBLIC_GISCUS_TERM: envField.string({
        access: "public",
        context: "client",
        optional: true,
      }),
      PUBLIC_GISCUS_ENABLED: envField.string({
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
