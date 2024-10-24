import { Job } from "../data/domain/job";
import { JobDTO } from "../data/dto/jobDTO";
import { invoke } from "./bridge";
import { StatisticJobBrowseDTO } from "../data/dto/statisticJobBrowseDTO";
import { SearchJobBO } from "../data/bo/searchJobBO";
import { SearchJobDTO } from "../data/dto/searchJobDTO";
import { StatisticJobSearchGroupByAvgSalaryDTO } from "../data/dto/statisticJobSearchGroupByAvgSalaryDTO";
import { Company } from "../data/domain/company";
import { CONTENT_SCRIPT } from "./bridgeCommon";
import { CompanyTagBO } from "../data/bo/companyTagBO";
import { CompanyTagDTO } from "../data/dto/companyTagDTO";
import { SearchCompanyTagBO } from "../data/bo/searchCompanyTagBO";
import { SearchCompanyTagDTO } from "../data/dto/searchCompanyTagDTO";
import { StatisticCompanyTagDTO } from "../data/dto/statisticCompanyTagDTO";
import { SearchCompanyBO } from "../data/bo/searchCompanyBO";
import { SearchCompanyDTO } from "../data/dto/searchCompanyDTO";
import { StatisticCompanyDTO } from "../data/dto/statisticCompanyDTO";
import { CompanyBO } from "../data/bo/companyBO";
import { OauthDTO } from "../data/dto/oauthDTO";
import { AssistantStatisticDTO } from "../data/dto/assistantStatisticDTO";
import { CompanyDTO } from "../data/dto/companyDTO";
import { Mission } from "../data/domain/mission";
import { MissionLog } from "../data/domain/missionLog";
import { SearchMissionLogBO } from "../data/bo/searchMissionLogBO";
import { SearchMissionLogDTO } from "../data/dto/searchMissionLogDTO";
import { SearchTaskBO } from "../data/bo/searchTaskBO";
import { SearchTaskDTO } from "../data/dto/searchTaskDTO";
import { SearchTaskDataUploadBO } from "../data/bo/searchTaskDataUploadBO";
import { SearchTaskDataUploadDTO } from "../data/dto/searchTaskDataUploadDTO";
import { TaskDataUpload } from "../data/domain/taskDataUpload";
import { File } from "../data/domain/file";
import { SearchTaskDataDownloadBO } from "../data/bo/searchTaskDataDownloadBO";
import { SearchTaskDataDownloadDTO } from "../data/dto/searchTaskDataDownloadDTO";
import { SearchTaskDataMergeBO } from "../data/bo/searchTaskDataMergeBO";
import { SearchTaskDataMergeDTO } from "../data/dto/searchTaskDataMergeDTO";
import { TaskDataDownload } from "../data/domain/taskDataDownload";
import { TaskDataMerge } from "../data/domain/taskDataMerge";
import { DataSharePartner } from "../data/domain/dataSharePartner";
import { SearchDataSharePartnerBO } from "../data/bo/searchDataSharePartnerBO";
import { SearchDataSharePartnerDTO } from "../data/dto/searchDataSharePartnerDTO";
import { StatisticDataSharePartnerDTO } from "../data/dto/statisticDataSharePartnerDTO";
import { StatisticTaskBO } from "../data/bo/statisticTaskBO";
import { StatisticTaskDTO } from "../data/dto/statisticTaskDTO";

