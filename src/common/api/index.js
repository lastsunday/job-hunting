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
  * @param {CompanyTagBO[]} param
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
  authGetToken: async function () {
    let result = await invoke(this.authGetToken.name, {});
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