import{W as c,O as n,d as e,B as t}from"../../log.js";const i=new Worker(new URL("/assets/worker-CnBtlFyO.js",import.meta.url),{type:"module"});i.onmessage=function(o){let r=o.data.data;r&&r.from==c&&r.to==n&&(e("8.[offscreen][receive]["+r.from+" -> "+r.to+"] message [action="+r.action+",invokeEnv="+r.invokeEnv+",callbackId="+r.callbackId+",error="+r.error+"]"),r.from=n,r.to=t,e("9.[offscreen][send]["+r.from+" -> "+r.to+"] message [action="+r.action+",invokeEnv="+r.invokeEnv+",callbackId="+r.callbackId+",error="+r.error+"]"),chrome.runtime.sendMessage(r))};chrome.runtime.onMessage.addListener((o,r,a)=>{o&&o.from==t&&o.to==n&&(e("4.[offscreen][receive]["+o.from+" -> "+o.to+"] message [action="+o.action+",invokeEnv="+o.invokeEnv+",callbackId="+o.callbackId+",error="+o.error+"]"),o.from=n,o.to=c,e("5.[offscreen][send]["+o.from+" -> "+o.to+"] message [action="+o.action+",invokeEnv="+o.invokeEnv+",callbackId="+o.callbackId+",error="+o.error+"]"),i.postMessage(o))});
