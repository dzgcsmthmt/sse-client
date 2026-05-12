# SSE 客户端库

一个功能强大的 JavaScript SSE（Server-Sent Events）客户端库，基于责任链模式实现消息过滤处理，支持灵活的事件驱动架构。

## 特性

✨ **核心功能**

- 基于 EventEmitter 的事件驱动架构
- 支持 SSE 连接的建立、维护和关闭
- token 刷新机制：支持自定义 `refreshToken` 函数，或配置 `refresh_token_address` 由库自动请求刷新接口
- 完整的错误处理和重连机制
- 纯 JavaScript 实现，无框架依赖

🔧 **过滤器系统**

- 基于责任链模式的消息过滤器
- 默认内置三个过滤器：`MessageFilter`、`ThinkingFilter`（`src/filters/thinkingFilter.js`）、`ErrorFilter`（`src/filters/errorFilter.js`），构造函数的 `filters` 参数可传入自定义列表覆盖默认链
- 支持自定义过滤器扩展
- 灵活的过滤器管理（头部添加、尾部追加、插入、替换、移除、清空）

🎯 **框架兼容**

- 框架无关，可与任何前端框架集成
- 支持多种 JavaScript 模块系统（UMD、CJS、ESM）

🌐 **平台适配**

- 自动检测运行环境并选择合适的适配器
- Web 平台：使用 `@microsoft/fetch-event-source` 实现
- 微信小程序：使用 `wx.request` 实现流式响应
- 支持自定义适配器扩展

## 安装

```bash
npm install fb-sse-client
```

## 快速开始

### 基础使用

```javascript
import { SSEInstance } from "fb-sse-client";

// 创建SSE实例
const sse = new SSEInstance(
    "https://your-api-endpoint.com/sse", // API地址
    {
        data: {
            // 请求数据
            conversation_id: "your-conversation-id",
            model_codes: ["gpt-4o-mini"],
        },
        headers: {
            Authorization: "Bearer your-access-token", // 认证token放在headers中（可选，如果提供了refreshToken，token会自动更新到headers）
        },
        // 二选一：自定义刷新函数，或配置 refresh_token_address 由库自动请求（见下文「Token 刷新」）
        refreshToken: handleTokenRefresh,
        // refresh_token_address: "https://www.xh.com",
    },
);

// 监听事件
sse.on("message", (messageId, answer) => {
    console.log("收到消息:", messageId, answer);
});

sse.on("error", (error) => {
    if (error.status === 401) {
        console.log("您的登录状态已失效，还请重新登录");
    } else if (error.status === 500) {
        console.log("服务器错误:", error.message);
    } else if (error.status === 422) {
        console.log("数据格式错误:", error.message);
    } else {
        console.log(error.message);
    }
});

// 开始连接
sse.connect();
```

### 微信小程序使用示例

```javascript
import { SSEInstance } from "fb-sse-client";

// 在微信小程序中，库会自动使用 WeixinAdapter
const sse = new SSEInstance("https://your-api-endpoint.com/sse", {
    data: {
        conversation_id: "your-conversation-id",
        model_codes: ["gpt-4o-mini"],
    },
    headers: {
        Authorization: "Bearer your-access-token",
    },
    timeout: 60000, // 微信小程序特有：设置超时时间（毫秒）
    refreshToken: handleTokenRefresh,
});

// 监听事件
sse.on("message", (messageId, answer) => {
    console.log("收到消息:", messageId, answer);
});

// 开始连接
sse.connect();
```

### 自定义过滤器

```javascript
import { BaseFilter } from "fb-sse-client";

/**
 * 自定义日志过滤器
 */
class LogFilter extends BaseFilter {
    constructor() {
        super();
        this.filterType = "log";
    }

    /**
     * 判断是否可以处理此消息
     */
    canHandle(msg) {
        return msg.type === "log";
    }

    /**
     * 处理消息的具体逻辑
     */
    process(msg, sseInstance) {
        console.log("日志消息:", msg.content);
        // 发出自定义事件
        sseInstance.emit("log", msg.content);
        // 返回true继续传递给下一个过滤器，false则停止传递
        return true;
    }
}

// 添加自定义过滤器
const logFilter = new LogFilter();
sse.filterManager.prependFilter(logFilter);

// 在指定过滤器之前插入
sse.filterManager.insertFilterBeforeType(logFilter, "thinking");

// 监听自定义事件
sse.on("log", (content) => {
    console.log("收到日志事件:", content);
});
```

