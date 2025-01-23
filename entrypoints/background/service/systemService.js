import { postErrorMessage, postSuccessMessage } from "@/common/extension/background/util";

export const SystemService = {
    /**
     * @param {*} message
     * @param {{url}} param 
     * 
     * @return 
     */
    systemTabCreate: async function (message, param) {
        try {
            postSuccessMessage(message, await chrome.tabs.create(param));
        } catch (e) {
            postErrorMessage(
                message,
                "[background] userGet error : " + e.message
            );
        }
    },
};