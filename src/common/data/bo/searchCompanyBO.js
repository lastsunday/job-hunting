import { PageBO } from "./pageBO";

export class SearchCompanyBO extends PageBO {
  companyName;
  startDateStartDatetime;
  startDateEndDatetime;
  startDatetimeForUpdate;
  endDatetimeForUpdate;
  orderByColumn;
  /**
   * ASC,DESC
   */
  orderBy;

  minLat;
  maxLat;
  minLng;
  maxLng;
}
