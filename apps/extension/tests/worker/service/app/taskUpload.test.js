import { TASK_TYPE_JOB_DATA_UPLOAD, DATA_TYPE_NAME_JOB } from '@/common';
import {
  calculateUploadTask,
  uploadDataByDataId,
} from '@/entrypoints/offscreen/worker/service/app/taskUpload';
import * as modTaskUploadLogic from '@/entrypoints/offscreen/worker/service/app/taskUploadLogic';
import * as modTaskDataUploadService from '@/entrypoints/offscreen/worker/service/taskDataUploadService';
import * as modApp from '@/entrypoints/offscreen/worker/service/app/index';
import { jobDataToExcelJSONArray } from '@/common/excel';
import * as modExcel from '@/common/excel';
import * as modGithub from '@/common/api/github/index';
import dayjs from 'dayjs';
import { expect, test, vi } from 'vitest';
const USER_NAME = import.meta.env.TEST_GITHUB_APP_USERNAME;
const REPO_NAME = 'job-hunting-data';
import { parse } from '@/common/utils/date';

test('calculateUploadTask no need to upload', async () => {
  vi.spyOn(
    modTaskDataUploadService,
    '_taskDataUploadGetMaxEndDatetime'
  ).mockReturnValue(parse('2025-05-09'));
  expect(
    await calculateUploadTask({
      userName: USER_NAME,
      repoName: REPO_NAME,
      taskType: TASK_TYPE_JOB_DATA_UPLOAD,
      targetDay: async () => {
        return parse('2025-05-09');
      },
    })
  ).toBe(false);
});

test('calculateUploadTask need upload', async () => {
  vi.spyOn(
    modTaskDataUploadService,
    '_taskDataUploadGetMaxEndDatetime'
  ).mockReturnValue(parse('2025-05-04'));
  vi.spyOn(modTaskUploadLogic, 'calculateRepoMaxUploadDate').mockImplementation(
    async ({ userName, repoName, type }) => {
      expect(type).toBe(TASK_TYPE_JOB_DATA_UPLOAD);
      expect(userName).toBe(USER_NAME);
      expect(repoName).toBe(REPO_NAME);
      return dayjs(parse('2025-05-04'));
    }
  );
  vi.spyOn(modTaskUploadLogic, 'saveTask').mockImplementation(
    async ({ type, startDatetime, endDatetime, userName, repoName }) => {
      expect(type).toBe(TASK_TYPE_JOB_DATA_UPLOAD);
      expect(startDatetime).toStrictEqual(dayjs(parse('2025-05-04')));
      expect(endDatetime).toStrictEqual(dayjs(parse('2025-05-05')));
      expect(userName).toBe(USER_NAME);
      expect(repoName).toBe(REPO_NAME);
    }
  );
  expect(
    await calculateUploadTask({
      userName: USER_NAME,
      repoName: REPO_NAME,
      taskType: TASK_TYPE_JOB_DATA_UPLOAD,
      targetDay: async () => {
        return dayjs(parse('2025-05-05'));
      },
    })
  ).toBe(true);
});

test('uploadDataByDataId for job data', async () => {
  vi.spyOn(modApp, 'isLogin').mockImplementation(async () => {
    return true;
  });
  vi.spyOn(
    modTaskDataUploadService,
    '_taskDataUploadGetById'
  ).mockImplementation(async ({ param }) => {
    return {
      id: param,
      type: TASK_TYPE_JOB_DATA_UPLOAD,
      username: USER_NAME,
      reponame: REPO_NAME,
      startDatetime: dayjs(parse('2025-05-05')),
      endDatetime: dayjs(parse('2025-05-06')),
      dataCount: 18001,
      dataPageNum: 2,
      dataPageSize: 6000,
    };
  });
  vi.spyOn(modExcel, 'convertJsonObjectToExcelData').mockImplementation(
    async (result) => {
      // test
      return 'dGVzdA==';
    }
  );
  vi.mock(import('@/common/api/github/index.js'), async (importOriginal) => {
    return {
      ...(await importOriginal()),
      GithubApi: {
        createFileContent: async (
          owner,
          repo,
          path,
          base64Data,
          msg,
          { getTokenFunction, setTokenFunction }
        ) => {
          expect(path).toBe('/2025/05-06/job_1.zip');
        },
      },
    };
  });
  await uploadDataByDataId(
    'testDataId',
    DATA_TYPE_NAME_JOB,
    async ({ pageNum, pageSize, startDatetime, endDatetime, connection }) => {
      return {
        items: [{ jobId: 'jobId1' }],
      };
    },
    jobDataToExcelJSONArray
  );
});
