export const LIST_SELECTOR = '.job-list-panel, .positionlist__list';

export function isZhilianListPage(location) {
  return location.hostname === 'www.zhaopin.com' &&
    /^\/(jobs|sou)(\/|$)/.test(location.pathname);
}

export function isZhilianListResponse(url) {
  try {
    const parsed = new URL(url);
    return /(^|\.)zhaopin\.(com|cn)$/.test(parsed.hostname) &&
      /^\/c\/i\/(search\/positions|position\/recommend-tag(?:-newest)?)\/?$/.test(parsed.pathname);
  } catch {
    return false;
  }
}

export function extractList(response) {
  const data = typeof response === 'string' ? JSON.parse(response) : response;
  const list = data?.data?.list ?? data?.data?.data?.list ?? data?.positionList;
  return Array.isArray(list) ? list : [];
}

export function normalizeJob(item) {
  // Keep the existing key when present, so stored history remains addressable.
  const rawId = item.jobId ?? item.number;
  if ((typeof rawId !== 'string' && typeof rawId !== 'number') ||
      (typeof rawId === 'number' && (!Number.isSafeInteger(rawId) || rawId <= 0))) return null;
  const jobId = String(rawId).trim();
  if (!jobId) return null;
  return {
    ...item,
    jobId,
    positionUrl: (item.positionUrl || item.positionURL ||
      `https://www.zhaopin.com/jobdetail/${encodeURIComponent(item.number || jobId)}.htm`)
      .replace('jobs.zhaopin.com/', 'www.zhaopin.com/jobdetail/'),
    workingExp: typeof item.workingExp === 'string' ? item.workingExp : '',
    salaryReal: typeof item.salaryReal === 'string' ? item.salaryReal : '',
    salaryCount: String(item.salaryCount ?? ''),
    skillLabel: Array.isArray(item.skillLabel) ? item.skillLabel : [],
    welfareLabel: Array.isArray(item.welfareLabel) ? item.welfareLabel : [],
  };
}

const text = value => String(value ?? '').replace(/\s+/g, '').trim();

export function matchCards(node, list) {
  if (!node.matches('.job-list-panel')) {
    return list.map((item, index) => ({ item, dom: node.children[index] }))
      .filter(({ dom }) => dom && !dom.matches('.pagination'));
  }
  const cards = Array.from(node.querySelectorAll(':scope > .job-card'));
  // The new client-rendered cards have no job URL or ID. Never use array
  // offsets: pagination appends cards and concurrent requests can reorder them.
  return cards.flatMap(dom => {
    const name = text(dom.querySelector('.job-card__title-clamp')?.textContent);
    const company = text(dom.querySelector('.job-card__company-name')?.textContent);
    const candidates = list.filter(item => text(item.name) === name &&
      text(item.companyName) === company);
    const duplicates = cards.filter(card =>
      text(card.querySelector('.job-card__title-clamp')?.textContent) === name &&
      text(card.querySelector('.job-card__company-name')?.textContent) === company);
    // Ambiguous same-title jobs must not acquire another position's history.
    return candidates.length === 1 && duplicates.length === 1
      ? [{ item: candidates[0], dom }] : [];
  });
}
