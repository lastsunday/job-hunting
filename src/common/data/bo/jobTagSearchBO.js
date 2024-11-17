import { PageBO } from "./pageBO";

export class JobTagSearchBO extends PageBO {
  tagIds;
  startDatetimeForUpdate;
  endDatetimeForUpdate;
  orderByColumn;
  /**
   * ASC,DESC
   */
  orderBy;
}
