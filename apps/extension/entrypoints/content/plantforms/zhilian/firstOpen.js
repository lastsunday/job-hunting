import { getZhiLianData } from './index';

// SSR and network responses share normalization and deduplication.
export default function firstOpen(data) {
  return getZhiLianData(data);
}
