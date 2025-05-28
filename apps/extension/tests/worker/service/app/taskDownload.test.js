import { expect, test } from "vitest";
import { calculateDownloadTask, downloadDataByDataId } from "@/entrypoints/offscreen/worker/service/app/taskDownload";
import { DATA_TYPE_NAME_JOB, TASK_STATUS_CANCEL, TASK_TYPE_JOB_DATA_DOWNLOAD, TASK_TYPE_JOB_DATA_MERGE, TASK_TYPE_METADATA_DATA_DOWNLOAD, TASK_TYPE_METADATA_DATA_MERGE } from "@/common";
import * as modApp from "@/entrypoints/offscreen/worker/service/app";
import * as modTaskLogic from "@/entrypoints/offscreen/worker/service/app/taskLogic";
import * as modTaskDownloadLogic from "@/entrypoints/offscreen/worker/service/app/taskDownloadLogic";
import * as modTaskDataDownloadService from "@/entrypoints/offscreen/worker/service/taskDataDownloadService";
import * as modTaskService from "@/entrypoints/offscreen/worker/service/taskService";
import { vi } from "vitest";
import { parse } from "@/common/utils/date";
import { EXCEPTION } from "@/common/api/github";
const USER_NAME = "lastsunday";
const REPO_NAME = "job-hunting-data";
const TASK_TYPE = TASK_TYPE_JOB_DATA_DOWNLOAD;
test('calculate standard data download task in correct logic', async () => {
  vi.spyOn(modTaskLogic, 'queryRepoFileDateList').mockImplementation(async ({ userName, repoName, taskType }) => {
    expect(userName).toBe(USER_NAME);
    expect(repoName).toBe(REPO_NAME);
    expect(taskType).toBe(TASK_TYPE);
    return [
      parse("2025-01-03"),
      parse("2024-12-30"),
      parse("2025-01-01"),
      parse("2024-12-31"),
    ]
  });
  vi.spyOn(modTaskDataDownloadService, "_searchTaskDataDownload").mockImplementation(async ({ param }) => {
    expect(param).toMatchObject(
      {
        pageNum: undefined,
        pageSize: undefined,
        userName: USER_NAME,
        repoName: REPO_NAME,
        type: TASK_TYPE,
        startDatetime: parse("2024-12-30"),
        endDatetime: parse("2025-01-04"),
        orderByColumn: 'createDatetime',
        orderBy: 'ASC'
      }
    );
    return {
      items: [{
        id: "testid",
        type: TASK_TYPE,
        username: USER_NAME,
        reponame: REPO_NAME,
        datetime: parse("2024-12-30"),
        createDatetime: parse("2024-12-30"),
        updateDatetime: parse("2024-12-30"),
      }],
      total: 1
    };
  });
  vi.spyOn(modTaskDownloadLogic, 'saveTask').mockImplementation(async ({ type, datetimeList, userName, repoName }) => {
    expect(type).toBe(TASK_TYPE);
    expect(datetimeList).toMatchObject([parse("2024-12-31"), parse(("2025-01-01")), parse("2025-01-03")]);
    expect(userName).toBe(USER_NAME);
    expect(repoName).toBe(REPO_NAME);
  });
  const result = await calculateDownloadTask({
    userName: USER_NAME, repoName: REPO_NAME, taskType: TASK_TYPE, getTargetDay: async () => {
      return parse("2025-01-15");
    }
  });
  expect(result).toBeTruthy();
})

test('downloadDataByDataId in correct logic', async () => {
  const dataId = "";
  const dataTypeName = DATA_TYPE_NAME_JOB;
  const taskType = TASK_TYPE_JOB_DATA_MERGE;
  const fileData = new Uint8Array();
  vi.spyOn(modApp, "isLogin").mockImplementation(async () => {
    return true;
  });
  vi.spyOn(modTaskDataDownloadService, '_taskDataDownloadGetById').mockImplementation(async () => {
    return {
      type: TASK_TYPE,
      username: USER_NAME,
      reponame: REPO_NAME,
      datetime: parse("2025-01-01")
    };
  });
  vi.spyOn(modTaskLogic, "getFileData").mockImplementation(async ({ userName, repoName, filePath }) => {
    expect(userName).toBe(USER_NAME);
    expect(repoName).toBe(REPO_NAME);
    expect(filePath).toBe("/2025/01-01/job.zip");
    return fileData;
  })
  vi.spyOn(modTaskDownloadLogic, "saveFileAndCalculateDataMergeTask").mockImplementation(async ({ userName, repoName, taskType, file, datetime }) => {
    expect(userName).toBe(USER_NAME);
    expect(repoName).toBe(REPO_NAME);
    expect(taskType).toBe(TASK_TYPE_JOB_DATA_MERGE);
    expect(datetime).toMatchObject(parse("2025-01-01"));
    expect(file.name).toBe("job.zip");
    expect(file.size).toBe(fileData.byteLength);
  });
  const result = await downloadDataByDataId(dataId, dataTypeName, taskType);
  expect(result).toBeNull();
});

