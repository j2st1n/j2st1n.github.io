import satori from "satori";
import { SITE } from "@/config";
import loadGoogleFonts from "../loadGoogleFont";

const WIDTH = 1200;
const HEIGHT = 630;

export default async () => {
  const hostname = new URL(SITE.website).hostname;
  const footerText = "日常观察 / AI 工具 / 技术折腾 / 随笔";
  const fontText = [
    SITE.title,
    SITE.desc,
    hostname,
    SITE.author,
    footerText,
    "by",
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
          padding: "54px 64px",
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
                height: 18,
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
                top: 18,
                width: 18,
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
                right: 56,
                top: 86,
                color: "rgba(15,118,110,0.08)",
                fontSize: 172,
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
                alignItems: "center",
                gap: 14,
                position: "relative",
                color: "#51605d",
                fontSize: 24,
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
                    children: SITE.author,
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
                flexDirection: "column",
                width: "100%",
                paddingRight: 120,
              },
              children: [
                {
                  type: "h1",
                  props: {
                    style: {
                      margin: 0,
                      fontSize: 96,
                      fontWeight: 700,
                      lineHeight: 1.08,
                      letterSpacing: 0,
                      color: "#17201d",
                    },
                    children: SITE.title,
                  },
                },
                {
                  type: "p",
                  props: {
                    style: {
                      margin: "34px 0 0",
                      fontSize: 32,
                      lineHeight: 1.5,
                      maxWidth: 850,
                      color: "#56625f",
                    },
                    children: SITE.desc,
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
                paddingTop: 26,
              },
              children: [
                {
                  type: "div",
                  props: {
                    style: {
                      display: "flex",
                      color: "#51605d",
                      fontSize: 24,
                    },
                    children: footerText,
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
