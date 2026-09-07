import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { expect, it, vi } from 'vitest';

it('observes only Zhilian list fetches without consuming or replacing the response', async () => {
  const source = readFileSync('public/proxyAjax.js', 'utf8');
  const listeners = new Map();
  const events = [];
  const text = vi.fn(async () => '{"data":{"list":[]}}');
  const clone = vi.fn(() => ({ text }));
  const response = { ok: true, status: 200, url: 'https://api.zhaopin.com/c/i/search/positions', clone };
  const fetch = vi.fn(async () => response);
  const window = {
    location: { hostname: 'www.zhaopin.com' }, fetch, Event: function () {},
    addEventListener: (name, callback) => listeners.set(name, callback),
    dispatchEvent: event => events.push(event),
  };
  const document = { createEvent: () => ({ initCustomEvent(name, bubbles, cancelable, detail) { this.type = name; this.detail = detail; } }) };
  runInNewContext(source, { window, document, XMLHttpRequest: function () {}, URL, crypto: {}, console });
  expect(await window.fetch('/test')).toBe(response);
  await Promise.resolve();
  expect(clone).toHaveBeenCalledTimes(1);
  expect(events[0]).toMatchObject({ type: 'ajaxGetData', detail: { responseURL: response.url } });
  response.url = 'https://example.com/c/i/search/positions';
  await window.fetch('/other');
  expect(clone).toHaveBeenCalledTimes(1);
  const error = new Error('network failed');
  fetch.mockRejectedValueOnce(error);
  await expect(window.fetch('/failed')).rejects.toBe(error);
});
