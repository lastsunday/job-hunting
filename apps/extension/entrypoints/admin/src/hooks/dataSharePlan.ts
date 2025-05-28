import {
  TASK_STATUS_CANCEL,
  TASK_STATUS_ERROR,
  TASK_STATUS_FINISHED,
  TASK_STATUS_FINISHED_BUT_ERROR,
  TASK_STATUS_READY, TASK_STATUS_RUNNING,
  TASK_TYPE_COMPANY_DATA_DOWNLOAD,
  TASK_TYPE_COMPANY_DATA_MERGE,
  TASK_TYPE_COMPANY_DATA_UPLOAD,
  TASK_TYPE_COMPANY_TAG_DATA_DOWNLOAD,
  TASK_TYPE_COMPANY_TAG_DATA_MERGE,
  TASK_TYPE_COMPANY_TAG_DATA_UPLOAD,
  TASK_TYPE_JOB_DATA_DOWNLOAD,
  TASK_TYPE_JOB_DATA_MERGE,
  TASK_TYPE_JOB_DATA_UPLOAD,
  TASK_TYPE_JOB_TAG_DATA_DOWNLOAD,
  TASK_TYPE_JOB_TAG_DATA_MERGE,
  TASK_TYPE_JOB_TAG_DATA_UPLOAD,
  TASK_TYPE_JOB_PUBLIC_DATA_DOWNLOAD,
  TASK_TYPE_JOB_PUBLIC_DATA_MERGE,
  TASK_TYPE_JOB_PUBLIC_DATA_UPLOAD,
  TASK_TYPE_METADATA_DATA_DOWNLOAD,
  TASK_TYPE_METADATA_DATA_MERGE,
  isDownloadType,
  isMergeType,
  isUploadType
} from "@/common";
import { genRangeDate } from "@/common/utils";
import { SeriesData, StackBarData } from "../data/chart/StackBarData";

