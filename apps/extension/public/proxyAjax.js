function CustomEvent(event, params) {
  params = params || { bubbles: false, cancelable: false, detail: undefined };
  const evt = document.createEvent('CustomEvent');
  evt.initCustomEvent(event, params.bubbles, params.cancelable, params.detail);
  return evt;
}
CustomEvent.prototype = window.Event.prototype;
window.CustomEvent = CustomEvent;

function ajaxEventTrigger(event) {
  const ajaxEvent = new CustomEvent(event, { detail: this });
  window.dispatchEvent(ajaxEvent);
}

function proxyAjax(xhrPrototype) {
  const originalOpen = xhrPrototype.open;
  xhrPrototype.open = function (...openArguments) {
    this.__id = crypto.randomUUID();
    this.addEventListener('readystatechange', function () {
      ajaxEventTrigger.call(this, 'ajaxReadyStateChange');
    });
    return originalOpen.apply(this, openArguments);
  };
}

if (window._ahrealxhr) {
  // hack ajax-hook, for liepin
  proxyAjax(window._ahrealxhr.prototype);
} else {
  proxyAjax(XMLHttpRequest.prototype);
}

const dispatchDataMap = new Map();

// 监听页面的ajax
window.addEventListener('ajaxReadyStateChange', async function (e) {
  try {
    const xhr = e.detail;
    const responseURL = xhr?.responseURL ? xhr.responseURL : xhr?.orignUrl;
    const dispatchDataKey = xhr.__id ?? `${xhr.start_time}${responseURL}`;
    const data = {
      response: xhr?.response,
      responseType: xhr?.responseType,
      responseURL: responseURL,
      status: xhr?.status,
      statusText: xhr?.statusText,
      readyState: xhr?.readyState,
      withCredentials: xhr?.withCredentials,
    };
    if (xhr?.readyState == 4 && xhr?.status == 200) {
      // 防止重复触发事件
      //部分招聘网站（如BOSS直聘）会触发两次相同的detail的事件，导致目标网站执行多余的渲染动作（例如出现多个公司信息）
      //记录并判断请求响应的唯一标识，保证只触发一次
      if (dispatchDataMap.has(dispatchDataKey)) {
        return;
      } else {
        dispatchDataMap.set(dispatchDataKey, null);
        const event = new CustomEvent('ajaxGetData', { detail: data });
        window.dispatchEvent(event);
      }
    }
  } catch (error) {
    console.error('Error handling ajaxReadyStateChange event:', error);
  }
});

// New Zhilian pages may use fetch as well as XMLHttpRequest. Observe only
// position-list responses and clone them so the site's consumer is unaffected.
if (window.location.hostname === 'www.zhaopin.com') {
  const originalFetch = window.fetch;
  window.fetch = function (...args) {
    return originalFetch.apply(this, args).then((response) => {
      try {
        const url = new URL(response.url);
        if (
          response.ok &&
          /(^|\.)zhaopin\.(com|cn)$/.test(url.hostname) &&
          /^\/c\/i\/(search\/positions|position\/recommend-tag(?:-newest)?)\/?$/.test(
            url.pathname,
          )
        ) {
          response
            .clone()
            .text()
            .then((text) => {
              window.dispatchEvent(
                new CustomEvent('ajaxGetData', {
                  detail: {
                    response: text,
                    responseURL: response.url,
                    status: response.status,
                  },
                }),
              );
            })
            .catch((error) =>
              console.error('[job-hunting] 智联 fetch 响应读取失败', error),
            );
        }
      } catch (error) {
        console.error('[job-hunting] 智联 fetch 监听失败', error);
      }
      return response;
    });
  };
}

console.log('[Inject] proxy ajax');
