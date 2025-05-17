import {
  TASK_TYPE_ALL_PRIVATE_DATA_DOWNLOAD,
  TASK_TYPE_COMPANY_DATA_DOWNLOAD,
  TASK_TYPE_COMPANY_DATA_UPLOAD,
  TASK_TYPE_COMPANY_TAG_DATA_DOWNLOAD,
  TASK_TYPE_COMPANY_TAG_DATA_UPLOAD,
  TASK_TYPE_JOB_DATA_DOWNLOAD,
  TASK_TYPE_JOB_DATA_UPLOAD,
  TASK_TYPE_JOB_TAG_DATA_DOWNLOAD,
  TASK_TYPE_JOB_TAG_DATA_UPLOAD
} from "@/common";
import { useTask } from "@/common/hooks/task";
import { expect, test } from "vitest";

const { getPrivateUploadTaskTypeFromConfig, getPrivateDownloadTaskTypeFromConfig, getTaskTypeListFromDataSharePartnerConfig } = useTask();

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

test('getTaskTypeListFromDataSharePartnerConfig return correct download task', () => {
  const resultAllFromEmpty = expect(getTaskTypeListFromDataSharePartnerConfig({}).map(item => {
    return item.type;
  }));
  resultAllFromEmpty.toContain(TASK_TYPE_JOB_DATA_DOWNLOAD);
  resultAllFromEmpty.toContain(TASK_TYPE_COMPANY_DATA_DOWNLOAD);
  resultAllFromEmpty.toContain(TASK_TYPE_JOB_TAG_DATA_DOWNLOAD);
  resultAllFromEmpty.toContain(TASK_TYPE_COMPANY_TAG_DATA_DOWNLOAD);
  const resultAllFromPublicAll = expect(getTaskTypeListFromDataSharePartnerConfig([{ type: TASK_TYPE_ALL_PRIVATE_DATA_DOWNLOAD }]).map(item => {
    return item.type;
  }));
  resultAllFromPublicAll.toContain(TASK_TYPE_JOB_DATA_DOWNLOAD);
  resultAllFromPublicAll.toContain(TASK_TYPE_COMPANY_DATA_DOWNLOAD);
  resultAllFromPublicAll.toContain(TASK_TYPE_JOB_TAG_DATA_DOWNLOAD);
  resultAllFromPublicAll.toContain(TASK_TYPE_COMPANY_TAG_DATA_DOWNLOAD);
  const resultAll = expect(getTaskTypeListFromDataSharePartnerConfig([
    { type: TASK_TYPE_JOB_DATA_DOWNLOAD },
    { type: TASK_TYPE_COMPANY_DATA_DOWNLOAD },
    { type: TASK_TYPE_COMPANY_TAG_DATA_DOWNLOAD },
    { type: TASK_TYPE_JOB_TAG_DATA_DOWNLOAD }
  ]).map(item => {
    return item.type;
  }));
  resultAll.toContain(TASK_TYPE_JOB_DATA_DOWNLOAD);
  resultAll.toContain(TASK_TYPE_COMPANY_DATA_DOWNLOAD);
  resultAll.toContain(TASK_TYPE_JOB_TAG_DATA_DOWNLOAD);
  resultAll.toContain(TASK_TYPE_COMPANY_TAG_DATA_DOWNLOAD);
  const result = expect(getTaskTypeListFromDataSharePartnerConfig([{ type: TASK_TYPE_JOB_DATA_DOWNLOAD }]).map(item => {
    return item.type;
  }));
  result.toContain(TASK_TYPE_JOB_DATA_DOWNLOAD);
})
