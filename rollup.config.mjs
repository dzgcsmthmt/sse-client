import { join } from "path";
import commonjs from "@rollup/plugin-commonjs";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import replace from "@rollup/plugin-replace";
import { createRequire } from "module";
import alias from "@rollup/plugin-alias";

const require = createRequire(import.meta.url);
const info = require("./package.json");
// 当前路径
const root = process.cwd();

const config = {
    input: "src/index.js",
    output: [
        { file: `./dist/${info.name}.cjs.js`, format: "cjs" },
        {
            file: `./dist/${info.name}.umd.js`,
            format: "umd",
            name: info.name,
            globals: {},
        },
        { file: `./dist/${info.name}.esm.js`, format: "esm", exports: "named" },
        // { file: `./dist/${info.name}.iife.js`, format: "iife", name: info.name, globals: {
        //     vue: 'Vue',
        //     "element-ui": "ElementUI",
        // } },
    ],
    plugins: [
        replace({
            preventAssignment: true,
            __build_time__: JSON.stringify(new Date()),
            __build_version__: info.version,
        }),
        commonjs(),
        nodeResolve({
            browser: true,
            extensions: [".js"],
        }),
        alias({
            entries: [{ find: "@", replacement: join(root, "src") }],
        }),
    ],
    external: [],
    // Ignore only the specific Rollup warning about top-level `this`
    onwarn(warning, warn) {
        if (warning.code === "THIS_IS_UNDEFINED") return;
        warn(warning);
    },
    // Ensure a browser context for this module so `this` is not rewritten
    moduleContext: (id) => {
        return id.includes("@microsoft/fetch-event-source") ? "window" : undefined;
    },
};

export default config;

export const packageInfo = info;