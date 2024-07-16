import { PageBO } from "./pageBO";

export class SearchCompanyBO extends PageBO {
  companyName;
  startDateStartDatetime;
  startDateEndDatetime;
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
