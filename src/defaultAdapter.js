import { WebAdapter } from "./adapters/webAdapter.js";
import { WeixinAdapter } from "./adapters/weixinAdapter.js";

/**
 * 检测当前运行环境是否为微信小程序
 * @returns {boolean} 如果在微信小程序环境返回 true，否则返回 false
 */
export function isWeixinMiniProgram() {
    return typeof wx !== "undefined" && typeof wx.request === "function";
}

/**
 * 根据运行环境自动选择默认适配器
 * @returns {Function} 返回适配器类
 */
export function getDefaultAdapter() {
    return isWeixinMiniProgram() ? WeixinAdapter : WebAdapter;
}
