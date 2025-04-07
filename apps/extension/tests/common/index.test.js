import { expect, test } from "vitest";
import { getInfoFromJobDetailUrl, PLATFORM_BOSS, PLATFORM_51JOB, PLATFORM_ZHILIAN, PLATFORM_LAGOU, PLATFORM_LIEPIN, PLATFORM_JOBONLINE } from "../../common";

test('getInfoFromJobDetailUrl return correct info from job detail url', () => {
    const urlAndResult = [
        {
            urlObject: new URL("https://www.zhipin.com/job_detail/dfede224568628f41Hd53NS4EVRT.html"),
            platform: PLATFORM_BOSS,
            jobId: "BOSS_dfede224568628f41Hd53NS4EVRT",
            url: "https://www.zhipin.com/job_detail/dfede224568628f41Hd53NS4EVRT.html"
        },
        {
            urlObject: new URL("https://jobs.51job.com/shanghai-bsq/163395211.html"),
            platform: PLATFORM_51JOB,
            jobId: "51JOB_163395211",
            url: "https://jobs.51job.com/shanghai-bsq/163395211.html"
        },
        {
            urlObject: new URL("https://www.zhaopin.com/jobdetail/CCL1397659050J40721890611.htm"),
            platform: PLATFORM_ZHILIAN,
            jobId: "ZHILIAN_CCL1397659050J40721890611",
            url: "https://www.zhaopin.com/jobdetail/CCL1397659050J40721890611.htm"
        },
        {
            urlObject: new URL("https://www.lagou.com/wn/jobs/12218669.html"),
            platform: PLATFORM_LAGOU,
            jobId: "LAGOU_12218669",
            url: "https://www.lagou.com/wn/jobs/12218669.html"
        },
        {
            urlObject: new URL("https://www.liepin.com/lptjob/73639847?pgRef=c_pc_search_page"),
            platform: PLATFORM_LIEPIN,
            jobId: "LIEPIN_73639847",
            url: "https://www.liepin.com/lptjob/73639847"
        },
        {
            urlObject: new URL("https://www.jobonline.cn/positionDetail?id=1562687668897464321&live=0&posiOriginate=3&type="),
            platform: PLATFORM_JOBONLINE,
            jobId: "JOBONLINE_1562687668897464321",
            url: "https://www.jobonline.cn/positionDetail?id=1562687668897464321"
        },
    ]
    for (let i = 0; i < urlAndResult.length; i++) {
        const item = urlAndResult[i];
        const { platform, jobId, url } = getInfoFromJobDetailUrl(item.urlObject);
        expect(item.platform).eq(platform);
        expect(item.jobId).eq(jobId);
        expect(item.url).eq(url);
    }
});