import { postSuccessMessage, postErrorMessage } from "@/common/extension/background/util";

export const EmitterService = {

    emitterEmit: async function (message, param) {
        try {
            await chrome.storage.local.set(param);
            postSuccessMessage(message, {});
        } catch (e) {
            postErrorMessage(
                message,
                "[background] emitterEmit error : " + e.message
            );
        }
    },
}