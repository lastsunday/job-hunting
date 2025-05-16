import { AppService } from "@/entrypoints/offscreen/worker/service/appService";
import { test, vi, expect } from "vitest";
import * as modUtil from "@/common/extension/worker/util";
import * as modDataSharePlan from "@/entrypoints/offscreen/worker/service/app/dataSharePlan";
import * as modApp from "@/entrypoints/offscreen/worker/service/app";
import * as modTaskUpload from "@/entrypoints/offscreen/worker/service/app/taskUpload";
import * as modTaskDownload from "@/entrypoints/offscreen/worker/service/app/taskDownload";
import {
  TASK_TYPE_JOB_DATA_DOWNLOAD, TASK_TYPE_COMPANY_DATA_DOWNLOAD,
  TASK_TYPE_COMPANY_TAG_DATA_DOWNLOAD, TASK_TYPE_JOB_TAG_DATA_DOWNLOAD,
  TASK_TYPE_JOB_DATA_UPLOAD, TASK_TYPE_COMPANY_DATA_UPLOAD,
  TASK_TYPE_COMPANY_TAG_DATA_UPLOAD, TASK_TYPE_JOB_TAG_DATA_UPLOAD
} from "@/common";
test('appBackgroundTaskRun run in correct logic', async () => {
  vi.spyOn(modUtil, 'postErrorMessage').mockImplementation((message, error) => {
    expect(error).toBeNull();
  })
  vi.spyOn(modDataSharePlan, "getDataSharePlanConfig").mockImplementation(async () => {
    return {
      enable: true,
      privateDataSyncEnableConfig: {
        job: true,
        company: true,
        jobTag: true,
        companyTag: true,
      }
    }
  });
  vi.spyOn(modApp, '_getUser').mockImplementation((async () => {
    return {
      login: 'lastsunday'
    }
  }));
  const userName = "lastsunday";
  const repoName = "job-hunting-data";
  const isPrivate = true;
  const expectResult = [
    ...Array(4).fill({ userName, repoName, isPrivate })
  ];
  const expectIterator = expectResult.values();
  vi.spyOn(modTaskUpload, 'createRepoIfNotExists').mockImplementation(async ({ userName, repoName, isPrivate }) => {
    const expectItem = expectIterator.next().value;
    expect(userName).toBe(expectItem.userName);
    expect(repoName).toBe(expectItem.repoName);
    expect(isPrivate).toBe(expectItem.isPrivate);
  });
  const expectCaculateUploadTaskResult = [
    { userName, repoName, taskType: TASK_TYPE_JOB_DATA_UPLOAD },
    { userName, repoName, taskType: TASK_TYPE_COMPANY_DATA_UPLOAD },
    { userName, repoName, taskType: TASK_TYPE_COMPANY_TAG_DATA_UPLOAD },
    { userName, repoName, taskType: TASK_TYPE_JOB_TAG_DATA_UPLOAD },
  ];
  const expectCaculateUploadTaskIterator = expectCaculateUploadTaskResult.values();
  vi.spyOn(modTaskUpload, 'calculateUploadTask').mockImplementation(async ({ userName, repoName, taskType }) => {
    const expectItem = expectCaculateUploadTaskIterator.next().value;
    expect(userName).toBe(expectItem.userName);
    expect(repoName).toBe(expectItem.repoName);
    expect(taskType).toBe(expectItem.taskType);
  });
  const OTHER_1_USER_NAME = "skystarday";
  const OTHER_2_USER_NAME = "skystarday2";
  vi.spyOn(modDataSharePlan, 'calculateDataSharePartnerList').mockImplementation(async () => {
    return [
      {
        username: OTHER_1_USER_NAME,
        reponame: repoName,
        repoType: "GIT_HUB",
        enable: true,
        config: {
          taskTypeList: null,
        },
      },
      {
        username: OTHER_2_USER_NAME,
        reponame: repoName,
        repoType: "GIT_HUB",
        enable: true,
        config: {
          taskTypeList: [
            TASK_TYPE_JOB_DATA_DOWNLOAD,
            TASK_TYPE_COMPANY_DATA_DOWNLOAD,
            TASK_TYPE_COMPANY_TAG_DATA_DOWNLOAD,
            TASK_TYPE_JOB_TAG_DATA_DOWNLOAD
          ],
        },
      },
    ];
  });
  const expectCaculateDownloadTaskResult = [
    { userName, repoName, taskType: TASK_TYPE_JOB_DATA_DOWNLOAD },
    { userName, repoName, taskType: TASK_TYPE_COMPANY_DATA_DOWNLOAD },
    { userName, repoName, taskType: TASK_TYPE_COMPANY_TAG_DATA_DOWNLOAD },
    { userName, repoName, taskType: TASK_TYPE_JOB_TAG_DATA_DOWNLOAD },
    { userName: OTHER_1_USER_NAME, repoName, taskType: TASK_TYPE_JOB_DATA_DOWNLOAD },
    { userName: OTHER_1_USER_NAME, repoName, taskType: TASK_TYPE_COMPANY_DATA_DOWNLOAD },
    { userName: OTHER_1_USER_NAME, repoName, taskType: TASK_TYPE_COMPANY_TAG_DATA_DOWNLOAD },
    { userName: OTHER_1_USER_NAME, repoName, taskType: TASK_TYPE_JOB_TAG_DATA_DOWNLOAD },
    { userName: OTHER_2_USER_NAME, repoName, taskType: TASK_TYPE_JOB_DATA_DOWNLOAD },
    { userName: OTHER_2_USER_NAME, repoName, taskType: TASK_TYPE_COMPANY_DATA_DOWNLOAD },
    { userName: OTHER_2_USER_NAME, repoName, taskType: TASK_TYPE_COMPANY_TAG_DATA_DOWNLOAD },
    { userName: OTHER_2_USER_NAME, repoName, taskType: TASK_TYPE_JOB_TAG_DATA_DOWNLOAD },
  ];
  const expectCaculateDownloadTaskIterator = expectCaculateDownloadTaskResult.values();
  vi.spyOn(modTaskDownload, 'calculateDownloadTask').mockImplementation((async ({ userName, repoName, taskType }) => {
    const expectItem = expectCaculateDownloadTaskIterator.next().value;
    expect(userName).toBe(expectItem.userName);
    expect(repoName).toBe(expectItem.repoName);
    expect(taskType).toBe(expectItem.taskType);
  }));
  vi.spyOn(modApp, 'runTask').mockImplementation((async () => {

  }))
  vi.spyOn(modApp, 'runScheduleTask').mockImplementation((async () => {

  }))
  vi.spyOn(modUtil, 'postSuccessMessage').mockImplementation(async (message, error) => {

  });
  await AppService.appBackgroundTaskRun();
})
