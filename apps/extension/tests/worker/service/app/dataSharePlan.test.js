import { expect, test } from "vitest";
import { calculateDataSharePartnerList } from "@/entrypoints/offscreen/worker/service/app/dataSharePlan";
import { getDb } from "@/entrypoints/offscreen/worker/database";
import { PGlite } from "@electric-sql/pglite";
import { SERVICE_INSTANCE } from "@/entrypoints/offscreen/worker/service/dataSharePartnerService";
import { DataSharePartner } from "@/common/data/domain/dataSharePartner";
import {
  TASK_TYPE_JOB_DATA_DOWNLOAD, TASK_TYPE_COMPANY_DATA_DOWNLOAD,
  TASK_TYPE_COMPANY_TAG_DATA_DOWNLOAD, TASK_TYPE_JOB_TAG_DATA_DOWNLOAD,
} from "@/common";
test('calculateDataSharePartnerList return correct content', async () => {
  const db = await getDb({ dataDir: 'memory://' });
  expect(db).toBeInstanceOf(PGlite);
  const USER_NAME = "lastsunday";
  const REPO_NAME = "job-hunting-data";
  const REPO_TYPE = "GIT_HUB";
  const defaultEntity = new DataSharePartner();
  defaultEntity.username = USER_NAME;
  defaultEntity.reponame = REPO_NAME;
  defaultEntity.repoType = REPO_TYPE;
  const disabledEntity = new DataSharePartner();
  disabledEntity.username = USER_NAME;
  disabledEntity.reponame = REPO_NAME;
  disabledEntity.repoType = REPO_TYPE;
  disabledEntity.enable = false;
  const allTaskTypeListEntity = new DataSharePartner();
  allTaskTypeListEntity.username = USER_NAME;
  allTaskTypeListEntity.reponame = REPO_NAME;
  allTaskTypeListEntity.repoType = REPO_TYPE;
  allTaskTypeListEntity.config = {
    taskTypeList: [
      TASK_TYPE_JOB_DATA_DOWNLOAD, TASK_TYPE_COMPANY_DATA_DOWNLOAD,
      TASK_TYPE_COMPANY_TAG_DATA_DOWNLOAD, TASK_TYPE_JOB_TAG_DATA_DOWNLOAD,
    ]
  }
  const emptyTaskTypeListEntity = new DataSharePartner();
  emptyTaskTypeListEntity.username = USER_NAME;
  emptyTaskTypeListEntity.reponame = REPO_NAME;
  emptyTaskTypeListEntity.repoType = REPO_TYPE;
  emptyTaskTypeListEntity.config = {
    taskTypeList: [
    ]
  }
  await SERVICE_INSTANCE._batchAddOrUpdate([
    defaultEntity,
    disabledEntity,
    allTaskTypeListEntity,
    emptyTaskTypeListEntity
  ]);
  const expectResult = [
    { username: USER_NAME, reponame: REPO_NAME, repoType: REPO_TYPE, config: {} },
    {
      username: USER_NAME, reponame: REPO_NAME, repoType: REPO_TYPE, config: {
        taskTypeList: [
          TASK_TYPE_JOB_DATA_DOWNLOAD, TASK_TYPE_COMPANY_DATA_DOWNLOAD,
          TASK_TYPE_COMPANY_TAG_DATA_DOWNLOAD, TASK_TYPE_JOB_TAG_DATA_DOWNLOAD,
        ]
      }
    },
    {
      username: USER_NAME, reponame: REPO_NAME, repoType: REPO_TYPE, config: {
        taskTypeList: []
      }
    },
  ];
  const result = await calculateDataSharePartnerList();
  const epxectResultIterator = expectResult.values();
  result.forEach(item => {
    const expectItem = epxectResultIterator.next().value;
    expect(item.username).toBe(expectItem.username);
    expect(item.reponame).toBe(expectItem.reponame);
    expect(item.repoType).toBe(expectItem.repoType);
    expect(item.config).toStrictEqual(expectItem.config);
  });
})
