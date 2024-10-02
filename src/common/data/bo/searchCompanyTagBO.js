import { PageBO } from "./pageBO";

export class SearchCompanyTagBO extends PageBO {
  companyName;
  tagIds;
  startDatetimeForUpdate;
  endDatetimeForUpdate;
  orderByColumn;
  /**
   * ASC,DESC
   */
  orderBy;
}