export const JobApi = {
  /**
   *
   * @param {Job[]} jobs
   */
  batchAddOrUpdateJobBrowse: async function (jobs) {
    return await invoke(this.batchAddOrUpdateJobBrowse.name, jobs);
  },

  /**
   *
   * @param {Job[]} jobs
   */
  batchAddOrUpdateJob: async function (jobs, { invokeEnv } = { invokeEnv: CONTENT_SCRIPT }) {
    return await invoke(this.batchAddOrUpdateJob.name, jobs, {
      invokeEnv: invokeEnv,
    });
  },
  /**
     *
     * @param {Job[]} jobs
     */
  batchAddOrUpdateJobWithTransaction: async function (jobs, { invokeEnv } = { invokeEnv: CONTENT_SCRIPT }) {
    return await invoke(this.batchAddOrUpdateJobWithTransaction.name, jobs, {
      invokeEnv: invokeEnv,
    });
  },
  /**
   *
   * @param {Job} job
   */
  addOrUpdateJobBrowse: async function (job) {
    return await invoke(this.addOrUpdateJobBrowse.name, job);
  },

  /**
   *
   * @param {SearchJobBO} param
   *
   * @returns SearchJobDTO[]
   */
  searchJob: async function (param, { invokeEnv } = { invokeEnv: CONTENT_SCRIPT }) {
    let result = await invoke(this.searchJob.name, param, {
      invokeEnv: invokeEnv,
    });
    return result.data;
  },

  /**
   *
   * @param {string[]} ids
   *
   * @returns JobDTO[]
   */
  getJobBrowseInfoByIds: async function (ids) {
    let result = await invoke(this.getJobBrowseInfoByIds.name, ids);
    return result.data;
  },

  /**
   *
   * @returns {StatisticJobBrowseDTO}
   */
  statisticJobBrowse: async function () {
    let result = await invoke(this.statisticJobBrowse.name, {});
    return result.data;
  },

  /**
   *
   * @param {SearchJobBO} param
   *
   * @returns StatisticJobSearchGroupByAvgSalaryDTO
   */
  statisticJobSearchGroupByAvgSalary: async function (param) {
    let result = await invoke(
      this.statisticJobSearchGroupByAvgSalary.name,
      param
    );
    return result.data;
  },

  /**
   *
   * @param {string} param url
   *
   * @returns Job
   */
  getJobByDetailUrl: async function (
    param,
    { invokeEnv } = { invokeEnv: CONTENT_SCRIPT }
  ) {
    let result = await invoke(this.getJobByDetailUrl.name, param, {
      invokeEnv: invokeEnv,
    });
    return result.data;
  },
  /**
   *
   * @param {string} param jobId
   */
  addJobBrowseDetailHistory: async function (
    param,
    { invokeEnv } = { invokeEnv: CONTENT_SCRIPT }
  ) {
    return await invoke(this.addJobBrowseDetailHistory.name, param, {
      invokeEnv: invokeEnv,
    });
  },
  /**
   *
   * @param {string[]} param ids
   *
   * @returns Job[]
   */
  jobGetByIds: async function (
    param,
    { invokeEnv } = { invokeEnv: CONTENT_SCRIPT }
  ) {
    let result = await invoke(this.jobGetByIds.name, param, {
      invokeEnv: invokeEnv,
    });
    return result.data;
  },

};

