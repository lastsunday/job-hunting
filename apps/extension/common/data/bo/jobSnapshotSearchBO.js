import { PageBO } from "./pageBO";

export class JobSnapshotSearchBO extends PageBO {
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
