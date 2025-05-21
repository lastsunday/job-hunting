import {
  TASK_TYPE_ALL_PRIVATE_DATA_DOWNLOAD,
  TASK_TYPE_COMPANY_DATA_DOWNLOAD,
  TASK_TYPE_COMPANY_DATA_UPLOAD,
  TASK_TYPE_COMPANY_TAG_DATA_DOWNLOAD,
  TASK_TYPE_COMPANY_TAG_DATA_UPLOAD,
  TASK_TYPE_JOB_DATA_DOWNLOAD,
  TASK_TYPE_JOB_DATA_UPLOAD,
  TASK_TYPE_JOB_PUBLIC_DATA_DOWNLOAD,
  TASK_TYPE_JOB_PUBLIC_DATA_UPLOAD,
  TASK_TYPE_JOB_TAG_DATA_DOWNLOAD,
  TASK_TYPE_JOB_TAG_DATA_UPLOAD
} from "@/common";
import { useTask } from "@/common/hooks/task";
import { expect, test } from "vitest";

const { getPrivateUploadTaskTypeFromConfig, getPrivateDownloadTaskTypeFromConfig, getTaskTypeListFromDataSharePartnerConfig,
  getPublicUploadTaskTypeFromConfig, getPublicDownloadTaskTypeFromConfig } = useTask();

test('getPrivateUploadTaskTypeFromConfig return correct upload task', () => {
  const resultAll = expect(getPrivateUploadTaskTypeFromConfig({ privateDataSyncEnableConfig: { job: true, company: true, jobTag: true, companyTag: true } }).map(item => {
    return item.type;
  }));
  resultAll.toContain(TASK_TYPE_JOB_DATA_UPLOAD);
  resultAll.toContain(TASK_TYPE_COMPANY_DATA_UPLOAD);
  resultAll.toContain(TASK_TYPE_JOB_TAG_DATA_UPLOAD);
  resultAll.toContain(TASK_TYPE_COMPANY_TAG_DATA_UPLOAD);
  const resultPart = expect(getPrivateUploadTaskTypeFromConfig({ privateDataSyncEnableConfig: { job: true, company: false } }).map(item => {
    return item.type;
  }));
  resultPart.toContain(TASK_TYPE_JOB_DATA_UPLOAD);
})

test('getPublicUploadTaskTypeFromConfig return correct upload task', () => {
  expect(getPublicUploadTaskTypeFromConfig({ publicDataSyncEnableConfig: { job: true } })).toHaveLength(0);
  const resultAll = expect(getPublicUploadTaskTypeFromConfig({ publicDataSyncEnableConfig: { jobPublic: true } }).map(item => {
    return item.type;
  }));
  resultAll.toContain(TASK_TYPE_JOB_PUBLIC_DATA_UPLOAD);
})

test('getPrivateDownloadTaskTypeFromConfigreturn correct download task', () => {
  const resultAll = expect(getPrivateDownloadTaskTypeFromConfig({ privateDataSyncEnableConfig: { job: true, company: true, jobTag: true, companyTag: true } }).map(item => {
    return item.type;
  }));
  resultAll.toContain(TASK_TYPE_JOB_DATA_DOWNLOAD);
  resultAll.toContain(TASK_TYPE_COMPANY_DATA_DOWNLOAD);
  resultAll.toContain(TASK_TYPE_JOB_TAG_DATA_DOWNLOAD);
  resultAll.toContain(TASK_TYPE_COMPANY_TAG_DATA_DOWNLOAD);
  const resultPart = expect(getPrivateDownloadTaskTypeFromConfig({ privateDataSyncEnableConfig: { job: true, company: false } }).map(item => {
    return item.type;
  }));
  resultPart.toContain(TASK_TYPE_JOB_DATA_DOWNLOAD);
})

test('getPublicDownloadTaskTypeFromConfigreturn correct download task', () => {
  const resultAll = expect(getPublicDownloadTaskTypeFromConfig({ publicDataSyncEnableConfig: { jobPublic: true } }).map(item => {
    return item.type;
  }));
  resultAll.toContain(TASK_TYPE_JOB_PUBLIC_DATA_DOWNLOAD);
  expect(getPublicDownloadTaskTypeFromConfig({ publicDataSyncEnableConfig: { jobPublic: false } })).toHaveLength(0);
})

test('getTaskTypeListFromDataSharePartnerConfig return correct download task', () => {
  expect(getTaskTypeListFromDataSharePartnerConfig({})).toHaveLength(0);
  const resultAllFromPublicAll = expect(getTaskTypeListFromDataSharePartnerConfig({ taskTypeList: [{ type: TASK_TYPE_ALL_PRIVATE_DATA_DOWNLOAD }] }).map(item => {
    return item.type;
  }));
  resultAllFromPublicAll.toContain(TASK_TYPE_JOB_DATA_DOWNLOAD);
  resultAllFromPublicAll.toContain(TASK_TYPE_COMPANY_DATA_DOWNLOAD);
  resultAllFromPublicAll.toContain(TASK_TYPE_JOB_TAG_DATA_DOWNLOAD);
  resultAllFromPublicAll.toContain(TASK_TYPE_COMPANY_TAG_DATA_DOWNLOAD);
  const resultAll = expect(getTaskTypeListFromDataSharePartnerConfig({
    taskTypeList: [
      { type: TASK_TYPE_JOB_DATA_DOWNLOAD },
      { type: TASK_TYPE_COMPANY_DATA_DOWNLOAD },
      { type: TASK_TYPE_COMPANY_TAG_DATA_DOWNLOAD },
      { type: TASK_TYPE_JOB_TAG_DATA_DOWNLOAD }
    ]
  }).map(item => {
    return item.type;
  }));
  resultAll.toContain(TASK_TYPE_JOB_DATA_DOWNLOAD);
  resultAll.toContain(TASK_TYPE_COMPANY_DATA_DOWNLOAD);
  resultAll.toContain(TASK_TYPE_JOB_TAG_DATA_DOWNLOAD);
  resultAll.toContain(TASK_TYPE_COMPANY_TAG_DATA_DOWNLOAD);
  const result = expect(getTaskTypeListFromDataSharePartnerConfig({ taskTypeList: [{ type: TASK_TYPE_JOB_DATA_DOWNLOAD }] }).map(item => {
    return item.type;
  }));
  result.toContain(TASK_TYPE_JOB_DATA_DOWNLOAD);
})
