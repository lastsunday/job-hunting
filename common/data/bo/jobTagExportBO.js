import { PageBO } from "./pageBO";

export class JobTagExportBO extends PageBO{
    jobIds;
    source;
    startDatetimeForUpdate;
    endDatetimeForUpdate;
    isPublic = true;
}