## API 文档

### SSEInstance 类

#### 构造函数

```javascript
new SSEInstance(url, options, filters, AdapterClass);
```

**参数:**

- `url` (string): SSE 服务端点 URL，必需
- `options` (Object): 配置选项，可选，默认为 `{}`
- `filters` (Array<Function>): 自定义过滤器构造函数数组，可选，默认为 `[ThinkingFilter, MessageFilter, ErrorFilter]`
- `AdapterClass` (Function): 自定义适配器类，可选，默认根据环境自动选择（微信小程序使用 WeixinAdapter，否则使用 WebAdapter）

**options 配置项:**

```javascript
{
    // HTTP请求配置
    method: 'POST',                    // HTTP方法，默认POST，支持GET/POST
    data: {},                          // 请求数据，GET请求时忽略此项

    // SSE连接配置
    openWhenHidden: true,              // 页面隐藏时是否保持连接，默认true（仅WebAdapter）
    retry: true,                       // 是否启用自动重试，默认true（仅WebAdapter）
    timeout: 60000,                    // 请求超时时间（毫秒），默认60000（仅WeixinAdapter）

    // 认证和错误处理（Token 刷新二选一，也可同时提供函数优先）
    // 方式一：自定义 refreshToken，收到 401 时调用；须返回 Promise，resolve 值为新的 token 字符串（可带或不带 Bearer 前缀，库会统一处理）
    refreshToken: function(oldToken) {
        return fetch('/api/refresh-token', { /* ... */ }).then((res) => res.json()).then((data) => data.access_token);
    },

    // 方式二：配置 refresh_token_address，由库自动请求刷新（实现见 src/utils.js 的 refreshToken）
    // 请求地址为：{refresh_token_address}/gateway/account/auth/refreshtoken，POST JSON：access_token（去掉 Bearer）、client_id
    // client_id 默认为 xh，可通过下方 client_id 覆盖
    // refresh_token_address: 'https://www.xh.com',

    client_id: 'xh', // 与 refresh_token_address 联用时传递给刷新接口，默认 xh

    // 库完成刷新并重连成功后回调（可选）
    // refreshTokenSuccessed: function (newToken) { /* ... */ },

    // 请求头配置（会与默认头合并）
    headers: {
        'Authorization': 'Bearer your-access-token', // 认证token应放在headers中,也可以不添加Bearer，会自动处理
        'Custom-Header': 'value'                     // 自定义请求头
        // 注意：如果未指定 Content-Type，默认会自动设置为 'application/json'
    },

    // fetchEventSource的其他配置项（仅WebAdapter）
    // 详见: https://github.com/Azure/fetch-event-source
    onopen: function(response) {       // 连接打开时的回调
        // 自定义onopen处理逻辑
        // 注意：这会覆盖内置的401处理逻辑
    },
    onerror: function(err) {          // 连接错误时的回调
        // 自定义错误处理逻辑
        // 注意：这会覆盖内置的错误处理逻辑
    },
    onclose: function() {             // 连接关闭时的回调
        // 自定义关闭处理逻辑
    },
    onmessage: function(msg) {        // 收到消息时的回调
        // 自定义消息处理逻辑
        // 注意：这会覆盖内置的过滤器链处理逻辑（仅WebAdapter）
    }
}
```

#### Token 刷新（`refreshToken` 与 `refresh_token_address`）

- **自定义函数**：配置 `options.refreshToken(oldToken)`，在 401 时由你自行请求刷新接口，并 `resolve` 新的 access token 字符串。
- **自动刷新**：配置 `options.refresh_token_address` 为站点根地址（无需带刷新路径），库会向 `{refresh_token_address}/gateway/account/auth/refreshtoken` 发起 POST，请求体为当前 `access_token`（自动去掉 `Bearer `）与 `client_id`（默认 `xh`，可通过 `options.client_id` 修改）。二者同时配置时，**优先使用** `refreshToken` 函数。
- **北大法宝环境根地址（示例）**：

