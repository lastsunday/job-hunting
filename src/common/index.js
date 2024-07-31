export const PLATFORM_BOSS = "BOSS";
export const PLATFORM_51JOB = "51JOB";
export const PLATFORM_ZHILIAN = "ZHILIAN";
export const PLATFORM_LAGOU = "LAGOU";
export const PLATFORM_JOBSDB = "JOBSDB";
export const PLATFORM_LIEPIN = "LIEPIN";
/**
 * 爱企查
 */
export const PLATFORM_AIQICHA = "AIQICHA";

export const TAG_RUOBILIN_BLACK_LIST = "若比邻黑名单";
export const TAG_IT_BLACK_LIST = "互联网企业黑名单";

export function getUrlByTagAndCompanyName(tagName, companyName) {
    const decode = encodeURIComponent(companyName);
    if (tagName == TAG_RUOBILIN_BLACK_LIST) {
        return `https://kjxb.org/?s=${decode}&post_type=question`;
    } else if (tagName == TAG_IT_BLACK_LIST) {
        return `https://job.me88.top/index.php/search/=${decode}`;
    } else {
        return null;
    }
}