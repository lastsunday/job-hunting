import { beforeEach, describe, expect, it, vi } from 'vitest';
import { extractList, normalizeJob, matchCards, isZhilianListPage, isZhilianListResponse } from '../entrypoints/content/plantforms/zhilian/data';

const api = vi.hoisted(() => ({ save: vi.fn(), get: vi.fn(), panel: vi.fn() }));
vi.mock('../common/api', () => ({ JobApi: { getJobBrowseInfoByIds: api.get } }));
vi.mock('../entrypoints/content/commonDataHandler', () => ({
  saveBrowseJob: api.save,
  getJobIds: list => list.map(item => `ZHILIAN_${item.jobId}`),
  getAnalysisConfig: async () => ({}),
}));
vi.mock('../entrypoints/content/commonRender', () => ({
  finalRender: vi.fn(), renderFunctionPanel: api.panel,
  renderSortJobItem: vi.fn(), setupSortJobItem: vi.fn(),
  renderTimeTag: (dom, dto) => { dom.textContent = dto.jobId; },
}));
import { getZhiLianData } from '../entrypoints/content/plantforms/zhilian/index';

const job = (number = 'CC123J456') => ({ number, name: '运维工程师', companyName: '测试公司' });
const card = (name = '运维工程师') => `<div class="job-card"><div class="job-card__title-clamp">${name}</div><a class="job-card__company-name">测试公司</a></div>`;
beforeEach(() => {
  document.body.innerHTML = `<div class="job-list-panel">${card()}</div>`;
  vi.clearAllMocks();
  api.get.mockImplementation(async ids => ids.map(jobId => ({ jobId })).reverse());
});

describe('Zhilian page and payload compatibility', () => {
  it('matches new routes with boundaries and exact list endpoints', () => {
    for (const path of ['/jobs', '/jobs?kw=test', '/sou', '/sou/'])
      expect(isZhilianListPage(new URL(`https://www.zhaopin.com${path}`))).toBe(true);
    expect(isZhilianListPage(new URL('https://www.zhaopin.com/jobs-other'))).toBe(false);
    for (const path of ['/c/i/search/positions', '/c/i/position/recommend-tag', '/c/i/position/recommend-tag-newest'])
      expect(isZhilianListResponse(`https://api.zhaopin.com${path}?page=2`)).toBe(true);
    expect(isZhilianListResponse('https://example.com/c/i/search/positions')).toBe(false);
  });
  it('reads search, recommendation, JSON XHR and SSR lists', () => {
    const list = [job()];
    expect(extractList(JSON.stringify({ data: { list } }))).toEqual(list);
    expect(extractList({ data: { data: { list } } })).toEqual(list);
    expect(extractList({ positionList: list })).toEqual(list);
    expect(extractList({ data: { list: {} } })).toEqual([]);
  });
  it('preserves existing IDs and tolerates absent optional fields', () => {
    expect(normalizeJob({ ...job(), jobId: 'old-id' }).jobId).toBe('old-id');
    expect(normalizeJob(job())).toMatchObject({ jobId: 'CC123J456', skillLabel: [], salaryCount: '' });
    expect(normalizeJob({ name: 'no ID' })).toBeNull();
    expect(normalizeJob(job()).publishTime).toBeUndefined();
  });
  it('matches appended cards by identity and skips ambiguous names', () => {
    const node = document.querySelector('.job-list-panel');
    node.innerHTML = card('旧岗位') + card();
    expect(matchCards(node, [job()])[0].dom).toBe(node.children[1]);
    expect(matchCards(node, [job(), job('other-id')])).toEqual([]);
  });
});

describe('Zhilian injection lifecycle', () => {
  it('renders the numeric jobId shape observed in the live SSR page', async () => {
    const liveShape = {
      jobId: 40967514415, number: 'CC634415720J40967514415',
      name: '系统运维工程师', companyName: '杭州杭途科技有限公司',
      positionUrl: 'http://www.zhaopin.com/jobdetail/CC634415720J40967514415.htm',
      publishTime: '2026-09-03 19:21:19', firstPublishTime: '',
      salaryReal: '8001-10000', salaryCount: '',
    };
    document.body.innerHTML = '<div class="job-list-panel"><div class="job-card"><div class="job-card__title-clamp">系统运维工程师</div><a class="job-card__company-name">杭州杭途科技有限公司</a></div></div>';
    await getZhiLianData({ positionList: [liveShape] });
    expect(api.save.mock.calls[0][0][0]).toMatchObject({ jobId: '40967514415', publishTime: liveShape.publishTime });
    expect(document.querySelector('.__zhilian_time_tag').textContent).toBe('ZHILIAN_40967514415');
    expect(normalizeJob({ ...liveShape, positionUrl: undefined }).positionUrl).toContain(liveShape.number);
    expect(normalizeJob({ jobId: NaN })).toBeNull();
    expect(normalizeJob({ jobId: Number.MAX_SAFE_INTEGER + 1 })).toBeNull();
  });
  it('renders existing cards and deduplicates SSR plus XHR', async () => {
    await getZhiLianData({ positionList: [job()] });
    await getZhiLianData({ data: { list: [job()] } });
    expect(api.save).toHaveBeenCalledTimes(1);
    expect(document.querySelectorAll('.__zhilian_time_tag')).toHaveLength(1);
    expect(document.querySelector('.__zhilian_time_tag').textContent).toBe('ZHILIAN_CC123J456');
  });
  it('waits for a container mounted after the response', async () => {
    document.body.innerHTML = '';
    const pending = getZhiLianData({ data: { list: [job()] } });
    await Promise.resolve();
    document.body.innerHTML = `<div class="job-list-panel">${card()}</div>`;
    await pending;
    expect(document.querySelector('.__zhilian_time_tag')).not.toBeNull();
  });
  it('uses DTO IDs rather than database result order', async () => {
    document.querySelector('.job-list-panel').innerHTML += card('开发工程师');
    await getZhiLianData({ data: { list: [job(), { ...job('second'), name: '开发工程师' }] } });
    expect([...document.querySelectorAll('.__zhilian_time_tag')].map(e => e.textContent))
      .toEqual(['ZHILIAN_CC123J456', 'ZHILIAN_second']);
  });
  it('allows retry after a database failure', async () => {
    api.save.mockRejectedValueOnce(new Error('database unavailable'));
    await getZhiLianData({ positionList: [job()] });
    await getZhiLianData({ positionList: [job()] });
    expect(document.querySelectorAll('.__zhilian_time_tag')).toHaveLength(1);
  });
});
