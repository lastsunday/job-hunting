import {
  AUTOMATE_ERROR_HUMAN_VALID,
  AUTOMATE_ERROR_UNKNOW,
  MISSION_AUTO_BROWSE_JOB_SEARCH_PAGE,
  MISSION_STATUS_FAILURE,
  MISSION_STATUS_SUCCESS,
  PLATFORM_51JOB,
  PLATFORM_BOSS,
  PLATFORM_GGFW_HRSS_GD,
  PLATFORM_JOBONLINE,
  PLATFORM_LAGOU,
  PLATFORM_LIEPIN,
  PLATFORM_ZHILIAN,
  TASK_TYPE_ALL_PRIVATE_DATA_DOWNLOAD,
  TASK_TYPE_COMPANY_DATA_DOWNLOAD,
  TASK_TYPE_COMPANY_TAG_DATA_DOWNLOAD,
  TASK_TYPE_JOB_DATA_DOWNLOAD,
  TASK_TYPE_JOB_TAG_DATA_DOWNLOAD,
  TASK_TYPE_ALL_PUBLIC_DATA_DOWNLOAD,
  TASK_TYPE_JOB_PUBLIC_DATA_DOWNLOAD,
  TASK_TYPE_COMPANY_COMMENT_DATA_DOWNLOAD,
} from '@/common';
import dayjs from 'dayjs';
import { MissionLogData } from '../data/MissionLogData';
import { TaskData } from '../data/TaskData';
const TASK_TYPE_AND_DISPLAY_NAME_MAP = new Map([
  [TASK_TYPE_ALL_PRIVATE_DATA_DOWNLOAD, '全部私有数据下载'],
  [TASK_TYPE_JOB_DATA_DOWNLOAD, '职位数据下载'],
  [TASK_TYPE_COMPANY_DATA_DOWNLOAD, '公司数据下载'],
  [TASK_TYPE_COMPANY_TAG_DATA_DOWNLOAD, '公司标签数据下载'],
  [TASK_TYPE_JOB_TAG_DATA_DOWNLOAD, '职位标签数据下载'],
  [TASK_TYPE_ALL_PUBLIC_DATA_DOWNLOAD, '全部公开数据下载'],
  [TASK_TYPE_JOB_PUBLIC_DATA_DOWNLOAD, '职位公开数据下载'],
  [TASK_TYPE_COMPANY_COMMENT_DATA_DOWNLOAD, '公司评论数据下载'],
]);

export function useTask() {
  const convertTaskList = (items: any[]): Array<TaskData> => {
    let result = [];
    items.forEach((item) => {
      result.push(convertTask(item));
    });
    return result;
  };

  const convertTask = (item: any): TaskData => {
    return {
      id: item.missionId,
      name: item.missionName,
      type: item.missionType,
      platform: item.missionPlatform,
      url: item?.missionConfig.url,
      delay: item?.missionConfig.delay,
      delayRange: item?.missionConfig.delayRange,
      maxPage: item?.missionConfig.maxPage,
    };
  };

  const missionPlatformFormat = (value: string) => {
    if (value == PLATFORM_51JOB) {
      return '前程无忧';
    } else if (value == PLATFORM_BOSS) {
      return 'BOSS直聘';
    } else if (value == PLATFORM_ZHILIAN) {
      return '智联招聘';
    } else if (value == PLATFORM_LAGOU) {
      return '拉钩网';
    } else if (value == PLATFORM_LIEPIN) {
      return '猎聘网';
    } else if (value == PLATFORM_JOBONLINE) {
      return '就业在线';
    } else if (value == PLATFORM_GGFW_HRSS_GD) {
      return '广东公共求职招聘服务平台';
    } else {
      return value;
    }
  };

  const missionTypeFormat = (value: string) => {
    return value;
  };

  const convertMissionLogList = (items: any[]): MissionLogData[] => {
    const result = [];
    items.forEach((item) => {
      result.push(convertMissionLog(item));
    });
    return result;
  };

  const convertMissionLog = (item: any): MissionLogData => {
    const {
      missionId,
      missionLogDetail,
      missionLogId,
      missionStatus,
      missionStatusReason,
      createDatetime,
      updateDatetime,
    } = item;
    let detail = JSON.parse(missionLogDetail);
    detail.startDatetime =
      detail.startDatetime != null
        ? dayjs(detail.startDatetime).toDate()
        : null;
    detail.endDatetime =
      detail.endDatetime != null ? dayjs(detail.endDatetime).toDate() : null;
    return {
      missionId: missionId,
      detail,
      id: missionLogId,
      status: missionStatus,
      reason: missionStatusReason,
      createDatetime,
      updateDatetime,
    };
  };

  const missionStatusFormat = (value: string): string => {
    if (value == MISSION_STATUS_SUCCESS) {
      return '成功';
    } else if (value == MISSION_STATUS_FAILURE) {
      return '失败';
    } else {
      return value;
    }
  };

  const missionErrorFormat = (value: string) => {
    if (value == AUTOMATE_ERROR_HUMAN_VALID) {
      return '人机验证错误';
    } else if (value == AUTOMATE_ERROR_UNKNOW) {
      return '未知错误';
    } else {
      return value;
    }
  };

  const getDisplayNameByTaskType = (taskType) => {
    if (TASK_TYPE_AND_DISPLAY_NAME_MAP.has(taskType)) {
      return TASK_TYPE_AND_DISPLAY_NAME_MAP.get(taskType);
    } else {
      return taskType;
    }
  };
  return {
    convertTask,
    convertTaskList,
    missionPlatformFormat,
    missionTypeFormat,
    convertMissionLog,
    convertMissionLogList,
    missionStatusFormat,
    missionErrorFormat,
    getDisplayNameByTaskType,
  };
}