| 环境 | `refresh_token_address` 示例 |
| ---- | ---------------------------- |
| 测试 | `https://test1.xh.com`   |
| 预发 | `https://pre.xh.com`     |
| 线上 | `https://www.xh.com`     |

刷新成功并重连后，若配置了 `options.refreshTokenSuccessed`，会以新 token 为参数调用该回调。

**内置错误状态码:**

库会自动为不同类型的错误设置状态码：

- `401`: 未授权/token 过期，若已配置 `refreshToken` 或 `refresh_token_address`，会尝试刷新后重连
- `500`: 服务器返回的错误消息（message.event === "error"）
- `422`: 数据格式错误（JSON 解析失败等）
- 其他: 网络错误、连接错误等

**适配器自动选择:**

库会根据运行环境自动选择合适的适配器：

- 如果在微信小程序环境（检测到 `wx` 对象），使用 `WeixinAdapter`
- 否则使用 `WebAdapter`

你也可以通过构造函数传入自定义适配器类来覆盖默认选择。

#### 核心方法

##### connect()

建立 SSE 连接

```javascript
sse.connect();
```

##### abort()

中止 SSE 连接

```javascript
sse.abort();
```

##### on(eventName, callback)

监听事件

```javascript
sse.on("rawMessage", (msg) => {
    console.log("原始消息:", msg);
});
sse.on("thinking", (messageId, answer) => {
    console.log("思考过程:", messageId, answer);
});

sse.on("message", (messageId, answer) => {
    console.log("收到消息:", messageId, answer);
});
```

#### 过滤器管理方法

过滤器管理方法通过 `filterManager` 属性访问。FilterManager 提供了以下方法：

##### prependFilter(filter)

添加过滤器到链的开头

```javascript
const customFilter = new CustomFilter();
sse.filterManager.prependFilter(customFilter);
```

##### appendFilter(filter)

添加过滤器到链的尾部

```javascript
const customFilter = new CustomFilter();
sse.filterManager.appendFilter(customFilter);
```

##### insertFilterBeforeType(newFilter, targetFilterType)

在指定类型过滤器之前插入

```javascript
sse.filterManager.insertFilterBeforeType(newFilter, "thinking");
```

##### replaceFilter(filterType, newFilter)

替换指定类型的过滤器

```javascript
sse.filterManager.replaceFilter("message", new CustomMessageFilter());
```

##### removeFilter(filterType)

移除指定类型的过滤器

```javascript
sse.filterManager.removeFilter("thinking");
```

##### clearFilter()

清空所有过滤器

```javascript
sse.filterManager.clearFilter();
```

##### getFilter(filterType)

获取指定类型的过滤器

```javascript
const thinkingFilter = sse.filterManager.getFilter("thinking");
```

### BaseFilter 基础过滤器类

创建自定义过滤器需要继承此类：

```javascript
import { BaseFilter } from "fb-sse-client";

class CustomFilter extends BaseFilter {
    constructor() {
        super();
        this.filterType = "custom"; // 设置过滤器类型
    }

    /**
     * 判断是否可以处理此消息
     * @param {Object} msg - 消息对象
     * @returns {boolean}
     */
    canHandle(msg) {
        return msg.type === "custom_message";
    }

    /**
     * 处理消息的具体逻辑
     * @param {Object} msg - 消息对象
     * @param {SSEInstance} sseInstance - SSE实例
     * @returns {boolean} - 是否继续传递给下一个过滤器
     */
    process(msg, sseInstance) {
        // 自定义处理逻辑
        console.log("处理自定义消息:", msg);

        // 发出自定义事件
        sseInstance.emit("custom_event", msg.content);

        // 返回true继续传递，false停止传递
        return true;
    }
}
```

### 内置过滤器

默认责任链顺序为：**ThinkingFilter → MessageFilter → ErrorFilter**。源码位于 `src/filters/`。

#### ThinkingFilter（思考过滤器，`src/filters/thinkingFilter.js`）

- 处理 SSE 消息中 `event === "thinking"` 的数据
- 发出 `thinking` 事件，参数为 `(messageId, answer)`
- 链路上 `filterType` 为 `"thinking"`

#### MessageFilter（消息过滤器，`src/filters/messageFilter.js`）

- 处理 `event === "message"` 的消息
- 发出 `message` 事件，参数为 `(messageId, answer)`
- 链路上 `filterType` 为 `"message"`

