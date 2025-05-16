import { postErrorMessage, postSuccessMessage } from "@/common/extension/worker/util";
import { useTask } from "@/common/hooks/task";
import { infoLog, errorLog } from "@/common/log";
import { _getUser, runScheduleTask, runTask } from "./app";
import { calculateDataSharePartnerList, getDataSharePlanConfig } from "./app/dataSharePlan";
import { calculateDownloadTask } from "./app/taskDownload";
import { calculateUploadTask, createRepoIfNotExists } from "./app/taskUpload";
const { getPrivateUploadTaskTypeFromConfig, getPrivateRepoName,
  getPrivateDownloadTaskTypeFromConfig, getTaskTypeListFromDataSharePartnerConfig } = useTask();

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
          infoLog(`[Task] has login info userName = ${userName}`)
          infoLog(`[Task] calculateUploadTask`)
          const enablePrivateUploadTaskTypeList = getPrivateUploadTaskTypeFromConfig(dataSharePlanConfig);
          infoLog(`[Task] calculateUploadTask enable upload task type list = ${enablePrivateUploadTaskTypeList}`)
          const shareDataPlanList = [];
          if (enablePrivateUploadTaskTypeList.length > 0) {
            const repoName = getPrivateRepoName();
            createRepoIfNotExists({ userName, repoName, isPrivate: true });
            for (let i = 0; i < enablePrivateUploadTaskTypeList.length; i++) {
              const taskType = enablePrivateUploadTaskTypeList[i];
              await calculateUploadTask({ userName, repoName, taskType });
            }
            const enablePrivateDownloadTaskTypeList = getPrivateDownloadTaskTypeFromConfig(dataSharePlanConfig);
            shareDataPlanList.push({ username: userName, reponame: repoName, config: { taskTypeList: enablePrivateDownloadTaskTypeList } });
          }
          //从数据库中获取数据共享伙伴列表
          let dataSharePartnerList = await calculateDataSharePartnerList();
          shareDataPlanList.push(...dataSharePartnerList);
          infoLog(`[TASK] Share data plan list length = ${shareDataPlanList.length}`);
          for (let i = 0; i < shareDataPlanList.length; i++) {
            const shareItem = shareDataPlanList[i];
            const taskTypeList = getTaskTypeListFromDataSharePartnerConfig(shareItem.config);
            for (let n = 0; n < taskTypeList.length; n++) {
              const taskType = taskTypeList[n];
              await calculateDownloadTask({ userName: shareItem.username, repoName: shareItem.reponame, taskType });
            }
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
      errorLog(e);
      postErrorMessage(
        message,
        "[worker] appBackgroundTaskRun error : " + e.message
      );
    }
  },
}