export const CompanyApi = {
  /**
   *
   * @param {string} id
   */
  getCompanyById: async function (id) {
    let result = await invoke(this.getCompanyById.name, id);
    return result.data;
  },

  /**
 *
 * @param {string[]} ids
 * @returns CompanyDTO[]
 */
  getCompanyDTOByIds: async function (ids) {
    let result = await invoke(this.getCompanyDTOByIds.name, ids);
    return result.data;
  },

  /**
   *
   * @param {string[]} param ids
   *
   * @returns Company[]
   */
  companyGetByIds: async function (
    param,
    { invokeEnv } = { invokeEnv: CONTENT_SCRIPT }
  ) {
    let result = await invoke(this.companyGetByIds.name, param, {
      invokeEnv: invokeEnv,
    });
    return result.data;
  },

  /**
   * 
   * @returns StatisticCompanyDTO
   */
  statisticCompany: async function () {
    let result = await invoke(this.statisticCompany.name, {});
    return result.data;
  },

  /**
   * 
   * @param {SearchCompanyBO} param 
   * @returns SearchCompanyDTO
   */
  searchCompany: async function (param, { invokeEnv } = { invokeEnv: CONTENT_SCRIPT }) {
    let result = await invoke(this.searchCompany.name, param, { invokeEnv });
    return result.data;
  },

  /**
   *
   * @param {Company} company
   */
  addOrUpdateCompany: async function (company) {
    return await invoke(this.addOrUpdateCompany.name, company);
  },

  /**
   *
   * @param {CompanyBO} param
   */
  batchAddOrUpdateCompany: async function (param, { invokeEnv } = { invokeEnv: CONTENT_SCRIPT }) {
    return await invoke(this.batchAddOrUpdateCompany.name, param, { invokeEnv: invokeEnv });
  },

  /**
 *
 * @param {CompanyBO} param
 */
  batchAddOrUpdateCompanyWithTransaction: async function (param, { invokeEnv } = { invokeEnv: CONTENT_SCRIPT }) {
    return await invoke(this.batchAddOrUpdateCompanyWithTransaction.name, param, { invokeEnv: invokeEnv });
  },

  /**
  *
  * @param {CompanyTagBO} param
  */
  addOrUpdateCompanyTag: async function (param) {
    return await invoke(this.addOrUpdateCompanyTag.name, param);
  },

  /**
  *
  * @param {CompanyTagBO[]} param
  */
  batchAddOrUpdateCompanyTag: async function (param, { invokeEnv } = { invokeEnv: CONTENT_SCRIPT }) {
    return await invoke(this.batchAddOrUpdateCompanyTag.name, param, { invokeEnv: invokeEnv });
  },

  /**
  *
  * @param {CompanyTagBO[]} param
  */
  batchAddOrUpdateCompanyTagWithTransaction: async function (param, { invokeEnv } = { invokeEnv: CONTENT_SCRIPT }) {
    return await invoke(this.batchAddOrUpdateCompanyTagWithTransaction.name, param, { invokeEnv: invokeEnv });
  },
  /**
   * 
   * @param {string} id companyId 
   * @returns CompanyTagDTO[]
   */
  getAllCompanyTagDTOByCompanyId: async function (id) {
    let result = await invoke(this.getAllCompanyTagDTOByCompanyId.name, id);
    return result.data;
  },

  /**
   * 
   * @param {string[]} ids 
   * @returns CompanyTagDTO[]
   */
  getAllCompanyTagDTOByCompanyIds: async function (ids, { invokeEnv } = { invokeEnv: CONTENT_SCRIPT }) {
    let result = await invoke(this.getAllCompanyTagDTOByCompanyIds.name, ids, { invokeEnv: invokeEnv });
    return result.data;
  },

  /**
   * 
   * @param {SearchCompanyTagBO} param 
   * @returns SearchCompanyTagDTO
   */
  searchCompanyTag: async function (param, { invokeEnv } = { invokeEnv: CONTENT_SCRIPT }) {
    let result = await invoke(this.searchCompanyTag.name, param, { invokeEnv: invokeEnv });
    return result.data;
  },

  /**
   * 
   * @returns StatisticCompanyTagDTO
   */
  statisticCompanyTag: async function () {
    let result = await invoke(this.statisticCompanyTag.name, {});
    return result.data;
  },

  /**
   * 
   * @param {string[]} param companyIds
   * @returns 
   */
  deleteCompanyTagByCompanyIds: async function (param) {
    return await invoke(this.deleteCompanyTagByCompanyIds.name, param);
  },
};

export const TagApi = {
  /**
   *
   * 
   * @returns Tag[]
   */
  getAllTag: async function () {
    let result = await invoke(this.getAllTag.name, {});
    return result.data;
  }
}

export const AuthApi = {

  /**
   *
   * @returns OauthDTO
   */
  authOauth2Login: async function () {
    let result = await invoke(this.authOauth2Login.name, {});
    return result.data;
  },

  /**
   *
   * @returns OauthDTO
   */
  authInstallAndLogin: async function () {
    let result = await invoke(this.authInstallAndLogin.name, {});
    return result.data;
  },

  /**
 *
 * @returns OauthDTO
 */
  authGetToken: async function () {
    let result = await invoke(this.authGetToken.name, null);
    return result.data;
  },

  /**
    *
    * @param {OauthDTO} param
    */
  authSetToken: async function (param) {
    return await invoke(this.authSetToken.name, param);
  },
}

export const UserApi = {

  /**
  *
  * @returns UserDTO
  */
  userGet: async function () {
    let result = await invoke(this.userGet.name, {});
    return result.data;
  },

  /**
    *
    * @param {UserDTO} param
    */
  userSet: async function (param) {
    return await invoke(this.userSet.name, param);
  },
}

export const ConfigApi = {

  /**
   * 
   * @param {string} param key
   * 
   * @returns Config
   */
  getConfigByKey: async function (param, { invokeEnv } = { invokeEnv: CONTENT_SCRIPT }) {
    let result = await invoke(this.getConfigByKey.name, param, {
      invokeEnv: invokeEnv,
    });
    return result.data;
  },

  /**
   * 
   * @returns Config[]
   */
  getAllConfig: async function ({ invokeEnv } = { invokeEnv: CONTENT_SCRIPT }) {
    let result = await invoke(this.getAllConfig.name, {}, {
      invokeEnv: invokeEnv,
    });
    return result.data;
  },

  /**
   * 
   * @param {Config} param config
   * 
   */
  addOrUpdateConfig: async function (param, { invokeEnv } = { invokeEnv: CONTENT_SCRIPT }) {
    return await invoke(this.addOrUpdateConfig.name, param, {
      invokeEnv: invokeEnv,
    });
  },

}

