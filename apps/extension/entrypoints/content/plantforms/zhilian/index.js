import { PLATFORM_ZHILIAN } from '../../../../common';
import { JobApi } from '../../../../common/api';
import {
  getJobIds,
  saveBrowseJob,
  getAnalysisConfig,
} from '../../commonDataHandler';
import {
  finalRender,
  renderFunctionPanel,
  renderSortJobItem,
  renderTimeTag,
  setupSortJobItem,
} from '../../commonRender';
import { LIST_SELECTOR, extractList, normalizeJob, matchCards } from './data';

let pending = Promise.resolve();

export function getZhiLianData(response) {
  try {
    const rawList = extractList(response);
    const list = rawList.map(normalizeJob).filter(Boolean);
    console.info('[job-hunting] zhilian data', {
      received: rawList.length,
      valid: list.length,
    });
    if (!list.length) return Promise.resolve();
    pending = pending
      .then(async () => {
        const pairs = await waitForCards(list);
        if (!pairs.length)
          console.warn('[job-hunting] 智联：未找到可唯一匹配的职位卡片');
        if (pairs.length)
          await parseZhilianData(
            pairs.map((pair) => pair.item),
            (index) => pairs[index]?.dom,
          );
      })
      .catch((error) => console.error('[job-hunting] 智联适配失败', error));
    return pending;
  } catch (error) {
    console.error('[job-hunting] 智联响应解析失败', error);
    return Promise.resolve();
  }
}

export function getListByNode(node) {
  const children = Array.from(node?.children || []);
  return (index) => children[index];
}

// Check existing cards as well as containers mounted after the response.
function waitForCards(list) {
  return new Promise((resolve) => {
    let timer;
    const finish = (pairs) => {
      clearTimeout(timer);
      observer.disconnect();
      resolve(pairs);
    };
    const check = () => {
      const node = document.querySelector(LIST_SELECTOR);
      const pairs = node ? matchCards(node, list) : [];
      if (pairs.length) finish(pairs);
    };
    const observer = new MutationObserver(check);
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
    timer = setTimeout(() => finish([]), 5000);
    check();
  });
}

export async function parseZhilianData(list, getListItem) {
  const pairs = list
    .map((item, index) => ({ item, dom: getListItem(index) }))
    .filter(
      ({ item, dom }) =>
        dom?.isConnected && dom.dataset.jobHuntingZhilianId !== item.jobId,
    );
  if (!pairs.length) return;
  // firstOpen and proxyAjax are separate bundles; reserve through the DOM.
  pairs.forEach(({ item, dom }) => {
    dom.dataset.jobHuntingZhilianId = item.jobId;
  });
  try {
    const jobs = pairs.map((pair) => pair.item);
    await saveBrowseJob(jobs, PLATFORM_ZHILIAN);
    const dtos = await JobApi.getJobBrowseInfoByIds(
      getJobIds(jobs, PLATFORM_ZHILIAN),
    );
    const dtoById = new Map(dtos.map((dto) => [dto.jobId, dto]));
    const analysisConfig = await getAnalysisConfig();
    const current = pairs.filter(({ item, dom }) => {
      const stillMatches =
        dom.isConnected &&
        (!dom.parentElement.matches('.job-list-panel') ||
          matchCards(dom.parentElement, jobs).some(
            (pair) => pair.dom === dom && pair.item.jobId === item.jobId,
          ));
      const valid =
        stillMatches &&
        dom.dataset.jobHuntingZhilianId === item.jobId &&
        dtoById.has(`ZHILIAN_${item.jobId}`);
      if (!valid && dom.dataset.jobHuntingZhilianId === item.jobId)
        delete dom.dataset.jobHuntingZhilianId;
      return valid;
    });
    if (!current.length) return;
    const getDom = (index) => current[index].dom;
    const currentDtos = current.map(({ item }) =>
      dtoById.get(`ZHILIAN_${item.jobId}`),
    );
    current.forEach(({ dom }, index) => {
      dom
        .querySelectorAll('.__zhilian_time_tag')
        .forEach((tag) => tag.remove());
      dom.appendChild(createDOM(currentDtos[index], { analysisConfig }));
    });
    setupSortJobItem(current[0].dom.parentElement);
    renderSortJobItem(currentDtos, getDom, { platform: PLATFORM_ZHILIAN });
    await renderFunctionPanel(currentDtos, getDom, {
      platform: PLATFORM_ZHILIAN,
    });
    finalRender(currentDtos, { platform: PLATFORM_ZHILIAN });
  } catch (error) {
    pairs.forEach(({ item, dom }) => {
      if (dom.dataset.jobHuntingZhilianId === item.jobId)
        delete dom.dataset.jobHuntingZhilianId;
    });
    throw error;
  }
}

export function createDOM(jobDTO, { analysisConfig } = {}) {
  const div = document.createElement('div');
  div.classList.add('__zhilian_time_tag');
  renderTimeTag(div, jobDTO, { analysisConfig });
  return div;
}
