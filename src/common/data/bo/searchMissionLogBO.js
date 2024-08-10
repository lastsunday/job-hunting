import { PageBO } from "./pageBO";

export class SearchMissionLogBO extends PageBO {
    missionId;

    orderByColumn;
    /**
     * ASC,DESC
     */
    orderBy;
}
