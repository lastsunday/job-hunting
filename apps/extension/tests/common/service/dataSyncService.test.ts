import { expect, test, vi } from "vitest";
import { getMergeDataListForJobPublic } from "@/common/service/dataSyncService";
import { parse } from "@/common/utils/date";
test('getMergeDataListForJobPublic in correct logic', async () => {
  const items = [
    { "jobId": "1", createDatetime: parse("2025-05-16"), "updateDatetime": parse("2025-05-16"), sourceType: 0, source: null },
    { "jobId": "2", createDatetime: parse("2025-05-17"), "updateDatetime": parse("2025-05-17"), sourceType: 0, source: null },
    { "jobId": "3", createDatetime: parse("2025-05-18"), "updateDatetime": parse("2025-05-18"), sourceType: 0, source: null },
    { "jobId": "4", createDatetime: parse("2025-05-19"), "updateDatetime": parse("2025-05-19"), sourceType: 0, source: null },
  ];
  const result = await getMergeDataListForJobPublic(items, "jobId", (ids) => {
    return [
      { "jobId": "2", "jobName": "test2", createDatetime: parse("2025-05-16"), "updateDatetime": parse("2025-05-16") },
      { "jobId": "3", "jobName": "test3", createDatetime: parse("2025-05-18"), "updateDatetime": parse("2025-05-18") },
      { "jobId": "4", "jobName": "test4", createDatetime: parse("2025-05-20"), "updateDatetime": parse("2025-05-20") },
    ]
  }, (ids) => {
    return [
      { "jobId": "2", createDatetime: parse("2025-05-16"), "updateDatetime": parse("2025-05-16"), sourceType: 0, source: null },
    ];
  });
  expect(result).toMatchObject({
    jobPublicList: [
      { "jobId": "1", createDatetime: parse("2025-05-16"), "updateDatetime": parse("2025-05-16"), sourceType: 0, source: null },
      { "jobId": "3", createDatetime: parse("2025-05-18"), "updateDatetime": parse("2025-05-18"), sourceType: 0, source: null },
      { "jobId": "4", createDatetime: parse("2025-05-19"), "updateDatetime": parse("2025-05-19"), sourceType: 0, source: null },
    ],
    jobList: [
      { "jobId": "4", "jobName": "test4", createDatetime: parse("2025-05-19"), "updateDatetime": parse("2025-05-20") },
    ]
  })
});
