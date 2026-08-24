import { getCollection } from "astro:content";

export const getPublishedPosts = () =>
  getCollection("blog", ({ data }) => !data.draft);
