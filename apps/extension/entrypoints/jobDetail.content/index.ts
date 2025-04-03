import "single-file-core/single-file-bootstrap.js";
import { getPageData } from "single-file-core/single-file.js";
import { initBridge, dbSchemaVersion } from "../../common/api/common.js";

export default defineContentScript({
    // Set manifest options
    matches: ["https://www.zhipin.com/job_detail/*"],
    async main() {
        await initBridge();
        //TODO for testing
        console.log(await getPageData({
            removeHiddenElements: true,
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
            groupDuplicateImages: true
        }))
        console.log(await dbSchemaVersion())
    },
})
