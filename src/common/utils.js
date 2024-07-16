import dayjs from "dayjs";
import { v4 as uuidv4 } from "uuid";
import sha256 from "crypto-js/sha256";

export function createScript(src) {
  const script = document.createElement("script");
  script.setAttribute("src", src);
  return script;
}

export function createLink(href) {
  const link = document.createElement("link");
  link.setAttribute("rel", "stylesheet");
  link.setAttribute("type", "text/css");

  // 注意这里需要配置 manifest 的 web_accessible_resources 字段，否则无法加载
  link.setAttribute("href", href);
  link.setAttribute("crossorigin", "anonymous");
  return link;
}

// 转换时间
export function convertTimeToHumanReadable(dateTime) {
  let date = dayjs(dateTime);
  let curDate = dayjs();

  // 计算时间差共有多少个分钟
  let minC = curDate.diff(date, "minute", true);
  // 计算时间差共有多少个小时
  let hourC = curDate.diff(date, "hour", true);
  // 计算时间差共有多少个天
  let dayC = curDate.diff(date, "day", true);
  // 计算时间差共有多少个周
  let weekC = curDate.diff(date, "week", true);
  // 计算时间差共有多少个月
  let monthC = curDate.diff(date, "month", true);

  if (minC < 5) {
    return `刚刚`;
  } else if (minC < 60) {
    return `1小时内`;
  } else if (hourC < 24) {
    return `1天内`;
  } else if (dayC < 7) {
    return `${parseInt(dayC)}天内`;
  } else if (monthC < 1) {
    return `${parseInt(Math.ceil(weekC))}周内`;
  } else if (monthC <= 2) {
    return `2个月内`;
  } else if (monthC <= 3) {
    return `3个月内`;
  } else {
    return "超出3个月";
  }
}

export function convertTimeOffsetToHumanReadable(dateTime) {
  let date = dayjs(dateTime);
  let curDate = dayjs();

  // 计算时间差共有多少个分钟
  let minC = curDate.diff(date, "minute", true);
  // 计算时间差共有多少个小时
  let hourC = curDate.diff(date, "hour", true);
  // 计算时间差共有多少个天
  let dayC = curDate.diff(date, "day", true);
  // 计算时间差共有多少个月
  let monthC = curDate.diff(date, "month", true);
  // 计算时间差共有多少个年
  let yearC = curDate.diff(date, "year", true);

  if (minC < 1) {
    return `刚刚`;
  } else if (minC < 60) {
    return `${parseInt(minC)}分钟前`;
  } else if (hourC < 24) {
    return `${parseInt(hourC)}小时前`;
  } else if (monthC < 1) {
    return `${parseInt(dayC)}天前`;
  } else if (yearC < 1) {
    return `${parseInt(monthC)}月前`;
  } else {
    return `${parseInt(yearC)}年前`;
  }
}

export function getRandomInt(max) {
  return Math.floor(Math.random() * max);
}

export function debounce(fn, delay) {
  let timer = null;
  return function (...args) {
    if (timer) {
      clearTimeout(timer);
    }
    timer = setTimeout(() => {
      fn(...args);
    }, delay);
  };
}

// 下划线转换驼峰
export function toHump(name) {
  return name.replace(/\_(\w)/g, function (all, letter) {
    return letter.toUpperCase();
  });
}
// 驼峰转换下划线
export function toLine(name) {
  return name.replace(/([A-Z])/g, "_$1").toLowerCase();
}

/**
 * 对象转换，下划线参数的对象转换为驼峰参数的对象
 * @param {*} target 驼峰参数的对象
 * @param {*} source 下划线参数的对象
 */
export function parseToLineObjectToToHumpObject(target, source) {
  let resultItem = Object.assign({}, target);
  let keys = Object.keys(source);
  for (let n = 0; n < keys.length; n++) {
    let key = keys[n];
    resultItem[toHump(key)] = source[key];
  }
  return resultItem;
}

/**
 * 随机等待
 * @param {*} delayTime 等待时间，单位ms
 * @param {*} randomRange 随机时间范围，单位ms
 * @returns
 */
export function randomDelay(delayTime, randomRange) {
  return new Promise((r) =>
    setTimeout(r, delayTime + getRandomInt(randomRange))
  );
}

export function convertEmptyStringToNull(value) {
  if (isNumeric(value)) {
    return value;
  }
  if (value) {
    if (isEmpty(value) || isBlank(value)) {
      return null;
    } else {
      return value;
    }
  } else {
    return null;
  }
}

export function isNumeric(value) {
  return !isNaN(parseFloat(value)) && isFinite(value);
}

const isEmpty = (str) => !str?.length;

function isBlank(str) {
  return !str || /^\s*$/.test(str);
}

export function isNotEmpty(value) {
  return value != undefined && value != null && !(/^\s*$/.test(value));
}

export function autoFillHttp(url) {
  if (
    url.substr(0, 7).toLowerCase() == "http://" ||
    url.substr(0, 8).toLowerCase() == "https://"
  ) {
    return url;
  } else {
    return "http://" + url;
  }
}

export function getDomain(url) {
  if (url) {
    return url.replace("http://", "").replace("https://", "").replace("www.", "").replace("/", "");
  }
  return url;
}

export function convertDateStringToDateObject(text) {
  return dayjs(text).isValid() ? dayjs(text).toDate() : null;
}

export function convertPureJobDetailUrl(link) {
  let url = new URL(link);
  return url.origin + url.pathname;
}

export function genIdFromText(value) {
  return sha256(value) + "";
}

export function genUniqueId() {
  return uuidv4();
}

export function paramsToObject(entries) {
  const result = {};
  for (const [key, value] of entries) {
    // each 'entry' is a [key, value] tupple
    result[key] = value;
  }
  return result;
}