import { CompanyBO } from "../data/bo/companyBO";
import { CompanyTagBatchAddOrUpdateBO } from "../data/bo/companyTagBatchAddOrUpdateBO";
import { CompanyTagBO } from "../data/bo/companyTagBO";
import { CompanyTagExportBO } from "../data/bo/companyTagExportBO";
import { JobStatisticJobCompanyTagGroupByCompanyBO } from "../data/bo/jobStatisticJobCompanyTagGroupByCompanyBO";
import { JobStatisticJobCompanyTagGroupByPlatformBO } from "../data/bo/jobStatisticJobCompanyTagGroupByPlatformBO";
import { JobTagExportBO } from "../data/bo/jobTagExportBO";
import { JobTagNameStatisticBO } from "../data/bo/jobTagNameStatisticBO";
import { JobTagSearchBO } from "../data/bo/jobTagSearchBO";
import { SearchCompanyBO } from "../data/bo/searchCompanyBO";
import { SearchCompanyTagBO } from "../data/bo/searchCompanyTagBO";
import { SearchDataSharePartnerBO } from "../data/bo/searchDataSharePartnerBO";
import { SearchJobBO } from "../data/bo/searchJobBO";
import { SearchMissionLogBO } from "../data/bo/searchMissionLogBO";
import { SearchTaskBO } from "../data/bo/searchTaskBO";
import { SearchTaskDataDownloadBO } from "../data/bo/searchTaskDataDownloadBO";
import { SearchTaskDataMergeBO } from "../data/bo/searchTaskDataMergeBO";
import { SearchTaskDataUploadBO } from "../data/bo/searchTaskDataUploadBO";
import { TagSearchBO } from "../data/bo/tagSearchBO";
import { Company } from "../data/domain/company";
import { DataSharePartner } from "../data/domain/dataSharePartner";
import { File } from "../data/domain/file";
import { Job } from "../data/domain/job";
import { Mission } from "../data/domain/mission";
import { MissionLog } from "../data/domain/missionLog";
import { Tag } from "../data/domain/tag";
import { TaskDataDownload } from "../data/domain/taskDataDownload";
import { TaskDataMerge } from "../data/domain/taskDataMerge";
import { TaskDataUpload } from "../data/domain/taskDataUpload";
import { OauthDTO } from "../data/dto/oauthDTO";
import { SearchDataSharePartnerDTO } from "../data/dto/searchDataSharePartnerDTO";
import { SearchMissionLogDTO } from "../data/dto/searchMissionLogDTO";
import { SearchTaskDataDownloadDTO } from "../data/dto/searchTaskDataDownloadDTO";
import { SearchTaskDataMergeDTO } from "../data/dto/searchTaskDataMergeDTO";
import { SearchTaskDataUploadDTO } from "../data/dto/searchTaskDataUploadDTO";
import { SearchTaskDTO } from "../data/dto/searchTaskDTO";
import { StatisticJobBrowseDTO } from "../data/dto/statisticJobBrowseDTO";
import { invoke } from "./bridge";

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
  batchAddOrUpdateJob: async function (jobs,) {
    return await invoke(this.batchAddOrUpdateJob.name, jobs);
  },

  /**
   *
   * @param {SearchJobBO} param
   *
   * @returns SearchJobDTO[]
   */
  searchJob: async function (param) {
    let result = await invoke(this.searchJob.name, param);
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
  getJobByDetailUrl: async function (param) {
    let result = await invoke(this.getJobByDetailUrl.name, param);
    return result.data;
  },
  /**
   *
   * @param {string} param jobId
   */
  addJobBrowseDetailHistory: async function (param) {
    return await invoke(this.addJobBrowseDetailHistory.name, param);
  },
  /**
   *
   * @param {string[]} param ids
   *
   * @returns Job[]
   */
  jobGetByIds: async function (param) {
    let result = await invoke(this.jobGetByIds.name, param);
    return result.data;
  },


  /**
    * 
    * @param {JobTagBO} param
    */
  jobTagAddOrUpdate: async function (param) {
    return invoke(this.jobTagAddOrUpdate.name, param);
  },
  /**
     * 
     * @param {JobTagBO[]} param
     */
  jobTagBatchAddOrUpdate: async function (param) {
    return invoke(this.jobTagBatchAddOrUpdate.name, param);
  },

  /**
  * 
  * @param {string} param jobId
  */
  jobTagGetAllDTOByJobId: async function (param) {
    let result = await invoke(this.jobTagGetAllDTOByJobId.name, param);
    return result.data;
  },

  /**
  * 
  * @param {string[]} param jobId
  */
  jobTagGetAllDTOByJobIds: async function (param) {
    let result = await invoke(this.jobTagGetAllDTOByJobIds.name, param);
    return result.data;
  },

  /**
 *
 * @param {JobTagSearchBO} param
 *
 * @returns JobTagSearchDTO[]
 */
  jobTagSearch: async function (param) {
    let result = await invoke(this.jobTagSearch.name, param);
    return result.data;
  },

  /**
   * 
   * @param {string[]} param ids
   */
  jobTagDeleteByJobIds: async function (param) {
    return invoke(this.jobTagDeleteByJobIds.name, param);
  },
  /**
   * 
   * @param {JobTagNameStatisticBO} param 
   * @returns JobTagNameStatisticDTO
   */
  jobTagNameStatistic: async function (param) {
    let result = await invoke(this.jobTagNameStatistic.name, param);
    return result.data;
  },

  /**
  * 
  * @param {*} param 
  * @returns []
  */
  jobStatisticGroupByPublishDate: async function (param) {
    let result = await invoke(this.jobStatisticGroupByPublishDate.name, param);
    return result.data;
  },

  /**
  * 
  * @param {*} param 
  * @returns []
  */
  jobStatisticGroupByPlatform: async function (param) {
    let result = await invoke(this.jobStatisticGroupByPlatform.name, param);
    return result.data;
  },

  /**
  * 
  * @param {JobTagExportBO} param 
  * @returns []
  */
  jobTagExport: async function (param) {
    let result = await invoke(this.jobTagExport.name, param);
    return result.data;
  },

  /**
  * 
  * @param {JobStatisticJobCompanyTagGroupByPlatformBO} param 
  * @returns []
  */
  jobStatisticJobCompanyTagGroupByPlatform: async function (param) {
    let result = await invoke(this.jobStatisticJobCompanyTagGroupByPlatform.name, param);
    return result.data;
  },

  /**
  * 
  * @param {JobStatisticJobCompanyTagGroupByCompanyBO} param 
  * @returns []
  */
  jobStatisticJobCompanyTagGroupByCompany: async function (param) {
    let result = await invoke(this.jobStatisticJobCompanyTagGroupByCompany.name, param);
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
  companyGetByIds: async function (param) {
    let result = await invoke(this.companyGetByIds.name, param);
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
  searchCompany: async function (param) {
    let result = await invoke(this.searchCompany.name, param);
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
  batchAddOrUpdateCompany: async function (param) {
    return await invoke(this.batchAddOrUpdateCompany.name, param);
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
  * @param {CompanyTagBatchAddOrUpdateBO} param
  */
  batchAddOrUpdateCompanyTag: async function (param) {
    return await invoke(this.batchAddOrUpdateCompanyTag.name, param);
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
  getAllCompanyTagDTOByCompanyIds: async function (ids,) {
    let result = await invoke(this.getAllCompanyTagDTOByCompanyIds.name, ids,);
    return result.data;
  },

  /**
   * 
   * @param {SearchCompanyTagBO} param 
   * @returns SearchCompanyTagDTO
   */
  searchCompanyTag: async function (param) {
    let result = await invoke(this.searchCompanyTag.name, param);
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

  /**
  * 
  * @param {*} param 
  * @returns []
  */
  companyStatisticGroupByStartDate: async function (param) {
    let result = await invoke(this.companyStatisticGroupByStartDate.name, param);
    return result.data;
  },

  /**
  * 
  * @param {*} param 
  * @returns []
  */
  companyStatisticGroupByInsurance: async function (param) {
    let result = await invoke(this.companyStatisticGroupByInsurance.name, param);
    return result.data;
  },

  /**
  * 
  * @param {CompanyTagExportBO} param 
  * @returns []
  */
  companyTagExport: async function (param) {
    let result = await invoke(this.companyTagExport.name, param);
    return result.data;
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
  },

  /**
   * 
   * @param {TagSearchBO} param 
   * @returns TagSearchDTO
   */
  tagSearch: async function (param) {
    let result = await invoke(this.tagSearch.name, param);
    return result.data;
  },

  /**
   * 
   * @param {string} param id
   * @returns 
   */
  tagDeleteById: async function (param) {
    return await invoke(this.tagDeleteById.name, param);
  },

  /**
  * 
  * @param {string[]} param ids
  * @returns 
  */
  tagDeleteByIds: async function (param) {
    return await invoke(this.tagDeleteByIds.name, param);
  },


  /**
   * 
   * @param {Tag} param tag
   * 
   */
  addOrUpdateTag: async function (param) {
    return await invoke(this.addOrUpdateTag.name, param);
  },

  /**
     * 
     * @param {string} param tagName
     */
  tagGetByName: async function (param) {
    let result = await invoke(this.tagGetByName.name, param);
    return result.data;
  },

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
  getConfigByKey: async function (param) {
    let result = await invoke(this.getConfigByKey.name, param);
    return result.data;
  },

  /**
   * 
   * @returns Config[]
   */
  getAllConfig: async function () {
    let result = await invoke(this.getAllConfig.name, {});
    return result.data;
  },

  /**
   * 
   * @param {Config} param config
   * 
   */
  addOrUpdateConfig: async function (param) {
    return await invoke(this.addOrUpdateConfig.name, param);
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
  searchTask: async function (param) {
    let result = await invoke(this.searchTask.name, param);
    return result.data;
  },

  /**
   * 
   * @param {SearchTaskBO} param 
   * @returns {SearchTaskDTO}
   */
  searchTaskWithDetail: async function (param) {
    let result = await invoke(this.searchTaskWithDetail.name, param);
    return result.data;
  },

  /**
   * 
   * @param {Task} param 
   * @returns Task
   */
  taskAddOrUpdate: async function (param) {
    let result = await invoke(this.taskAddOrUpdate.name, param);
    return result.data;
  },

  /**
   * 
   * @param {string} param id
   * @returns 
   */
  taskDeleteById: async function (param) {
    let result = await invoke(this.taskDeleteById.name, param);
    return result.data;
  },

  /**
 * 
 * @param {string[]} param ids
 * @returns 
 */
  taskDeleteByIds: async function (param) {
    let result = await invoke(this.taskDeleteByIds.name, param);
    return result.data;
  },
  /**
   * 
   * @param StatisticTaskBO param 
   * @returns StatisticTaskDTO
   */
  statisticTask: async function (param) {
    let result = await invoke(this.statisticTask.name, param);
    return result.data;
  },
  /**
   * 
   * @param TaskStatisticBO param 
   * @returns []
   */
  taskStatisticUpload: async function (param) {
    let result = await invoke(this.taskStatisticUpload.name, param);
    return result.data;
  },
  /**
   * 
   * @param TaskStatisticBO param 
   * @returns []
   */
  taskStatisticDownload: async function (param) {
    let result = await invoke(this.taskStatisticDownload.name, param);
    return result.data;
  },
  /**
  * 
  * @param TaskStatisticBO param 
  * @returns []
  */
  taskStatisticMerge: async function (param) {
    let result = await invoke(this.taskStatisticMerge.name, param);
    return result.data;
  },
  /**
  * 
  * @param TaskStatisticBO param 
  * @returns []
  */
  taskStatisticStatus: async function (param) {
    let result = await invoke(this.taskStatisticStatus.name, param);
    return result.data;
  },

}

export const TaskDataUploadApi = {

  /**
   * 
   * @param {SearchTaskDataUploadBO} param 
   * @returns {SearchTaskDataUploadDTO}
   */
  searchTaskDataUpload: async function (param) {
    let result = await invoke(this.searchTaskDataUpload.name, param);
    return result.data;
  },

  /**
   * 
   * @param {string} param id 
   * @returns {TaskDataUpload}
   */
  taskDataUploadGetById: async function (param) {
    let result = await invoke(this.taskDataUploadGetById.name, param);
    return result.data;
  },

  /**
   * 
   * @param {TaskDataUpload} param 
   * @returns TaskDataUpload
   */
  taskDataUploadAddOrUpdate: async function (param) {
    let result = await invoke(this.taskDataUploadAddOrUpdate.name, param);
    return result.data;
  },

  /**
   * 
   * @param {string} param id
   * @returns 
   */
  taskDataUploadDeleteById: async function (param) {
    let result = await invoke(this.taskDataUploadDeleteById.name, param);
    return result.data;
  },

  /**
 * 
 * @param {string[]} param ids
 * @returns 
 */
  taskDataUploadDeleteByIds: async function (param) {
    let result = await invoke(this.taskDataUploadDeleteByIds.name, param);
    return result.data;
  },

  /**
  * 
  * @param {} param 
  * @returns string
  */
  taskDataUploadGetMaxEndDatetime: async function (param) {
    let result = await invoke(this.taskDataUploadGetMaxEndDatetime.name, param);
    return result.data;
  },

}

export const TaskDataDownloadApi = {

  /**
   * 
   * @param {SearchTaskDataDownloadBO} param 
   * @returns {SearchTaskDataDownloadDTO}
   */
  searchTaskDataDownload: async function (param) {
    let result = await invoke(this.searchTaskDataDownload.name, param);
    return result.data;
  },

  /**
   * 
   * @param {string} param id 
   * @returns {TaskDataDownload}
   */
  taskDataDownloadGetById: async function (param) {
    let result = await invoke(this.taskDataDownloadGetById.name, param);
    return result.data;
  },

  /**
   * 
   * @param {TaskDataDownload} param 
   * @returns TaskDataDownload
   */
  taskDataDownloadAddOrUpdate: async function (param) {
    let result = await invoke(this.taskDataDownloadAddOrUpdate.name, param);
    return result.data;
  },

  /**
   * 
   * @param {string} param id
   * @returns 
   */
  taskDataDownloadDeleteById: async function (param) {
    let result = await invoke(this.taskDataDownloadDeleteById.name, param);
    return result.data;
  },

  /**
 * 
 * @param {string[]} param ids
 * @returns 
 */
  taskDataDownloadDeleteByIds: async function (param) {
    let result = await invoke(this.taskDataDownloadDeleteByIds.name, param);
    return result.data;
  },

}

export const FileApi = {

  /**
   * 
   * @param {SearchFileBO} param 
   * @returns {SearchFileDTO}
   */
  searchFile: async function (param) {
    let result = await invoke(this.searchFile.name, param);
    return result.data;
  },

  /**
   * 
   * @param {string} param id 
   * @returns {File}
   */
  fileGetById: async function (param) {
    let result = await invoke(this.fileGetById.name, param);
    return result.data;
  },

  /**
   * 
   * @param {File} param 
   * @returns File
   */
  fileAddOrUpdate: async function (param) {
    let result = await invoke(this.fileAddOrUpdate.name, param);
    return result.data;
  },

  /**
   * 
   * @param {string} param id
   * @returns 
   */
  fileDeleteById: async function (param) {
    let result = await invoke(this.fileDeleteById.name, param);
    return result.data;
  },

  /**
   * 
   * @param {string[]} param ids
   * @returns 
   */
  fileDeleteByIds: async function (param) {
    let result = await invoke(this.fileDeleteByIds.name, param);
    return result.data;
  },

  /**
   * 
   * @param {string[]} param ids
   * @returns 
   */
  fileLogicDeleteByIds: async function (param) {
    let result = await invoke(this.fileLogicDeleteByIds.name, param);
    return result.data;
  },

  /**
   * 
   * @param {void} param 
   * @returns FileDTO[]
   */
  fileGetAllMergedNotDeleteFile: async function (param) {
    let result = await invoke(this.fileGetAllMergedNotDeleteFile.name, param);
    return result.data;
  },

  /**
   * 
   * @param {void} param 
   * @returns FileStatisticDTO[]
   */
  fileStatistic: async function (param) {
    let result = await invoke(this.fileStatistic.name, param);
    return result.data;
  },

}

export const TaskDataMergeApi = {

  /**
   * 
   * @param {SearchTaskDataMergeBO} param 
   * @returns {SearchTaskDataMergeDTO}
   */
  searchTaskDataMerge: async function (param) {
    let result = await invoke(this.searchTaskDataMerge.name, param);
    return result.data;
  },

  /**
   * 
   * @param {string} param id 
   * @returns {TaskDataMerge}
   */
  taskDataMergeGetById: async function (param) {
    let result = await invoke(this.taskDataMergeGetById.name, param);
    return result.data;
  },

  /**
   * 
   * @param {TaskDataMerge} param 
   * @returns TaskDataMerge
   */
  taskDataMergeAddOrUpdate: async function (param) {
    let result = await invoke(this.taskDataMergeAddOrUpdate.name, param);
    return result.data;
  },

  /**
   * 
   * @param {string} param id
   * @returns 
   */
  taskDataMergeDeleteById: async function (param) {
    let result = await invoke(this.taskDataMergeDeleteById.name, param);
    return result.data;
  },

  /**
 * 
 * @param {string[]} param ids
 * @returns 
 */
  taskDataMergeDeleteByIds: async function (param) {
    let result = await invoke(this.taskDataMergeDeleteByIds.name, param);
    return result.data;
  },

}

export const DataSharePartnerApi = {

  /**
   * 
   * @param {SearchDataSharePartnerBO} param 
   * @returns {SearchDataSharePartnerDTO}
   */
  searchDataSharePartner: async function (param) {
    let result = await invoke(this.searchDataSharePartner.name, param);
    return result.data;
  },

  /**
   * 
   * @param {string} param id 
   * @returns {DataSharePartner}
   */
  dataSharePartnerGetById: async function (param) {
    let result = await invoke(this.dataSharePartnerGetById.name, param);
    return result.data;
  },

  /**
   * 
   * @param {DataSharePartner} param 
   * @returns DataSharePartner
   */
  dataSharePartnerAddOrUpdate: async function (param) {
    let result = await invoke(this.dataSharePartnerAddOrUpdate.name, param);
    return result.data;
  },

  /**
   * 
   * @param {DataSharePartner[]} param 
   * @returns DataSharePartner[]
   */
  dataSharePartnerBatchAddOrUpdate: async function (param) {
    let result = await invoke(this.dataSharePartnerBatchAddOrUpdate.name, param);
    return result.data;
  },

  /**
   * 
   * @param {string} param id
   * @returns 
   */
  dataSharePartnerDeleteById: async function (param) {
    let result = await invoke(this.dataSharePartnerDeleteById.name, param);
    return result.data;
  },

  /**
 * 
 * @param {string[]} param ids
 * @returns 
 */
  dataSharePartnerDeleteByIds: async function (param) {
    let result = await invoke(this.dataSharePartnerDeleteByIds.name, param);
    return result.data;
  },

  /**
   * 
   * @param {} param 
   * @returns StatisticDataSharePartnerDTO
   */
  statisticDataSharePartner: async function (param) {
    let result = await invoke(this.statisticDataSharePartner.name, param);
    return result.data;
  },

}

export const AppApi = {

  appBackgroundTaskRun: async function (param) {
    let result = await invoke(this.appBackgroundTaskRun.name, param);
    return result.data;
  },
}

export const EmitterApi = {

  emitterEmit: async function (param) {
    let result = await invoke(this.emitterEmit.name, param);
    return result.data;
  },
}