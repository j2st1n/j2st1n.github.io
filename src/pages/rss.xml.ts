import rss from "@astrojs/rss";
import { getPublishedPosts } from "@/utils/getPublishedPosts";
import { getPath } from "@/utils/getPath";
import { SITE } from "@/config";

export async function GET() {
  const posts = await getPublishedPosts();
  const sortedPosts = posts.toSorted(
    (a, b) => b.data.pubDatetime.valueOf() - a.data.pubDatetime.valueOf()
  );
  return rss({
    title: SITE.title,
    description: SITE.desc,
    site: SITE.website,
    items: sortedPosts.map(({ data, id, filePath }) => ({
      link: getPath(id, filePath),
      title: data.title,
      description: data.description,
      pubDate: new Date(data.pubDatetime),
      categories: data.tags,
    })),
  });
}
