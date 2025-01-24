import { debugLog, errorLog } from "@/common/log";

const chunkSize = 1024 * 1024 * 50;

export default function useMessage() {
    const postSuccessMessage = (message, data, { from = null, to = null, sendMessageFunction = null } = {}) => {
        // Here will throw exception "Message length exceeded maximum allowed length."
        // IPC messages will fail at > 128 MB. Restrict extension messages to 64 MB.
        // https://chromium.googlesource.com/chromium/src.git/+/refs/tags/134.0.6946.1/extensions/renderer/api/messaging/messaging_util.cc
        if (typeof data === 'string' && data.length > chunkSize) {
            let resultLength = data.length;
            let chunkTotal = parseInt(resultLength / chunkSize);
            if (resultLength % chunkSize > 0) {
                chunkTotal += 1;
            }
            for (let i = 0; i < chunkTotal; i++) {
                let currentLength = i * chunkSize;
                let chunk = i + 1;
                if (chunk == chunkTotal) {
                    //last chunk
                    _postSuccessMessage(message, data.slice(currentLength, resultLength), { chunk, chunkTotal, from, to, sendMessageFunction });
                } else {
                    let nextLength = chunk * chunkSize;
                    _postSuccessMessage(message, data.slice(currentLength, nextLength), { chunk, chunkTotal, from, to, sendMessageFunction });
                }
            }
        } else {
            _postSuccessMessage(message, data, { from, to, sendMessageFunction });
        }
    }
    const postErrorMessage = (message, error, { from = null, to = null, sendMessageFunction = null } = {}) => {
        message.from = from;
        message.to = to;
        message.error = error;
        errorLog(
            "[Message][send][" +
            message.from +
            " -> " +
            message.to +
            "] message [action=" +
            message.action +
            ",invokeEnv=" +
            message.invokeEnv +
            ",callbackId=" +
            message.callbackId +
            ",error=" +
            message.error +
            "]"
        );
        let resultMessage = JSON.parse(JSON.stringify(message));
        debugLog(resultMessage);
        sendMessageFunction({
            data: resultMessage,
        })
    }

    function _postSuccessMessage(message, data, { chunk = null, chunkTotal = null, from = null, to = null, sendMessageFunction = null } = {}) {
        message.from = from;
        message.to = to;
        debugLog(
            "[Message][send][" +
            message.from +
            " -> " +
            message.to +
            "] message [action=" +
            message.action +
            ",invokeEnv=" +
            message.invokeEnv +
            ",callbackId=" +
            message.callbackId +
            ",error=" +
            message.error +
            "]"
        );
        message.chunk = chunk;
        message.chunkTotal = chunkTotal;
        let resultMessage = JSON.parse(JSON.stringify(message));
        resultMessage.data = data;
        sendMessageFunction({
            data: resultMessage,
        })
    }

    return { postSuccessMessage, postErrorMessage }

}

