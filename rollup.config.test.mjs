// import CDNUploadPlugin from "./build/CDNUploadPlugin.mjs";
import buildConfig from "./build/config.mjs";
import config from "./rollup.config.mjs";
import { packageInfo } from "./rollup.config.mjs";

const { name, version } = packageInfo;

const build_version = process.argv.includes("--ver");

config.output.forEach(function (item) {
    // 改为test模式名称
    item.file = `./dist/test${build_version ? (buildConfig.icon + version) : ""}.${item.format}.js`;
});

// 推送
// const _push = process.argv.includes("--push");
// if (_push == true) {
    
//     config.plugins.push(
//         CDNUploadPlugin({
//             logname: name + version.split(".").slice(0, 2).join("."),
//             packageName: name,
//             cdnName: buildConfig.cndName,
//             pushUrl: buildConfig.pushSeaver,
//         })
//     );
// }

export default config;