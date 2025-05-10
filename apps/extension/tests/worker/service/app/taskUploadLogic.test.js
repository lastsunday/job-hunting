import { TASK_TYPE_JOB_DATA_UPLOAD } from "@/common";
import * as mod from "@/entrypoints/offscreen/worker/database";
import { calculateRepoMaxUploadDate, saveTask } from "@/entrypoints/offscreen/worker/service/app/taskUploadLogic";
import * as modTaskDataUploadService from "@/entrypoints/offscreen/worker/service/taskDataUploadService";
import * as modTaskService from "@/entrypoints/offscreen/worker/service/taskService";
import dayjs from "dayjs";
import { expect, test, vi } from "vitest";
import { parse } from "@/common/utils/date";
const USER_NAME = import.meta.env.TEST_GITHUB_APP_USERNAME;
const REPO_NAME = "job-hunting-data";
const DEBUG = import.meta.env.TEST_ENABLE_DEBUG_LOG === "true";

test('calculateRepoMaxUploadDate return correct content', async () => {
    const result = await calculateRepoMaxUploadDate({
        userName: USER_NAME, repoName: REPO_NAME, type: TASK_TYPE_JOB_DATA_UPLOAD, getPathMap: async ({ userName, repoName }) => {
            expect(userName).toBe(USER_NAME);
            expect(repoName).toBe(REPO_NAME);
            const map = new Map();
            map.set(`/2025/01-02/job.zip`, `e5ced0af2db4606cc8dc5898bbe126a5badac2c5`);
            map.set(`/2025/01-01/job.zip`, `e5ced0af2db4606cc8dc5898bbe126a5badac2c6`);
            map.set(`/2025/01-03/job.zip`, `e5ced0af2db4606cc8dc5898bbe126a5badac2c7`);
            map.set(`/12025/01-03/job.zip`, `e5ced0af2db4606cc8dc5898bbe126a5badac2a7`);
            map.set(`/2025/01-01/company.zip`, `e5ced0af2db4606cc8dc5898bbe126a5badac2c8`);
            map.set(`/2025/01-02/company.zip`, `e5ced0af2db4606cc8dc5898bbe126a5badac2c9`);
            map.set(`README.md`, `e5ced0af2db4606cc8dc5898bbe126a5badac210`);
            return map;
        }
    });
    expect(result).toStrictEqual(parse("2025-01-03"));
})

test('saveTask return correct result', {}, async () => {
    vi.spyOn(mod, 'getDb').mockImplementation(async () => {
        const tx = {
            query: (sql, param) => {
                if (DEBUG) {
                    console.log(sql, param);
                }
                return { rows: [0] }
            }
        };
        return {
            transaction: async (callback) => {
                await callback(tx);
            }
        }
    });
    vi.spyOn(modTaskDataUploadService, '_taskDataUploadAddOrUpdate').mockImplementation(async ({ param }) => {
        const { type, username, reponame, startDatetime, endDatetime, dataCount } = param;
        expect(type).toBe(TASK_TYPE_JOB_DATA_UPLOAD);
        expect(username).toBe(USER_NAME);
        expect(reponame).toBe(REPO_NAME);
        expect(startDatetime).toStrictEqual(dayjs(parse("2025-05-04")));
        expect(endDatetime).toStrictEqual(dayjs(parse("2025-05-05")));
        expect(dataCount).toBe(10);
        return { id: "testDataId" }
    });
    vi.spyOn(modTaskService, '_taskAddOrUpdate').mockImplementation(async ({ param }) => {
        const { type, dataId, status, costTime, retryCount } = param;
        expect(type).toBe(TASK_TYPE_JOB_DATA_UPLOAD);
        expect(dataId).toBe("testDataId");
        expect(status).toBe("READY");
        expect(costTime).toBe(0);
        expect(retryCount).toBe(0);
    });
    await saveTask({
        type: TASK_TYPE_JOB_DATA_UPLOAD,
        startDatetime: dayjs(parse("2025-05-04")),
        endDatetime: dayjs(parse("2025-05-05")),
        userName: USER_NAME,
        repoName: REPO_NAME,
        getTotalByTaskType: async () => {
            return 10;
        }
    });
})