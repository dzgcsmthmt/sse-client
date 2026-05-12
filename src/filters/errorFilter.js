import { BaseFilter } from "./baseFilter.js";
/**
 * 内容消息过滤器
 * 处理 "message" 类型的消息
 */
export class ErrorFilter extends BaseFilter {
    /**
     * 构造函数
     */
    constructor() {
        super();
        this.filterType = "error";
    }

    /**
     * 判断是否可以处理错误消息
     * @param {Object} msg - 消息对象
     * @returns {boolean}
     */
    canHandle(msg) {
        return msg.event === "error";
    }

    /**
     * 处理错误消息
     * @param {Object} msg - 消息对象
     * @param {SSEInstance} sseInstance - SSE实例
     * @returns {boolean}
     */
    process(msg, context) {
        context.emit("error", msg);
        return false;
    }
}
