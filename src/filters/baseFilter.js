/**
 * 基础过滤器类 - 责任链模式的基础类
 * 每个过滤器都可以处理消息或将其传递给下一个过滤器
 */
export class BaseFilter {
    /**
     * 构造函数
     * @param {BaseFilter|null} nextFilter - 下一个过滤器
     */
    constructor(nextFilter = null) {
        this.nextFilter = nextFilter;
        // 过滤器类型标识，子类应该重写此属性
        this.filterType = "base";
    }

    /**
     * 获取过滤器类型
     * @returns {string} 过滤器类型
     */
    getFilterType() {
        return this.filterType;
    }

    /**
     * 设置下一个过滤器
     * @param {BaseFilter} filter - 下一个过滤器
     */
    setNext(filter) {
        this.nextFilter = filter;
        return filter;
    }

    /**
     * 处理消息的核心方法
     * @param {Object} msg - 消息对象
     * @param {SSEInstance} sseInstance - SSE实例
     * @returns {boolean} - 是否继续传递给下一个过滤器
     */
    handle(msg, sseInstance) {
        if (this.canHandle(msg)) {
            const shouldContinue = this.process(msg, sseInstance);
            if (!shouldContinue) {
                return false;
            }
        }

        if (this.nextFilter) {
            return this.nextFilter.handle(msg, sseInstance);
        }

        return true;
    }

    /**
     * 判断是否可以处理此消息
     * @param {Object} msg - 消息对象
     * @returns {boolean}
     */
    canHandle(msg) {
        return false;
    }

    /**
     * 处理消息的具体逻辑
     * @param {Object} msg - 消息对象
     * @param {SSEInstance} sseInstance - SSE实例
     * @returns {boolean} - 是否继续传递给下一个过滤器
     */
    process(msg, sseInstance) {
        return true;
    }
}
