import { postErrorMessage, postSuccessMessage } from "../util";
import { _getConfigByKey } from "./configService";
import { CONFIG_KEY_DATA_SHARE_PLAN, DEFAULT_DATA_REPO } from "@/common/config";
import { DataSharePlanConfigDTO } from "@/common/data/dto/dataSharePlanConfigDTO";
import { infoLog } from "@/common/log";
import { calculateUploadTask, calculateDataSharePartnerList, calculateDownloadTask, runTask, _getUser, runScheduleTask } from "./app";

export const AppService = {

    appBackgroundTaskRun: async function (message, param) {
        try {
            let dataSharePlanConfig = new DataSharePlanConfigDTO();
            let configValue = await _getConfigByKey(CONFIG_KEY_DATA_SHARE_PLAN);
            if (configValue && configValue.value) {
                dataSharePlanConfig = JSON.parse(configValue.value);
            }
            if (dataSharePlanConfig.enable) {
                infoLog(`[TASK] Data share plan enable`);
                infoLog(`[TASK] Data share plan task running`);
                let userDTO = await _getUser();
                if (userDTO) {
                    let userName = userDTO.login;
                    let repoName = DEFAULT_DATA_REPO;
                    infoLog(`[Task] has login info userName = ${userName}`)
                    infoLog(`[Task] calculateUploadTask`)
                    await calculateUploadTask({ userName: userName, repoName: repoName });
                    //获取自身的数据共享计划仓库
                    let shareDataPlanList = [{ username: userName, reponame: DEFAULT_DATA_REPO }];
                    //从数据库中获取数据共享伙伴列表
                    let dataSharePartnerList = await calculateDataSharePartnerList();
                    shareDataPlanList.push(...dataSharePartnerList);
                    infoLog(`[TASK] Share data plan list length = ${shareDataPlanList.length}`);
                    for (let i = 0; i < shareDataPlanList.length; i++) {
                        let shareItem = shareDataPlanList[i];
                        await calculateDownloadTask({ userName: shareItem.username, repoName: shareItem.reponame });
                    }
                    infoLog(`[TASK] runTask`)
                    await runTask();
                } else {
                    infoLog(`[TASK] no login info`)
                    infoLog(`[TASK] skip data share plan`)
                }
            } else {
                infoLog(`[TASK] Data share plan disable`);
                infoLog(`[TASK] Data share plan task skip`);
            }
            //TODO
            // infoLog(`[TASK] runScheduleTask`)
            // await runScheduleTask();
            postSuccessMessage(message, {});
        } catch (e) {
            postErrorMessage(
                message,
                "[worker] appBackgroundTaskRun error : " + e.message
            );
        }
    },
}

