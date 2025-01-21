import { MissionLogData } from "../data/MissionLogData";
import { TaskData } from "../data/TaskData";
import {
    MISSION_AUTO_BROWSE_JOB_SEARCH_PAGE, PLATFORM_51JOB,
    PLATFORM_BOSS, PLATFORM_ZHILIAN, PLATFORM_LAGOU, PLATFORM_LIEPIN,
    MISSION_STATUS_SUCCESS, MISSION_STATUS_FAILURE, AUTOMATE_ERROR_HUMAN_VALID, AUTOMATE_ERROR_UNKNOW
} from "@/common"
import dayjs from "dayjs";

export function useTask() {

    const convertTaskList = (items: any[]): Array<TaskData> => {
        let result = [];
        items.forEach(item => {
            result.push(convertTask(item));
        });
        return result;
    }

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
    }

    const missionPlatformFormat = (value: string) => {
        if (value == PLATFORM_51JOB) {
            return "前程无忧";
        } else if (value == PLATFORM_BOSS) {
            return "BOSS直聘";
        } else if (value == PLATFORM_ZHILIAN) {
            return "智联招聘";
        } else if (value == PLATFORM_LAGOU) {
            return "拉钩网";
        } else if (value == PLATFORM_LIEPIN) {
            return "猎聘网";
        } else {
            return value;
        }
    };

    const missionTypeFormat = (value: string) => {
        if (value == MISSION_AUTO_BROWSE_JOB_SEARCH_PAGE) {
            return "自动浏览职位搜索页";
        } else {
            return value;
        }
    };

    const convertMissionLogList = (items: any[]): MissionLogData[] => {
        const result = [];
        items.forEach(item => {
            result.push(convertMissionLog(item));
        });
        return result;
    }

    const convertMissionLog = (item: any): MissionLogData => {
        const { missionId, missionLogDetail, missionLogId, missionStatus, missionStatusReason, createDatetime, updateDatetime } = item;
        let detail = JSON.parse(missionLogDetail);
        detail.startDatetime = detail.startDatetime != null ? dayjs(detail.startDatetime).toDate() : null;
        detail.endDatetime = detail.endDatetime != null ? dayjs(detail.endDatetime).toDate() : null;
        return {
            missionId: missionId,
            detail,
            id: missionLogId,
            status: missionStatus,
            reason: missionStatusReason,
            createDatetime,
            updateDatetime,
        }

    }

    const missionStatusFormat = (value: string): string => {
        if (value == MISSION_STATUS_SUCCESS) {
            return "成功";
        } else if (value == MISSION_STATUS_FAILURE) {
            return "失败";
        } else {
            return value;
        }
    }

    const missionErrorFormat = (value: string) => {
        if (value == AUTOMATE_ERROR_HUMAN_VALID) {
            return "人机验证错误";
        } else if (value == AUTOMATE_ERROR_UNKNOW) {
            return "未知错误";
        } else {
            return value;
        }
    }

    return {
        convertTask, convertTaskList, missionPlatformFormat,
        missionTypeFormat, convertMissionLog, convertMissionLogList,
        missionStatusFormat, missionErrorFormat
    }

}

