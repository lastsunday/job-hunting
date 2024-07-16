import { PageBO } from "./pageBO";

export class SearchJobBO extends PageBO {
  jobName;
  jobCompanyName;
  startDatetime;
  endDatetime;
  firstPublishStartDatetime;
  firstPublishEndDatetime;
  jobLocationName;
  jobAddress;
  orderByColumn;
  /**
   * ASC,DESC
   */
  orderBy;

  /**
   * 是否有查看时间
   */
  hasBrowseTime;
  /**
   * 是否有坐标信息
   */
  hasCoordinate;

  minLat;
  maxLat;
  minLng;
  maxLng;
}
