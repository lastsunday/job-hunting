import {
  JOB_MAX_EXPORT_SIZE,
  JOB_PUBLIC_MAX_EXPORT_SIZE,
  COMPANY_MAX_EXPORT_SIZE,
  JOB_TAG_MAX_EXPORT_SIZE,
  COMPANY_TAG_MAX_EXPORT_SIZE,
  COMPANY_COMMENT_MAX_EXPORT_SIZE,
} from './config';

export const PLATFORM_BOSS = 'BOSS';
export const PLATFORM_51JOB = '51JOB';
export const PLATFORM_ZHILIAN = 'ZHILIAN';
export const PLATFORM_LAGOU = 'LAGOU';
export const PLATFORM_JOBSDB = 'JOBSDB';
export const PLATFORM_LIEPIN = 'LIEPIN';
export const PLATFORM_JOBONLINE = 'JOBONLINE';
export const PLATFORM_GGFW_HRSS_GD = 'GGFW_HRSS_GD';
/**
 * 爱企查
 */
export const PLATFORM_AIQICHA = 'AIQICHA';

export const TAG_RUOBILIN_BLACK_LIST = '若比邻黑名单';

export const AUTOMATE_ERROR_UNKNOW = 'AUTOMATE_ERROR_UNKNOW';
export const AUTOMATE_ERROR_HUMAN_VALID = 'AUTOMATE_ERROR_HUMAN_VALID';

export function getUrlByTagAndCompanyName(tagName, companyName) {
  const decode = encodeURIComponent(companyName);
  if (tagName == TAG_RUOBILIN_BLACK_LIST) {
    return `https://kjxb.org/?s=${decode}&post_type=question`;
  } else {
    return null;
  }
}

export function genId(id, platform) {
  return platform + '_' + id;
}

