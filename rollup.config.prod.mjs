import terser from "@rollup/plugin-terser";
import strip from "@rollup/plugin-strip";
import config from "./rollup.config.mjs";
import { packageInfo } from "./rollup.config.mjs";

const { name, version, homepage, description } = packageInfo;

const build_version = process.argv.includes("--ver");

config.output.forEach(function (item) {
    // 改为release模式名称
    item.file = `./dist/release${
        build_version ? "@" + version : ""
    }.${item.format}.js`;
});

// 正式环境 需要压缩代码
config.plugins.push(
    terser({
        compress: {
            pure_getters: true,
            unsafe: true,
            unsafe_comps: true,
            warnings: false,
        },
    }),
    strip({
        include: ["**/*.ts", "**/*.js"],
        functions: ["console.log", "debug"],
    }),
);

export default config;
