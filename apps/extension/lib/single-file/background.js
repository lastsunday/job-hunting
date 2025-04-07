//copy from https://github.com/gildas-lormeau/SingleFile-MV3/blob/main/src/lib/single-file/background.js

export const onMessageHandle = (message, sender) => {
    // import "./fetch/bg/fetch.js";
    if (message.method && message.method.startsWith("singlefile.fetch")) {
        return new Promise(resolve => {
            onRequest(message, sender)
                .then(resolve)
                .catch(error => resolve({ error: error && (error.message || error.toString()) }));
        });
    }
    // import "./frame-tree/bg/frame-tree.js";
    if (message.method == "singlefile.frameTree.initResponse" || message.method == "singlefile.frameTree.ackInitRequest") {
		browser.tabs.sendMessage(sender.tab.id, message, { frameId: 0 });
		return Promise.resolve({});
	}
    // import "./lazy/bg/lazy-timeout.js";
    if (message.method == "singlefile.lazyTimeout.setTimeout") {
		let tabTimeouts = timeouts.get(sender.tab.id);
		let frameTimeouts;
		if (tabTimeouts) {
			frameTimeouts = tabTimeouts.get(sender.frameId);
			if (frameTimeouts) {
				const previousTimeoutId = frameTimeouts.get(message.type);
				if (previousTimeoutId) {
					clearTimeout(previousTimeoutId);
				}
			} else {
				frameTimeouts = new Map();
			}
		}
		const timeoutId = setTimeout(async () => {
			try {
				const tabTimeouts = timeouts.get(sender.tab.id);
				const frameTimeouts = tabTimeouts.get(sender.frameId);
				if (tabTimeouts && frameTimeouts) {
					deleteTimeout(frameTimeouts, message.type);
				}
				await browser.tabs.sendMessage(sender.tab.id, { method: "singlefile.lazyTimeout.onTimeout", type: message.type });
				 
			} catch (error) {
				// ignored
			}
		}, message.delay);
		if (!tabTimeouts) {
			tabTimeouts = new Map();
			frameTimeouts = new Map();
			tabTimeouts.set(sender.frameId, frameTimeouts);
			timeouts.set(sender.tab.id, tabTimeouts);
		}
		frameTimeouts.set(message.type, timeoutId);
		return Promise.resolve({});
	}
	if (message.method == "singlefile.lazyTimeout.clearTimeout") {
		const tabTimeouts = timeouts.get(sender.tab.id);
		if (tabTimeouts) {
			const frameTimeouts = tabTimeouts.get(sender.frameId);
			if (frameTimeouts) {
				const timeoutId = frameTimeouts.get(message.type);
				if (timeoutId) {
					clearTimeout(timeoutId);
				}
				deleteTimeout(frameTimeouts, message.type);
			}
		}
		return Promise.resolve({});
	}
}

const timeouts = new Map();

browser.tabs.onRemoved.addListener(tabId => timeouts.delete(tabId));

function deleteTimeout(framesTimeouts, type) {
	framesTimeouts.delete(type);
}

const MAX_CONTENT_SIZE = 8 * (1024 * 1024);
const REQUEST_WAIT_DELAY = 1000;

let requestId = 1;

async function onRequest(message, sender) {
    if (message.method == "singlefile.fetch") {
        try {
            const response = await fetchResource(message.url, { referrer: message.referrer, headers: message.headers });
            return sendResponse(sender.tab.id, message.requestId, response);
        } catch (error) {
            return sendResponse(sender.tab.id, message.requestId, { error: error.message, array: [] });
        }
    } else if (message.method == "singlefile.fetchFrame") {
        return browser.tabs.sendMessage(sender.tab.id, message);
    }
}

async function sendResponse(tabId, requestId, response) {
    for (let blockIndex = 0; blockIndex * MAX_CONTENT_SIZE <= response.array.length; blockIndex++) {
        const message = {
            method: "singlefile.fetchResponse",
            requestId,
            headers: response.headers,
            status: response.status,
            error: response.error
        };
        message.truncated = response.array.length > MAX_CONTENT_SIZE;
        if (message.truncated) {
            message.finished = (blockIndex + 1) * MAX_CONTENT_SIZE > response.array.length;
            message.array = response.array.slice(blockIndex * MAX_CONTENT_SIZE, (blockIndex + 1) * MAX_CONTENT_SIZE);
        } else {
            message.array = response.array;
        }
        await browser.tabs.sendMessage(tabId, message);
    }
    return {};
}

async function fetchResource(url, options = {}) {
    options.cache = "no-store";
    const response = await fetch(url, options);
    if (options.referrer && response.status == 401 || response.status == 403 || response.status == 404) {
        const requestId = await enableReferrerOnError(url, options.referrer);
        await new Promise(resolve => setTimeout(resolve, REQUEST_WAIT_DELAY));
        try {
            const response = await fetch(url, options);
            const array = Array.from(new Uint8Array(await response.arrayBuffer()));
            const headers = { "content-type": response.headers.get("content-type") };
            const status = response.status;
            return {
                array,
                headers,
                status
            };
        } finally {
            await disableReferrerOnError(requestId);
        }
    }

    const array = Array.from(new Uint8Array(await response.arrayBuffer()));
    const headers = { "content-type": response.headers.get("content-type") };
    const status = response.status;
    return {
        array,
        headers,
        status
    };
}

async function enableReferrerOnError(url, referrer) {
    const id = requestId++;
    await browser.declarativeNetRequest.updateSessionRules({
        addRules: [{
            action: {
                type: "modifyHeaders",
                requestHeaders: [
                    {
                        header: "Referer",
                        operation: "set",
                        value: referrer
                    }
                ]
            },
            condition: {
                initiatorDomains: [browser.runtime.id],
                urlFilter: url,
                resourceTypes: ["xmlhttprequest"]
            },
            id
        }]
    });
    return id;
}

async function disableReferrerOnError(requestId) {
    await browser.declarativeNetRequest.updateSessionRules({
        removeRuleIds: [requestId]
    });
}