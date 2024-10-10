import { PageBO } from "./pageBO";

export class SearchTaskBO extends PageBO {
    typeList;
    statusList;
    startDatetimeForCreate;
    endDatetimeForCreate;
    startDatetimeForUpdate;
    endDatetimeForUpdate;
    endRetryCount
    orderByColumn;
    /**
     * ASC,DESC
     */
    orderBy;
}
