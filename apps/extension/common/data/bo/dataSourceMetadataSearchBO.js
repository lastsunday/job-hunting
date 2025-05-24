import { PageBO } from "./pageBO";

export class DataSourceMetadataSearchBO extends PageBO {
  id;
  name;
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
