import * as modUtil from "@/common/extension/worker/util";
import { genSha256 } from "@/common/utils";
import { parse } from "@/common/utils/date";
import { getDb } from "@/entrypoints/offscreen/worker/database";
import {
  METHOD_BATCH_ADD_OR_UPDATE
} from "@/entrypoints/offscreen/worker/service/baseBridgeService";
import Service from "@/entrypoints/offscreen/worker/service/companyCommentService";
import { PGlite } from "@electric-sql/pglite";
import { expect, test, vi } from "vitest";
test('company commentservice method name correct', async () => {
  const result = Service.getMethodNameMap();
  expect(result.size).greaterThan(0);
});

test('company comment service batch add or update correct', { timeout: 60000 }, async () => {
  const batchItemList = [];
  for (let i = 0; i < 10000; i++) {
    batchItemList.push(
      {
        id: i + "",
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
    );
  }
  vi.spyOn(modUtil, 'postErrorMessage').mockImplementation(async (message, error) => {
    throw error;
  });
  const db = await getDb({ dataDir: 'memory://' });
  expect(db).toBeInstanceOf(PGlite);
  vi.spyOn(modUtil, 'postSuccessMessage').mockImplementation(async (message, data) => {
    expect(data.length).toBe(batchItemList.length)
  });
  await Service[Service.getMethodName(METHOD_BATCH_ADD_OR_UPDATE)]({}, { items: batchItemList });
})
