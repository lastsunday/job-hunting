import { expect, test } from 'vitest';
import { scheduleClearFile } from '@/entrypoints/offscreen/worker/service/app/file';
import * as modFileService from '@/entrypoints/offscreen/worker/service/fileService';
import { vi } from 'vitest';
import { getDb } from '@/entrypoints/offscreen/worker/database';
import { PGlite } from '@electric-sql/pglite';
import { HISTORY_FILE_MAX_SIZE } from '@/common/config';

test('scheduleClearFile return correct content', async () => {
  const db = await getDb({ dataDir: 'memory://' });
  expect(db).toBeInstanceOf(PGlite);
  const allNotDeleteFile = [
    {
      id: '9800ec3e-6696-455c-878e-b3c0aa377cd3',
      dataId: '0caabc1f-b9a2-4ec6-849c-d2498f6a7bf4',
      status: 'FINISHED',
      size: HISTORY_FILE_MAX_SIZE + 1,
      updateDatetime: '2026-03-07T10:16:42.000Z',
    },
    {
      id: 'bf327d43-79c5-4e2b-8443-bf39016e8bb0',
      dataId: '4ecd7bf2-084e-48a5-8c0a-da05442e0340',
      status: 'FINISHED',
      size: 11541000,
      updateDatetime: '2026-03-07T10:16:38.000Z',
    },
    {
      id: '51a9bca0-7a06-453f-9c22-630ca64b9f02',
      dataId: '4ecd7bf2-084e-48a5-8c0a-da05442e0340',
      status: 'TEST',
      size: 11541000,
      updateDatetime: '2026-03-07T10:16:38.000Z',
    },
    {
      id: 'f37ff166-cde3-43ae-8214-34a71a5bca44',
      dataId: '4ecd7bf2-084e-48a5-8c0a-da05442e0340',
      status: 'FINISHED',
      size: 11541000,
      updateDatetime: '2026-03-07T10:16:38.000Z',
    },
    {
      id: '5013b50c-8141-4021-bbd6-26019ce4d056',
      dataId: '4ecd7bf2-084e-48a5-8c0a-da05442e0340',
      status: 'FINISHED',
      size: 11541000,
      updateDatetime: '2026-03-07T10:16:38.000Z',
    },
    {
      id: '02376a49-9258-404b-832e-4d8e3bfe3dac',
      dataId: '994ea91a-31b5-4d53-9427-22bf1444347f',
      status: 'FINISHED',
      size: 3577837,
      updateDatetime: '2026-03-07T10:15:48.000Z',
    },
  ];
  vi.spyOn(modFileService, '_fileGetAllNotDeleteFile').mockImplementation(
    async ({ param }) => {
      return allNotDeleteFile;
    }
  );
  vi.spyOn(modFileService, '_fileLogicDeleteByIds').mockImplementation(
    async ({ param, connection }) => {
      expect(param.length).toBe(1);
      expect(param).toEqual(
        expect.arrayContaining(['0caabc1f-b9a2-4ec6-849c-d2498f6a7bf4'])
      );
    }
  );
  let result = await scheduleClearFile();
  expect(result).toBeTruthy();
});
