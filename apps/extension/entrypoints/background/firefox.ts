import { onMessageHandle } from '@/common/extension/background/util';
import { onMessageHandle as onSingleFileMessageHandle } from '@/lib/single-file/background.js';
import App, { WORLD_BACKGROUND } from '@/common/extension/app';

export function setupFirefoxEnvironment(
  actionFunction: Map<any, any>,
  startBackgroundTaskLoop: () => Promise<void>,
) {
  App.setWorld(WORLD_BACKGROUND);

  const worker = new Worker(
    chrome.runtime.getURL('/offscreen-worker.js'),
    { type: 'module' },
  );
  worker.onmessage = (event) => {
    const msg = event.data?.data;
    if (msg) {
      msg.from = 'OFFSCREEN';
      msg.to = 'BACKGROUND';
      onMessageHandle(msg, null, actionFunction);
    }
  };

  const orig = chrome.runtime.sendMessage.bind(chrome.runtime);
  chrome.runtime.sendMessage = ((message: any) => {
    if (message?.callbackId) {
      worker.postMessage({ ...message, from: 'OFFSCREEN', to: 'WEB_WORKER' });
    }
    return orig(message).catch(() => {});
  }) as typeof chrome.runtime.sendMessage;

  chrome.runtime.onMessage.addListener((message, sender) => {
    if (message.method?.startsWith('singlefile.')) {
      onSingleFileMessageHandle(message, sender);
      return;
    }
    const toWorker =
      (message.from === 'BACKGROUND' && message.to === 'OFFSCREEN') ||
      (message.from === 'CONTENT_SCRIPT' && message.to === 'BACKGROUND' &&
        !actionFunction.has(message.action));
    if (toWorker) {
      if (sender?.tab) message.tabId = sender.tab.id;
      worker.postMessage({ ...message, from: 'OFFSCREEN', to: 'WEB_WORKER' });
      return;
    }
    onMessageHandle(message, sender, actionFunction);
  });

  startBackgroundTaskLoop();
}
