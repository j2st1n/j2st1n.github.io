import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";
import { SITE } from "@/config";

// Where your blog posts live.
export const BLOG_PATH = "src/content/blog";

export const BLOG_TAGS = [
  "AI",
  "Agent",
  "Cloudflare",
  "Linux.do",
  "Obsidian",
  "OpenClaw",
  "安全",
  "博客",
  "出差",
  "读书",
  "公共领域",
  "工作流",
  "观察",
  "家庭",
  "健身",
  "教育",
  "科技",
  "历史",
  "旅行",
  "南渡北归",
  "生活",
  "生图",
  "社会",
  "赛里木湖",
  "思考",
  "随笔",
  "图床",
  "微信",
  "微信公众号",
  "新疆",
  "伊宁",
  "职场",
] as const;

const tagsSchema = z
  .array(z.enum(BLOG_TAGS))
  .min(1, "每篇文章至少需要一个标签")
  .max(4, "每篇文章最多使用四个标签")
  .refine(tags => new Set(tags).size === tags.length, {
    message: "同一篇文章不能使用重复标签",
  });

const blog = defineCollection({
  loader: glob({ pattern: "**/[^_]*.md", base: `./${BLOG_PATH}` }),
  schema: ({ image }) =>
    z.object({
      author: z.string().default(SITE.author),
      pubDatetime: z.date(),
      modDatetime: z.date().optional().nullable(),
      title: z.string(),
      featured: z.boolean().optional(),
      draft: z.boolean().optional(),
      tags: tagsSchema,
      ogImage: image().or(z.string()).optional(),
      description: z
        .string()
        .min(30, "文章摘要至少需要 30 个字符")
        .max(90, "文章摘要最多使用 90 个字符"),
      canonicalURL: z.string().optional(),
      timezone: z.string().optional(),
    }),
});

export const collections = { blog };
