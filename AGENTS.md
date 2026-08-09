# Repository instructions

## Blog publishing

When creating or materially editing a post in `src/content/blog/`:

1. Read the authoritative tagging policy in the Obsidian Wiki page `concepts/blog-publishing-workflow#博客文章标签规则` and the current `BLOG_TAGS` in `src/content.config.ts`.
2. Extract 1–4 tags from the title, description, and central ideas of the body.
3. Prefer semantically matching existing tags, even when the exact label does not appear in the article.
4. If no existing tag accurately covers an essential recurring topic, create a canonical new tag according to `TAGGING.md`, add it to `BLOG_TAGS`, and use it in the post in the same change.
5. Do not create tags for incidental mentions or one-off details.
6. Run `pnpm run check` before considering the post ready to publish.
