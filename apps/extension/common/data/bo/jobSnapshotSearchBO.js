import { PageBO } from "./pageBO";

export class JobSnapshotSearchBO extends PageBO {
    jobId;
    orderByColumn;
    /**
     * ASC,DESC
     */
    orderBy;
    skipContent;
}
