import { PageBO } from "./pageBO";

export class SearchDataSharePartnerBO extends PageBO {
    username;
    usernameList;
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
