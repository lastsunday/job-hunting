import { DEFAULT_DATA_REPO } from "@/common/config";
import { postErrorMessage, postSuccessMessage } from "@/common/extension/worker/util";
import { infoLog } from "@/common/log";
import { _getUser, runScheduleTask, runTask } from "./app";
import { calculateDataSharePartnerList, getDataSharePlanConfig } from "./app/dataSharePlan";
import { calculateDownloadTask } from "./app/taskDownload";
import { calculateUploadTask } from "./app/taskUpload";

export const AppService = {

    appBackgroundTaskRun: async function (message, param) {
        try {
            let dataSharePlanConfig = await getDataSharePlanConfig();
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
            infoLog(`[TASK] runScheduleTask`)
            await runScheduleTask();
            postSuccessMessage(message, {});
        } catch (e) {
            postErrorMessage(
                message,
                "[worker] appBackgroundTaskRun error : " + e.message
            );
        }
    },
}

