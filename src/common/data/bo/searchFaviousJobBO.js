import { PageBO } from "./pageBO";

export class SearchFaviousJobBO extends PageBO {
    nameKeywordList;
    nameDislikeKeywordList;
    salary;
    addressKeywordList;
    descKeywordList;
    descDislikeKeywordList;
    dislikeCompanyTagList;
    publishDateOffset;
    bossPositionDislikeKeywordList;
    
    orderByColumn;
    /**
     * ASC,DESC
     */
    orderBy;
}