export const AssistantApi = {

  /**
   *
   * @param {SearchJobBO} param
   *
   * @returns SearchJobDTO[]
   */
  assistantSearchFaviousJob: async function (param) {
    let result = await invoke(this.assistantSearchFaviousJob.name, param);
    return result.data;
  },
  /**
   * 
   * @param {JobFaviousSettingDTO} param
   * 
   */
  assistantSetJobFaviousSetting: async function (param) {
    return await invoke(this.assistantSetJobFaviousSetting.name, param);
  },
  /**
   * 
   * @returns JobFaviousSettingDTO
   */
  assistantGetJobFaviousSetting: async function () {
    let result = await invoke(this.assistantGetJobFaviousSetting.name, {});
    return result.data;
  },
  /**
 * 
 * @returns AssistantStatisticDTO
 */
  assistantStatistic: async function () {
    let result = await invoke(this.assistantStatistic.name, {});
    return result.data;
  },

}

export const DeveloperApi = {

  /**
   * 
   * @param {string} param token
   * @returns 
   */
  developerSetToken: async function (param) {
    return await invoke(this.developerSetToken.name, param);
  },
  /**
   * 
   * @returns string
   */
  developerGetToken: async function () {
    let result = await invoke(this.developerGetToken.name, {});
    return result.data;
  },

}

export const SystemApi = {
  /**
   * 
   * @param {{url,active}} param 
   * @returns 
   */
  systemTabCreate: async function (param) {
    let result = await invoke(this.systemTabCreate.name, param);
    return result.data;
  },
}

export const AutomateApi = {
  /**
   * 
   * @param {{url,platform,delay,delayRandomRange}} param 
   * @returns 
   */
  automateFetchJobItemData: async function (param) {
    let result = await invoke(this.automateFetchJobItemData.name, param);
    return result.data;
  },
}

export const MissionApi = {

  /**
   * 
   * @param {} param 
   * @returns Mission[]
   */
  missionGetAll: async function (param) {
    let result = await invoke(this.missionGetAll.name, param);
    return result.data;
  },

  /**
   * 
   * @param {Mission} param 
   * @returns 
   */
  missionAddOrUpdate: async function (param) {
    let result = await invoke(this.missionAddOrUpdate.name, param);
    return result.data;
  },

  /**
   * 
   * @param {string} param id
   * @returns 
   */
  missionDeleteById: async function (param) {
    let result = await invoke(this.missionDeleteById.name, param);
    return result.data;
  },

}

export const MissionLogApi = {

  /**
   * 
   * @param {SearchMissionLogBO} param 
   * @returns {SearchMissionLogDTO}
   */
  searchMissionLog: async function (param) {
    let result = await invoke(this.searchMissionLog.name, param);
    return result.data;
  },

  /**
   * 
   * @param {MissionLog} param 
   * @returns 
   */
  missionLogAddOrUpdate: async function (param) {
    let result = await invoke(this.missionLogAddOrUpdate.name, param);
    return result.data;
  },

  /**
   * 
   * @param {string} param id
   * @returns 
   */
  missionLogDeleteById: async function (param) {
    let result = await invoke(this.missionLogDeleteById.name, param);
    return result.data;
  },

  /**
 * 
 * @param {string[]} param ids
 * @returns 
 */
  missionLogDeleteByIds: async function (param) {
    let result = await invoke(this.missionLogDeleteByIds.name, param);
    return result.data;
  },

  /**
   * 
   * @param {string[]} param ids
   * @returns 
   */
  missionSort: async function (param) {
    let result = await invoke(this.missionSort.name, param);
    return result.data;
  },

}

