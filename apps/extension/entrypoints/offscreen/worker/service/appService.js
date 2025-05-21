import { postErrorMessage, postSuccessMessage } from "@/common/extension/worker/util";
import { useTask } from "@/common/hooks/task";
import { infoLog, errorLog, warnLog } from "@/common/log";
import { _getUser, runScheduleTask, runTask } from "./app";
import { calculateDataSharePartnerList, getDataSharePlanConfig } from "./app/dataSharePlan";
import { calculateDownloadTask } from "./app/taskDownload";
import { calculateUploadTask, createRepoIfNotExists } from "./app/taskUpload";
const {
  getPrivateUploadTaskTypeFromConfig, getPrivateRepoName,
  getPrivateDownloadTaskTypeFromConfig, getTaskTypeListFromDataSharePartnerConfig,
  getPublicUploadTaskTypeFromConfig, getPublicRepoName,
  getPublicDownloadTaskTypeFromConfig,
} = useTask();

export const AppService = {

  appBackgroundTaskRun: async function (message, param) {
    try {
      const shareDataPlanList = [];
      let dataSharePlanConfig = await getDataSharePlanConfig();
      if (dataSharePlanConfig.enable) {
        infoLog(`[TASK] private data sync enable`);
        infoLog(`[TASK] private data sync task running`);
        let userDTO = await _getUser();
        if (userDTO) {
          let userName = userDTO.login;
          infoLog(`[Task] has login info userName = ${userName}`)
          infoLog(`[Task] private calculateUploadTask`)
          const enablePrivateUploadTaskTypeList = getPrivateUploadTaskTypeFromConfig(dataSharePlanConfig);
          infoLog(`[Task] private calculateUploadTask enable upload task type list = ${JSON.stringify(enablePrivateUploadTaskTypeList)}`)
          if (enablePrivateUploadTaskTypeList.length > 0) {
            const repoName = getPrivateRepoName();
            try {
              await createRepoIfNotExists({ userName, repoName, isPrivate: true });
            } catch (e) {
              warnLog(`[Task] createRepoIfNotExists ${userName}/${repoName} failure,message = ${e}`)
            }
            for (let i = 0; i < enablePrivateUploadTaskTypeList.length; i++) {
              const taskType = enablePrivateUploadTaskTypeList[i].type;
              try {
                await calculateUploadTask({ userName, repoName, taskType });
              } catch (e) {
                warnLog(`[Task] private calculateUploadTask failure,message = ${e}`)
              }
            }
            const enablePrivateDownloadTaskTypeList = getPrivateDownloadTaskTypeFromConfig(dataSharePlanConfig);
            shareDataPlanList.push({ username: userName, reponame: repoName, config: { taskTypeList: enablePrivateDownloadTaskTypeList } });
          }
        } else {
          infoLog(`[TASK] no login info`)
          infoLog(`[TASK] skip private upload task calculate and self private data download`)
        }
      } else {
        infoLog(`[TASK] skip private data sync`)
      }
      if (dataSharePlanConfig.enablePublic) {
        infoLog(`[TASK] public data sync enable`);
        infoLog(`[TASK] public data sync task running`);
        let userDTO = await _getUser();
        if (userDTO) {
          let userName = userDTO.login;
          infoLog(`[Task] has login info userName = ${userName}`)
          infoLog(`[Task] public calculateUploadTask`)
          const enablePublicUploadTaskTypeList = getPublicUploadTaskTypeFromConfig(dataSharePlanConfig);
          infoLog(`[Task] public calculateUploadTask enable upload task type list = ${JSON.stringify(enablePublicUploadTaskTypeList)}`)
          if (enablePublicUploadTaskTypeList.length > 0) {
            const repoName = getPublicRepoName();
            try {
              await createRepoIfNotExists({ userName, repoName, isPrivate: false });
            } catch (e) {
              warnLog(`[Task] createRepoIfNotExists ${userName}/${repoName} failure,message = ${e}`)
            }
            for (let i = 0; i < enablePublicUploadTaskTypeList.length; i++) {
              const taskType = enablePublicUploadTaskTypeList[i].type;
              try {
                await calculateUploadTask({ userName, repoName, taskType });
              } catch (e) {
                warnLog(`[Task] public calculateUploadTask failure,message = ${e}`)
              }
            }
            const enablePublicDownloadTaskTypeList = getPublicDownloadTaskTypeFromConfig(dataSharePlanConfig);
            shareDataPlanList.push({ username: userName, reponame: repoName, config: { taskTypeList: enablePublicDownloadTaskTypeList } });
          }
        } else {
          infoLog(`[TASK] no login info`)
          infoLog(`[TASK] skip public upload task calculate and self private data download`)
        }
      } else {
        infoLog(`[TASK] skip public data sync`)
      }
      //从数据库中获取数据共享伙伴列表
      let dataSharePartnerList = await calculateDataSharePartnerList();
      shareDataPlanList.push(...dataSharePartnerList);
      infoLog(`[TASK] Share data plan list length = ${shareDataPlanList.length}`);
      for (let i = 0; i < shareDataPlanList.length; i++) {
        const shareItem = shareDataPlanList[i];
        const taskTypeList = getTaskTypeListFromDataSharePartnerConfig(shareItem.config);
        for (let n = 0; n < taskTypeList.length; n++) {
          const taskType = taskTypeList[n].type;
          try {
            await calculateDownloadTask({ userName: shareItem.username, repoName: shareItem.reponame, taskType });
          } catch (e) {
            warnLog(`[Task] calculateDownloadTask failure,${shareItem.username}/${shareItem.reponame},taskType = ${taskType},message = ${e}`)
          }
        }
      }
      infoLog(`[TASK] runTask`)
      await runTask();
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

