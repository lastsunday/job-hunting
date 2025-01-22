import { PageBO } from "./pageBO";

export class CompanyTagExportBO extends PageBO {
    companyIds;
    source;
    startDatetimeForUpdate;
    endDatetimeForUpdate;
    isPublic = true;
}