export const TaskApi = {

  /**
   * 
   * @param {SearchTaskBO} param 
   * @returns {SearchTaskDTO}
   */
  searchTask: async function (param, { invokeEnv } = { invokeEnv: CONTENT_SCRIPT }) {
    let result = await invoke(this.searchTask.name, param, { invokeEnv: invokeEnv });
    return result.data;
  },

  /**
   * 
   * @param {SearchTaskBO} param 
   * @returns {SearchTaskDTO}
   */
  searchTaskWithDetail: async function (param, { invokeEnv } = { invokeEnv: CONTENT_SCRIPT }) {
    let result = await invoke(this.searchTaskWithDetail.name, param, { invokeEnv: invokeEnv });
    return result.data;
  },

  /**
   * 
   * @param {Task} param 
   * @returns Task
   */
  taskAddOrUpdate: async function (param, { invokeEnv } = { invokeEnv: CONTENT_SCRIPT }) {
    let result = await invoke(this.taskAddOrUpdate.name, param, { invokeEnv: invokeEnv });
    return result.data;
  },

  /**
   * 
   * @param {string} param id
   * @returns 
   */
  taskDeleteById: async function (param, { invokeEnv } = { invokeEnv: CONTENT_SCRIPT }) {
    let result = await invoke(this.taskDeleteById.name, param, { invokeEnv: invokeEnv });
    return result.data;
  },

  /**
 * 
 * @param {string[]} param ids
 * @returns 
 */
  taskDeleteByIds: async function (param, { invokeEnv } = { invokeEnv: CONTENT_SCRIPT }) {
    let result = await invoke(this.taskDeleteByIds.name, param, { invokeEnv: invokeEnv });
    return result.data;
  },
  /**
 * 
 * @param StatisticTaskBO param 
 * @returns StatisticTaskDTO
 */
  statisticTask: async function (param, { invokeEnv } = { invokeEnv: CONTENT_SCRIPT }) {
    let result = await invoke(this.statisticTask.name, param, { invokeEnv: invokeEnv });
    return result.data;
  },

}

export const TaskDataUploadApi = {

  /**
   * 
   * @param {SearchTaskDataUploadBO} param 
   * @returns {SearchTaskDataUploadDTO}
   */
  searchTaskDataUpload: async function (param, { invokeEnv } = { invokeEnv: CONTENT_SCRIPT }) {
    let result = await invoke(this.searchTaskDataUpload.name, param, { invokeEnv: invokeEnv });
    return result.data;
  },

  /**
   * 
   * @param {string} param id 
   * @returns {TaskDataUpload}
   */
  taskDataUploadGetById: async function (param, { invokeEnv } = { invokeEnv: CONTENT_SCRIPT }) {
    let result = await invoke(this.taskDataUploadGetById.name, param, { invokeEnv: invokeEnv });
    return result.data;
  },

  /**
   * 
   * @param {TaskDataUpload} param 
   * @returns TaskDataUpload
   */
  taskDataUploadAddOrUpdate: async function (param, { invokeEnv } = { invokeEnv: CONTENT_SCRIPT }) {
    let result = await invoke(this.taskDataUploadAddOrUpdate.name, param, { invokeEnv: invokeEnv });
    return result.data;
  },

  /**
   * 
   * @param {string} param id
   * @returns 
   */
  taskDataUploadDeleteById: async function (param, { invokeEnv } = { invokeEnv: CONTENT_SCRIPT }) {
    let result = await invoke(this.taskDataUploadDeleteById.name, param, { invokeEnv: invokeEnv });
    return result.data;
  },

  /**
 * 
 * @param {string[]} param ids
 * @returns 
 */
  taskDataUploadDeleteByIds: async function (param, { invokeEnv } = { invokeEnv: CONTENT_SCRIPT }) {
    let result = await invoke(this.taskDataUploadDeleteByIds.name, param, { invokeEnv: invokeEnv });
    return result.data;
  },

  /**
  * 
  * @param {} param 
  * @returns string
  */
  taskDataUploadGetMaxEndDatetime: async function (param, { invokeEnv } = { invokeEnv: CONTENT_SCRIPT }) {
    let result = await invoke(this.taskDataUploadGetMaxEndDatetime.name, param, { invokeEnv: invokeEnv });
    return result.data;
  },

}

