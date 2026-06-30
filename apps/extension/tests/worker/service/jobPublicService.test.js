import * as modUtil from "@/common/extension/worker/util";
import { getDb } from "@/entrypoints/offscreen/worker/database";
import { _jobPublicBatchAddJobPublicAndUpdateJob } from "@/entrypoints/offscreen/worker/service/jobPublicService";
import { PGlite } from "@electric-sql/pglite";
import { expect, test, vi } from "vitest";

test('forEach bug: source with single quote no longer masks error as "transaction aborted"', async () => {
  vi.spyOn(modUtil, 'postErrorMessage').mockImplementation(async (message, error) => {
    throw error;
  });
  const db = await getDb({ dataDir: 'memory://' });
  expect(db).toBeInstanceOf(PGlite);

  await db.exec(`INSERT INTO job_public (id, job_id, source_type, source, create_datetime, update_datetime) VALUES
    ('old-x', 'job-x', 0, NULL, NOW(), NOW()),
    ('old-y', 'job-y', 0, 'normal', NOW(), NOW())`);

  const error = await (await getDb()).transaction(async (tx) => {
    try {
      await _jobPublicBatchAddJobPublicAndUpdateJob({
        jobPublicList: [
          { id: 'new-x', jobId: 'job-x', sourceType: 0, source: null, createDatetime: new Date().toISOString(), updateDatetime: new Date().toISOString() },
          { id: 'new-y', jobId: 'job-y', sourceType: 0, source: "it's", createDatetime: new Date().toISOString(), updateDatetime: new Date().toISOString() },
        ]
      }, { connection: tx });
      return null;
    } catch (e) {
      return e.message;
    }
  });

  expect(error).not.toBeNull();
  expect(error).not.toContain('current transaction is aborted');
  expect(error).toContain('syntax error');
});
