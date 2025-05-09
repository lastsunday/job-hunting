import { expect, test } from "vitest";
import { calculateUploadTask } from "@/entrypoints/offscreen/worker/service/app/taskUpload"
import { TASK_TYPE_JOB_DATA_UPLOAD } from "@/common";

const userName = import.meta.env.TEST_GITHUB_APP_USERNAME;
const repoName = "job-hunting-data";
const uploadJobTaskType = TASK_TYPE_JOB_DATA_UPLOAD;
test('calculateUploadTask no need to upload', async () => {
    const now = new Date();
    expect(await calculateUploadTask({ userName, repoName, taskType: uploadJobTaskType, getMaxEndDatetimeByUploadTask: () => { return now.toISOString() }, targetDay: async () => { return now } })).toBe(false);
})

//TODO
// test('calculateUploadTask need upload', async () => {
//     const dbDate = new Date("2025-05-04T00:00:00");
//     const now = new Date("2025-05-05T00:00:00");
//     expect(await calculateUploadTask({
//         userName,
//         repoName,
//         taskType: uploadJobTaskType,
//         getMaxEndDatetimeByUploadTask: () => { return dbDate.toISOString() }, targetDay: async () => { return now },
//         // getRepoMaxDateByTaskType: async ({ userName, repoName, type }) => {
//         //     return new Date("2025-05-04T00:00:00");
//         // }

//     })).toBe(true);
// })