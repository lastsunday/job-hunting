import { HISTORY_FILE_MAX_SIZE } from "@/common/config";
import { infoLog } from "@/common/log";
import { getDb } from "../../database";
import { _fileGetAllMergedNotDeleteFile, _fileLogicDeleteByIds } from "../fileService";

export async function scheduleClearFile() {
    infoLog("[TASK] [SCHEDULE] scheduleClearFile")
    await (await getDb()).transaction(async (tx) => {
        const mergedFileList = await _fileGetAllMergedNotDeleteFile({ connection: tx });
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
        infoLog(`[TASK] [SCHEDULE] history file max size = ${HISTORY_FILE_MAX_SIZE},file count readyDelete/merged  = ${readyToDeleteFileIdListCount}/${mergedFileList.length}`)
        if (readyToDeleteFileIdListCount > 0) {
            await _fileLogicDeleteByIds({ param: readyToDeleteFileIdList, connection: tx });
            infoLog(`[TASK] [SCHEDULE] delete history file count = ${readyToDeleteFileIdList.length}`);
        } else {
            infoLog(`[TASK] [SCHEDULE] no history file to delete`);
        }
    });
}