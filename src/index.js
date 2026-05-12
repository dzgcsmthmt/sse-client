import EventEmitter from "./eventEmitter";
import {
    BaseFilter,
    ThinkingFilter,
    MessageFilter,
    ErrorFilter,
} from "./filters/index.js";
import FilterManager from "./filterManager.js";
import { getDefaultAdapter } from "./defaultAdapter.js";
import { prependBearer, isFunction, refreshToken } from "./utils.js";

/**
 * SSE客户端类，继承自EventEmitter
 * 用于处理服务器发送事件的连接和数据处理
 */
export class SSEInstance extends EventEmitter {
    /**
     * 创建一个新的SSEInstance实例
     * @param {string} url - 基础URL
     * @param {Object} options - 配置选项
     * @param {BaseFilter|BaseFilter[]} filters - 自定义过滤器或过滤器数组
     * @param {BaseAdapter} AdapterClass - 自定义适配器类，默认根据环境自动选择（微信小程序使用 WeixinAdapter，否则使用 WebAdapter）
     */
    constructor(
        url,
        options = {},
        filters = [ThinkingFilter, MessageFilter, ErrorFilter],
        AdapterClass,
    ) {
        super();
        if (!url) {
            throw new Error("url is required");
        }
        this.url = url;
        this.options = options;
        this.handleHeaderAuthorization();
        this.initializeFilterChain(filters);
        // 如果没有传入适配器类，则根据环境自动选择
        const Adapter = AdapterClass || getDefaultAdapter();
        // 初始化适配器
        this.adapter = new Adapter(url, options, this);
    }

    handleHeaderAuthorization() {
        if (this.options.headers?.Authorization) {
            this.options.headers.Authorization = prependBearer(
                this.options.headers.Authorization,
            );
        }
    }

    /**
     * 初始化过滤器责任链
     * @param {Array<Function>} filters - 过滤器构造函数数组
     */
    initializeFilterChain(filters) {
        let headerFilter = null;

        if (filters && filters.length > 0) {
            // 实例化数组中的所有过滤器
            const filterInstances = filters.map(
                (FilterClass) => new FilterClass(),
            );

            // 将数组中的过滤器按顺序链接
            headerFilter = filterInstances[0];
            for (let i = 0; i < filterInstances.length - 1; i++) {
                filterInstances[i].setNext(filterInstances[i + 1]);
            }
        }
        this.filterManager = new FilterManager(headerFilter);
    }

    /**
     * 初始化SSE连接
     * 委托给适配器处理实际的连接逻辑
     */
    connect() {
        this.adapter.connect();
    }
    /**
     * 处理 HTTP 401 错误（未授权，通常表示 token 过期）的方法
     */
    error401() {
        const error = new Error("token已过期");
        error.status = 401;
        this.emit("error", error);
    }

    /**
     * 处理当用户未授权时的方法
     */
    unauthorized() {
        const old_token = this.options.headers.Authorization;
        let currentRefreshToken;
        if (isFunction(this.options.refreshToken)) {
            currentRefreshToken = this.options.refreshToken(old_token);
        } else if (this.options.refresh_token_address) {
            currentRefreshToken = refreshToken(
                this.options.refresh_token_address,
                old_token,
                this.options.client_id || "pkulaw",
            );
        } else {
            this.error401();
            return Promise.reject(new Error("refresh token failed"));
        }
        return currentRefreshToken
            .then((access_token) => {
                this.handleReconnect(access_token);
                if (isFunction(this.options.refreshTokenSuccessed)) {
                    this.options.refreshTokenSuccessed(access_token);
                }
                return Promise.resolve(true);
            })
            .catch(() => {
                this.error401();
                return Promise.reject(new Error("refresh token failed"));
            });
    }

    handleReconnect(access_token) {
        // 更新 options.headers 中的 Authorization（如果存在）
        if (this.options.headers?.Authorization) {
            this.options.headers.Authorization = prependBearer(access_token);
        }
        this.connect();
    }

    /**
     * 中止当前连接或操作
     * 委托给适配器处理实际的中止逻辑
     */
    abort() {
        this.adapter.abort();
    }
}

// 重新导出过滤器类和管理器，允许用户创建自定义过滤器
export { BaseFilter, ThinkingFilter, MessageFilter, ErrorFilter };

// 导出适配器，允许用户扩展自定义平台
export { BaseAdapter } from "./adapters/index.js";
