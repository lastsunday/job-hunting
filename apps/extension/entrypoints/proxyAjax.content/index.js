export default defineContentScript({
    // Set manifest options
    matches: [
        "https://www.zhipin.com/*",
        "https://www.zhaopin.com/*",
        "https://we.51job.com/*",
        "https://www.lagou.com/*",
        "https://hk.jobsdb.com/*",
        "https://www.liepin.com/*",
        "https://aiqicha.baidu.com/*",
    ],
    runAt: 'document_start',

    main(ctx) {
        const script = document.createElement('script');
        script.setAttribute('type', 'text/javascript');
        script.setAttribute('src', chrome.runtime.getURL('proxyAjax.js'));
        document.documentElement.appendChild(script);
    },
})
