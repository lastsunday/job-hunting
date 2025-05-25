import { PageBO } from "./pageBO";

export class DataSourceMetadataSearchBO extends PageBO {
  id;
  name;
  enable;
  autoUpdateEnable;
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
