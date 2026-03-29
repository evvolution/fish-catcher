import pxToViewport from "postcss-px-to-viewport-8-plugin";

const postcssConfig = {
  plugins: [
    pxToViewport({
      unitToConvert: "px",
      viewportWidth: 393,
      unitPrecision: 5,
      propList: ["*"],
      viewportUnit: "vw",
      fontViewportUnit: "vw",
      selectorBlackList: [],
      minPixelValue: 1,
      mediaQuery: true,
      replace: true,
      exclude: [/node_modules/, /src\/generated\/prisma/],
    }),
  ],
};

export default postcssConfig;
