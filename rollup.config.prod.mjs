import terser from "@rollup/plugin-terser";
import strip from "@rollup/plugin-strip";
// import CDNUploadPlugin from "./build/CDNUploadPlugin.mjs";
// import MessagePlugin from "./build/MessagePlugin.mjs";
import buildConfig from "./build/config.mjs";
import config from "./rollup.config.mjs";
import { packageInfo } from "./rollup.config.mjs";

const { name, version, homepage, description } = packageInfo;

const build_version = process.argv.includes("--ver");

config.output.forEach(function (item) {
    // 改为release模式名称
    item.file = `./dist/release${
        build_version ? buildConfig.icon + version : ""
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
    })
);

/*
// 推送
const _push = process.argv.includes("--push");
if (_push == true) {
    config.plugins.push(
        CDNUploadPlugin({
            logname: name + version.split(".").slice(0, 2).join("."),
            packageName: name,
            cdnName: buildConfig.cndName,
            pushUrl: buildConfig.pushSeaver,
        })
    );
}

const _msg = process.argv.includes("--msg");
if (_msg == true) {
    config.plugins.push(
        MessagePlugin({
            name,
            version,
            homepage,
            description
        })
    );
}
*/

export default config;
