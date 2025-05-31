import { PageBO } from "./pageBO";

export class CompanyCommentSearchBO extends PageBO {
  id;
  companyId;
  companyName;
  emotion;
  sourceType;
  source;
  startDatetimeForCreate;
  endDatetimeForCreate;
  startDatetimeForUpdate;
  endDatetimeForUpdate;
  orderByColumn;
  /**
   * ASC,DESC
   */
  orderBy;
}
