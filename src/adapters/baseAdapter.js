/**
 * 基础适配器类
 * 不同平台需要继承此类并实现 connect 和 abort 方法
 */
export class BaseAdapter {
    /**
     * 创建适配器实例
     * @param {string} url - 连接URL
     * @param {Object} options - 配置选项
     * @param {Object} context - SSEInstance 上下文
     */
    constructor(url, options, context) {
        this.url = url;
        this.options = options;
        this.context = context;
    }

    /**
     * 建立连接
     * 子类必须实现此方法
     */
    connect() {
        throw new Error('connect() 方法必须由子类实现');
    }

    /**
     * 中止连接
     * 子类必须实现此方法
     */
    abort() {
        throw new Error('abort() 方法必须由子类实现');
    }
}