export function useDataSharePlan() {

  const STATUS_NAME_OBJECT = {
    "READY": "准备",
    "RUNNING": "运行中",
    "FINISHED": "完成",
    "FINISHED_BUT_ERROR": "异常完成",
    "ERROR": "错误",
    "CANCEL": "取消",
  }

  const STATUS_COLOR_OBJECT = {
    "READY": "#73c0de",
    "RUNNING": "#5470c6",
    "FINISHED": "#91cc75",
    "FINISHED_BUT_ERROR": "#fac858",
    "ERROR": "#ee6666",
    "CANCEL": "#111111",
  }

  const UPLOAD_NAME_OBJECT = {
    "JOB_DATA_UPLOAD": "职位数据",
    "COMPANY_DATA_UPLOAD": "公司数据",
    "COMPANY_TAG_DATA_UPLOAD": "公司标签数据",
    "JOB_TAG_DATA_UPLOAD": "职位标签数据",
    "JOB_PUBLIC_DATA_UPLOAD": "职位公开数据",
  }

  const convertStatusName = (name) => {
    return STATUS_NAME_OBJECT[name] ?? name;
  }

  const convertUploadName = (name) => {
    return UPLOAD_NAME_OBJECT[name] ?? name;
  }

  const convertToChartData = ({ startDate, endDate, queryResult, convertNameFunction = null, defaultNameArray = null, defaultColorObject = null }): StackBarData => {
    const rangeDate = genRangeDate(startDate, endDate);
    rangeDate.sort();
    let nameArray = null;
    const nameMap = new Map();
    if (defaultNameArray) {
      defaultNameArray.forEach(name => {
        if (!nameMap.has(name)) {
          nameMap.set(name, null);
        }
      });
    }
    queryResult.forEach(item => {
      if (!nameMap.has(item.name)) {
        nameMap.set(item.name, null);
      }
    });
    nameArray = Array.from(nameMap.keys());
    const seriesData: SeriesData[] = [];
    const nameAndDateTotalMapMap = new Map();
    nameArray.forEach(name => {
      const map = new Map();
      const filterItem = queryResult.filter(item => { return item.name == name });
      filterItem.forEach(filterObj => {
        map.set(filterObj.datetime, filterObj.total);
      });
      nameAndDateTotalMapMap.set(name, map)
    });
    nameArray.forEach(name => {
      const data = [];
      const dateTotalMap = nameAndDateTotalMapMap.get(name);
      rangeDate.forEach(date => {
        data.push((dateTotalMap && dateTotalMap.has(date) ? dateTotalMap.get(date) : 0))
      });
      seriesData.push({ "name": convertNameFunction ? convertNameFunction(name) : name, data, color: defaultColorObject ? defaultColorObject[name] : null });
    });
    return {
      dateData: rangeDate,
      seriesData,
    }
  }

  const typeWhitelist = [
    { value: "职位数据上传", code: TASK_TYPE_JOB_DATA_UPLOAD },
    { value: "公司数据上传", code: TASK_TYPE_COMPANY_DATA_UPLOAD },
    { value: "公司标签数据上传", code: TASK_TYPE_COMPANY_TAG_DATA_UPLOAD },
    { value: "职位标签数据上传", code: TASK_TYPE_JOB_TAG_DATA_UPLOAD },
    { value: "职位公开数据上传", code: TASK_TYPE_JOB_PUBLIC_DATA_UPLOAD },
    { value: "职位数据下载", code: TASK_TYPE_JOB_DATA_DOWNLOAD },
    { value: "公司数据下载", code: TASK_TYPE_COMPANY_DATA_DOWNLOAD },
    { value: "公司标签数据下载", code: TASK_TYPE_COMPANY_TAG_DATA_DOWNLOAD },
    { value: "职位标签数据下载", code: TASK_TYPE_JOB_TAG_DATA_DOWNLOAD },
    { value: "职位公开数据下载", code: TASK_TYPE_JOB_PUBLIC_DATA_DOWNLOAD },
    { value: "职位数据合并", code: TASK_TYPE_JOB_DATA_MERGE },
    { value: "公司数据合并", code: TASK_TYPE_COMPANY_DATA_MERGE },
    { value: "公司标签数据合并", code: TASK_TYPE_COMPANY_TAG_DATA_MERGE },
    { value: "职位标签数据合并", code: TASK_TYPE_JOB_TAG_DATA_MERGE },
    { value: "职位公开数据合并", code: TASK_TYPE_JOB_PUBLIC_DATA_MERGE },
    { value: "数据源元数据下载", code: TASK_TYPE_METADATA_DATA_DOWNLOAD },
    { value: "数据源元数据合并", code: TASK_TYPE_METADATA_DATA_MERGE },
  ];

  const taskCodeNameMap = new Map();
  typeWhitelist.forEach((item) => {
    taskCodeNameMap.set(item.code, item.value);
  });

  const taskFormat = (value: string) => {
    if (taskCodeNameMap.has(value)) {
      return taskCodeNameMap.get(value);
    } else {
      return value;
    }
  }

  const statusWhitelist = [
    { value: "准备", code: TASK_STATUS_READY },
    { value: "运行中", code: TASK_STATUS_RUNNING },
    { value: "完成", code: TASK_STATUS_FINISHED },
    { value: "异常完成", code: TASK_STATUS_FINISHED_BUT_ERROR },
    { value: "错误", code: TASK_STATUS_ERROR },
    { value: "取消", code: TASK_STATUS_CANCEL }
  ];

  const statusCodeNameMap = new Map();
  statusWhitelist.forEach((item) => {
    statusCodeNameMap.set(item.code, item.value);
  });

  const statusFormat = (value: string) => {
    if (statusCodeNameMap.has(value)) {
      return statusCodeNameMap.get(value);
    } else {
      return value;
    }
  }

  const getColorForStatus = (value: string): string => {
    switch (value) {
      case TASK_STATUS_READY:
        return "#73c0de";
      case TASK_STATUS_RUNNING:
        return "#5470c6";
      case TASK_STATUS_FINISHED:
        return "#91cc75";
      case TASK_STATUS_FINISHED_BUT_ERROR:
        return "#fac858";
      case TASK_STATUS_ERROR:
        return "#ee6666";
      default:
        return "#111111";
    }
  }

  const getIconStringForStatus = (value: string) => {
    switch (value) {
      case TASK_STATUS_READY:
        return "i-arcticons:ready-for";
      case TASK_STATUS_RUNNING:
        return "i-mdi:play";
      case TASK_STATUS_FINISHED:
        return "i-mdi:success-circle";
      case TASK_STATUS_FINISHED_BUT_ERROR:
        return "i-mdi:alert-circle-success";
      case TASK_STATUS_ERROR:
        return "i-ix:error-filled";
      default:
        return "";
    }
  }

  return {
    convertToChartData, convertUploadName, convertStatusName,
    STATUS_COLOR_OBJECT, STATUS_NAME_OBJECT, UPLOAD_NAME_OBJECT,
    typeWhitelist, taskFormat, statusWhitelist, statusFormat,
    getColorForStatus, getIconStringForStatus,
    isDownloadType, isUploadType, isMergeType
  }

}