test('downloadDataByDataId file not found and never upload', async () => {
  const dataId = "";
  const dataTypeName = DATA_TYPE_NAME_JOB;
  const taskType = TASK_TYPE_JOB_DATA_MERGE;
  vi.spyOn(modApp, "isLogin").mockImplementation(async () => {
    return true;
  });
  vi.spyOn(modTaskDataDownloadService, '_taskDataDownloadGetById').mockImplementation(async () => {
    return {
      type: TASK_TYPE,
      username: USER_NAME,
      reponame: REPO_NAME,
      datetime: parse("2025-01-01")
    };
  });
  vi.spyOn(modTaskLogic, "getFileData").mockImplementation(async ({ userName, repoName, filePath }) => {
    throw EXCEPTION.NOT_FOUND;
  })
  const result = await downloadDataByDataId(dataId, dataTypeName, taskType, {
    getTargetDay: async () => {
      return parse("2025-01-02");
    }
  });
  expect(result).contains("never upload");
});

test('downloadDataByDataId file not found', async () => {
  const dataId = "";
  const dataTypeName = DATA_TYPE_NAME_JOB;
  const taskType = TASK_TYPE_JOB_DATA_MERGE;
  vi.spyOn(modApp, "isLogin").mockImplementation(async () => {
    return true;
  });
  vi.spyOn(modTaskDataDownloadService, '_taskDataDownloadGetById').mockImplementation(async () => {
    return {
      type: TASK_TYPE,
      username: USER_NAME,
      reponame: REPO_NAME,
      datetime: parse("2025-01-01")
    };
  });
  vi.spyOn(modTaskLogic, "getFileData").mockImplementation(async ({ userName, repoName, filePath }) => {
    throw EXCEPTION.NOT_FOUND;
  })
  try {
    const result = await downloadDataByDataId(dataId, dataTypeName, taskType, {
      getTargetDay: async () => {
        return parse("2025-01-01T23:59:59");
      }
    });
  } catch (e) {
    expect(e).contains("not found");
  }
});

test('calculateDownloadTask for metadata', async () => {
  vi.spyOn(modTaskDataDownloadService, '_queryLatestTaskDataDownload').mockImplementation(async ({ param }) => {
    return [
      { id: "1", datetime: parse('2025-01-14') }
    ];
  });
  vi.spyOn(modTaskService, '_updateTaskStatus').mockImplementation(async ({ param, connection }) => {
    expect(param.id.length).toBe(1);
    expect(param.id[0]).toBe('1');
    expect(param.status).toBe(TASK_STATUS_CANCEL);
  });
  vi.spyOn(modTaskDownloadLogic, 'saveTask').mockImplementation(async ({ type, datetimeList, userName, repoName, typeId, config }) => {
    expect(type).toBe(TASK_TYPE_METADATA_DATA_DOWNLOAD);
    expect(datetimeList).toMatchObject([parse('2025-01-15')]);
    expect(typeId).toBe('typeId1');
    expect(config).toMatchObject({});
  });
  const result = await calculateDownloadTask({
    taskType: TASK_TYPE_METADATA_DATA_DOWNLOAD,
    typeId: "typeId1",
    config: {},
    getTargetDay: async () => {
      return parse("2025-01-15");
    }
  });
  expect(result).toBeTruthy();
});

test('downloadDataByDataId for metadata merge', async () => {
  const URL = "https://github.com/lastsunday/job-hunting-data-source";
  const FILE_PATH = "metadata.json";
  vi.spyOn(modTaskDataDownloadService, '_taskDataDownloadGetById').mockImplementation(async ({ param }) => {
    return {
      typeId: "typeId1",
      datetime: parse("2025-01-01"),
      config: {
        config: {
          url: URL,
          filePath: FILE_PATH
        }
      }
    };
  });
  vi.spyOn(modTaskLogic, 'getFileDataByUrl').mockImplementation(async ({ url, filePath }) => {
    expect(url).toBe(URL);
    expect(filePath).toBe(FILE_PATH);
    return new TextEncoder().encode("Test Data");
  });
  vi.spyOn(modTaskDownloadLogic, 'saveFileAndCalculateDataMergeTask').mockImplementation(async ({ userName, repoName, taskType, file, datetime, typeId }) => {
    expect(typeId).toBe("typeId1");
    expect(parse(datetime)).toMatchObject(parse('2025-01-01'));
  });
  const result = await downloadDataByDataId('1', null, TASK_TYPE_METADATA_DATA_MERGE, { getTargetDay: async () => { return parse('2025-01-15') } });
  expect(result).toBeNull();
});
