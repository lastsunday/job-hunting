import { GithubApi } from "../../common/api/github";
import { ElMessage } from "element-plus";
import semver from "semver";
const version = __APP_VERSION__;

export function useSystem() {

    const queryVersion = async () => {
        return await GithubApi.queryVersion();
    }

    const checkNewVersion = (versionObject) => {
        const latestVersion = versionObject.tag_name;
        return semver.gt(latestVersion, version);
    }

    const getLatestAssets = (versionObject) => {
        let assets = versionObject.assets;
        let chromeZipAssets = assets.filter(item => { return item.name.includes("chrome") && item.name.endsWith(".zip") });
        if (chromeZipAssets && chromeZipAssets.length > 0) {
            return chromeZipAssets[0];
        } else {
            return null;
        }
    }

    const downloadLatest = (versionObject) => {
        let assets = getLatestAssets(versionObject);
        let url = assets?.browser_download_url;
        if (url) {
            window.open(url);
        } else {
            ElMessage('未找到安装文件');
        }
    }

    return { queryVersion, checkNewVersion, getLatestAssets, downloadLatest }

}