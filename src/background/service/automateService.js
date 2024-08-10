import { postSuccessMessage, postErrorMessage } from "../util";
import { infoLog, errorLog } from "../../common/log";
import { randomDelay } from "../../common/utils";
import {
    connect,
    ExtensionTransport,
} from 'puppeteer-core/lib/esm/puppeteer/puppeteer-core-browser.js';
import {
    PLATFORM_BOSS,
    PLATFORM_51JOB,
    PLATFORM_ZHILIAN,
    PLATFORM_LAGOU,
    PLATFORM_LIEPIN,
    AUTOMATE_ERROR_UNKNOW,
    AUTOMATE_ERROR_HUMAN_VALID,
} from "../../common";
import dayjs from "dayjs";
const DATE_FORMAT = "YYYY-MM-DD HH:mm:ss.SSS";

export const AutomateService = {
    /**
     * @param {*} message
     * @param {{url,platform,delay,delayRandomRange}} param 
     * 
     * @return 
     */
    automateFetchJobItemData: async function (message, param) {
        try {
            let result = await _automateFetchJobItemData(param);
            postSuccessMessage(message, result);
        } catch (e) {
            postErrorMessage(
                message,
                "[background] automateFetchJobItemData error : " + e.message
            );
        }
    },
};

const jobItemPageHandleFunction = new Map();

jobItemPageHandleFunction.set(PLATFORM_51JOB, _51jobHandle);
jobItemPageHandleFunction.set(PLATFORM_BOSS, _bossHandle);
jobItemPageHandleFunction.set(PLATFORM_ZHILIAN, _zhilianHandle);
jobItemPageHandleFunction.set(PLATFORM_LAGOU, _lagouHandle);
jobItemPageHandleFunction.set(PLATFORM_LIEPIN, _liepinHandle);

async function _automateFetchJobItemData({ url, platform, delay, delayRandomRange, maxPage }) {
    let windowValue = await chrome.windows.create({
        url,
        width: 800,
        height: 600
    });
    const tab = windowValue.tabs[0];
    infoLog(`[puppeteer] create tab id = ${tab.id}`)
    const browser = await connect({
        transport: await ExtensionTransport.connectTab(tab.id),
    });
    const [page] = await browser.pages();
    try {
        const handler = jobItemPageHandleFunction.get(platform);
        infoLog(`[puppeteer] get job item page handle function platform = ${platform}`)
        if (handler) {
            const startDatetime = new Date();
            const result = await handler(tab, page, platform, delay, delayRandomRange, maxPage)
            result.startDatetime = startDatetime;
            result.endDatetime = new Date();
            return result;
        } else {
            throw `not support platform = ${platform}`;
        }
    } finally {
        if (page) {
            page.close();
        }
        if (windowValue) {
            chrome.windows.remove(
                windowValue.id,
            )
        }
    }
}

function _log(logList, message) {
    infoLog(message);
    logList.push(`${dayjs(new Date()).format(DATE_FORMAT)} ${message}`);
}

async function _51jobHandle(tab, page, platform, delay, delayRandomRange, maxPage) {
    const logList = [];
    const screenshotList = [];
    let error = null;
    let count = 1;
    try {
        _log(logList, `[puppeteer] [${platform}] handle _51jobHandle`)
        let jobItemLoaded = await page.waitForSelector(".btn-next", { timeout: 5000 });
        if (jobItemLoaded) {
            while (true) {
                await page.waitForSelector(".__status_job_render_finish");
                let nextButtonElementHandle = await page.waitForSelector(".btn-next");
                screenshotList.push(await page.screenshot({ encoding: 'base64', fullPage: true }));
                count++;
                if (maxPage && maxPage > 0 && count > maxPage) {
                    _log(logList, `[puppeteer] [${platform}] page(${count}) over maxPage(${maxPage})`)
                    break;
                }
                let isLastPage = await (await nextButtonElementHandle.getProperty("disabled")).jsonValue();
                if (isLastPage) {
                    _log(logList, `[puppeteer] [${platform}] is last page`)
                    _log(logList, `[puppeteer] [${platform}] close page tab id = ${tab.id}`)
                    break;
                } else {
                    _log(logList, `[puppeteer] [${platform}] has next page tab id = ${tab.id}`)
                    _log(logList, `[puppeteer] [${platform}] will go to page no = ${count}`)
                    await randomDelay(delay, delayRandomRange);
                    await nextButtonElementHandle.click();
                    _log(logList, `[puppeteer] [${platform}] go to page no = ${count}`)
                }
            }
            return { logList, count, error, screenshotList };
        } else {
            await chrome.tabs.reload(tab.id);
        }
    } catch (e) {
        errorLog(e);
        _log(logList, `[puppeteer] [${platform}] handle has error`);
        error = await _checkValidHuman(platform, page) ? AUTOMATE_ERROR_HUMAN_VALID : AUTOMATE_ERROR_UNKNOW;
        screenshotList.push(await page.screenshot({ encoding: 'base64', fullPage: true }));
        return { logList, count, error, screenshotList };
    }
}

