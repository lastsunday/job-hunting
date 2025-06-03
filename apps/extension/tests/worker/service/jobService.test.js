import { parse, dateToStr } from "@/common/utils/date";
import { getDb } from "@/entrypoints/offscreen/worker/database";
import { SERVICE_INSTANCE as JOB_PUBLIC_SERVICE_INSTANCE } from "@/entrypoints/offscreen/worker/service/jobPublicService";
import { SERVICE_INSTANCE, _batchInsertOrUpdateJob } from "@/entrypoints/offscreen/worker/service/jobService";
import { PGlite } from "@electric-sql/pglite";
import { expect, test } from "vitest";

test('job _batchInsertOrUpdateJob correct', async () => {
  const db = await getDb({ dataDir: 'memory://' });
  expect(db).toBeInstanceOf(PGlite);
  const jobPublicItem = { id: null, jobId: "jobId1", createDatetime: parse("2025-05-18"), updateDatetime: parse("2025-05-18"), sourceType: 0, source: null };
  const jobItem = { jobId: "jobId1" };
  const addJobPublicResult = await JOB_PUBLIC_SERVICE_INSTANCE._batchAddOrUpdate([jobPublicItem], { overrideCreateDatetime: true, overrideUpdateDatetime: true });
  expect(addJobPublicResult.length).toBe(1);
  const addJobResult = await _batchInsertOrUpdateJob([jobItem]);
  expect(addJobResult.length).toBe(1);
  const result = await SERVICE_INSTANCE._getById("jobId1");
  expect(dateToStr(parse(result.createDatetime))).toBe(dateToStr(parse("2025-05-18")));
})

