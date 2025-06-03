import { expect, test } from "vitest";
import { _taskDataUploadGetMaxEndDatetime } from "@/entrypoints/offscreen/worker/service/taskDataUploadService";
import {
    TASK_TYPE_JOB_DATA_UPLOAD,
} from "@/common";

test('_taskDataUploadGetMaxEndDatetime return correct sql', () => {
    _taskDataUploadGetMaxEndDatetime({
        connection: {
            query: async (sql) => {
                expect(sql.trim()).toBe(`SELECT MAX(end_datetime) AS datetime FROM task_data_upload WHERE username = 'lastsunday' AND reponame = 'job-hunting-data' AND type = 'JOB_DATA_UPLOAD'`);
                return { rows: [{ datetime: new Date() }] }
            }
        }, username: "lastsunday", reponame: "job-hunting-data", type: TASK_TYPE_JOB_DATA_UPLOAD
    });
    _taskDataUploadGetMaxEndDatetime({
        connection: {
            query: async (sql) => {
                expect(sql.trim()).toBe(`SELECT MAX(end_datetime) AS datetime FROM task_data_upload`);
                return { rows: [{ datetime: new Date() }] }
            }
        }
    });
})