export function getInfoFromJobDetailUrl(url) {
  if (url.href.startsWith('https://www.zhipin.com/job_detail/')) {
    const platform = PLATFORM_BOSS;
    const jobId = genId(
      url.href.match(/https:\/\/www.zhipin.com\/job_detail\/(?<id>.*)\.html/)
        .groups.id,
      platform
    );
    return {
      platform,
      jobId,
      url: url.origin + url.pathname,
    };
  } else if (url.href.startsWith('https://jobs.51job.com/')) {
    const platform = PLATFORM_51JOB;
    const jobId = genId(
      url.href.match(/https:\/\/jobs.51job.com\/.*\/(?<id>.*)\.html/).groups.id,
      platform
    );
    return {
      platform,
      jobId,
      url: url.origin + url.pathname,
    };
  } else if (url.href.startsWith('https://www.zhaopin.com/jobdetail/')) {
    const platform = PLATFORM_ZHILIAN;
    const jobId = genId(
      url.href.match(/https:\/\/www.zhaopin.com\/jobdetail\/(?<id>.*)\.htm/)
        .groups.id,
      platform
    );
    return {
      platform,
      jobId,
      url: url.origin + url.pathname,
    };
  } else if (url.href.match(/https:\/\/www.liepin.com\/(lptjob|a|job)\//)) {
    const platform = PLATFORM_LIEPIN;
    const jobId = genId(
      url.href.match(/https:\/\/www.liepin.com\/(a|job|lptjob)\/(?<id>[0-9]*)/)
        .groups.id,
      platform
    );
    return {
      platform,
      jobId,
      url: url.origin + url.pathname,
    };
  } else if (url.href.startsWith('https://www.lagou.com/wn/jobs/')) {
    const platform = PLATFORM_LAGOU;
    const jobId = genId(
      url.href.match(/https:\/\/www.lagou.com\/wn\/jobs\/(?<id>.*)\.html/)
        .groups.id,
      platform
    );
    return {
      platform,
      jobId,
      url: url.origin + url.pathname,
    };
  } else if (url.href.startsWith('https://www.jobonline.cn/positionDetail')) {
    const platform = PLATFORM_JOBONLINE;
    const regexContent = url.href.match(
      /https:\/\/www.jobonline.cn\/positionDetail\?id=(?<id>[0-9]*)/
    );
    const jobId = genId(regexContent.groups.id, platform);
    return {
      platform,
      jobId,
      url: regexContent[0],
    };
  } else {
    throw `not supported url = ${url}`;
  }
}

export const MISSION_AUTO_BROWSE_JOB_SEARCH_PAGE =
  'MISSION_AUTO_BROWSE_JOB_SEARCH_PAGE';

export const MISSION_STATUS_SUCCESS = 'MISSION_STATUS_SUCCESS';
export const MISSION_STATUS_FAILURE = 'MISSION_STATUS_FAILURE';

export const TASK_TYPE_JOB_DATA_UPLOAD = 'JOB_DATA_UPLOAD';
export const TASK_TYPE_JOB_DATA_DOWNLOAD = 'JOB_DATA_DOWNLOAD';
export const TASK_TYPE_JOB_DATA_MERGE = 'JOB_DATA_MERGE';
export const DATA_TYPE_NAME_JOB = 'job';

export const TASK_TYPE_COMPANY_DATA_UPLOAD = 'COMPANY_DATA_UPLOAD';
export const TASK_TYPE_COMPANY_DATA_DOWNLOAD = 'COMPANY_DATA_DOWNLOAD';
export const TASK_TYPE_COMPANY_DATA_MERGE = 'COMPANY_DATA_MERGE';
export const DATA_TYPE_NAME_COMPANY = 'company';

export const TASK_TYPE_COMPANY_TAG_DATA_UPLOAD = 'COMPANY_TAG_DATA_UPLOAD';
export const TASK_TYPE_COMPANY_TAG_DATA_DOWNLOAD = 'COMPANY_TAG_DATA_DOWNLOAD';
export const TASK_TYPE_COMPANY_TAG_DATA_MERGE = 'COMPANY_TAG_DATA_MERGE';
export const DATA_TYPE_NAME_COMPANY_TAG = 'company_tag';

export const TASK_TYPE_JOB_TAG_DATA_UPLOAD = 'JOB_TAG_DATA_UPLOAD';
export const TASK_TYPE_JOB_TAG_DATA_DOWNLOAD = 'JOB_TAG_DATA_DOWNLOAD';
export const TASK_TYPE_JOB_TAG_DATA_MERGE = 'JOB_TAG_DATA_MERGE';
export const DATA_TYPE_NAME_JOB_TAG = 'job_tag';

export const DATA_TYPE_NAME_JOB_SNAPSHOT = 'job_snapshot';

export const TASK_TYPE_JOB_PUBLIC_DATA_UPLOAD = 'JOB_PUBLIC_DATA_UPLOAD';
export const TASK_TYPE_JOB_PUBLIC_DATA_DOWNLOAD = 'JOB_PUBLIC_DATA_DOWNLOAD';
export const TASK_TYPE_JOB_PUBLIC_DATA_MERGE = 'JOB_PUBLIC_DATA_MERGE';
export const DATA_TYPE_NAME_JOB_PUBLIC = 'job_public';

export const TASK_TYPE_ALL_PRIVATE_DATA_DOWNLOAD = 'ALL_PRIVATE_DATA_DOWNLOAD';
export const TASK_TYPE_ALL_PUBLIC_DATA_DOWNLOAD = 'ALL_PUBLIC_DATA_DOWNLOAD';

export const TASK_TYPE_METADATA_DATA_DOWNLOAD = 'METADATA_DATA_DOWNLOAD';
export const TASK_TYPE_METADATA_DATA_MERGE = 'METADATA_DATA_MERGE';

export const TASK_TYPE_COMPANY_COMMENT_DATA_DOWNLOAD =
  'COMPANY_COMMENT_DATA_DOWNLOAD';
export const TASK_TYPE_COMPANY_COMMENT_DATA_MERGE =
  'COMPANY_COMMENT_DATA_MERGE';

export const TASK_TYPE_AND_FILE_NAME_MAP = new Map([
  [TASK_TYPE_JOB_DATA_UPLOAD, DATA_TYPE_NAME_JOB],
  [TASK_TYPE_JOB_DATA_DOWNLOAD, DATA_TYPE_NAME_JOB],
  [TASK_TYPE_COMPANY_DATA_UPLOAD, DATA_TYPE_NAME_COMPANY],
  [TASK_TYPE_COMPANY_DATA_DOWNLOAD, DATA_TYPE_NAME_COMPANY],
  [TASK_TYPE_COMPANY_TAG_DATA_UPLOAD, DATA_TYPE_NAME_COMPANY_TAG],
  [TASK_TYPE_COMPANY_TAG_DATA_DOWNLOAD, DATA_TYPE_NAME_COMPANY_TAG],
  [TASK_TYPE_JOB_TAG_DATA_UPLOAD, DATA_TYPE_NAME_JOB_TAG],
  [TASK_TYPE_JOB_TAG_DATA_DOWNLOAD, DATA_TYPE_NAME_JOB_TAG],
  [TASK_TYPE_JOB_PUBLIC_DATA_UPLOAD, DATA_TYPE_NAME_JOB_PUBLIC],
  [TASK_TYPE_JOB_PUBLIC_DATA_DOWNLOAD, DATA_TYPE_NAME_JOB_PUBLIC],
]);

export const isStandardDataDownloadType = (value) => {
  return (
    value == TASK_TYPE_JOB_DATA_DOWNLOAD ||
    value == TASK_TYPE_COMPANY_DATA_DOWNLOAD ||
    value == TASK_TYPE_COMPANY_TAG_DATA_DOWNLOAD ||
    value == TASK_TYPE_JOB_TAG_DATA_DOWNLOAD ||
    value == TASK_TYPE_JOB_PUBLIC_DATA_DOWNLOAD
  );
};

export const isDataSourceDataDownloadType = (value) => {
  return value == TASK_TYPE_COMPANY_COMMENT_DATA_DOWNLOAD;
};

export const isDownloadType = (value) => {
  return (
    isStandardDataDownloadType(value) ||
    isDataSourceDataDownloadType(value) ||
    value == TASK_TYPE_METADATA_DATA_DOWNLOAD
  );
};

export const isUploadType = (value) => {
  return (
    value == TASK_TYPE_JOB_DATA_UPLOAD ||
    value == TASK_TYPE_COMPANY_DATA_UPLOAD ||
    value == TASK_TYPE_COMPANY_TAG_DATA_UPLOAD ||
    value == TASK_TYPE_JOB_TAG_DATA_UPLOAD ||
    value == TASK_TYPE_JOB_PUBLIC_DATA_UPLOAD
  );
};

export const isStandardDataMergeType = (value) => {
  return (
    value == TASK_TYPE_JOB_DATA_MERGE ||
    value == TASK_TYPE_COMPANY_DATA_MERGE ||
    value == TASK_TYPE_COMPANY_TAG_DATA_MERGE ||
    value == TASK_TYPE_JOB_TAG_DATA_MERGE ||
    value == TASK_TYPE_JOB_PUBLIC_DATA_MERGE
  );
};

export const isDataSourceDataMergeType = (value) => {
  return value == TASK_TYPE_COMPANY_COMMENT_DATA_MERGE;
};

export const isMergeType = (value) => {
  return (
    isStandardDataMergeType(value) ||
    isDataSourceDataMergeType(value) ||
    value == TASK_TYPE_METADATA_DATA_MERGE
  );
};

export const TASK_STATUS_READY = 'READY';
export const TASK_STATUS_RUNNING = 'RUNNING';
export const TASK_STATUS_FINISHED = 'FINISHED';
export const TASK_STATUS_FINISHED_BUT_ERROR = 'FINISHED_BUT_ERROR';
export const TASK_STATUS_ERROR = 'ERROR';
export const TASK_STATUS_CANCEL = 'CANCEL';

export const TAG_SOURCE_TYPE_CUSTOM = 0;
export const TAG_SOURCE_TYPE_PLATFORM = 1;

//EVENT
export const EVENT_RESPONSE_INFO = 'EVENT_RESPONSE_INFO';
//EVENT KEY
export const API_SERVER_GITHUB = 'github.com';

export function getFileMaxRecordCountByTaskType(value) {
  if (
    value == TASK_TYPE_JOB_DATA_MERGE ||
    value == TASK_TYPE_JOB_DATA_DOWNLOAD
  ) {
    return JOB_MAX_EXPORT_SIZE;
  } else if (
    value == TASK_TYPE_COMPANY_DATA_MERGE ||
    value == TASK_TYPE_COMPANY_DATA_DOWNLOAD
  ) {
    return COMPANY_MAX_EXPORT_SIZE;
  } else if (
    value == TASK_TYPE_COMPANY_TAG_DATA_MERGE ||
    value == TASK_TYPE_COMPANY_TAG_DATA_DOWNLOAD
  ) {
    return COMPANY_TAG_MAX_EXPORT_SIZE;
  } else if (
    value == TASK_TYPE_JOB_TAG_DATA_MERGE ||
    value == TASK_TYPE_JOB_TAG_DATA_DOWNLOAD
  ) {
    return JOB_TAG_MAX_EXPORT_SIZE;
  } else if (
    value == TASK_TYPE_JOB_PUBLIC_DATA_MERGE ||
    value == TASK_TYPE_JOB_PUBLIC_DATA_DOWNLOAD
  ) {
    return JOB_PUBLIC_MAX_EXPORT_SIZE;
  } else if (
    value == TASK_TYPE_COMPANY_COMMENT_DATA_MERGE ||
    value == TASK_TYPE_COMPANY_COMMENT_DATA_DOWNLOAD
  ) {
    return COMPANY_COMMENT_MAX_EXPORT_SIZE;
  } else {
    throw `unkonw file max record for ${value}`;
  }
}

export const isDevEnv = () => {
  return import.meta.env.DEV;
};
