import { TASK_TYPE_JOB_DATA_UPLOAD } from "@/common";
import { calculateUploadTask } from "@/entrypoints/offscreen/worker/service/app/taskUpload";
import * as modTaskUploadLogic from "@/entrypoints/offscreen/worker/service/app/taskUploadLogic";
import * as modTaskDataUploadService from "@/entrypoints/offscreen/worker/service/taskDataUploadService";
import dayjs from "dayjs";
import { expect, test, vi } from "vitest";
const USER_NAME = import.meta.env.TEST_GITHUB_APP_USERNAME;
const REPO_NAME = "job-hunting-data";
import { parse } from "@/common/utils/date";

test('calculateUploadTask no need to upload', async () => {
    vi.spyOn(modTaskDataUploadService, '_taskDataUploadGetMaxEndDatetime').mockReturnValue(parse("2025-05-09"));
    expect(await calculateUploadTask({
        userName: USER_NAME,
        repoName: REPO_NAME,
        taskType: TASK_TYPE_JOB_DATA_UPLOAD,
        targetDay: async () => { return parse("2025-05-09") }
    })).toBe(false);
})

test('calculateUploadTask need upload', async () => {
    vi.spyOn(modTaskDataUploadService, '_taskDataUploadGetMaxEndDatetime').mockReturnValue(parse("2025-05-04"));
    vi.spyOn(modTaskUploadLogic, 'calculateRepoMaxUploadDate').mockImplementation(async ({
        userName, repoName, type
    }) => {
        expect(type).toBe(TASK_TYPE_JOB_DATA_UPLOAD);
        expect(userName).toBe(USER_NAME);
        expect(repoName).toBe(REPO_NAME);
        return dayjs(parse("2025-05-04"));
    });
    vi.spyOn(modTaskUploadLogic, 'saveTask').mockImplementation(async ({ type, startDatetime, endDatetime, userName, repoName }) => {
        expect(type).toBe(TASK_TYPE_JOB_DATA_UPLOAD);
        expect(startDatetime).toStrictEqual(dayjs(parse("2025-05-04")));
        expect(endDatetime).toStrictEqual(dayjs(parse("2025-05-05")));
        expect(userName).toBe(USER_NAME);
        expect(repoName).toBe(REPO_NAME);
    })
    expect(await calculateUploadTask({
        userName: USER_NAME,
        repoName: REPO_NAME,
        taskType: TASK_TYPE_JOB_DATA_UPLOAD,
        targetDay: async () => { return dayjs(parse("2025-05-05")) },
    })).toBe(true);
})