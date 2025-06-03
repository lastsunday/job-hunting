import { parse, dateToStr } from "@/common/utils/date";
import { getDb } from "@/entrypoints/offscreen/worker/database";
import { _queryLatestTaskDataDownload } from "@/entrypoints/offscreen/worker/service/taskDataDownloadService";
import { PGlite } from "@electric-sql/pglite";
import { expect, test } from "vitest";
import { _updateTaskStatus, SERVICE_INSTANCE as TASK_SERVICE_INSTANCE } from "@/entrypoints/offscreen/worker/service/taskService";
import { SERVICE_INSTANCE as TASK_DOWNLOAD_SERVICE_INSTANCE } from "@/entrypoints/offscreen/worker/service/taskDataDownloadService";
import { TASK_STATUS_CANCEL, TASK_STATUS_FINISHED, TASK_STATUS_FINISHED_BUT_ERROR, TASK_STATUS_READY, TASK_TYPE_METADATA_DATA_DOWNLOAD } from "@/common";
import { calculateDownloadTask } from "@/entrypoints/offscreen/worker/service/app/taskDownload";
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
  await TASK_DOWNLOAD_SERVICE_INSTANCE._batchAddOrUpdate([taskDownloadItem, taskDownloadItem2, taskDownloadItem3, taskDownloadItem4Other]);
  const today = parse(`2025-05-05`);
  await calculateDownloadTask({
    getTargetDay: () => { return today }, userName: "lastsunday",
    repoName: "job-hunting-data-source", taskType: TASK_TYPE_METADATA_DATA_DOWNLOAD, typeId: "typeId1", config: {}
  });
  const result = await _queryLatestTaskDataDownload({
    param: {
      typeId: "typeId1",
      datetime: today,
    }
  });
  expect(result.length).toBe(1);
  expect(dateToStr(parse(result[0].datetime))).toBe(dateToStr(parse(`2025-05-05`)));
  await calculateDownloadTask({
    getTargetDay: () => { return today }, userName: "lastsunday",
    repoName: "job-hunting-data-source", taskType: TASK_TYPE_METADATA_DATA_DOWNLOAD, typeId: "typeId1", config: {}
  });
  const secondResult = await _queryLatestTaskDataDownload({
    param: {
      typeId: "typeId1",
      datetime: today,
    }
  });
  expect(secondResult.length).toBe(1);
  expect(dateToStr(parse(secondResult[0].datetime))).toBe(dateToStr(parse(`2025-05-05`)));
})
