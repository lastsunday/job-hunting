import * as modUtil from "@/common/extension/worker/util";
import { parse, dateToStr } from "@/common/utils/date";
import { getDb } from "@/entrypoints/offscreen/worker/database";
import {
  METHOD_BATCH_ADD_OR_UPDATE,
  METHOD_SEARCH
} from "@/entrypoints/offscreen/worker/service/baseBridgeService";
import { SERVICE_INSTANCE, _queryMinCreateDatetimeGroupByJobId } from "@/entrypoints/offscreen/worker/service/jobPublicService";
import { PGlite } from "@electric-sql/pglite";
import { expect, test, vi } from "vitest";

test('job public service query min createDatetime group by jobid correct', async () => {
  const db = await getDb({ dataDir: 'memory://' });
  expect(db).toBeInstanceOf(PGlite);
  const item = { id: null, jobId: "jobId1", createDatetime: parse("2025-05-18"), updateDatetime: parse("2025-05-18"), sourceType: 0, source: null };
  const item2 = { id: null, jobId: "jobId2", createDatetime: parse("2025-05-19"), updateDatetime: parse("2025-05-19"), sourceType: 0, source: null };
  const item_1 = { id: null, jobId: "jobId1", createDatetime: parse("2025-05-19"), updateDatetime: parse("2025-05-19"), sourceType: 0, source: "lastsunday" };
  const item2_1 = { id: null, jobId: "jobId2", createDatetime: parse("2025-05-17"), updateDatetime: parse("2025-05-17"), sourceType: 0, source: "lastsunday" };
  const addResult = await SERVICE_INSTANCE._batchAddOrUpdate([item, item2, item_1, item2_1],{overrideCreateDatetime : true, overrideUpdateDatetime : true});
  expect(addResult.length).toBe(4);
  const result = await _queryMinCreateDatetimeGroupByJobId(["jobId1", "jobId2"]);
  expect(dateToStr(result.filter(item => item.jobId == "jobId1")[0].createDatetime)).toBe(dateToStr(parse("2025-05-18")));
  expect(dateToStr(result.filter(item => item.jobId == "jobId2")[0].createDatetime)).toBe(dateToStr(parse("2025-05-17")));
})

