import { PageBO } from "./pageBO";

export class SearchFaviousJobBO extends PageBO {
    nameKeywordList;
    salary;
    addressKeywordList;
    descKeywordList;
    descDislikeKeywordList;
    dislikeCompanyTagList;
    publishDateOffset;

    orderByColumn;
    /**
     * ASC,DESC
     */
    orderBy;
}
