import satori from "satori";
import { SITE } from "@/config";
import loadGoogleFonts from "../loadGoogleFont";

const WIDTH = 1200;
const HEIGHT = 1200;

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

function getTitleSize(title) {
  if (title.length <= 14) return 96;
  if (title.length <= 24) return 84;
  if (title.length <= 38) return 72;
  return 64;
}

function tagNode(tag) {
  return {
    type: "span",
    props: {
      style: {
        display: "flex",
        alignItems: "center",
        borderRadius: 999,
        border: "1px solid #d7d2c4",
        background: "rgba(255,255,255,0.74)",
        color: "#51605d",
        padding: "8px 16px",
        fontSize: 22,
        lineHeight: 1,
      },
      children: tag,
    },
  };
}

export default async post => {
  const { title, description, pubDatetime, tags = [], author } = post.data;
  const displayTitle = truncateText(title, 58);
  const displayDescription = truncateText(description, 96);
  const displayTags = tags.slice(0, 4);
  const date = formatDate(pubDatetime);
  const hostname = new URL(SITE.website).hostname;
  const fontText = [
    displayTitle,
    displayDescription,
    displayTags.join(""),
    author,
    SITE.title,
    hostname,
    date,
    "by随笔",
  ].join("");

  return satori(
    {
      type: "div",
      props: {
        style: {
          width: WIDTH,
          height: HEIGHT,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          position: "relative",
          overflow: "hidden",
          background: "#f7f3ea",
          color: "#17201d",
          padding: "72px",
          fontFamily: "Noto Sans SC",
        },
        children: [
          {
            type: "div",
            props: {
              style: {
                position: "absolute",
                left: 0,
                top: 0,
                width: "100%",
                height: 24,
                background: "#0f766e",
                display: "flex",
              },
            },
          },
          {
            type: "div",
            props: {
              style: {
                position: "absolute",
                right: 0,
                top: 24,
                width: 24,
                height: "100%",
                background: "#c05621",
                display: "flex",
              },
            },
          },
          {
            type: "div",
            props: {
              style: {
                position: "absolute",
                right: 60,
                top: 176,
                color: "rgba(15,118,110,0.08)",
                fontSize: 230,
                fontWeight: 700,
                lineHeight: 1,
                display: "flex",
              },
              children: SITE.title,
            },
          },
          {
            type: "div",
            props: {
              style: {
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                width: "100%",
                position: "relative",
                color: "#51605d",
                fontSize: 26,
              },
              children: {
                type: "div",
                props: {
                  style: {
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                  },
                  children: [
                    {
                      type: "span",
                      props: {
                        style: {
                          width: 10,
                          height: 10,
                          borderRadius: 999,
                          background: "#0f766e",
                          display: "flex",
                        },
                      },
                    },
                    {
                      type: "span",
                      props: {
                        style: { fontWeight: 700, color: "#25302d" },
                        children: SITE.title,
                      },
                    },
                    {
                      type: "span",
                      props: {
                        children: "by",
                      },
                    },
                    {
                      type: "span",
                      props: {
                        style: { fontWeight: 700, color: "#25302d" },
                        children: author,
                      },
                    },
                  ],
                },
              },
            },
          },
          {
            type: "div",
            props: {
              style: {
                position: "absolute",
                right: 72,
                top: 72,
                color: "#6b746f",
                fontSize: 26,
                display: "flex",
              },
              children: date,
            },
          },
          {
            type: "div",
            props: {
              style: {
                position: "relative",
                display: "flex",
                flexDirection: "column",
                width: "100%",
                paddingRight: 24,
              },
              children: [
                {
                  type: "h1",
                  props: {
                    style: {
                      margin: 0,
                      fontSize: getTitleSize(displayTitle),
                      fontWeight: 700,
                      lineHeight: 1.16,
                      letterSpacing: 0,
                      maxHeight: 430,
                      overflow: "hidden",
                      color: "#17201d",
                    },
                    children: displayTitle,
                  },
                },
                {
                  type: "p",
                  props: {
                    style: {
                      margin: "36px 0 0",
                      fontSize: 34,
                      lineHeight: 1.45,
                      maxHeight: 150,
                      overflow: "hidden",
                      color: "#56625f",
                    },
                    children: displayDescription,
                  },
                },
              ],
            },
          },
          {
            type: "div",
            props: {
              style: {
                position: "relative",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-end",
                gap: 32,
                width: "100%",
                borderTop: "1px solid #d7d2c4",
                paddingTop: 32,
              },
              children: [
                {
                  type: "div",
                  props: {
                    style: {
                      display: "flex",
                      gap: 12,
                      maxWidth: 760,
                      overflow: "hidden",
                    },
                    children:
                      displayTags.length > 0
                        ? displayTags.map(tagNode)
                        : [tagNode("随笔")],
                  },
                },
                {
                  type: "div",
                  props: {
                    style: {
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      color: "#25302d",
                      fontSize: 25,
                      fontWeight: 700,
                      whiteSpace: "nowrap",
                    },
                    children: [
                      {
                        type: "span",
                        props: {
                          style: {
                            display: "flex",
                            width: 34,
                            height: 4,
                            background: "#c05621",
                          },
                        },
                      },
                      {
                        type: "span",
                        props: { children: hostname },
                      },
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
      width: WIDTH,
      height: HEIGHT,
      embedFont: true,
      fonts: await loadGoogleFonts(fontText),
    }
  );
};