export const TaskDataDownloadApi = {

  /**
   * 
   * @param {SearchTaskDataDownloadBO} param 
   * @returns {SearchTaskDataDownloadDTO}
   */
  searchTaskDataDownload: async function (param, { invokeEnv } = { invokeEnv: CONTENT_SCRIPT }) {
    let result = await invoke(this.searchTaskDataDownload.name, param, { invokeEnv: invokeEnv });
    return result.data;
  },

  /**
   * 
   * @param {string} param id 
   * @returns {TaskDataDownload}
   */
  taskDataDownloadGetById: async function (param, { invokeEnv } = { invokeEnv: CONTENT_SCRIPT }) {
    let result = await invoke(this.taskDataDownloadGetById.name, param, { invokeEnv: invokeEnv });
    return result.data;
  },

  /**
   * 
   * @param {TaskDataDownload} param 
   * @returns TaskDataDownload
   */
  taskDataDownloadAddOrUpdate: async function (param, { invokeEnv } = { invokeEnv: CONTENT_SCRIPT }) {
    let result = await invoke(this.taskDataDownloadAddOrUpdate.name, param, { invokeEnv: invokeEnv });
    return result.data;
  },

  /**
   * 
   * @param {string} param id
   * @returns 
   */
  taskDataDownloadDeleteById: async function (param, { invokeEnv } = { invokeEnv: CONTENT_SCRIPT }) {
    let result = await invoke(this.taskDataDownloadDeleteById.name, param, { invokeEnv: invokeEnv });
    return result.data;
  },

  /**
 * 
 * @param {string[]} param ids
 * @returns 
 */
  taskDataDownloadDeleteByIds: async function (param, { invokeEnv } = { invokeEnv: CONTENT_SCRIPT }) {
    let result = await invoke(this.taskDataDownloadDeleteByIds.name, param, { invokeEnv: invokeEnv });
    return result.data;
  },

}

export const DBApi = {

  /**
   * 
   * @param {} param 
   * @returns {}
   */
  dbBeginTransaction: async function (param, { invokeEnv } = { invokeEnv: CONTENT_SCRIPT }) {
    let result = await invoke(this.dbBeginTransaction.name, param, { invokeEnv: invokeEnv });
    return result.data;
  },

  /**
   * 
   * @param {} param 
   * @returns 
   */
  dbCommitTransaction: async function (param, { invokeEnv } = { invokeEnv: CONTENT_SCRIPT }) {
    let result = await invoke(this.dbCommitTransaction.name, param, { invokeEnv: invokeEnv });
    return result.data;
  },
  /**
   * 
   * @param {} param 
   * @returns 
   */
  dbRollbackTransaction: async function (param, { invokeEnv } = { invokeEnv: CONTENT_SCRIPT }) {
    let result = await invoke(this.dbRollbackTransaction.name, param, { invokeEnv: invokeEnv });
    return result.data;
  },

}

export const FileApi = {

  /**
   * 
   * @param {SearchFileBO} param 
   * @returns {SearchFileDTO}
   */
  searchFile: async function (param, { invokeEnv } = { invokeEnv: CONTENT_SCRIPT }) {
    let result = await invoke(this.searchFile.name, param, { invokeEnv: invokeEnv });
    return result.data;
  },

  /**
   * 
   * @param {string} param id 
   * @returns {File}
   */
  fileGetById: async function (param, { invokeEnv } = { invokeEnv: CONTENT_SCRIPT }) {
    let result = await invoke(this.fileGetById.name, param, { invokeEnv: invokeEnv });
    return result.data;
  },

  /**
   * 
   * @param {File} param 
   * @returns File
   */
  fileAddOrUpdate: async function (param, { invokeEnv } = { invokeEnv: CONTENT_SCRIPT }) {
    let result = await invoke(this.fileAddOrUpdate.name, param, { invokeEnv: invokeEnv });
    return result.data;
  },

  /**
   * 
   * @param {string} param id
   * @returns 
   */
  fileDeleteById: async function (param, { invokeEnv } = { invokeEnv: CONTENT_SCRIPT }) {
    let result = await invoke(this.fileDeleteById.name, param, { invokeEnv: invokeEnv });
    return result.data;
  },

  /**
   * 
   * @param {string[]} param ids
   * @returns 
   */
  fileDeleteByIds: async function (param, { invokeEnv } = { invokeEnv: CONTENT_SCRIPT }) {
    let result = await invoke(this.fileDeleteByIds.name, param, { invokeEnv: invokeEnv });
    return result.data;
  },

}

