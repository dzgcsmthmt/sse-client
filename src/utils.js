import { WebAdapter, WeixinAdapter } from "./adapters/index.js";

/**
 * 检测当前运行环境是否为微信小程序
 * @returns {boolean} 如果在微信小程序环境返回 true，否则返回 false
 */
export function isWeixinMiniProgram() {
    return typeof wx !== 'undefined' && typeof wx.request === 'function';
}

/**
 * 根据运行环境自动选择默认适配器
 * @returns {Function} 返回适配器类
 */
export function getDefaultAdapter() {
    return isWeixinMiniProgram() ? WeixinAdapter : WebAdapter;
}

/**
 * TextDecoder polyfill - 用于小程序环境
 * 将 UTF-8 字节数组解码为字符串
 * @param {Uint8Array} bytes - UTF-8 编码的字节数组
 * @returns {string} 解码后的字符串
 */
export function decodeUTF8(bytes) {
    let str = "";
    let i = 0;
    while (i < bytes.length) {
        const byte1 = bytes[i++];
        if (byte1 < 0x80) {
            // 单字节字符 (0xxxxxxx)
            str += String.fromCharCode(byte1);
        } else if ((byte1 & 0xe0) === 0xc0) {
            // 双字节字符 (110xxxxx 10xxxxxx)
            const byte2 = bytes[i++];
            str += String.fromCharCode(((byte1 & 0x1f) << 6) | (byte2 & 0x3f));
        } else if ((byte1 & 0xf0) === 0xe0) {
            // 三字节字符 (1110xxxx 10xxxxxx 10xxxxxx)
            const byte2 = bytes[i++];
            const byte3 = bytes[i++];
            str += String.fromCharCode(
                ((byte1 & 0x0f) << 12) | ((byte2 & 0x3f) << 6) | (byte3 & 0x3f)
            );
        } else if ((byte1 & 0xf8) === 0xf0) {
            // 四字节字符 (11110xxx 10xxxxxx 10xxxxxx 10xxxxxx)
            const byte2 = bytes[i++];
            const byte3 = bytes[i++];
            const byte4 = bytes[i++];
            let codePoint =
                ((byte1 & 0x07) << 18) |
                ((byte2 & 0x3f) << 12) |
                ((byte3 & 0x3f) << 6) |
                (byte4 & 0x3f);
            // 转换为 UTF-16 代理对
            codePoint -= 0x10000;
            str += String.fromCharCode(
                0xd800 | (codePoint >> 10),
                0xdc00 | (codePoint & 0x3ff)
            );
        }
    }
    return str;
}

/**
 * 将 Uint8Array 字节数组转换为字符串
 * 优先使用原生 TextDecoder，如果不存在则使用 polyfill
 * @param {Uint8Array} bytes - 要解码的字节数组
 * @returns {string} 解码后的字符串
 */
export function uint8ArrayToString(bytes) {
    // 优先使用原生 TextDecoder，如果不存在则使用 polyfill
    if (typeof TextDecoder !== "undefined") {
        const decoder = new TextDecoder();
        return decoder.decode(bytes);
    }
    return decodeUTF8(bytes);
}

/**
 * 连接两个 Uint8Array
 * @param {Uint8Array} a - 第一个数组
 * @param {Uint8Array} b - 第二个数组
 * @returns {Uint8Array} 连接后的数组
 */
export function concat(a, b) {
    const res = new Uint8Array(a.length + b.length);
    res.set(a);
    res.set(b, a.length);
    return res;
}

/**
 * 创建新的 SSE 消息对象
 * @returns {Object} 包含 data、event、id、retry 字段的消息对象
 */
export function newMessage() {
    return {
        data: "",
        event: "",
        id: "",
        retry: undefined,
    };
}

/**
 * 将字节流解析为 SSE 行
 * 每行格式应为 "field: value"，并以 \r、\n 或 \r\n 结尾
 * @param {Function} onLine - 每次接收到新 SSE 行时调用的函数
 * @returns {Function} 应为每个传入的字节块调用的函数
 */
