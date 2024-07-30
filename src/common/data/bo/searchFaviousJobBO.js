import { PageBO } from "./pageBO";

export class SearchFaviousJobBO extends PageBO {
    nameKeywordList;
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