export const TaskDataMergeApi = {

  /**
   * 
   * @param {SearchTaskDataMergeBO} param 
   * @returns {SearchTaskDataMergeDTO}
   */
  searchTaskDataMerge: async function (param, { invokeEnv } = { invokeEnv: CONTENT_SCRIPT }) {
    let result = await invoke(this.searchTaskDataMerge.name, param, { invokeEnv: invokeEnv });
    return result.data;
  },

  /**
   * 
   * @param {string} param id 
   * @returns {TaskDataMerge}
   */
  taskDataMergeGetById: async function (param, { invokeEnv } = { invokeEnv: CONTENT_SCRIPT }) {
    let result = await invoke(this.taskDataMergeGetById.name, param, { invokeEnv: invokeEnv });
    return result.data;
  },

  /**
   * 
   * @param {TaskDataMerge} param 
   * @returns TaskDataMerge
   */
  taskDataMergeAddOrUpdate: async function (param, { invokeEnv } = { invokeEnv: CONTENT_SCRIPT }) {
    let result = await invoke(this.taskDataMergeAddOrUpdate.name, param, { invokeEnv: invokeEnv });
    return result.data;
  },

  /**
   * 
   * @param {string} param id
   * @returns 
   */
  taskDataMergeDeleteById: async function (param, { invokeEnv } = { invokeEnv: CONTENT_SCRIPT }) {
    let result = await invoke(this.taskDataMergeDeleteById.name, param, { invokeEnv: invokeEnv });
    return result.data;
  },

  /**
 * 
 * @param {string[]} param ids
 * @returns 
 */
  taskDataMergeDeleteByIds: async function (param, { invokeEnv } = { invokeEnv: CONTENT_SCRIPT }) {
    let result = await invoke(this.taskDataMergeDeleteByIds.name, param, { invokeEnv: invokeEnv });
    return result.data;
  },

}

export const DataSharePartnerApi = {

  /**
   * 
   * @param {SearchDataSharePartnerBO} param 
   * @returns {SearchDataSharePartnerDTO}
   */
  searchDataSharePartner: async function (param, { invokeEnv } = { invokeEnv: CONTENT_SCRIPT }) {
    let result = await invoke(this.searchDataSharePartner.name, param, { invokeEnv: invokeEnv });
    return result.data;
  },

  /**
   * 
   * @param {string} param id 
   * @returns {DataSharePartner}
   */
  dataSharePartnerGetById: async function (param, { invokeEnv } = { invokeEnv: CONTENT_SCRIPT }) {
    let result = await invoke(this.dataSharePartnerGetById.name, param, { invokeEnv: invokeEnv });
    return result.data;
  },

  /**
   * 
   * @param {DataSharePartner} param 
   * @returns DataSharePartner
   */
  dataSharePartnerAddOrUpdate: async function (param, { invokeEnv } = { invokeEnv: CONTENT_SCRIPT }) {
    let result = await invoke(this.dataSharePartnerAddOrUpdate.name, param, { invokeEnv: invokeEnv });
    return result.data;
  },

  /**
   * 
   * @param {DataSharePartner[]} param 
   * @returns DataSharePartner[]
   */
  dataSharePartnerBatchAddOrUpdate: async function (param, { invokeEnv } = { invokeEnv: CONTENT_SCRIPT }) {
    let result = await invoke(this.dataSharePartnerBatchAddOrUpdate.name, param, { invokeEnv: invokeEnv });
    return result.data;
  },

  /**
   * 
   * @param {string} param id
   * @returns 
   */
  dataSharePartnerDeleteById: async function (param, { invokeEnv } = { invokeEnv: CONTENT_SCRIPT }) {
    let result = await invoke(this.dataSharePartnerDeleteById.name, param, { invokeEnv: invokeEnv });
    return result.data;
  },

  /**
 * 
 * @param {string[]} param ids
 * @returns 
 */
  dataSharePartnerDeleteByIds: async function (param, { invokeEnv } = { invokeEnv: CONTENT_SCRIPT }) {
    let result = await invoke(this.dataSharePartnerDeleteByIds.name, param, { invokeEnv: invokeEnv });
    return result.data;
  },

  /**
   * 
   * @param {} param 
   * @returns StatisticDataSharePartnerDTO
   */
  statisticDataSharePartner: async function (param, { invokeEnv } = { invokeEnv: CONTENT_SCRIPT }) {
    let result = await invoke(this.statisticDataSharePartner.name, param, { invokeEnv: invokeEnv });
    return result.data;
  },


}