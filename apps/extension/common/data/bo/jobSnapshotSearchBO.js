import { PageBO } from "./pageBO";

export class JobSnapshotSearchBO extends PageBO {
    jobIds;
    orderByColumn;
    /**
     * ASC,DESC
     */
    orderBy;
    skipContent;
}
