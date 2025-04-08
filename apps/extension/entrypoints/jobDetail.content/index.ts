import "single-file-core/single-file-bootstrap.js";
import { getPageData } from "single-file-core/single-file";
import { initBridge } from "@/common/api/common.js";
import { getInfoFromJobDetailUrl, PLATFORM_JOBONLINE } from "@/common";
import { JOB_SNAPSHOT_DATA_EXPRIE_DAY } from "@/common/config";
import { JobSnapshotApi } from "@/common/api";
import { JobSnapshot } from "@/common/data/domain/jobSnapshot";
import { JobSnapshotSearchBO } from "@/common/data/bo/jobSnapshotSearchBO";
import { infoLog } from "@/common/log";
import dayjs from "dayjs";

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
        //check job data save timing
        //> x days to save
        //TODO [UI] show saving procecss bar?
        //TODO [UI] show immediately save job snapshot button?
        //TODO [UI] show history job snapshot by timeline?
        const latestJobSnapshot = await getLatestJobSnapshot(jobId);
        if (checkIsSaveJobSnapshot(latestJobSnapshot)) {
            infoLog("[Job Snapshot] job snapshot save")
            const data = await getPageData(getPageDataConfig);
            const jobSnapshot = new JobSnapshot();
            jobSnapshot.jobId = jobId;
            jobSnapshot.url = url;
            jobSnapshot.platform = platform;
            jobSnapshot.content = data.content;
            await JobSnapshotApi.jobSnapshotAddOrUpdate(jobSnapshot);
        } else {
            infoLog("[Job Snapshot] job snapshot not save")
        }
    },
})

function checkIsSaveJobSnapshot(jobSnapshot: JobSnapshot): boolean {
    if (jobSnapshot) {
        const now = dayjs();
        if (now.isBefore(dayjs(jobSnapshot.updateDatetime).add(JOB_SNAPSHOT_DATA_EXPRIE_DAY, "day"))) {
            return false;
        } else {
            return true;
        }
    } else {
        return true;
    }
}

async function getLatestJobSnapshot(jobId: string) {
    const jobSnapshotSearchBO = new JobSnapshotSearchBO();
    jobSnapshotSearchBO.pageNum = 1;
    jobSnapshotSearchBO.pageSize = 1;
    jobSnapshotSearchBO.orderByColumn = "updateDatetime";
    jobSnapshotSearchBO.orderBy = "DESC";
    jobSnapshotSearchBO.jobId = jobId;
    const { items } = await JobSnapshotApi.jobSnapshotSearch(jobSnapshotSearchBO);
    if (items.length > 0) {
        return items[0];
    } else {
        return null;
    }
}