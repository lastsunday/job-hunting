import { PageBO } from "./pageBO";

export class JobPublicSearchBO extends PageBO {
  jobIds;
  sourceType;
  source;
  orderByColumn;
  /**
   * ASC,DESC
   */
  orderBy;
}
