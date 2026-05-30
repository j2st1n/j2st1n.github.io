# Quiet Theme TODO

Quiet is the primary production theme for bins.blog. It started as an isolated `/quiet` experiment and has now replaced the previous root theme.

## Principles

- Keep theme-level primitives reusable across production routes.
- Prefer reusable quiet components over page-level copy/paste.
- Optimize for calm reading, clear archives, and low visual noise.
- Test with real posts, real tags, long Chinese titles, code blocks, images, and mobile widths.
- Keep production routes crawlable and avoid reintroducing preview-only `/quiet` routes.

## P0: Theme Foundation

- [x] Create `src/themes/quiet/layouts/QuietLayout.astro` to wrap quiet pages with shared metadata, header, footer, and page width.
- [x] Create `src/themes/quiet/components/QuietHeader.astro` for quiet navigation and theme controls.
- [x] Create `src/themes/quiet/components/QuietFooter.astro` for quiet footer links and license text.
- [x] Move shared quiet CSS variables and base styles into `src/themes/quiet/styles/quiet.css`.
- [x] Replace duplicated header/footer/theme-toggle markup in `src/pages/quiet/*.astro` with shared components.
- [x] Decide the minimal quiet navigation: Home, Archive, Tags, Search.

## P1: Core Page Completeness

- [x] Finish `/quiet` homepage hierarchy: intro, featured/latest post, recent posts, archive link.
- [x] Finish `/quiet/article` reading layout with real typography rules for headings, paragraphs, lists, quotes, images, tables, and code blocks.
- [x] Finish `/quiet/articles` or `/quiet/archives` as the primary article index.
- [x] Validate desktop, tablet, and mobile spacing for the three core pages.
- [x] Remove preview routes like `/quiet/article` and `/quiet/tag`; real `/quiet/posts/[slug]` and `/quiet/tags/[tag]` routes are the canonical paths.

## P2: Real Route Model

- [x] Add real quiet article routes under `/quiet/posts/[slug]` instead of relying only on `/quiet/article` sample content.
- [x] Add real quiet tag routes under `/quiet/tags/[tag]` instead of relying only on `/quiet/tag` sample content.
- [x] Ensure quiet article links point to quiet article routes when browsing inside `/quiet`.
- [x] Keep production article/tag routes unchanged during the quiet experiment.

## P3: Secondary Pages

- [x] Refine `/quiet/tags` for high-frequency tags and all-tags discovery.
- [x] Refine `/quiet/all-tags` for large tag counts and long tag names.
- [x] Refine `/quiet/search` as a lightweight local title, summary, and tag search that stays inside quiet routes.
- [x] Remove `/quiet/about`; quiet does not need a separate about page.
- [x] Refine `/quiet/404` so it works as a real not-found page candidate, not only an animation sketch.

## P4: Isolation And Release Readiness

- [x] Promote quiet routes to production paths and remove the `/quiet` preview route tree.
- [x] Remove quiet-only `noindex, nofollow` behavior from production pages.
- [x] Replace Pagefind with the simpler title, summary, and tag search.
- [x] Run `pnpm run build` after each structural change.
- [x] Prepare a route switch plan and rollback plan before promotion.
- [x] Remove preview-only markers and delete `/quiet` routes after promotion.

## Open Questions

- Quiet is replacing the current theme as the primary production theme.
- Quiet keeps its smaller navigation vocabulary.
- Article pages keep Giscus comments and intentionally omit edit/share/back affordances.
- Search uses the simpler title, summary, and tag search instead of Pagefind.
