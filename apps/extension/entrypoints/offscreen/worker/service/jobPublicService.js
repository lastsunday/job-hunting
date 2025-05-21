import { JobPublicSearchBO } from "@/common/data/bo/jobPublicSearchBO";
import { JobPublic } from "@/common/data/domain/jobPublic";
import { convertRows, getDb } from "../database";
import { BaseService } from "../service/baseService";
import { SERVICE_INSTANCE as JOB_SERVICE_INSTANCE } from "../service/jobService";
import BaseBridgeService, { addTransactionServiceMethod, fillBaseServiceMethod } from "./baseBridgeService";
import { genWhereSql } from "./sqlUtil";
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

export const _jobPublicBatchAddJobPublicAndUpdateJob = async (param, { connection = null } = {}) => {
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
        connection,
        otherCondition: `source_type = ${item.sourceType} AND ${item.source ? `source = '${item.source}'` : `source is null`} `
      });
    });
    await SERVICE_INSTANCE._batchAddOrUpdate(jobPublicList, { overrideCreateDatetime: true, overrideUpdateDatetime: true, connection });
  }
  if (jobList && jobList.length > 0) {
    await JOB_SERVICE_INSTANCE._batchAddOrUpdate(jobList, { overrideCreateDatetime: true, overrideUpdateDatetime: false, connection });
  }
}

addTransactionServiceMethod({
  bridgeService: JobPublicService, methodName: M_BATCH_ADD_JOB_PUBLIC_U_JOB, methodFunction: async ({ param, tx }) => {
    await _jobPublicBatchAddJobPublicAndUpdateJob(param, { connection: tx });
  }
})

export const _queryMinCreateDatetimeGroupByJobId = async (jobIds, { connection = null } = {}) => {
  connection ??= await getDb();
  const sql = `SELECT job_id ,MIN(create_datetime) AS create_datetime FROM job_public ${genWhereSql(
    [
      { include: jobIds && jobIds.length > 0, sql: ` AND job_id IN (${"'" + jobIds.join("','") + "'"})` }
    ]
  )} GROUP BY job_id`;
  const { rows } = await connection.query(sql);
  return convertRows(rows);
}


export default JobPublicService;
