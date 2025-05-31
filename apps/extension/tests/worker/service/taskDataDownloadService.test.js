import { parse } from "@/common/utils/date";
import { getDb } from "@/entrypoints/offscreen/worker/database";
import { _queryLatestTaskDataDownload } from "@/entrypoints/offscreen/worker/service/taskDataDownloadService";
import { PGlite } from "@electric-sql/pglite";
import { expect, test } from "vitest";
import { _updateTaskStatus, SERVICE_INSTANCE as TASK_SERVICE_INSTANCE } from "@/entrypoints/offscreen/worker/service/taskService";
import { SERVICE_INSTANCE as TASK_DOWNLOAD_SERVICE_INSTANCE } from "@/entrypoints/offscreen/worker/service/taskDataDownloadService";
import { TASK_STATUS_CANCEL, TASK_STATUS_FINISHED, TASK_STATUS_FINISHED_BUT_ERROR, TASK_STATUS_READY, TASK_TYPE_METADATA_DATA_DOWNLOAD } from "@/common";
test('query and cancel download task by typeId logic correct', async () => {
  const db = await getDb({ dataDir: 'memory://' });
  expect(db).toBeInstanceOf(PGlite);
  const taskItem = {
    id: "1",
    type: TASK_TYPE_METADATA_DATA_DOWNLOAD,
    status: TASK_STATUS_FINISHED,
    dataId: "dataId1",
  };
  const taskItem2 = {
    id: "2",
    type: TASK_TYPE_METADATA_DATA_DOWNLOAD,
    status: TASK_STATUS_FINISHED_BUT_ERROR,
    dataId: "dataId2",
  };
  const taskItem3 = {
    id: "3",
    type: TASK_TYPE_METADATA_DATA_DOWNLOAD,
    status: TASK_STATUS_READY,
    dataId: "dataId3",
  };
  const taskItem4Other = {
    id: "4",
    type: TASK_TYPE_METADATA_DATA_DOWNLOAD,
    status: TASK_STATUS_READY,
    dataId: "otherdataId4",
  };
  const taskItem5 = {
    id: "5",
    type: TASK_TYPE_METADATA_DATA_DOWNLOAD,
    status: TASK_STATUS_READY,
    dataId: "dataId5",
  };
  await TASK_SERVICE_INSTANCE._batchAddOrUpdate([taskItem, taskItem2, taskItem3, taskItem4Other, taskItem5]);
  const taskDownloadItem = {
    id: "dataId1",
    type: TASK_TYPE_METADATA_DATA_DOWNLOAD,
    datetime: parse(`2025-05-01`),
    typeId: "typeId1"
  };
  const taskDownloadItem2 = {
    id: "dataId2",
    type: TASK_TYPE_METADATA_DATA_DOWNLOAD,
    datetime: parse(`2025-05-02`),
    typeId: "typeId1"
  };
  const taskDownloadItem3 = {
    id: "dataId3",
    type: TASK_TYPE_METADATA_DATA_DOWNLOAD,
    datetime: parse(`2025-05-03`),
    typeId: "typeId1"
  };
  const taskDownloadItem4Other = {
    id: "otherdataId4",
    type: TASK_TYPE_METADATA_DATA_DOWNLOAD,
    datetime: parse(`2025-05-04`),
    typeId: "typeId4"
  };
  const taskDownloadItem5 = {
    id: "dataId5",
    type: TASK_TYPE_METADATA_DATA_DOWNLOAD,
    datetime: parse(`2025-05-05`),
    typeId: "typeId1"
  };
  await TASK_DOWNLOAD_SERVICE_INSTANCE._batchAddOrUpdate([taskDownloadItem, taskDownloadItem2, taskDownloadItem3, taskDownloadItem4Other, taskDownloadItem5]);
  const today = parse(`2025-05-05`);
  const result = await _queryLatestTaskDataDownload({
    param: {
      typeId: "typeId1",
      datetime: today,
    }
  });
  expect(result.length).toBe(2);
  const ids = result.map(item => item.id);
  const cancelResult = await _updateTaskStatus({ param: { id: ids, status: TASK_STATUS_CANCEL } });
  expect(cancelResult.affectedRows).toBe(2);
  const afterUpdateStatusResult = await _queryLatestTaskDataDownload({
    param: {
      typeId: "typeId1",
      datetime: today,
    }
  });
  expect(afterUpdateStatusResult.length).toBe(1);
})
