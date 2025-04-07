import "single-file-core/single-file-bootstrap.js";
import { getPageData } from "single-file-core/single-file.js";
import { initBridge } from "../../common/api/common.js";
import { getInfoFromJobDetailUrl, PLATFORM_JOBONLINE } from "../../common";
import { JobSnapshotApi } from "../../common/api";
import { JobSnapshot } from "../../common/data/domain/jobSnapshot";

export default defineContentScript({
    // Set manifest options
    matches: [
        "https://www.zhipin.com/job_detail/*",
        "https://jobs.51job.com/*",
        "https://www.zhaopin.com/jobdetail/*",
        "https://www.liepin.com/lptjob/*",
        "https://www.lagou.com/wn/jobs/*",
        "https://www.jobonline.cn/positionDetail*",
    ],
    async main() {
        await initBridge();
        const href = window.location.href;
        const { platform, jobId, url } = getInfoFromJobDetailUrl(new URL(href));
        let getPageDataConfig;
        if (platform == PLATFORM_JOBONLINE) {
            getPageDataConfig = {
                removeUnusedStyles: true,
                removeUnusedFonts: true,
                removeImports: true,
                compressHTML: true,
                removeAudioSrc: true,
                removeVideoSrc: true,
                removeAlternativeFonts: true,
                removeAlternativeMedias: true,
                removeAlternativeImages: true,
                groupDuplicateImages: true,
                blockScripts: true,
            };
        } else {
            getPageDataConfig = {
                removeUnusedStyles: true,
                removeUnusedFonts: true,
                removeImports: true,
                removeScripts: true,
                compressHTML: true,
                removeAudioSrc: true,
                removeVideoSrc: true,
                removeAlternativeFonts: true,
                removeAlternativeMedias: true,
                removeAlternativeImages: true,
                groupDuplicateImages: true,
                blockScripts: true,
            };
        }
        //TODO check job data save timing
        //TODO > 7 days to save?
        //TODO [UI] show saving procecss bar?
        //TODO [UI] show immediately save job snapshot button?
        //TODO [UI] show history job snapshot by timeline?
        const data = await getPageData(getPageDataConfig);
        const jobSnapshot = new JobSnapshot();
        jobSnapshot.jobId = jobId;
        jobSnapshot.url = url;
        jobSnapshot.platform = platform;
        jobSnapshot.content = data.content;
        await JobSnapshotApi.jobSnapshotAddOrUpdate(jobSnapshot);
    },
})

