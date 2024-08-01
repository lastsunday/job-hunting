export class JobFaviousSettingDTO {
    nameKeywordList = [];
    nameDislikeKeywordList = [];
    salary;
    addressKeywordList = [];
    descKeywordList = [];
    descDislikeKeywordList = []
    dislikeCompanyTagList = [];
    publishDateOffset;
    bossPositionDislikeKeywordList = [];
    /**
     * 0: createDatetime desc,1: publishDatetime desc
     */
    sortMode = 0;
}