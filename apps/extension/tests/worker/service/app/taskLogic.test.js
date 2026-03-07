import { expect, test } from 'vitest';
import { TASK_TYPE_JOB_DATA_DOWNLOAD } from '@/common';
import { queryRepoFileDateAndMaxSeqMap } from '@/entrypoints/offscreen/worker/service/app/taskLogic';

const USER_NAME = 'lastsunday';
const REPO_NAME = 'job-hunting-data';
const TASK_TYPE = TASK_TYPE_JOB_DATA_DOWNLOAD;

test('queryRepoFileDateAndMaxSeqMap in correct logic', async () => {
  const result = await queryRepoFileDateAndMaxSeqMap({
    userName: USER_NAME,
    repoName: REPO_NAME,
    taskType: TASK_TYPE,
    getPathMap: async ({ userName, repoName }) => {
      return new Map([
        ['/2026/01-01/job.zip', 'dummyhash'],
        ['/2026/01-02/job.zip', 'dummyhash'],
        ['/2026/01-03/job.zip', 'dummyhash'],
        ['/2026/01-04/job.zip', 'dummyhash'],
        ['/2026/01-04/job_1.zip', 'dummyhash'],
        ['/2026/01-04/job_2.zip', 'dummyhash'],
      ]);
    },
  });
});