async function _bossHandle(tab, page, platform, delay, delayRandomRange, maxPage) {
    const logList = [];
    const screenshotList = [];
    let error = null;
    let count = 1;
    try {
        _log(logList, `[puppeteer] [${platform}] handle _bossHandle`)
        await page.waitForNavigation();
        error = await _checkValidHuman(platform, page) ? AUTOMATE_ERROR_HUMAN_VALID : null;
        if (error == AUTOMATE_ERROR_HUMAN_VALID) {
            throw "navigate to human valid page"
        }
        try {
            await page.waitForSelector(".__status_job_render_finish", { timeout: 5000 });
        } catch (e) {
            await chrome.tabs.reload(tab.id);
            await page.waitForSelector(".__status_job_render_finish");
        }
        while (true) {
            await page.waitForSelector(".__status_job_render_finish");
            let nextButtonElementHandle = await page.waitForSelector(".ui-icon-arrow-right");
            screenshotList.push(await page.screenshot({ encoding: 'base64', fullPage: true }));
            count++;
            if (maxPage && maxPage > 0 && count > maxPage) {
                _log(logList, `[puppeteer] [${platform}] page(${count}) over maxPage(${maxPage})`)
                break;
            }
            const isLastPage = await page.evaluate(() => {
                const targetNode = document.querySelector('.ui-icon-arrow-right')?.parentElement;
                return targetNode?.className == "disabled";
            });
            if (isLastPage) {
                _log(logList, `[puppeteer] [${platform}] is last page`)
                _log(logList, `[puppeteer] [${platform}] close page tab id = ${tab.id}`)
                break;
            } else {
                _log(logList, `[puppeteer] [${platform}] has next page tab id = ${tab.id}`)
                _log(logList, `[puppeteer] [${platform}] will go to page no = ${count}`)
                await randomDelay(delay, delayRandomRange);
                await page.evaluate((element) => {
                    element.click()
                }, nextButtonElementHandle)
                _log(logList, `[puppeteer] [${platform}] go to page no = ${count}`)
            }
        }
        return { logList, count, error, screenshotList };
    } catch (e) {
        errorLog(e);
        _log(logList, `[puppeteer] [${platform}] handle has error`);
        error = await _checkValidHuman(platform, page) ? AUTOMATE_ERROR_HUMAN_VALID : AUTOMATE_ERROR_UNKNOW;
        screenshotList.push(await page.screenshot({ encoding: 'base64', fullPage: true }));
        return { logList, count, error, screenshotList };
    }
}

async function _liepinHandle(tab, page, platform, delay, delayRandomRange, maxPage) {
    const logList = [];
    const screenshotList = [];
    let error = null;
    let count = 1;
    try {
        _log(logList, `[puppeteer] [${platform}] handle _liepinHandle`)
        await page.waitForNavigation();
        error = await _checkValidHuman(platform, page) ? AUTOMATE_ERROR_HUMAN_VALID : null;
        if (error == AUTOMATE_ERROR_HUMAN_VALID) {
            throw "navigate to human valid page"
        }
        await page.waitForSelector(".__status_job_render_finish");
        while (true) {
            await page.waitForSelector(".__status_job_render_finish");
            let nextButtonElementHandle = await page.waitForSelector(".anticon-right");
            screenshotList.push(await page.screenshot({ encoding: 'base64', fullPage: true }));
            count++;
            if (maxPage && maxPage > 0 && count > maxPage) {
                _log(logList, `[puppeteer] [${platform}] page(${count}) over maxPage(${maxPage})`)
                break;
            }
            const isLastPage = await page.evaluate(() => {
                const targetNode = document.querySelector('.anticon-right').parentElement;
                return targetNode.disabled;
            });
            if (isLastPage) {
                _log(logList, `[puppeteer] [${platform}] is last page`)
                _log(logList, `[puppeteer] [${platform}] close page tab id = ${tab.id}`)
                break;
            } else {
                _log(logList, `[puppeteer] [${platform}] has next page tab id = ${tab.id}`)
                _log(logList, `[puppeteer] [${platform}] will go to page no = ${count}`)
                await randomDelay(delay, delayRandomRange);
                await nextButtonElementHandle.click();
                _log(logList, `[puppeteer] [${platform}] go to page no = ${count}`)
            }
        }
        return { logList, count, error, screenshotList };
    } catch (e) {
        errorLog(e);
        _log(logList, `[puppeteer] [${platform}] handle has error`);
        error = await _checkValidHuman(platform, page) ? AUTOMATE_ERROR_HUMAN_VALID : AUTOMATE_ERROR_UNKNOW;
        screenshotList.push(await page.screenshot({ encoding: 'base64', fullPage: true }));
        return { logList, count, error, screenshotList };
    }
}

