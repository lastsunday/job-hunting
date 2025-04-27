import dayjs from 'dayjs';
import { expect, test, vi } from "vitest";
import {
  autoFillHttp,
  cleanHTMLTag,
  convertDateStringToDateObject,
  convertEmptyStringToNull,
  convertPureJobDetailUrl,
  convertTimeOffsetToHumanReadable,
  convertTimeToHumanReadable,
  convertToAbbreviation,
  createLink,
  createScript,
  dateToStr,
  debounce,
  genIdFromText,
  genRangeDate,
  genSha256,
  genUniqueId,
  getDomain,
  getRandomInt,
  isBlank,
  isNotEmpty,
  isNumeric,
  isToday,
  isValidDate,
  paramsToObject,
  parseToLineObjectToToHumpObject,
  randomDelay,
  toHump,
  toLine,
  convertNumberToHumanReadable
} from '../../common/utils';
import sha256 from "crypto-js/sha256";

test('createScript should create a script element with the given src', () => {
  const src = 'https://example.com/script.js';
  const script = createScript(src);
  expect(script.tagName).toBe('SCRIPT');
  expect(script.getAttribute('src')).toBe(src);
});

test('createLink should create a link element with the given href', () => {
  const href = 'https://example.com/style.css';
  const link = createLink(href);
  expect(link.tagName).toBe('LINK');
  expect(link.getAttribute('href')).toBe(href);
  expect(link.getAttribute('rel')).toBe('stylesheet');
  expect(link.getAttribute('type')).toBe('text/css');
  expect(link.getAttribute('crossorigin')).toBe('anonymous');
});

test('convertTimeToHumanReadable should return correct human readable time', () => {
  const now = dayjs();
  expect(convertTimeToHumanReadable(now.subtract(3, 'minute'), now)).toBe('刚刚');
  expect(convertTimeToHumanReadable(now.subtract(30, 'minute'), now)).toBe('1小时内');
  expect(convertTimeToHumanReadable(now.subtract(5, 'hour'), now)).toBe('1天内');
  expect(convertTimeToHumanReadable(now.subtract(3, 'day'), now)).toBe('3天内');
  expect(convertTimeToHumanReadable(now.subtract(2, 'week'), now)).toBe('2周内');
  expect(convertTimeToHumanReadable(now.subtract(1, 'month'), now)).toBe('2个月内');
  expect(convertTimeToHumanReadable(now.subtract(3, 'month'), now)).toBe('3个月内');
  expect(convertTimeToHumanReadable(now.subtract(4, 'month'), now)).toBe('超出3个月');
});

test('convertTimeOffsetToHumanReadable should return correct human readable time', () => {
  const now = dayjs();
  expect(convertTimeOffsetToHumanReadable(now.subtract(30, 'second'), now)).toBe('刚刚');
  expect(convertTimeOffsetToHumanReadable(now.subtract(30, 'minute'), now)).toBe('30分钟前');
  expect(convertTimeOffsetToHumanReadable(now.subtract(5, 'hour'), now)).toBe('5小时前');
  expect(convertTimeOffsetToHumanReadable(now.subtract(3, 'day'), now)).toBe('3天前');
  expect(convertTimeOffsetToHumanReadable(now.subtract(2, 'month'), now)).toBe('2月前');
  expect(convertTimeOffsetToHumanReadable(now.subtract(1, 'year'), now)).toBe('1年前');
});

test('getRandomInt should return a random integer less than max', () => {
  const max = 10;
  const randomInt = getRandomInt(max);
  expect(randomInt).toBeGreaterThanOrEqual(0);
  expect(randomInt).toBeLessThan(max);
});

test('debounce should delay the execution of the function', async () => {
  const mockFn = vi.fn();
  const debouncedFn = debounce(mockFn, 100);
  debouncedFn();
  debouncedFn();
  expect(mockFn).not.toBeCalled();
  await new Promise(resolve => {
    setTimeout(() => {
      expect(mockFn).toBeCalled();
      resolve();
    }, 150)
  });
});

test('toHump should convert snake_case to camelCase', () => {
  expect(toHump('snake_case')).toBe('snakeCase');
});

test('toLine should convert camelCase to snake_case', () => {
  expect(toLine('camelCase')).toBe('camel_case');
});

test('parseToLineObjectToToHumpObject should convert object keys from snake_case to camelCase', () => {
  const source = { snake_case_key: 'value' };
  const target = {};
  const result = parseToLineObjectToToHumpObject(target, source);
  expect(result.snakeCaseKey).toBe('value');
});

test('randomDelay should delay for at least the specified time', async () => {
  const start = Date.now();
  await randomDelay(100, 50);
  const end = Date.now();
  expect(end - start).toBeGreaterThanOrEqual(100);
});

