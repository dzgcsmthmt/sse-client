import { BaseFilter } from "./baseFilter.js";
/**
 * 思考消息过滤器
 * 处理 "think" 类型的消息
 */
export class ThinkFilter extends BaseFilter {
    /**
     * 构造函数
     */
    constructor() {
        super();
        this.filterType = "think";
    }

    /**
     * 判断是否可以处理思考消息
     * @param {Object} msg - 消息对象
     * @returns {boolean}
     */
    canHandle(msg) {
        return msg.event === "think";
    }

    /**
     * 处理思考消息
     * @param {Object} msg - 消息对象
     * @param {SSEInstance} sseInstance - SSE实例
     * @returns {boolean}
     */
    process(msg, sseInstance) {
        sseInstance.emit("think", msg.message_id, msg.answer);
        return true;
    }
}
