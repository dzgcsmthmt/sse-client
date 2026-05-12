import { BaseFilter } from "./baseFilter.js";
/**
 * 思考消息过滤器
 * 处理 "think" 类型的消息
 */
export class ThinkingFilter extends BaseFilter {
    /**
     * 构造函数
     */
    constructor() {
        super();
        this.filterType = "thinking";
    }

    /**
     * 判断是否可以处理思考消息
     * @param {Object} msg - 消息对象
     * @returns {boolean}
     */
    canHandle(msg) {
        return msg.event === "thinking";
    }

    /**
     * 处理思考消息
     * @param {Object} msg - 消息对象
     * @param {SSEInstance} sseInstance - SSE实例
     * @returns {boolean}
     */
    process(msg, sseInstance) {
        sseInstance.emit("thinking", msg.message_id, msg.answer);
        return false;
    }
}
