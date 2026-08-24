import satori from "satori";
import sharp from "sharp";
import { SITE } from "@/config";
import loadKamiFont from "../loadGoogleFont";
import {
  OG_HEIGHT,
  OG_WIDTH,
  sealNode,
  sideGuideNode,
  tagNode,
} from "./shared";

function truncateText(text, maxLength) {
  if (!text || text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1)}…`;
}

function formatDate(date) {
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: SITE.timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(new Date(date))
    .replaceAll("/", ".");
}

async function resolveImageDataUri(rawUrl) {
  if (!rawUrl) return null;
  try {
    let buffer;
    if (rawUrl.startsWith("http://") || rawUrl.startsWith("https://")) {
      const res = await fetch(rawUrl, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) return null;
      buffer = Buffer.from(await res.arrayBuffer());
    } else {
      return null;
    }

    // 通过 sharp 统一转为 570x220 的 PNG Buffer
    const pngBuffer = await sharp(buffer)
      .resize(570, 220, { fit: "cover" })
      .png()
      .toBuffer();

    return `data:image/png;base64,${pngBuffer.toString("base64")}`;
  } catch {
    return null; // 图片处理失败时优雅回退到纯文字排版
  }
}

export default async post => {
  const { title, description, pubDatetime, tags = [], ogImage } = post.data;
  const displayTitle = truncateText(title, 42);
  const displayDescription = truncateText(description, 76);
  const displayTags = tags.slice(0, 3);
  const date = formatDate(pubDatetime);
  const siteTitle = "BINS.BLOG";

  // 提取文章插图（若有）
  let rawImageUrl = null;
  if (typeof ogImage === "string") {
    rawImageUrl = ogImage;
  } else if (ogImage && typeof ogImage === "object" && ogImage.src) {
    rawImageUrl = ogImage.src;
  } else if (post.body) {
    const match = post.body.match(/!\[.*?\]\((https?:\/\/[^\s\)]+)\)/);
    if (match) {
      rawImageUrl = match[1];
    }
  }

  const imageDataUri = await resolveImageDataUri(rawImageUrl);

  // 1. 中间主体区（纯文字 vs 图文自适应）
  let bodyContentNode;
  if (imageDataUri) {
    bodyContentNode = {
      type: "div",
      props: {
        style: {
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          flex: 1,
          padding: "4px 0",
        },
        children: [
          // 上半部：插图画框
          {
            type: "div",
            props: {
              style: {
                width: "100%",
                height: 220,
                display: "flex",
                borderRadius: 4,
                overflow: "hidden",
                border: "1px solid #ded9cc",
                margin: "8px 0 6px 0",
              },
              children: [
                {
                  type: "img",
                  props: {
                    src: imageDataUri,
                    style: {
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    },
                  },
                },
              ],
            },
          },
          // 下半部：标题与摘要
          {
            type: "div",
            props: {
              style: {
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
              },
              children: [
                {
                  type: "h1",
                  props: {
                    style: {
                      fontSize: 34,
                      fontWeight: 500,
                      color: "#141413",
                      lineHeight: 1.25,
                      margin: 0,
                      letterSpacing: "0.02em",
                    },
                    children: displayTitle,
                  },
                },
                {
                  type: "p",
                  props: {
                    style: {
                      fontSize: 18,
                      color: "#504e49",
                      lineHeight: 1.5,
                      margin: "8px 0 0 0",
                      maxHeight: 54,
                      overflow: "hidden",
                      letterSpacing: "0.01em",
                    },
                    children: displayDescription,
                  },
                },
              ],
            },
          },
        ],
      },
    };
  } else {
    // 纯文字藏书票
    bodyContentNode = {
      type: "div",
      props: {
        style: {
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          flex: 1,
          padding: "20px 0",
        },
        children: [
          {
            type: "h1",
            props: {
              style: {
                fontSize: 44,
                fontWeight: 500,
                color: "#141413",
                lineHeight: 1.3,
                margin: 0,
                letterSpacing: "0.02em",
              },
              children: displayTitle,
            },
          },
          {
            type: "p",
            props: {
              style: {
                fontSize: 21,
                color: "#504e49",
                lineHeight: 1.6,
                margin: "18px 0 0 0",
                maxHeight: 96,
                overflow: "hidden",
                letterSpacing: "0.015em",
              },
              children: displayDescription,
            },
          },
        ],
      },
    };
  }

  return satori(
    {
      type: "div",
      props: {
        style: {
          width: OG_WIDTH,
          height: OG_HEIGHT,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f5f4ed", // 纯正 Kami 暖纸底
          fontFamily: "TsangerJinKai02",
          color: "#141413",
          position: "relative",
        },
        children: [
          // 两侧古典书志发丝导线
          sideGuideNode("left"),
          sideGuideNode("right"),

          // 中央核心版心 (570px 宽 x 534px 高)
          {
            type: "div",
            props: {
              style: {
                width: 570,
                height: 534,
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                padding: "12px 0",
                position: "relative",
              },
              children: [
                // 顶部：墨蓝方标 + BINS.BLOG + 日期
                {
                  type: "div",
                  props: {
                    style: {
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      width: "100%",
                      borderBottom: "1px solid #e8e6dc",
                      paddingBottom: "14px",
                    },
                    children: [
                      {
                        type: "div",
                        props: {
                          style: {
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                          },
                          children: [
                            {
                              type: "div",
                              props: {
                                style: {
                                  width: 6,
                                  height: 6,
                                  background: "#1B365D",
                                  display: "flex",
                                },
                              },
                            },
                            {
                              type: "span",
                              props: {
                                style: {
                                  fontSize: 17,
                                  fontWeight: 500,
                                  color: "#1B365D",
                                  letterSpacing: "0.1em",
                                },
                                children: siteTitle,
                              },
                            },
                          ],
                        },
                      },
                      {
                        type: "span",
                        props: {
                          style: {
                            fontSize: 16,
                            color: "#7e796e",
                            letterSpacing: "0.06em",
                          },
                          children: date,
                        },
                      },
                    ],
                  },
                },

                // 中间主体
                bodyContentNode,

                // 底部：Kami 标签 + 朱砂红「摸鱼时刻」方印
                {
                  type: "div",
                  props: {
                    style: {
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      width: "100%",
                      borderTop: "1px solid #e8e6dc",
                      paddingTop: "14px",
                    },
                    children: [
                      {
                        type: "div",
                        props: {
                          style: {
                            display: "flex",
                            gap: 8,
                            alignItems: "center",
                          },
                          children:
                            displayTags.length > 0
                              ? displayTags.map(tagNode)
                              : [tagNode("随笔")],
                        },
                      },
                      sealNode(),
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
    {
      width: OG_WIDTH,
      height: OG_HEIGHT,
      fonts: await loadKamiFont(),
    }
  );
};