async function _zhilianHandle(tab, page, platform, delay, delayRandomRange, maxPage) {
    return _handle(tab, page, platform, delay, delayRandomRange, maxPage,
        {
            nextButtonSelector: ".btn ::-p-text(下一页)",
            lastPageButtonSelector: "a.btn.soupager__btn.soupager__btn--disable"
        });
}

async function _lagouHandle(tab, page, platform, delay, delayRandomRange, maxPage) {
    return _handle(tab, page, platform, delay, delayRandomRange, maxPage,
        {
            nextButtonSelector: ".lg-pagination-next",
            lastPageButtonSelector: "li.lg-pagination-next.lg-pagination-disabled"
        });
}

async function _handle(tab, page, platform, delay, delayRandomRange, maxPage, { nextButtonSelector, lastPageButtonSelector }) {
    const logList = [];
    const screenshotList = [];
    let error = null;
    let count = 1;
    try {
        _log(logList, `[puppeteer] [${platform}] handle _handle`)
        try {
            await page.waitForNavigation({ timeout: 5000 });
        } catch (e) {
            _log(logList, `[puppeteer] [${platform}] waitForNavigation error`)
        }
        while (true) {
            await page.waitForSelector(".__status_job_render_finish");
            let nextButtonElementHandle = await page.waitForSelector(`${nextButtonSelector}`);
            screenshotList.push(await page.screenshot({ encoding: 'base64', fullPage: true }));
            count++;
            if (maxPage && maxPage > 0 && count > maxPage) {
                _log(logList, `[puppeteer] [${platform}] page(${count}) over maxPage(${maxPage})`)
                break;
            }
            let isLastPage = nextButtonElementHandle.remoteObject().description == `${lastPageButtonSelector}`;
            if (isLastPage) {
                _log(logList, `[puppeteer] [${platform}] is last page`)
                _log(logList, `[puppeteer] [${platform}] close page tab id = ${tab.id}`)
                break;
            } else {
                _log(logList, `[puppeteer] [${platform}] has next page tab id = ${tab.id}`)
                _log(logList, `[puppeteer] [${platform}] will go to page no = ${count}`)
                nextButtonElementHandle = await page.waitForSelector(`${nextButtonSelector}`);
                await randomDelay(delay, delayRandomRange);
                await nextButtonElementHandle.click();
                _log(logList, `[puppeteer] [${platform}] go to page no = ${count}`)
            }
        }
        return { logList, count, error, screenshotList };
    } catch (e) {
        errorLog(e);
        _log(logList, `[puppeteer] [${platform}] handle has error`);
        error = await _checkValidHuman(platform, page) ? AUTOMATE_ERROR_HUMAN_VALID : AUTOMATE_ERROR_UNKNOW;
        screenshotList.push(await page.screenshot({ encoding: 'base64', fullPage: true }));
        return { logList, count, error, screenshotList };
    }
}



async function _checkValidHuman(platform, page) {
    try {
        if (platform == PLATFORM_BOSS) {
            let url = page.url();
            return url.startsWith("https://www.zhipin.com/web/user/safe/verify-slider");
        } else if (platform == PLATFORM_51JOB) {
            let result = await page.waitForSelector(".waf-nc-wrapper", { timeout: 5000 });
            return result ? true : false;
        } else if (platform == PLATFORM_ZHILIAN) {
            let result = await page.waitForSelector(".__status_job_render_error", { timeout: 5000 });
            return result ? true : false;
        } else if (platform == PLATFORM_LAGOU) {
            //TODO LAGOU
            return false;
        } else if (platform == PLATFORM_LIEPIN) {
            //TODO LIEPIN
            return false;
        } else {
            throw `checkValidHuman unknow platform ${platform}`
        }
    } catch (e) {
        return false;
    }
}