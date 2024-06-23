(function(){const A=document.createElement("link").relList;if(A&&A.supports&&A.supports("modulepreload"))return;for(const f of document.querySelectorAll('link[rel="modulepreload"]'))v(f);new MutationObserver(f=>{for(const $ of f)if($.type==="childList")for(const M of $.addedNodes)M.tagName==="LINK"&&M.rel==="modulepreload"&&v(M)}).observe(document,{childList:!0,subtree:!0});function N(f){const $={};return f.integrity&&($.integrity=f.integrity),f.referrerPolicy&&($.referrerPolicy=f.referrerPolicy),f.crossOrigin==="use-credentials"?$.credentials="include":f.crossOrigin==="anonymous"?$.credentials="omit":$.credentials="same-origin",$}function v(f){if(f.ep)return;f.ep=!0;const $=N(f);fetch(f.href,$)}})();const rt="CONTENT_SCRIPT",nt="BACKGROUND",st="OFFSCREEN",it="WEB_WORKER";var q=typeof globalThis<"u"?globalThis:typeof window<"u"?window:typeof global<"u"?global:typeof self<"u"?self:{};function Q(y){return y&&y.__esModule&&Object.prototype.hasOwnProperty.call(y,"default")?y.default:y}var J={exports:{}};(function(y,A){(function(N,v){y.exports=v()})(q,function(){var N=1e3,v=6e4,f=36e5,$="millisecond",M="second",T="minute",C="hour",D="day",j="week",g="month",P="quarter",O="year",Y="date",U="Invalid Date",Z=/^(\d{4})[-/]?(\d{1,2})?[-/]?(\d{0,2})[Tt\s]*(\d{1,2})?:?(\d{1,2})?:?(\d{1,2})?[.:]?(\d+)?$/,z=/\[([^\]]+)]|Y{1,4}|M{1,4}|D{1,2}|d{1,4}|H{1,2}|h{1,2}|a|A|m{1,2}|s{1,2}|Z{1,2}|SSS/g,G={name:"en",weekdays:"Sunday_Monday_Tuesday_Wednesday_Thursday_Friday_Saturday".split("_"),months:"January_February_March_April_May_June_July_August_September_October_November_December".split("_"),ordinal:function(s){var r=["th","st","nd","rd"],t=s%100;return"["+s+(r[(t-20)%10]||r[t]||r[0])+"]"}},k=function(s,r,t){var n=String(s);return!n||n.length>=r?s:""+Array(r+1-n.length).join(t)+s},V={s:k,z:function(s){var r=-s.utcOffset(),t=Math.abs(r),n=Math.floor(t/60),e=t%60;return(r<=0?"+":"-")+k(n,2,"0")+":"+k(e,2,"0")},m:function s(r,t){if(r.date()<t.date())return-s(t,r);var n=12*(t.year()-r.year())+(t.month()-r.month()),e=r.clone().add(n,g),i=t-e<0,u=r.clone().add(n+(i?-1:1),g);return+(-(n+(t-e)/(i?e-u:u-e))||0)},a:function(s){return s<0?Math.ceil(s)||0:Math.floor(s)},p:function(s){return{M:g,y:O,w:j,d:D,D:Y,h:C,m:T,s:M,ms:$,Q:P}[s]||String(s||"").toLowerCase().replace(/s$/,"")},u:function(s){return s===void 0}},E="en",w={};w[E]=G;var B="$isDayjsObject",I=function(s){return s instanceof F||!(!s||!s[B])},x=function s(r,t,n){var e;if(!r)return E;if(typeof r=="string"){var i=r.toLowerCase();w[i]&&(e=i),t&&(w[i]=t,e=i);var u=r.split("-");if(!e&&u.length>1)return s(u[0])}else{var o=r.name;w[o]=r,e=o}return!n&&e&&(E=e),e||!n&&E},d=function(s,r){if(I(s))return s.clone();var t=typeof r=="object"?r:{};return t.date=s,t.args=arguments,new F(t)},a=V;a.l=x,a.i=I,a.w=function(s,r){return d(s,{locale:r.$L,utc:r.$u,x:r.$x,$offset:r.$offset})};var F=function(){function s(t){this.$L=x(t.locale,null,!0),this.parse(t),this.$x=this.$x||t.x||{},this[B]=!0}var r=s.prototype;return r.parse=function(t){this.$d=function(n){var e=n.date,i=n.utc;if(e===null)return new Date(NaN);if(a.u(e))return new Date;if(e instanceof Date)return new Date(e);if(typeof e=="string"&&!/Z$/i.test(e)){var u=e.match(Z);if(u){var o=u[2]-1||0,c=(u[7]||"0").substring(0,3);return i?new Date(Date.UTC(u[1],o,u[3]||1,u[4]||0,u[5]||0,u[6]||0,c)):new Date(u[1],o,u[3]||1,u[4]||0,u[5]||0,u[6]||0,c)}}return new Date(e)}(t),this.init()},r.init=function(){var t=this.$d;this.$y=t.getFullYear(),this.$M=t.getMonth(),this.$D=t.getDate(),this.$W=t.getDay(),this.$H=t.getHours(),this.$m=t.getMinutes(),this.$s=t.getSeconds(),this.$ms=t.getMilliseconds()},r.$utils=function(){return a},r.isValid=function(){return this.$d.toString()!==U},r.isSame=function(t,n){var e=d(t);return this.startOf(n)<=e&&e<=this.endOf(n)},r.isAfter=function(t,n){return d(t)<this.startOf(n)},r.isBefore=function(t,n){return this.endOf(n)<d(t)},r.$g=function(t,n,e){return a.u(t)?this[n]:this.set(e,t)},r.unix=function(){return Math.floor(this.valueOf()/1e3)},r.valueOf=function(){return this.$d.getTime()},r.startOf=function(t,n){var e=this,i=!!a.u(n)||n,u=a.p(t),o=function(_,m){var S=a.w(e.$u?Date.UTC(e.$y,m,_):new Date(e.$y,m,_),e);return i?S:S.endOf(D)},c=function(_,m){return a.w(e.toDate()[_].apply(e.toDate("s"),(i?[0,0,0,0]:[23,59,59,999]).slice(m)),e)},l=this.$W,h=this.$M,p=this.$D,L="set"+(this.$u?"UTC":"");switch(u){case O:return i?o(1,0):o(31,11);case g:return i?o(1,h):o(0,h+1);case j:var b=this.$locale().weekStart||0,H=(l<b?l+7:l)-b;return o(i?p-H:p+(6-H),h);case D:case Y:return c(L+"Hours",0);case C:return c(L+"Minutes",1);case T:return c(L+"Seconds",2);case M:return c(L+"Milliseconds",3);default:return this.clone()}},r.endOf=function(t){return this.startOf(t,!1)},r.$set=function(t,n){var e,i=a.p(t),u="set"+(this.$u?"UTC":""),o=(e={},e[D]=u+"Date",e[Y]=u+"Date",e[g]=u+"Month",e[O]=u+"FullYear",e[C]=u+"Hours",e[T]=u+"Minutes",e[M]=u+"Seconds",e[$]=u+"Milliseconds",e)[i],c=i===D?this.$D+(n-this.$W):n;if(i===g||i===O){var l=this.clone().set(Y,1);l.$d[o](c),l.init(),this.$d=l.set(Y,Math.min(this.$D,l.daysInMonth())).$d}else o&&this.$d[o](c);return this.init(),this},r.set=function(t,n){return this.clone().$set(t,n)},r.get=function(t){return this[a.p(t)]()},r.add=function(t,n){var e,i=this;t=Number(t);var u=a.p(n),o=function(h){var p=d(i);return a.w(p.date(p.date()+Math.round(h*t)),i)};if(u===g)return this.set(g,this.$M+t);if(u===O)return this.set(O,this.$y+t);if(u===D)return o(1);if(u===j)return o(7);var c=(e={},e[T]=v,e[C]=f,e[M]=N,e)[u]||1,l=this.$d.getTime()+t*c;return a.w(l,this)},r.subtract=function(t,n){return this.add(-1*t,n)},r.format=function(t){var n=this,e=this.$locale();if(!this.isValid())return e.invalidDate||U;var i=t||"YYYY-MM-DDTHH:mm:ssZ",u=a.z(this),o=this.$H,c=this.$m,l=this.$M,h=e.weekdays,p=e.months,L=e.meridiem,b=function(m,S,W,R){return m&&(m[S]||m(n,i))||W[S].slice(0,R)},H=function(m){return a.s(o%12||12,m,"0")},_=L||function(m,S,W){var R=m<12?"AM":"PM";return W?R.toLowerCase():R};return i.replace(z,function(m,S){return S||function(W){switch(W){case"YY":return String(n.$y).slice(-2);case"YYYY":return a.s(n.$y,4,"0");case"M":return l+1;case"MM":return a.s(l+1,2,"0");case"MMM":return b(e.monthsShort,l,p,3);case"MMMM":return b(p,l);case"D":return n.$D;case"DD":return a.s(n.$D,2,"0");case"d":return String(n.$W);case"dd":return b(e.weekdaysMin,n.$W,h,2);case"ddd":return b(e.weekdaysShort,n.$W,h,3);case"dddd":return h[n.$W];case"H":return String(o);case"HH":return a.s(o,2,"0");case"h":return H(1);case"hh":return H(2);case"a":return _(o,c,!0);case"A":return _(o,c,!1);case"m":return String(c);case"mm":return a.s(c,2,"0");case"s":return String(n.$s);case"ss":return a.s(n.$s,2,"0");case"SSS":return a.s(n.$ms,3,"0");case"Z":return u}return null}(m)||u.replace(":","")})},r.utcOffset=function(){return 15*-Math.round(this.$d.getTimezoneOffset()/15)},r.diff=function(t,n,e){var i,u=this,o=a.p(n),c=d(t),l=(c.utcOffset()-this.utcOffset())*v,h=this-c,p=function(){return a.m(u,c)};switch(o){case O:i=p()/12;break;case g:i=p();break;case P:i=p()/3;break;case j:i=(h-l)/6048e5;break;case D:i=(h-l)/864e5;break;case C:i=h/f;break;case T:i=h/v;break;case M:i=h/N;break;default:i=h}return e?i:a.a(i)},r.daysInMonth=function(){return this.endOf(g).$D},r.$locale=function(){return w[this.$L]},r.locale=function(t,n){if(!t)return this.$L;var e=this.clone(),i=x(t,n,!0);return i&&(e.$L=i),e},r.clone=function(){return a.w(this.$d,this)},r.toDate=function(){return new Date(this.valueOf())},r.toJSON=function(){return this.isValid()?this.toISOString():null},r.toISOString=function(){return this.$d.toISOString()},r.toString=function(){return this.$d.toUTCString()},s}(),K=F.prototype;return d.prototype=K,[["$ms",$],["$s",M],["$m",T],["$H",C],["$W",D],["$M",g],["$y",O],["$D",Y]].forEach(function(s){K[s[1]]=function(r){return this.$g(r,s[0],s[1])}}),d.extend=function(s,r){return s.$i||(s(r,F,d),s.$i=!0),d},d.locale=x,d.isDayjs=I,d.unix=function(s){return d(1e3*s)},d.en=w[E],d.Ls=w,d.p={},d})})(J);var X=J.exports;const tt=Q(X),et="YYYY-MM-DD HH:mm:ss.SSS";function ut(y){}function at(y){console.error(`${tt(new Date).format(et)} ${y}`),console.error(y)}export{nt as B,rt as C,st as O,it as W,tt as a,q as c,ut as d,at as e,Q as g};