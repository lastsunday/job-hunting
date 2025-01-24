import { OFFSCREEN, WEB_WORKER } from "@/common/api/bridgeCommon";
import useMessage from "@/common/extension/hooks/message";

export function postSuccessMessage(message, data) {
  const { postSuccessMessage: _postSuccessMessage } = useMessage();
  _postSuccessMessage(message, data, {
    from: WEB_WORKER, to: OFFSCREEN, sendMessageFunction: (obj) => {
      postMessage(obj);
    }
  })
}
export function postErrorMessage(message, error) {
  const { postErrorMessage: _postErrorMessage } = useMessage();
  _postErrorMessage(message, error, {
    from: WEB_WORKER, to: OFFSCREEN, sendMessageFunction: (obj) => {
      postMessage(obj);
    }
  });
}
