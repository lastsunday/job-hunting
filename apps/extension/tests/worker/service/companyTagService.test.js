import * as modUtil from "@/common/extension/worker/util";
import { getDb } from "@/entrypoints/offscreen/worker/database";
import { _batchAddOrUpdateCompanyTag } from "@/entrypoints/offscreen/worker/service/companyTagService";
import { BaseService } from "@/entrypoints/offscreen/worker/service/baseService";
import { PGlite } from "@electric-sql/pglite";
import { expect, test, vi } from "vitest";

test('_batchAddOrUpdateCompanyTag executes deletes sequentially, not concurrently', async () => {
  vi.spyOn(modUtil, 'postErrorMessage').mockImplementation(async (message, error) => {
    throw error;
  });
  const db = await getDb({ dataDir: 'memory://' });
  expect(db).toBeInstanceOf(PGlite);

  const callOrder = [];
  const originalDeleteByIds = BaseService.prototype._deleteByIds;
  vi.spyOn(BaseService.prototype, '_deleteByIds').mockImplementation(async function (...args) {
    callOrder.push('del_start');
    const result = await originalDeleteByIds.apply(this, args);
    callOrder.push('del_end');
    return result;
  });

  const items = [
    { companyName: 'CorpA', sourceType: 0, source: null, tags: ['startup', 'fintech'], updateDatetime: new Date().toISOString() },
    { companyName: 'CorpB', sourceType: 0, source: 'linkedin', tags: ['enterprise'], updateDatetime: new Date().toISOString() },
  ];

  await (await getDb()).transaction(async (tx) => {
    await _batchAddOrUpdateCompanyTag({ companyTagBOs: items, overrideUpdateDatetime: false, connection: tx });
  });

  for (let i = 0; i < callOrder.length - 1; i++) {
    if (callOrder[i] === 'del_start') {
      expect(callOrder[i + 1]).not.toBe('del_start');
    }
  }
});
