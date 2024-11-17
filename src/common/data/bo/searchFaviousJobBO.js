import { PageBO } from "./pageBO";

export class SearchFaviousJobBO extends PageBO {
    nameKeywordList;
    nameDislikeKeywordList;
    salary;
    addressKeywordList;
    descKeywordList;
    descDislikeKeywordList;
    dislikeCompanyTagList;
    likeJobTagList;
    dislikeJobTagList;
    publishDateOffset;
    bossPositionDislikeKeywordList;
    
    orderByColumn;
    /**
     * ASC,DESC
     */
    orderBy;
}
