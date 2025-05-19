import * as modUtil from "@/common/extension/worker/util";
import { parse } from "@/common/utils/date";
import { getDb } from "@/entrypoints/offscreen/worker/database";
import {
  METHOD_ADD_OR_UPDATE, METHOD_BATCH_ADD_OR_UPDATE, METHOD_DELETE_BY_ID, METHOD_DELETE_BY_IDS,
  METHOD_GET_BY_ID, METHOD_GET_BY_IDS, METHOD_SEARCH
} from "@/entrypoints/offscreen/worker/service/baseBridgeService";
import JobPublicService from "@/entrypoints/offscreen/worker/service/jobPublicService";
import { PGlite } from "@electric-sql/pglite";
import { expect, test, vi } from "vitest";
test('job public service method name correct', async () => {
  const result = JobPublicService.getMethodNameMap();
  expect(result.size).greaterThan(0);
});

test('job public service crud logic correct', async () => {
  const item = { id: null, jobId: "jobId1", createDatetime: parse("2025-05-18"), updateDatetime: parse("2025-05-18") };
  const item2 = { id: null, jobId: "jobId2", createDatetime: parse("2025-05-19"), updateDatetime: parse("2025-05-19") };
  vi.spyOn(modUtil, 'postErrorMessage').mockImplementation(async (message, error) => {
    throw error;
  });
  const db = await getDb({ dataDir: 'memory://' });
  expect(db).toBeInstanceOf(PGlite);
  let itemId = null;
  let itemId2 = null;
  vi.spyOn(modUtil, 'postSuccessMessage').mockImplementation(async (message, data) => {
    const item = data;
    expect(item.jobId).toBe(("jobId1"));
    expect(parse(item.createDatetime).valueOf()).toMatchObject(parse("2025-05-18").valueOf());
    expect(parse(item.updateDatetime).valueOf()).toMatchObject(parse("2025-05-18").valueOf());
    itemId = item.id;
  });
  await JobPublicService[JobPublicService.getMethodName(METHOD_ADD_OR_UPDATE)]({}, item);
  vi.spyOn(modUtil, 'postSuccessMessage').mockImplementation(async (message, data) => {
    const item = data[0];
    expect(item.jobId).toBe(("jobId2"));
    expect(parse(item.createDatetime).valueOf()).toMatchObject(parse("2025-05-19").valueOf());
    expect(parse(item.updateDatetime).valueOf()).toMatchObject(parse("2025-05-19").valueOf());
    itemId2 = item.id;
  });
  await JobPublicService[JobPublicService.getMethodName(METHOD_BATCH_ADD_OR_UPDATE)]({}, { items: [item2] });
  vi.spyOn(modUtil, 'postSuccessMessage').mockImplementation(async (message, data) => {
    let item = data.items[0];
    expect(item.jobId).toBe(("jobId1"));
    expect(parse(item.createDatetime).valueOf()).toMatchObject(parse("2025-05-18").valueOf());
    expect(parse(item.updateDatetime).valueOf()).toMatchObject(parse("2025-05-18").valueOf());
    expect(data.total).toBe(2);
  });
  await JobPublicService[JobPublicService.getMethodName(METHOD_SEARCH)]({}, { pageNum: 1, pageSize: 1 });
  vi.spyOn(modUtil, 'postSuccessMessage').mockImplementation(async (message, data) => {
    let item = data;
    expect(item.jobId).toBe(("jobId1"));
    expect(parse(item.createDatetime).valueOf()).toMatchObject(parse("2025-05-18").valueOf());
    expect(parse(item.updateDatetime).valueOf()).toMatchObject(parse("2025-05-18").valueOf());
  });
  await JobPublicService[JobPublicService.getMethodName(METHOD_GET_BY_ID)]({}, itemId);
  vi.spyOn(modUtil, 'postSuccessMessage').mockImplementation(async (message, data) => {
    let item = data[0];
    expect(item.jobId).toBe(("jobId1"));
    expect(parse(item.createDatetime).valueOf()).toMatchObject(parse("2025-05-18").valueOf());
    expect(parse(item.updateDatetime).valueOf()).toMatchObject(parse("2025-05-18").valueOf());
  });
  await JobPublicService[JobPublicService.getMethodName(METHOD_GET_BY_IDS)]({}, [itemId]);
  vi.spyOn(modUtil, 'postSuccessMessage').mockImplementation(async (message, data) => {
    expect(data[0].affectedRows).toBe(1);
  });
  await JobPublicService[JobPublicService.getMethodName(METHOD_DELETE_BY_ID)]({}, itemId);
  vi.spyOn(modUtil, 'postSuccessMessage').mockImplementation(async (message, data) => {
    expect(data.total).toBe(1);
  });
  await JobPublicService[JobPublicService.getMethodName(METHOD_SEARCH)]({}, { pageNum: 1, pageSize: 1 });
  vi.spyOn(modUtil, 'postSuccessMessage').mockImplementation(async (message, data) => {
    expect(data[0].affectedRows).toBe(1);
  });
  await JobPublicService[JobPublicService.getMethodName(METHOD_DELETE_BY_IDS)]({}, [itemId2]);
  vi.spyOn(modUtil, 'postSuccessMessage').mockImplementation(async (message, data) => {
    expect(data.total).toBe(0);
  });
  await JobPublicService[JobPublicService.getMethodName(METHOD_SEARCH)]({}, { pageNum: 1, pageSize: 1 });
})
