import { getLines, getMessages, stringToUint8Array } from "../utils.js";
import { BaseAdapter } from "./baseAdapter.js";

/**
 * 微信小程序平台适配器
 * 使用自定义的 fetchEventSource 实现 SSE 连接
 */
export class WeixinAdapter extends BaseAdapter {
    /**
     * 建立微信小程序平台的 SSE 连接
     */
    connect() {
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
            timeout: this.options.timeout || 60000,
            onopen: (res) => {
                const statusCode = res.statusCode || res.status;
                if (statusCode == 401) {
                    this.context.unauthorized();
                    return;
                } else if (statusCode != 200) {
                    this.context.emit("error", res);
                }
            },
            onmessage: (msg) => {
                if (!msg) return;
                this.context.emit('rawMessage', msg);
                try {
                    const message = JSON.parse(msg.data);
                    if (message.event === "error") {
                        const serverError = new Error("服务器繁忙，请稍后再试。");
                        serverError.status = 500; // 服务器错误
                        this.context.emit("error", serverError);
                        return;
                    }
                    // 使用责任链处理消息
                    this.context.filterManager.getFilterChain().handle(message, this.context);
                } catch (error) {
                    error.status = error.status || 422; // 数据格式错误
                    this.context.emit("error", error);
                }
            },
            onclose: () => {
                this.context.emit("close");
            },
            onerror: (err) => {
                this.context.emit("error", err);
            },
            // 先展开其他 options，允许用户复写 on 方法
            ...restOptions,
            // 最后设置 headers，确保不会被覆盖
            headers,
        };

        // 创建 SSE 消息解析器
        const onChunk = getLines(
            getMessages(() => {}, () => {}, _options.onmessage)
        );

        // 连接前重置状态
        this.eventSource = wx.request({
            url: this.url,
            method: _options.method,
            data: _options.body,
            header: _options.headers,
            enableChunked: true,
            timeout: _options.timeout,
            success(res) {
                if (_options.onclose) {
                    _options.onclose(res);
                }
            },
            fail(err) {
                if (_options.onerror) {
                    _options.onerror(err);
                }
            },
        });

        // 监听响应头，检查状态码
        // 当使用 enableChunked 时，非 200 状态码可能不会触发 success 或 fail
        this.eventSource.onHeadersReceived((res) => {
            if (_options.onopen) {
                _options.onopen(res);
            }
        });

        this.eventSource.onChunkReceived((chunkData) => {
            try {
                // 微信小程序的 chunkData.data 可能是 ArrayBuffer 或字符串
                let uint8Array;
                if (typeof chunkData.data === "string") {
                    // 如果是字符串，转换为 Uint8Array
                    uint8Array = stringToUint8Array(chunkData.data);
                } else {
                    // 如果是 ArrayBuffer，转换为 Uint8Array
                    uint8Array = new Uint8Array(chunkData.data);
                }
                // 使用解析器处理字节流
                onChunk(uint8Array);
            } catch (err) {
                console.error("[SSE] 处理数据块时出错:", err);
                if (_options.onerror) {
                    _options.onerror(err);
                }
            }
        });
    }

    /**
     * 中止微信小程序平台的连接
     */
    abort() {
        if (this.eventSource) {
            this.eventSource.abort();
            this.eventSource = null;
        }
    }
}
