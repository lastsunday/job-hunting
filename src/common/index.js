export const PLATFORM_BOSS = "BOSS";
export const PLATFORM_51JOB = "51JOB";
export const PLATFORM_ZHILIAN = "ZHILIAN";
export const PLATFORM_LAGOU = "LAGOU";
export const PLATFORM_JOBSDB = "JOBSDB";
export const PLATFORM_LIEPIN = "LIEPIN";
/**
 * 爱企查
 */
export const PLATFORM_AIQICHA = "AIQICHA";

export const TAG_RUOBILIN_BLACK_LIST = "若比邻黑名单";
export const TAG_IT_BLACK_LIST = "互联网企业黑名单";
export const TAG_IT_BLACK_LIST_2 = "IT黑名单";
export const TAG_CREDIT_BJ_BLACK_LIST = "信用中国(北京)黑名单";

export const AUTOMATE_ERROR_UNKNOW = "AUTOMATE_ERROR_UNKNOW";
export const AUTOMATE_ERROR_HUMAN_VALID = "AUTOMATE_ERROR_HUMAN_VALID";

export function getUrlByTagAndCompanyName(tagName, companyName) {
    const decode = encodeURIComponent(companyName);
    if (tagName == TAG_RUOBILIN_BLACK_LIST) {
        return `https://kjxb.org/?s=${decode}&post_type=question`;
    } else if (tagName == TAG_IT_BLACK_LIST) {
        return `https://job.me88.top/index.php/search/=${decode}`;
    } else if (tagName == TAG_IT_BLACK_LIST_2) {
        return `http://www.blackdir.com/?search=${decode}`;
    } else if (tagName == TAG_CREDIT_BJ_BLACK_LIST) {
        return `https://creditbj.jxj.beijing.gov.cn/credit-portal/credit_service/publicity/record/black`;
    } else {
        return null;
    }
}

export const MISSION_AUTO_BROWSE_JOB_SEARCH_PAGE = "MISSION_AUTO_BROWSE_JOB_SEARCH_PAGE";

export const MISSION_STATUS_SUCCESS = "MISSION_STATUS_SUCCESS";
export const MISSION_STATUS_FAILURE = "MISSION_STATUS_FAILURE";

export const TASK_TYPE_JOB_DATA_UPLOAD = "JOB_DATA_UPLOAD";
export const TASK_TYPE_COMPANY_DATA_UPLOAD = "COMPANY_DATA_UPLOAD";
export const TASK_TYPE_COMPANY_TAG_DATA_UPLOAD = "COMPANY_TAG_DATA_UPLOAD";
export const TASK_TYPE_JOB_DATA_DOWNLOAD = "JOB_DATA_DOWNLOAD";
export const TASK_TYPE_COMPANY_DATA_DOWNLOAD = "COMPANY_DATA_DOWNLOAD";
export const TASK_TYPE_COMPANY_TAG_DATA_DOWNLOAD = "COMPANY_TAG_DATA_DOWNLOAD";
export const TASK_TYPE_JOB_DATA_MERGE = "JOB_DATA_MERGE";
export const TASK_TYPE_COMPANY_DATA_MERGE = "COMPANY_DATA_MERGE";
export const TASK_TYPE_COMPANY_TAG_DATA_MERGE = "COMPANY_TAG_DATA_MERGE";

export const TASK_STATUS_READY = "READY";
export const TASK_STATUS_RUNNING = "RUNNING";
export const TASK_STATUS_FINISHED = "FINISHED";
export const TASK_STATUS_ERROR = "ERROR";
export const TASK_STATUS_CANCEL = "CANCEL";

export const MAX_RECORD_COUNT = 10000000;