import { PageBO } from "./pageBO";

export class SearchCompanyTagBO extends PageBO {
  companyName;
  tagIds;
  orderByColumn;
  /**
   * ASC,DESC
   */
  orderBy;
}