#### ErrorFilter（错误过滤器，`src/filters/errorFilter.js`）

- 处理 `event === "error"` 的服务端错误帧
- 发出 `error` 事件，错误对象 `message` 为提示 copy，`status` 为 `500`
- 链路上 `filterType` 为 `"error"`；处理后会中断责任链（不再向后传递）

### FilterManager 过滤器管理器

过滤器管理器负责管理过滤器链的增删改查操作。通过 `SSEInstance` 实例的 `filterManager` 属性访问。

**主要方法：**

- `prependFilter(filter)`: 在链的开头添加过滤器
- `appendFilter(filter)`: 在链的尾部添加过滤器
- `insertFilterBeforeType(newFilter, targetFilterType)`: 在指定类型过滤器之前插入
- `replaceFilter(filterType, newFilter)`: 替换指定类型的过滤器
- `removeFilter(filterType)`: 移除指定类型的过滤器
- `clearFilter()`: 清空所有过滤器
- `getFilter(filterType)`: 获取指定类型的过滤器
- `getFilterChain()`: 获取过滤器链的头节点

### BaseAdapter 基础适配器类

基础适配器类，不同平台需要继承此类并实现 `connect()` 和 `abort()` 方法。

**内置适配器：**

- `WebAdapter`: Web 平台适配器，使用 `@microsoft/fetch-event-source` 实现
- `WeixinAdapter`: 微信小程序平台适配器，使用 `wx.request` 实现

**自定义适配器示例：**

```javascript
import { BaseAdapter } from "fb-sse-client";

class CustomAdapter extends BaseAdapter {
    connect() {
        // 实现连接逻辑
    }

    abort() {
        // 实现中止逻辑
    }
}

// 使用自定义适配器
const sse = new SSEInstance(url, options, filters, CustomAdapter);
```

## 事件系统

SSEInstance 继承自 EventEmitter，支持以下事件：

### 系统事件

- `error`: 连接错误时触发
- `close`: 连接关闭时触发

### 内置过滤器事件

- `thinking`: 思考过程事件，参数：`(messageId, answer)`
- `message`: 消息内容事件，参数：`(messageId, answer)`

服务端通过 `event === "error"` 推送的错误由 **ErrorFilter** 转为实例上的 `error` 事件（见上文「内置过滤器」）。

### 适配器事件

- `rawMessage`: 原始消息事件，参数：`(msg)` - 在消息被 JSON 解析之前触发，可用于调试或自定义处理

### 自定义事件

过滤器可以触发自定义事件：

```javascript
class CustomFilter extends BaseFilter {
    process(msg, sseInstance) {
        // 触发自定义事件
        sseInstance.emit("custom_event", msg.data);
        return true;
    }
}

// 监听自定义事件
sse.on("custom_event", (data) => {
    console.log("收到自定义事件:", data);
});
```

## 完整示例

查看 `demo/index.html` 获取完整的使用示例，包括：

- 基本的 SSE 连接
- 自定义过滤器实现
- 错误处理
- 连接状态管理
- Token 自动刷新
- 事件监听和处理

## 项目结构

```
src/
├── index.js              # 主入口文件
├── eventEmitter.js       # 事件发射器实现
├── filterManager.js      # 过滤器管理器
├── utils.js              # 工具函数
├── adapters/
│   ├── index.js          # 适配器模块导出
│   ├── baseAdapter.js    # 基础适配器类
│   ├── webAdapter.js     # Web平台适配器
│   └── weixinAdapter.js  # 微信小程序平台适配器
└── filters/
    ├── index.js          # 过滤器模块导出
    ├── baseFilter.js     # 基础过滤器类
    ├── thinkingFilter.js # 思考过滤器（ThinkingFilter）
    ├── messageFilter.js # 消息过滤器（MessageFilter）
    └── errorFilter.js   # 错误过滤器（ErrorFilter）
```

## 构建和开发

```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 构建生产版本
npm run prod

# 代码检查
npm run lint

# 运行测试
npm run test
```

## 平台支持

- **Web 平台**: 现代浏览器 (Chrome, Firefox, Safari, Edge)
- **微信小程序**: 支持微信小程序环境，自动使用 WeixinAdapter

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request 来改进这个项目。
