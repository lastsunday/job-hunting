console.log("inject first open start");
; (function () {
  const host = window.location.host;
  let detail = {};
  if (host === "www.lagou.com") {
    detail.lagou = {
      initialState: window.__NEXT_DATA__
    };
  } else if (host === "aiqicha.baidu.com") {
    detail.aiqicha = {
      initialState: window.pageData
    };
  } else if (host === "www.zhaopin.com") {
    detail.zhipin = {
      initialState: window.__INITIAL_STATE__
    };
  }
  let event = new CustomEvent('firstOpen', { detail });
  window.dispatchEvent(event);
  console.log("inject first open end");
})();