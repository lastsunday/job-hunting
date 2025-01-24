import { OFFSCREEN, WEB_WORKER } from "@/common/api/bridgeCommon";
import useMessage from "@/common/extension/hooks/message";

export function postSuccessMessage(message, data) {
  const { postSuccessMessage: _postSuccessMessage } = useMessage();
  const worker = message.worker;
  delete message.worker;
  _postSuccessMessage(message, data, {
    from: OFFSCREEN, to: WEB_WORKER, sendMessageFunction: (obj) => {
      worker.postMessage(obj);
    }
  })
}
export function postErrorMessage(message, error) {
  const { postErrorMessage: _postErrorMessage } = useMessage();
  const worker = message.worker;
  delete message.worker;
  _postErrorMessage(message, error, {
    from: OFFSCREEN, to: WEB_WORKER, sendMessageFunction: (obj) => {
      worker.postMessage(obj);
    }
  });
}
