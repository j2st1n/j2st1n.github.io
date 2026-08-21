import satori from "satori";
import { SITE } from "@/config";
import loadKamiFont from "../loadGoogleFont";

const WIDTH = 1200;
const HEIGHT = 630;

function tagNode(tag) {
  return {
    type: "span",
    props: {
      style: {
        fontSize: 14,
        fontWeight: 500,
        color: "#1B365D",
        background: "#E4ECF5",
        padding: "3px 10px",
        borderRadius: 3,
        letterSpacing: "0.04em",
        display: "flex",
      },
      children: tag,
    },
  };
}

function sealNode() {
  return {
    type: "div",
    props: {
      style: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        width: 44,
        height: 44,
        border: "2px solid #9c2727",
        borderRadius: 3,
        background: "#faf1f0",
        padding: 2,
      },
      children: [
        {
          type: "div",
          props: {
            style: {
              width: "100%",
              height: "100%",
              border: "1px solid #c95d5d",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
            },
            children: [
              {
                type: "span",
                props: {
                  style: {
                    fontSize: 12,
                    fontWeight: 500,
                    color: "#9c2727",
                    lineHeight: 1.05,
                    letterSpacing: "0.06em",
                  },
                  children: "摸鱼",
                },
              },
              {
                type: "span",
                props: {
                  style: {
                    fontSize: 12,
                    fontWeight: 500,
                    color: "#9c2727",
                    lineHeight: 1.05,
                    letterSpacing: "0.06em",
                  },
                  children: "时刻",
                },
              },
            ],
          },
        },
      ],
    },
  };
}

export default async () => {
  const displayTitle = SITE.title;
  const displayDescription =
    SITE.desc || "日常观察 / AI 工具 / 技术折腾 / 随笔";
  const defaultTags = ["随笔", "思考", "生活"];

  return satori(
    {
      type: "div",
      props: {
        style: {
          width: WIDTH,
          height: HEIGHT,
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
          {
            type: "div",
            props: {
              style: {
                position: "absolute",
                top: 48,
                bottom: 48,
                left: 100,
                width: 1,
                background: "#e5e2d6",
                display: "flex",
              },
            },
          },
          {
            type: "div",
            props: {
              style: {
                position: "absolute",
                top: 48,
                bottom: 48,
                right: 100,
                width: 1,
                background: "#e5e2d6",
                display: "flex",
              },
            },
          },

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
                padding: "16px 0",
                position: "relative",
              },
              children: [
                // 顶部：墨蓝方标 + BINS.BLOG + 个人博客
                {
                  type: "div",
                  props: {
                    style: {
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      width: "100%",
                      borderBottom: "1px solid #e8e6dc",
                      paddingBottom: "16px",
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
                                children: "BINS.BLOG",
                              },
                            },
                          ],
                        },
                      },
                      {
                        type: "span",
                        props: {
                          style: {
                            fontSize: 15,
                            color: "#7e796e",
                            letterSpacing: "0.06em",
                          },
                          children: "J2 的个人博客",
                        },
                      },
                    ],
                  },
                },

                // 中间主体
                {
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
                            fontSize: 48,
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
                            fontSize: 22,
                            color: "#504e49",
                            lineHeight: 1.6,
                            margin: "18px 0 0 0",
                            letterSpacing: "0.015em",
                          },
                          children: displayDescription,
                        },
                      },
                    ],
                  },
                },

                // 底部
                {
                  type: "div",
                  props: {
                    style: {
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      width: "100%",
                      borderTop: "1px solid #e8e6dc",
                      paddingTop: "16px",
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
                          children: defaultTags.map(tagNode),
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
      width: WIDTH,
      height: HEIGHT,
      fonts: await loadKamiFont(),
    }
  );
};
