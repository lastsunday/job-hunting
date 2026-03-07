import { HISTORY_FILE_MAX_SIZE } from '@/common/config';
import { infoLog } from '@/common/log';
import { getDb } from '../../database';
import {
  _fileGetAllNotDeleteFile,
  _fileLogicDeleteByIds,
} from '../fileService';
import { parse } from '@/common/utils/date';
import { TASK_STATUS_FINISHED } from '@/common';

export async function scheduleClearFile() {
  infoLog('[TASK] [SCHEDULE] scheduleClearFile');
  return await (
    await getDb()
  ).transaction(async (tx) => {
    const allNotDeleteFileList = await _fileGetAllNotDeleteFile({
      connection: tx,
    });
    const fileIdAndIsUnFinishedMap = new Map();
    const fileIdAndFileMap = new Map();
    for (let i = 0; i < allNotDeleteFileList.length; i++) {
      const item = allNotDeleteFileList[i];
      const fileId = item.dataId;
      const status = item.status;
      const isUnFinished = status !== TASK_STATUS_FINISHED;
      fileIdAndFileMap.set(fileId, {
        id: fileId,
        size: item.size,
        updateDatetime: item.updateDatetime,
      });
      if (fileIdAndIsUnFinishedMap.has(fileId)) {
        fileIdAndIsUnFinishedMap.set(
          fileId,
          fileIdAndIsUnFinishedMap.get(fileId) || isUnFinished
        );
      } else {
        fileIdAndIsUnFinishedMap.set(fileId, isUnFinished);
      }
    }
    for (let key of fileIdAndIsUnFinishedMap.keys()) {
      const isUnFinished = fileIdAndIsUnFinishedMap.get(key);
      if (isUnFinished) {
        fileIdAndFileMap.delete(key);
      }
    }
    const mergedFileList = Array.from(fileIdAndFileMap.values());
    // sort desc by updateDatetime
    mergedFileList.sort((a, b) => {
      return parse(a.updateDatetime).diff(parse(b.updateDatetime));
    });
    let totalSize = 0;
    let readyToDeleteFileIdList = [];
    for (let i = 0; i < mergedFileList.length; i++) {
      const item = mergedFileList[i];
      totalSize += item.size;
      if (HISTORY_FILE_MAX_SIZE >= 0 && totalSize > HISTORY_FILE_MAX_SIZE) {
        readyToDeleteFileIdList.push(item.id);
      }
    }
    const readyToDeleteFileIdListCount = readyToDeleteFileIdList.length;
    infoLog(
      `[TASK] [SCHEDULE] history file max size = ${HISTORY_FILE_MAX_SIZE},file count readyDelete/merged  = ${readyToDeleteFileIdListCount}/${mergedFileList.length}`
    );
    if (readyToDeleteFileIdListCount > 0) {
      await _fileLogicDeleteByIds({
        param: readyToDeleteFileIdList,
        connection: tx,
      });
      infoLog(
        `[TASK] [SCHEDULE] delete history file count = ${readyToDeleteFileIdList.length}`
      );
      return true;
    } else {
      infoLog(`[TASK] [SCHEDULE] no history file to delete`);
      return false;
    }
  });
}

