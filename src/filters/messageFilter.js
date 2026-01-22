import { BaseFilter } from "./baseFilter.js";
/**
 * 内容消息过滤器
 * 处理 "message" 类型的消息
 */
export class MessageFilter extends BaseFilter {
    /**
     * 构造函数
     */
    constructor() {
        super();
        this.filterType = "message";
    }

    /**
     * 判断是否可以处理内容消息
     * @param {Object} msg - 消息对象
     * @returns {boolean}
     */
    canHandle(msg) {
        return msg.event === "message";
    }

    /**
     * 处理内容消息
     * @param {Object} msg - 消息对象
     * @param {SSEInstance} sseInstance - SSE实例
     * @returns {boolean}
     */
    process(msg, sseInstance) {
        sseInstance.emit("message", msg.message_id, msg.answer);
        return true;
    }
}
