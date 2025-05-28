import {
  TASK_STATUS_READY
} from "@/common";
import { Task } from "@/common/data/domain/task";
import { TaskDataDownload } from "@/common/data/domain/taskDataDownload";
import { getDb } from "../../database";
import { _taskDataDownloadAddOrUpdate } from "../taskDataDownloadService";
import { _taskAddOrUpdate } from "../taskService";
import { TaskDataMerge } from "@/common/data/domain/taskDataMerge";
import { infoLog } from "@/common/log";
import { _fileAddOrUpdate } from "../fileService";
import { _taskDataMergeAddOrUpdate } from "../taskDataMergeService";

export async function saveTask({ type, datetimeList, userName, repoName, typeId, config } = {}) {
  await (await getDb()).transaction(async (tx) => {
    for (let i = 0; i < datetimeList.length; i++) {
      const day = datetimeList[i];
      await addDataDownloadTask({ type, datetime: day, userName, repoName, typeId, config, connection: tx })
    }
  });
}

export async function addDataDownloadTask({ type, datetime, userName, repoName, typeId, config, connection = null } = {}) {
  let taskDataDownload = new TaskDataDownload();
  taskDataDownload.type = type;
  taskDataDownload.username = userName;;
  taskDataDownload.reponame = repoName;
  taskDataDownload.datetime = datetime;
  taskDataDownload.typeId = typeId;
  taskDataDownload.config = config;
  let savedTaskDataDownload = await _taskDataDownloadAddOrUpdate({ param: taskDataDownload, connection });
  let task = new Task();
  task.type = type;
  task.dataId = savedTaskDataDownload.id;
  task.retryCount = 0;
  task.costTime = 0;
  task.status = TASK_STATUS_READY;
  await _taskAddOrUpdate({ param: task, connection });
}

export async function saveFileAndCalculateDataMergeTask({ userName, repoName, taskType, file, datetime }) {
  await (await getDb()).transaction(async (tx) => {
    const savedFile = await _fileAddOrUpdate({ param: file, connection: tx });
    infoLog(`[TASK DOWNLOAD DATA] save file to database from ${userName}.${repoName} datetime = ${datetime}, id = ${savedFile.id}`);
    //添加数据合并任务
    const taskDataMerge = new TaskDataMerge();
    taskDataMerge.type = taskType;
    taskDataMerge.username = userName;
    taskDataMerge.reponame = repoName;
    taskDataMerge.datetime = datetime;
    taskDataMerge.dataId = savedFile.id;
    const savedTaskDataMerge = await _taskDataMergeAddOrUpdate({ param: taskDataMerge, connection: tx });
    infoLog(`[TASK DOWNLOAD DATA] merge task to database from ${userName}.${repoName} datetime = ${datetime}, id = ${savedTaskDataMerge.id}`);
    let task = new Task();
    task.type = taskType;
    task.dataId = savedTaskDataMerge.id;
    task.retryCount = 0;
    task.costTime = 0;
    task.status = TASK_STATUS_READY;
    const savedTask = await _taskAddOrUpdate({ param: task, connection: tx })
    infoLog(`[TASK DOWNLOAD DATA] add task to database from task type = ${taskType}, dataId = ${task.dataId}, id = ${savedTask.id}`);
  });
}
