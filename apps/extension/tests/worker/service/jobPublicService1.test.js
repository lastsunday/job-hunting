import * as modUtil from "@/common/extension/worker/util";
import { dateToStr } from "@/common/utils";
import { parse } from "@/common/utils/date";
import { getDb } from "@/entrypoints/offscreen/worker/database";
import {
  METHOD_BATCH_ADD_OR_UPDATE,
  METHOD_SEARCH
} from "@/entrypoints/offscreen/worker/service/baseBridgeService";
import JobPublicService, { M_BATCH_ADD_JOB_PUBLIC_U_JOB } from "@/entrypoints/offscreen/worker/service/jobPublicService";
import { SERVICE_INSTANCE as JOB_SERVICE_INSTANCE } from "@/entrypoints/offscreen/worker/service/jobService";
import { PGlite } from "@electric-sql/pglite";
import { expect, test, vi } from "vitest";

test('BatchAddJobPublicAndUpdateJob logic correct', async () => {
  const item = { id: null, jobId: "jobId1", createDatetime: parse("2025-05-18"), updateDatetime: parse("2025-05-18"), sourceType: 0, source: null };
  const item2 = { id: null, jobId: "jobId1", createDatetime: parse("2025-05-17"), updateDatetime: parse("2025-05-17"), sourceType: 0, source: `lastsunday` };
  const item3 = { id: null, jobId: "jobId2", createDatetime: parse("2025-05-19"), updateDatetime: parse("2025-05-19"), sourceType: 0, source: `lastsunday` };
  vi.spyOn(modUtil, 'postErrorMessage').mockImplementation(async (message, error) => {
    throw error;
  });
  const db = await getDb({ dataDir: 'memory://' });
  expect(db).toBeInstanceOf(PGlite);
  vi.spyOn(modUtil, 'postSuccessMessage').mockImplementation(async (message, data) => {
    expect(data.length).toBe(3);
  });
  await JobPublicService[JobPublicService.getMethodName(METHOD_BATCH_ADD_OR_UPDATE)]({}, { items: [item, item2, item3] });
  vi.spyOn(modUtil, 'postSuccessMessage').mockImplementation(async (message, data) => {
  });
  await JOB_SERVICE_INSTANCE.addOrUpdate({}, { jobId: "jobId1", createDatetime: parse("2025-05-18"), updateDatetime: parse("2025-05-18") });
  const newItem = { id: null, jobId: "jobId1", createDatetime: parse("2025-05-10"), updateDatetime: parse("2025-05-10"), sourceType: 0, source: null };
  const jobItem = { jobId: "jobId1", createDatetime: parse("2025-05-10"), updateDatetime: parse("2025-05-10") }
  vi.spyOn(modUtil, 'postSuccessMessage').mockImplementation(async (message, data) => {
  });
  await JobPublicService[JobPublicService.getMethodName(M_BATCH_ADD_JOB_PUBLIC_U_JOB)]({}, { jobPublicList: [newItem], jobList: [jobItem] });
  vi.spyOn(modUtil, 'postSuccessMessage').mockImplementation(async (message, data) => {
    expect(data.total).toBe(3);
    const items = data.items;
    expect(items.filter(item => item.source == "lastsunday" && item.sourceType == 0).length).toBe(2);
    expect(items.filter(item => item.source == null && item.sourceType == 0).length).toBe(1);
    expect(dateToStr(parse(items.filter(item => item.source == null && item.sourceType == 0)[0].createDatetime))).toBe(dateToStr(parse("2025-05-10")));
  });
  await JobPublicService[JobPublicService.getMethodName(METHOD_SEARCH)]({}, { pageNum: 1, pageSize: 10 });
  vi.spyOn(modUtil, 'postSuccessMessage').mockImplementation(async (message, data) => {
    const item = data.items[0];
    expect(dateToStr(parse(item.createDatetime))).toBe(dateToStr(parse("2025-05-10")));
    expect(dateToStr(parse(item.updateDatetime))).not.toBe(dateToStr(parse("2025-05-10")));
  });
  await JOB_SERVICE_INSTANCE.search({}, {});
})
