import { expect, test } from "vitest";
import { calculateUploadTask } from "@/entrypoints/offscreen/worker/service/app/taskUpload"
test('calculateUploadTask no need to upload', async () => {
    const now = new Date();
    expect(await calculateUploadTask({ getMaxEndDatetimeByUploadTask: () => { return now.toISOString() }, targetDay: async () => { return now } })).toBe(false);
})

//TODO
// test('calculateUploadTask need upload', async () => {
//     const dbDate = new Date("2025-05-06T00:00:00");
//     const now = new Date("2025-05-05T00:00:00");
//     expect(await calculateUploadTask({ getMaxEndDatetimeByUploadTask: () => { return dbDate.toISOString() }, targetDay: async () => { return now } })).toBe(false);
// })