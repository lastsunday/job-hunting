import * as modUtil from "@/common/extension/worker/util";
import { genSha256 } from "@/common/utils";
import { parse } from "@/common/utils/date";
import { getDb } from "@/entrypoints/offscreen/worker/database";
import {
  METHOD_ADD_OR_UPDATE, METHOD_BATCH_ADD_OR_UPDATE, METHOD_DELETE_BY_ID, METHOD_DELETE_BY_IDS,
  METHOD_GET_BY_ID, METHOD_GET_BY_IDS, METHOD_SEARCH
} from "@/entrypoints/offscreen/worker/service/baseBridgeService";
import Service from "@/entrypoints/offscreen/worker/service/companyCommentService";
import { PGlite } from "@electric-sql/pglite";
import { expect, test, vi } from "vitest";
test('company commentservice method name correct', async () => {
  const result = Service.getMethodNameMap();
  expect(result.size).greaterThan(0);
});

test('company comment service crud logic correct', async () => {
  const item = {
    id: null,
    companyId: genSha256("testCompanyName"),
    companyName: 'testCompanyName',
    comment: "test company comment",
    emotion: -1,
    sourceType: 0,
    source: "lastsunday/job-hunting-source",
    sourceDataName: "testSourceDataName",
    createDatetime: parse("2025-05-19"),
    updateDatetime: parse("2025-05-19"),
  }
  const item2 = {
    id: null,
    companyId: genSha256("testCompanyName2"),
    companyName: 'testCompanyName2',
    comment: "test company comment2",
    emotion: -1,
    sourceType: 0,
    source: "lastsunday/job-hunting-source",
    sourceDataName: "testSourceDataName2",
    createDatetime: parse("2025-05-20"),
    updateDatetime: parse("2025-05-20"),
  }
  const item3 = {
    id: null,
    companyId: genSha256("testCompanyName3"),
    companyName: 'testCompanyName3',
    comment: "test company comment3",
    emotion: -1,
    sourceType: 0,
    source: "lastsunday/job-hunting-source3",
    sourceDataName: "testSourceDataName3",
    createDatetime: parse("2025-05-19"),
    updateDatetime: parse("2025-05-19"),
  }
  vi.spyOn(modUtil, 'postErrorMessage').mockImplementation(async (message, error) => {
    throw error;
  });
  const db = await getDb({ dataDir: 'memory://' });
  expect(db).toBeInstanceOf(PGlite);
  let itemId = null;
  let itemId2 = null;
  let itemId3 = null;
  vi.spyOn(modUtil, 'postSuccessMessage').mockImplementation(async (message, data) => {
    const item = data;
    expect(item.companyName).toBe(("testCompanyName"));
    itemId = item.id;
  });
  await Service[Service.getMethodName(METHOD_ADD_OR_UPDATE)]({}, item);
  vi.spyOn(modUtil, 'postSuccessMessage').mockImplementation(async (message, data) => {
    const item2 = data[0];
    expect(item2.companyName).toBe(("testCompanyName2"));
    itemId2 = item2.id;
    const item3 = data[1];
    expect(item3.companyName).toBe(("testCompanyName3"));
    itemId3 = item3.id;
  });
  await Service[Service.getMethodName(METHOD_BATCH_ADD_OR_UPDATE)]({}, { items: [item2, item3] });
  vi.spyOn(modUtil, 'postSuccessMessage').mockImplementation(async (message, data) => {
    expect(data.total).toBe(3);
  });
  await Service[Service.getMethodName(METHOD_SEARCH)]({}, { pageNum: 1, pageSize: 1 });
  vi.spyOn(modUtil, 'postSuccessMessage').mockImplementation(async (message, data) => {
    expect(data.total).toBe(1);
  });
  await Service[Service.getMethodName(METHOD_SEARCH)]({}, {
    pageNum: 1,
    pageSize: 1,
    id: [itemId],
    companyId: genSha256("testCompanyName"),
    companyName: "testCompanyName",
    emotion: -1,
    sourceType: 0,
    source: "lastsunday/job-hunting-source",
    sourceDataName: "testSourceDataName",
    startDatetimeForCreate: parse("2025-05-19"),
    endDatetimeForCreate: parse("2025-05-20"),
    startDatetimeForUpdate: parse("2025-05-19"),
    endDatetimeForUpdate: parse("2025-05-20"),
  });
  vi.spyOn(modUtil, 'postSuccessMessage').mockImplementation(async (message, data) => {
    let item = data;
    expect(item.companyName).toBe(("testCompanyName"));
  });
  await Service[Service.getMethodName(METHOD_GET_BY_ID)]({}, itemId);
  vi.spyOn(modUtil, 'postSuccessMessage').mockImplementation(async (message, data) => {
    let item = data[0];
    expect(item.companyName).toBe(("testCompanyName"));
  });
  await Service[Service.getMethodName(METHOD_GET_BY_IDS)]({}, [itemId]);
  vi.spyOn(modUtil, 'postSuccessMessage').mockImplementation(async (message, data) => {
    expect(data[0].affectedRows).toBe(1);
  });
  await Service[Service.getMethodName(METHOD_DELETE_BY_ID)]({}, itemId);
  vi.spyOn(modUtil, 'postSuccessMessage').mockImplementation(async (message, data) => {
    expect(data.total).toBe(2);
  });
  await Service[Service.getMethodName(METHOD_SEARCH)]({}, { pageNum: 1, pageSize: 1 });
  vi.spyOn(modUtil, 'postSuccessMessage').mockImplementation(async (message, data) => {
    expect(data[0].affectedRows).toBe(2);
  });
  await Service[Service.getMethodName(METHOD_DELETE_BY_IDS)]({}, [itemId2, itemId3]);
  vi.spyOn(modUtil, 'postSuccessMessage').mockImplementation(async (message, data) => {
    expect(data.total).toBe(0);
  });
  await Service[Service.getMethodName(METHOD_SEARCH)]({}, { pageNum: 1, pageSize: 1 });
})
