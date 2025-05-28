import { PageBO } from "./pageBO";

export class SearchTaskDataDownloadBO extends PageBO {
  userName;
  repoName;
  type;
  typeId;
  startDatetime;
  endDatetime;
  orderByColumn;
  /**
   * ASC,DESC
   */
  orderBy;
}
