import { fetchEventSource } from "@microsoft/fetch-event-source";
import { BaseAdapter } from "./baseAdapter.js";

/**
 * Web 平台适配器
 * 使用 @microsoft/fetch-event-source 实现 SSE 连接
 */
export class WebAdapter extends BaseAdapter {
    /**
     * 建立 Web 平台的 SSE 连接
     */
    connect() {
        const connectionId = (this.connectionSequence || 0) + 1;
        this.connectionSequence = connectionId;

        // 连接前重置状态
        this.abortController = new AbortController();

        // 从 options 中提取 headers，避免被覆盖
        const { headers: optionsHeaders, ...restOptions } = this.options;

        // 构建 headers：如果用户没有指定 Content-Type，则使用默认值 application/json
        const headers = {
            ...(optionsHeaders || {}),
        };
        // 如果用户没有指定 Content-Type，则设置默认值
        if (!headers["Content-Type"] && !headers["content-type"]) {
            headers["Content-Type"] = "application/json";
        }

        let _options = {
            method: this.options.method?.toUpperCase() || "POST",
            body:
                this.options.method?.toUpperCase() === "GET"
                    ? undefined
                    : JSON.stringify(this.options.data || {}),
            openWhenHidden: true,
            signal: this.abortController.signal, // 传递AbortSignal以支持取消请求
            retry: this.options.retry !== undefined ? this.options.retry : true, // 默认启用重试
            onopen: (res) => {
                const { status } = res;
                if (status == 401) {
                    this.unauthorizedConnectionId = connectionId;
                    this.context
                        .unauthorized()
                        .catch(() => this.context.emit("close"));
                } else if (status != 200) {
                    this.context.emit("error", res);
                }
            },
            onmessage: (msg) => {
                if (!msg) return;
                this.context.emit("rawMessage", msg);
                try {
                    const message = JSON.parse(msg.data);
                    // 使用责任链处理消息
                    this.context.filterManager
                        .getFilterChain()
                        .handle(message, this.context);
                } catch (error) {
                    error.status = error.status || 422; // 数据格式错误
                    this.context.emit("error", error);
                }
            },
            onclose: () => {
                if (this.unauthorizedConnectionId === connectionId) {
                    return;
                }
                this.context.emit("close");
            },
            onerror: (err) => {
                this.context.emit("error", err);
                this.context.emit("close");
                throw err;
            },
            // 先展开其他 options
            ...restOptions,
            // 最后设置 headers，确保不会被覆盖
            headers,
        };

        fetchEventSource(this.url, _options);
    }

    /**
     * 中止 Web 平台的连接
     */
    abort() {
        if (this.abortController) {
            this.abortController.abort();
            this.abortController = null;
        }
    }
}
