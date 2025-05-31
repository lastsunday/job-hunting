import * as modUtil from "@/common/extension/worker/util";
import { parse, dateToStr } from "@/common/utils/date";
import { getDb } from "@/entrypoints/offscreen/worker/database";
import {
  METHOD_BATCH_ADD_OR_UPDATE,
  METHOD_SEARCH
} from "@/entrypoints/offscreen/worker/service/baseBridgeService";
import JobPublicService from "@/entrypoints/offscreen/worker/service/jobPublicService";
import { PGlite } from "@electric-sql/pglite";
import { expect, test, vi } from "vitest";

test('job public service advance search correct', async () => {
  const item = { id: null, jobId: "jobId1", createDatetime: parse("2025-05-18"), updateDatetime: parse("2025-05-18"), sourceType: 0, source: null };
  const item2 = { id: null, jobId: "jobId2", createDatetime: parse("2025-05-19"), updateDatetime: parse("2025-05-19"), sourceType: 0, source: null };
  const item2_1 = { id: null, jobId: "jobId2", createDatetime: parse("2025-05-20"), updateDatetime: parse("2025-05-20"), sourceType: 0, source: "lastsunday" };
  vi.spyOn(modUtil, 'postErrorMessage').mockImplementation(async (message, error) => {
    throw error;
  });
  const db = await getDb({ dataDir: 'memory://' });
  expect(db).toBeInstanceOf(PGlite);
  vi.spyOn(modUtil, 'postSuccessMessage').mockImplementation(async (message, data) => {
    expect(data.length).toBe(3);
  });
  await JobPublicService[JobPublicService.getMethodName(METHOD_BATCH_ADD_OR_UPDATE)]({}, { items: [item, item2, item2_1] });
  vi.spyOn(modUtil, 'postSuccessMessage').mockImplementation(async (message, data) => {
    const { items, total } = data;
    expect(total).toBe(2);
    expect(items[0].source).toBeNull();
    expect(items[0].sourceType).toBe(0);
    expect(items[1].source).toBeNull();
    expect(items[1].sourceType).toBe(0);
  });
  await JobPublicService[JobPublicService.getMethodName(METHOD_SEARCH)]({}, { jobIds: ["jobId1", "jobId2"], sourceType: 0, source: null });
})

