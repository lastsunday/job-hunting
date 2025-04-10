import { PageBO } from "./pageBO";

export class JobSnapshotSearchBO extends PageBO {
    ids;
    jobIds;
    startDatetimeForCreate;
    endDatetimeForCreate;
    startDatetimeForUpdate;
    endDatetimeForUpdate;
    orderByColumn;
    /**
     * ASC,DESC
     */
    orderBy;
    skipContent;
}
