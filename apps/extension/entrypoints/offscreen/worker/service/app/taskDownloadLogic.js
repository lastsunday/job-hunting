import { TASK_STATUS_READY } from '@/common';
import { Task } from '@/common/data/domain/task';
import { TaskDataDownload } from '@/common/data/domain/taskDataDownload';
import { getDb } from '../../database';
import {
  _taskDataDownloadAddOrUpdate,
  _taskDataDownloadGetById,
} from '../taskDataDownloadService';
import { _taskAddOrUpdate } from '../taskService';
import { TaskDataMerge } from '@/common/data/domain/taskDataMerge';
import { infoLog } from '@/common/log';
import { _fileAddOrUpdate } from '../fileService';
import { _taskDataMergeAddOrUpdate } from '../taskDataMergeService';

export async function saveTask({
  type,
  datetimeAndSeqList,
  userName,
  repoName,
  typeId,
  config,
} = {}) {
  await (
    await getDb()
  ).transaction(async (tx) => {
    for (let i = 0; i < datetimeAndSeqList.length; i++) {
      let item = datetimeAndSeqList[i];
      const day = item.day;
      const maxSeq = item.maxSeq;
      for (let i = 0; i < maxSeq; i++) {
        const seq = i;
        await addDataDownloadTask({
          type,
          datetime: day,
          userName,
          repoName,
          typeId,
          config,
          seq,
          connection: tx,
        });
      }
    }
  });
}

export async function addDataDownloadTask({
  type,
  datetime,
  userName,
  repoName,
  typeId,
  config,
  seq,
  connection = null,
} = {}) {
  let taskDataDownload = new TaskDataDownload();
  taskDataDownload.type = type;
  taskDataDownload.username = userName;
  taskDataDownload.reponame = repoName;
  taskDataDownload.datetime = datetime;
  taskDataDownload.typeId = typeId;
  taskDataDownload.config = config;
  taskDataDownload.seq = seq;
  let savedTaskDataDownload = await _taskDataDownloadAddOrUpdate({
    param: taskDataDownload,
    connection,
  });
  let task = new Task();
  task.type = type;
  task.dataId = savedTaskDataDownload.id;
  task.retryCount = 0;
  task.costTime = 0;
  task.status = TASK_STATUS_READY;
  await _taskAddOrUpdate({ param: task, connection });
}

export async function saveFileAndCalculateDataMergeTask({
  userName,
  repoName,
  taskType,
  file,
  datetime,
  typeId,
  config,
  total,
  pageNum,
  pageSize,
  downloadTaskId,
}) {
  await (
    await getDb()
  ).transaction(async (tx) => {
    const savedFile = await _fileAddOrUpdate({ param: file, connection: tx });
    infoLog(
      `[TASK DOWNLOAD DATA] save file to database from ${userName}.${repoName} datetime = ${datetime}, id = ${savedFile.id}, typeId = ${typeId}`
    );
    let taskData = await _taskDataDownloadGetById({
      param: downloadTaskId,
      connection: tx,
    });
    taskData.dataId = savedFile.id;
    await _taskDataDownloadAddOrUpdate({ param: taskData, connection: tx });
    //添加数据合并任务
    const taskDataMerge = new TaskDataMerge();
    taskDataMerge.type = taskType;
    taskDataMerge.username = userName;
    taskDataMerge.reponame = repoName;
    taskDataMerge.datetime = datetime;
    taskDataMerge.typeId = typeId;
    taskDataMerge.config = config;
    taskDataMerge.dataId = savedFile.id;
    taskDataMerge.dataCount = total;
    taskDataMerge.dataPageNum = pageNum;
    taskDataMerge.dataPageSize = pageSize;
    const savedTaskDataMerge = await _taskDataMergeAddOrUpdate({
      param: taskDataMerge,
      connection: tx,
    });
    infoLog(
      `[TASK DOWNLOAD DATA] merge task to database from ${userName}.${repoName} datetime = ${datetime}, id = ${savedTaskDataMerge.id}`
    );
    let task = new Task();
    task.type = taskType;
    task.dataId = savedTaskDataMerge.id;
    task.retryCount = 0;
    task.costTime = 0;
    task.status = TASK_STATUS_READY;
    const savedTask = await _taskAddOrUpdate({ param: task, connection: tx });
    infoLog(
      `[TASK DOWNLOAD DATA] add task to database from task type = ${taskType}, dataId = ${task.dataId}, id = ${savedTask.id}`
    );
  });
}
