import { Message } from "../../common/api/message";
import { postSuccessMessage, postErrorMessage } from "../util";
import { Config } from "../../common/data/domain/config";
import { _addOrUpdateConfig, _getConfigByKey } from "./configService";

const KEY_DEVELOPER_TOKEN = "KEY_DEVELOPER_TOKEN";

export const DeveloperService = {

    /**
     *
     * @param {Message} message
     * @param {string} param token
     */
    developerSetToken: async function (message, param) {
        try {
            await _setDeveloperToken(param);
            postSuccessMessage(message, {});
        } catch (e) {
            postErrorMessage(
                message,
                "[worker] developerSetToken error : " + e.message
            );
        }
    },
    /**
    *
    * @param {Message} message
    * @param {} param
    */
    developerGetToken: async function (message, param) {
        try {
            postSuccessMessage(message, await _getDeveloperToken());
        } catch (e) {
            postErrorMessage(
                message,
                "[worker] developerGetToken error : " + e.message
            );
        }
    },

};

/**
 * 
 * @param {string} param token 
 */
export async function _setDeveloperToken(param) {
    let config = new Config();
    config.key = KEY_DEVELOPER_TOKEN;
    config.value = JSON.stringify(param);
    return _addOrUpdateConfig(config);
}

/**
 * 
 * @returns token
 */
export async function _getDeveloperToken() {
    let item = null;
    let config = await _getConfigByKey(KEY_DEVELOPER_TOKEN);
    if (config) {
        item = JSON.parse(config.value);
    }
    return item;
}
