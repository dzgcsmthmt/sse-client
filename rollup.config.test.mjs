// import CDNUploadPlugin from "./build/CDNUploadPlugin.mjs";
import config from "./rollup.config.mjs";
import { packageInfo } from "./rollup.config.mjs";

const { name, version } = packageInfo;

const build_version = process.argv.includes("--ver");

config.output.forEach(function (item) {
    // 改为test模式名称
    item.file = `./dist/test${build_version ? "@" + version : ""}.${item.format}.js`;
});

export default config;
