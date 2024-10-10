import { PageBO } from "./pageBO";

export class SearchTaskDataDownloadBO extends PageBO {
    userName;
    repoName;
    startDatetime;
    endDatetime;
    orderByColumn;
    /**
     * ASC,DESC
     */
    orderBy;
}
