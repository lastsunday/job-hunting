import { JobPublicSearchBO } from "@/common/data/bo/jobPublicSearchBO";
import { JobPublic } from "@/common/data/domain/jobPublic";
import { BaseService } from "../service/baseService";
import { SERVICE_INSTANCE as JOB_SERVICE_INSTANCE } from "../service/jobService";
import BaseBridgeService, { addTransactionServiceMethod, fillBaseServiceMethod } from "./baseBridgeService";
const TABLE_NAME = "job_public";
const TABLE_ID_COLUMN = "id";
const SERVICE_NAME = "jobPublic";
export const M_BATCH_ADD_JOB_PUBLIC_U_JOB = "BatchAddJobPublicAndUpdateJob";
export const SERVICE_INSTANCE = new BaseService(TABLE_NAME, TABLE_ID_COLUMN,
  () => {
    return new JobPublic();
  },
  () => {
    return new JobPublicSearchBO();
  },
  (param) => {
    let whereCondition = "";
    if (param.jobIds && param.jobIds.length > 0) {
      const arraySplitString = "'" + param.jobIds.join("','") + "'";
      whereCondition +=
        ` AND job_id IN (${arraySplitString})`;
    }
    if (param.sourceType !== undefined && param.sourceType !== null) {
      whereCondition += ` AND source_type = ${param.sourceType}`;
    }
    if (param.source !== undefined) {
      if (param.source === null) {
        whereCondition += ` AND source is null`;
      } else {
        whereCondition += ` AND source = '${param.source}'`;
      }
    }
    return whereCondition;
  }
);
const JobPublicService = new BaseBridgeService(SERVICE_INSTANCE, SERVICE_NAME);
fillBaseServiceMethod({ bridgeService: JobPublicService, overrideCreateDatetime: true, overrideUpdateDatetime: true });

addTransactionServiceMethod({
  bridgeService: JobPublicService, methodName: M_BATCH_ADD_JOB_PUBLIC_U_JOB, methodFunction: async ({ param, tx }) => {
    const { jobPublicList, jobList } = param;
    if (jobPublicList && jobPublicList.length > 0) {
      const jobPublicSourceAndJobIdMap = new Map();
      jobPublicList.forEach(item => {
        const key = `${item.sourceType}${item.source}`;
        const value = jobPublicSourceAndJobIdMap.get(key) || { source: item.source, sourceType: item.sourceType, jobIdList: [] };
        value.jobIdList.push(item.jobId);
        jobPublicSourceAndJobIdMap.set(key, value);
      });
      jobPublicSourceAndJobIdMap.values().forEach(item => {
        SERVICE_INSTANCE._deleteByIds(item.jobIdList, "job_id", {
          connection: tx,
          otherCondition: `source_type = ${item.sourceType} AND ${item.source ? `source = ${item.source}` : `source is null`} `
        });
      });
      await SERVICE_INSTANCE._batchAddOrUpdate(jobPublicList, { overrideCreateDatetime: true, overrideUpdateDatetime: true, connection: tx });
    }
    if (jobList && jobList.length > 0) {
      await JOB_SERVICE_INSTANCE._batchAddOrUpdate(jobList, { overrideCreateDatetime: true, overrideUpdateDatetime: false, connection: tx });
    }
  }
})

export default JobPublicService;
