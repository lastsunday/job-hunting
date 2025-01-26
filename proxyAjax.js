; (function () {
  if (typeof window.CustomEvent === "function") return false;

  function CustomEvent(event, params) {
    params = params || { bubbles: false, cancelable: false, detail: undefined };
    let evt = document.createEvent('CustomEvent');
    evt.initCustomEvent(event, params.bubbles, params.cancelable, params.detail);
    return evt;
  }
  CustomEvent.prototype = window.Event.prototype;
  window.CustomEvent = CustomEvent;
})();

; (function () {
  function ajaxEventTrigger(event) {
    let ajaxEvent = new CustomEvent(event, { detail: this });
    window.dispatchEvent(ajaxEvent);
  }

  let oldXHR = window.XMLHttpRequest;
  if (!oldXHR) return console.error('不支持 XMLHttpRequest！ 请更换最新的 chrome 浏览器')

  function newXHR() {
    let realXHR = new oldXHR();

    realXHR.addEventListener('abort', function () { ajaxEventTrigger.call(this, 'ajaxAbort'); }, false);
    realXHR.addEventListener('error', function () { ajaxEventTrigger.call(this, 'ajaxError'); }, false);
    realXHR.addEventListener('load', function () { ajaxEventTrigger.call(this, 'ajaxLoad'); }, false);
    realXHR.addEventListener('loadstart', function () { ajaxEventTrigger.call(this, 'ajaxLoadStart'); }, false);
    realXHR.addEventListener('progress', function () { ajaxEventTrigger.call(this, 'ajaxProgress'); }, false);
    realXHR.addEventListener('timeout', function () { ajaxEventTrigger.call(this, 'ajaxTimeout'); }, false);
    realXHR.addEventListener('loadend', function () { ajaxEventTrigger.call(this, 'ajaxLoadEnd'); }, false);
    realXHR.addEventListener('readystatechange', function () { ajaxEventTrigger.call(this, 'ajaxReadyStateChange'); }, false);

    let send = realXHR.send;
    realXHR.send = function (...arg) {
      send.apply(realXHR, arg);
      realXHR.body = arg[0];
      ajaxEventTrigger.call(realXHR, 'ajaxSend');
    }

    let open = realXHR.open;
    realXHR.open = function (...arg) {
      open.apply(realXHR, arg)
      realXHR.method = arg[0];
      realXHR.orignUrl = arg[1];
      realXHR.async = arg[2];
      ajaxEventTrigger.call(realXHR, 'ajaxOpen');
    }

    let setRequestHeader = realXHR.setRequestHeader;
    realXHR.requestHeader = {};
    realXHR.setRequestHeader = function (name, value) {
      realXHR.requestHeader[name] = value;
      setRequestHeader.call(realXHR, name, value)
    }
    //某些招聘网站（如BOSS直聘）会将传递到ajaxReadyStateChange事件中的xmlHttpRequest对象存放到realXHR.xhr下，而普通网站则为realXHR本身
    realXHR.xhr ? realXHR.xhr.__id = crypto.randomUUID() : realXHR.__id = crypto.randomUUID();
    return realXHR;
  }
  newXHR.prototype = oldXHR.prototype;
  window.XMLHttpRequest = newXHR;
})();

const dispatchDataMap = new Map();

// 监听页面的ajax
window.addEventListener("ajaxReadyStateChange", async function (e) {
  let xhr = e.detail;
  const responseURL = xhr?.responseURL ? xhr.responseURL : xhr?.orignUrl;
  //某些招聘（BOSS直聘）网站第一次请求的xhr.__id不能获取，所以先取其插入的start_time作为key的一部分
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
    //部分招聘网站（如BOSS直聘）会触发两次相同的detail的事件，导致目标网站执行多余的渲染动作（例如出现多个公司信息）
    //记录并判断请求响应的唯一标识，保证只触发一次
    if (dispatchDataMap.has(dispatchDataKey)) {
      return;
    } else {
      dispatchDataMap.set(dispatchDataKey, null);
      // 直接给 xhr，app.js 收不到。
      let event = new CustomEvent('ajaxGetData', { detail: data });
      window.dispatchEvent(event);
    }
  }
});

; (function () {
  // 由于注入脚本的时候 DOMContentLoaded 已经触发，监听不到
  // proxy 脚本已加载，发送事件
  let event = new CustomEvent('proxyScriptLoaded', {
    detail: {
      zhipin: {
        initialState: window.__INITIAL_STATE__
      },
      lagou: {
        initialState: window.__NEXT_DATA__
      },
      aiqicha: {
        initialState: window.pageData
      }
    }
  });
  window.dispatchEvent(event);
})();
