import { expect, test } from "vitest";
import { useTask } from "@/common/hooks/task";
import {
  TASK_TYPE_COMPANY_DATA_DOWNLOAD,
  TASK_TYPE_COMPANY_DATA_UPLOAD,
  TASK_TYPE_COMPANY_TAG_DATA_DOWNLOAD,
  TASK_TYPE_COMPANY_TAG_DATA_UPLOAD,
  TASK_TYPE_JOB_DATA_DOWNLOAD,
  TASK_TYPE_JOB_DATA_UPLOAD,
  TASK_TYPE_JOB_TAG_DATA_DOWNLOAD,
  TASK_TYPE_JOB_TAG_DATA_UPLOAD
} from "@/common";

const { getPrivateUploadTaskTypeFromConfig, getPrivateDownloadTaskTypeFromConfig } = useTask();

test('getPrivateUploadTaskTypeFromConfig return correct upload task', () => {
  const resultAll = expect(getPrivateUploadTaskTypeFromConfig({ privateDataSyncEnableConfig: { job: true, company: true, jobTag: true, companyTag: true } }));
  resultAll.toContain(TASK_TYPE_JOB_DATA_UPLOAD);
  resultAll.toContain(TASK_TYPE_COMPANY_DATA_UPLOAD);
  resultAll.toContain(TASK_TYPE_JOB_TAG_DATA_UPLOAD);
  resultAll.toContain(TASK_TYPE_COMPANY_TAG_DATA_UPLOAD);
  const resultPart = expect(getPrivateUploadTaskTypeFromConfig({ privateDataSyncEnableConfig: { job: true, company: false } }));
  resultPart.toContain(TASK_TYPE_JOB_DATA_UPLOAD);
})

test('getPrivateDownloadTaskTypeFromConfigreturn correct upload task', () => {
  const resultAll = expect(getPrivateDownloadTaskTypeFromConfig({ privateDataSyncEnableConfig: { job: true, company: true, jobTag: true, companyTag: true } }));
  resultAll.toContain(TASK_TYPE_JOB_DATA_DOWNLOAD);
  resultAll.toContain(TASK_TYPE_COMPANY_DATA_DOWNLOAD);
  resultAll.toContain(TASK_TYPE_JOB_TAG_DATA_DOWNLOAD);
  resultAll.toContain(TASK_TYPE_COMPANY_TAG_DATA_DOWNLOAD);
  const resultPart = expect(getPrivateDownloadTaskTypeFromConfig({ privateDataSyncEnableConfig: { job: true, company: false } }));
  resultPart.toContain(TASK_TYPE_JOB_DATA_DOWNLOAD);
})
