import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
dayjs.extend(utc);
dayjs.extend(timezone);

export function parse(str) {
    return dayjs.tz(str);
}

export function dateToStr(date, pattern) {
    return isValidDate(date) ? (pattern ? dayjs(date).format(pattern) : dayjs(date).format()) : null;
}

export function isValidDate(value) {
    if (value) {
        return dayjs(value).isValid();
    } else {
        return false;
    }
}

export function convertDateStringToDateObject(text) {
    return isValidDate(text) ? dayjs(text).toDate() : null;
}