export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;

export function sideGuideNode(side) {
  return {
    type: "div",
    props: {
      style: {
        position: "absolute",
        top: 48,
        bottom: 48,
        [side]: 100,
        width: 1,
        background: "#e5e2d6",
        display: "flex",
      },
    },
  };
}

export function tagNode(tag) {
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

export function sealNode() {
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
