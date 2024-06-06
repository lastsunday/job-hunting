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
}