test('convertEmptyStringToNull should convert empty string to null', () => {
  expect(convertEmptyStringToNull('')).toBeNull();
  expect(convertEmptyStringToNull('not empty')).toBe('not empty');
});

test('isNumeric should return true for numeric values', () => {
  expect(isNumeric('123')).toBe(true);
  expect(isNumeric('abc')).toBe(false);
});

test('isBlank should return true for blank strings', () => {
  expect(isBlank('')).toBe(true);
  expect(isBlank('   ')).toBe(true);
  expect(isBlank('not blank')).toBe(false);
});

test('isNotEmpty should return true for non-empty values', () => {
  expect(isNotEmpty('not empty')).toBe(true);
  expect(isNotEmpty('')).toBe(false);
});

test('autoFillHttp should add http:// to URLs without protocol', () => {
  expect(autoFillHttp('example.com')).toBe('http://example.com');
  expect(autoFillHttp('http://example.com')).toBe('http://example.com');
});

test('getDomain should return the domain of a URL', () => {
  expect(getDomain('http://example.com/path')).toBe('example.com');
});

test('isValidDate should return true for valid dates', () => {
  expect(isValidDate('2021-01-01')).toBe(true);
  expect(isValidDate('invalid date')).toBe(false);
});

test('convertDateStringToDateObject should convert valid date string to Date object', () => {
  expect(convertDateStringToDateObject('2021-01-01')).toEqual(dayjs('2021-01-01').toDate());
  expect(convertDateStringToDateObject('invalid date')).toBeNull();
});

test('dateToStr should format date to string', () => {
  const date = new Date('2021-01-01');
  expect(dateToStr(date, 'YYYY-MM-DD')).toBe('2021-01-01');
});

test('genRangeDate should generate date range', () => {
  const start = '2021-01-01';
  const end = '2021-01-03';
  expect(genRangeDate(start, end)).toEqual(['2021-01-03', '2021-01-02', '2021-01-01']);
});

test('convertPureJobDetailUrl should return the origin and pathname of a URL', () => {
  expect(convertPureJobDetailUrl('http://example.com/path?query=1')).toBe('http://example.com/path');
});

test('genIdFromText should generate a SHA-256 hash from text', () => {
  expect(genIdFromText('text')).toBe(sha256('text') + '');
});

test('genSha256 should generate a SHA-256 hash from text', () => {
  expect(genSha256('text')).toBe(sha256('text') + '');
});

test('genUniqueId should generate a unique UUID', () => {
  const uuid = genUniqueId();
  expect(uuid).toMatch(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
  );
});

test('paramsToObject should convert URLSearchParams to object', () => {
  const params = new URLSearchParams('key=value');
  expect(paramsToObject(params)).toEqual({ key: 'value' });
});

test('convertToAbbreviation should convert number to abbreviated string', () => {
  expect(convertToAbbreviation(1000)).toBe('1K');
});

test('isToday should return true if the date is today', () => {
  expect(isToday(new Date())).toBe(true);
  expect(isToday(dayjs().subtract(1, 'day'))).toBe(false);
});

test('cleanHTMLTag should remove HTML tags from string', () => {
  expect(cleanHTMLTag('<p>text</p>')).toBe('text');
});

test('convertNumberToHumanReadable should convert valid string', () => {
  expect(convertNumberToHumanReadable(null)).toBe(`-`);
  expect(convertNumberToHumanReadable(0.0001)).toBe(`0`);
  expect(convertNumberToHumanReadable(0.001)).toBe(`0.001`);
  expect(convertNumberToHumanReadable(1)).toBe(`1`);
  expect(convertNumberToHumanReadable(10)).toBe(`10`);
  expect(convertNumberToHumanReadable(100)).toBe(`100`);
  expect(convertNumberToHumanReadable(1000)).toBe(`1000`);
  expect(convertNumberToHumanReadable(14999.99999)).toBe(`1.5万`);
  expect(convertNumberToHumanReadable(10000)).toBe(`1万`);
  expect(convertNumberToHumanReadable(100000)).toBe(`10万`);
  expect(convertNumberToHumanReadable(1000000)).toBe(`100万`);
  expect(convertNumberToHumanReadable(10000000)).toBe(`1000万`);
  expect(convertNumberToHumanReadable(100000000)).toBe(`1亿`);
  expect(convertNumberToHumanReadable(1000000000)).toBe(`10亿`);
  expect(convertNumberToHumanReadable(10000000000)).toBe(`100亿`);
  expect(convertNumberToHumanReadable(10045640000)).toBe(`100.456亿`);
  expect(convertNumberToHumanReadable(10045650000)).toBe(`100.457亿`);
});