export function getLines(onLine) {
    let buffer;
    let position; // 当前读取位置
    let fieldLength; // 行的 `field` 部分的长度
    let discardTrailingNewline = false;

    // 返回一个可以处理每个传入字节块的函数
    return function onChunk(arr) {
        if (buffer === undefined) {
            buffer = arr;
            position = 0;
            fieldLength = -1;
        } else {
            // 仍在解析旧行，将新字节追加到缓冲区
            buffer = concat(buffer, arr);
        }

        const bufLength = buffer.length;
        let lineStart = 0; // 当前行开始的索引
        while (position < bufLength) {
            if (discardTrailingNewline) {
                if (buffer[position] === 10) {
                    // \n
                    lineStart = ++position; // 跳到下一个字符
                }
                discardTrailingNewline = false;
            }

            // 开始向前查找直到行尾
            let lineEnd = -1; // \r 或 \n 字符的索引
            for (; position < bufLength && lineEnd === -1; ++position) {
                switch (buffer[position]) {
                    case 58: // 冒号 ':'
                        if (fieldLength === -1) {
                            // 行中的第一个冒号
                            fieldLength = position - lineStart;
                        }
                        break;
                    case 13: // \r
                        discardTrailingNewline = true;
                    // 穿透到下一个 case
                    case 10: // \n
                        lineEnd = position;
                        break;
                }
            }

            if (lineEnd === -1) {
                // 到达缓冲区末尾但行未结束
                // 等待下一个 arr 然后继续解析
                break;
            }

            // 到达行尾，发送出去
            onLine(buffer.subarray(lineStart, lineEnd), fieldLength);
            lineStart = position; // 现在在下一行
            fieldLength = -1;
        }

        if (lineStart === bufLength) {
            buffer = undefined; // 完成读取
        } else if (lineStart !== 0) {
            // 创建一个从 lineStart 开始的新缓冲区视图
            buffer = buffer.subarray(lineStart);
            position -= lineStart;
        }
    };
}

/**
 * 将行缓冲区解析为 SSE 消息
 * @param {Function} onId - 每次接收到 `id` 字段时调用的函数
 * @param {Function} onRetry - 每次接收到 `retry` 字段时调用的函数
 * @param {Function} onMessage - 每次接收到完整消息时调用的函数
 * @returns {Function} 应为每个传入的行缓冲区调用的函数
 */
export function getMessages(onId, onRetry, onMessage) {
    let message = newMessage();

    // 返回一个可以处理每个传入行缓冲区的函数
    return function onLine(line, fieldLength) {
        if (line.length === 0) {
            // 空行表示消息结束。触发回调并开始新消息
            if (onMessage) {
                onMessage(message);
            }
            message = newMessage();
        } else if (fieldLength > 0) {
            // 排除注释和没有值的行
            // 行格式为 "<field>:<value>" 或 "<field>: <value>"
            const field = uint8ArrayToString(line.subarray(0, fieldLength));
            const valueOffset =
                fieldLength + (line[fieldLength + 1] === 32 ? 2 : 1); // 32 是空格
            const value = uint8ArrayToString(line.subarray(valueOffset));

            switch (field) {
                case "data":
                    // 如果此消息已有数据，将新值追加到旧值
                    // 否则，只设置为新值
                    message.data = message.data
                        ? message.data + "\n" + value
                        : value;
                    break;
                case "event":
                    message.event = value;
                    break;
                case "id":
                    message.id = value;
                    if (onId) {
                        onId(message.id);
                    }
                    break;
                case "retry":
                    const retry = parseInt(value, 10);
                    if (!isNaN(retry)) {
                        // 根据规范，忽略非整数
                        message.retry = retry;
                        if (onRetry) {
                            onRetry(message.retry);
                        }
                    }
                    break;
            }
        }
    };
}

/**
 * 字符串转换为 Uint8Array
 * @param {string} str - 输入字符串
 * @returns {Uint8Array} 转换后的字节数组
 */
export function stringToUint8Array(str) {
    const arr = [];
    for (let i = 0; i < str.length; i++) {
        const charCode = str.charCodeAt(i);
        if (charCode < 0x80) {
            arr.push(charCode);
        } else if (charCode < 0x800) {
            arr.push(0xc0 | (charCode >> 6), 0x80 | (charCode & 0x3f));
        } else if (charCode < 0xd800 || charCode >= 0xe000) {
            arr.push(
                0xe0 | (charCode >> 12),
                0x80 | ((charCode >> 6) & 0x3f),
                0x80 | (charCode & 0x3f)
            );
        } else {
            // UTF-16 代理对
            i++;
            const codePoint =
                0x10000 +
                (((charCode & 0x3ff) << 10) | (str.charCodeAt(i) & 0x3ff));
            arr.push(
                0xf0 | (codePoint >> 18),
                0x80 | ((codePoint >> 12) & 0x3f),
                0x80 | ((codePoint >> 6) & 0x3f),
                0x80 | (codePoint & 0x3f)
            );
        }
    }
    return new Uint8Array(arr);
}
