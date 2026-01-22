import serve from "rollup-plugin-serve";

import config from "./rollup.config.mjs";
// import { packageInfo } from "./rollup.config.js";

config.output.file = config.output.forEach(function (item) {
    // 改为test模式名称
    item.file = `./dist/dev.${item.format}.js`;
});

// 开发环境
config.plugins.push(
    serve({
        open: true,
        host: "0.0.0.0",
        port: 10001,
        headers: {
            "Access-Control-Allow-Origin": "*",
        },
        contentBase: ["dist", "demo"],
        openPage: "/index.html",
    })
);

export default config;
