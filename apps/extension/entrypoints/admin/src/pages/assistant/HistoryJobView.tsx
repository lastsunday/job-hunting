import { JobApi, JobSnapshotApi } from '@/common/api';
import { SearchJobBO } from '@/common/data/bo/searchJobBO';
import { AnalysisConfigDTO } from '@/common/data/dto/analysisConfigDTO';
import { Empty, Flex, Pagination, Spin, Splitter } from 'antd';
import React from 'react';
import BasicMap from '../../components/BasicMap';
import JobItemCard from '../../components/JobItemCard';
import JobModal from '../../components/JobModal';
import { JobData } from '../../data/JobData';
import { Page, useAnalysis } from '../../hooks/analysis';
import { useJob } from '../../hooks/job';
import './FavoriteJobView.css';
import styles from './FavoriteJobView.module.css';
import JobSnapshotHistory from '@/entrypoints/components/JobSnapshotHistory';
import { Icon } from '@iconify/react';
import { JobSnapshotSearchBO } from '@/common/data/bo/jobSnapshotSearchBO';
import { JobSnapshot } from '@/common/data/domain/jobSnapshot';
import useJobSnapshotStore from '../../store/JobSnapshotStore';
import { useShallow } from 'zustand/shallow';
const { queryAnalysisConfig } = useAnalysis();

const { convertToJobDataList, convertToJobData } = useJob();

const HistoryJobView: React.FC = () => {
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [jobModalData, setJobModalData] = useState<JobData>();
  const [refresh, setRefresh] = useState(false);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = React.useState<boolean>(false);

  const [locateJobItem, setLocateJobItem] = useState(null);
  const [initLocateItem, setInitLocateItem] = useState(null);

  const [analysisConfig, setAnalysisConfig] = useState<AnalysisConfigDTO>(null);
  const [snapshotItems, setSnapshotItems] = useState<JobSnapshot>([]);
  const [jobSnapshotConfig] = useJobSnapshotStore(
    useShallow((state) => [state.config])
  );

  const getSearchParam = () => {
    const searchParam = new SearchJobBO();
    searchParam.pageNum = page;
    searchParam.pageSize = pageSize;
    searchParam.hasBrowseTime = true;
    searchParam.orderByColumn = 'latestBrowseDetailDatetime';
    searchParam.orderBy = 'DESC';
    return searchParam;
  };

  useEffect(() => {
    const getAnalysisConfig = async () => {
      const config = await queryAnalysisConfig();
      if (config && config.enable) {
        setAnalysisConfig(
          Object.assign(
            {
              auto: config.autoAnalysisPages
                ? config.autoAnalysisPages.includes(Page.ADMIN_HISTORY)
                : false,
            },
            config
          )
        );
      } else {
        setAnalysisConfig(null);
      }
    };
    getAnalysisConfig();
  }, []);

  useEffect(() => {
    setLoading(true);
    const search = async () => {
      try {
        const searchResult = await JobApi.searchJob(getSearchParam());
        const filter = data.filter(
          (item) => item.longitude == null || item.latitude == null
        );
        if (filter != null && filter.length > 0) {
          setInitLocateItem(convertToJobData(filter[0]));
        } else {
          setInitLocateItem(null);
        }
        setTotal(parseInt(searchResult.total));
        setData(convertToJobDataList(searchResult.items));
        if (jobSnapshotConfig.enable) {
          const result = await getSnapshotItemsByJobIds(
            searchResult.items.map((item) => item.jobId)
          );
          setSnapshotItems(result);
        }
      } finally {
        setLoading(false);
      }
    };
    search();
    return () => {};
  }, [
    //这里的值改变时，会执行上面return的匿名函数
    page,
    pageSize,
  ]);

  const onCardClickHandle = (data: JobData) => {
    setJobModalData(data);
    setRefresh(!refresh);
  };

  const onJobItemLocateHandle = (data: JobData) => {
    setLocateJobItem(data);
  };

  const getSnapshotItemsByJobIds = async (jobIds: string[]) => {
    const jobSnapshotSearchBO = new JobSnapshotSearchBO();
    jobSnapshotSearchBO.orderByColumn = 'updateDatetime';
    jobSnapshotSearchBO.orderBy = 'DESC';
    jobSnapshotSearchBO.jobIds = jobIds;
    jobSnapshotSearchBO.skipContent = true;
    const { items } = await JobSnapshotApi.jobSnapshotSearch(
      jobSnapshotSearchBO
    );
    return items;
  };

  const getSnapshotItemsByJobIdCallback = async (jobId: string) => {
    return await getSnapshotItemsByJobIds([jobId]);
  };

  const getSnapshotItemByIdCallback = async (id: string) => {
    return await JobSnapshotApi.jobSnapshotGetById(id);
  };

  return (
    <>
      <Flex vertical className={styles.main}>
        <Flex
          flex={1}
          vertical={false}
          gap="small"
          wrap
          style={{ overflow: 'hidden' }}
        >
          <Splitter style={{ boxShadow: '0 0 10px rgba(0, 0, 0, 0.1)' }}>
            <Splitter.Panel
              collapsible
              defaultSize={380}
              min={380}
              style={{ overflow: 'hidden' }}
            >
              <Flex
                align="center"
                justify="center"
                wrap
                className={styles.itemList}
              >
                <Spin
                  spinning={loading}
                  delay={100}
                  prefixCls="FavoriteJobView"
                >
                  {data && data.length > 0 ? (
                    data.map((item, index) => (
                      <JobItemCard
                        key={item.id}
                        data={item}
                        className={styles.item}
                        onCardClick={onCardClickHandle}
                        onLocate={onJobItemLocateHandle}
                        analysisConfig={
                          analysisConfig
                            ? Object.assign(
                                { demand: `${item.name}\n${item.desc}` },
                                analysisConfig
                              )
                            : null
                        }
                        historyElement={
                          jobSnapshotConfig.enable ? (
                            <JobSnapshotHistory
                              key={snapshotItems.length}
                              jobId={item.id}
                              getSnapshotTotalCallback={async () => {
                                return snapshotItems.filter(
                                  (snapshot) => snapshot.jobId == item.id
                                ).length;
                              }}
                              getSnapshotItemsByJobIdCallback={
                                getSnapshotItemsByJobIdCallback
                              }
                              getSnapshotItemByIdCallback={
                                getSnapshotItemByIdCallback
                              }
                              icon={
                                <Icon
                                  icon="ix:history-list"
                                  width="18"
                                  height="18"
                                />
                              }
                            />
                          ) : null
                        }
                      ></JobItemCard>
                    ))
                  ) : (
                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />
                  )}
                </Spin>
              </Flex>
            </Splitter.Panel>
            <Splitter.Panel collapsible>
              <BasicMap
                longitude={116.3912757}
                latitude={39.906217}
                zoom={3}
                data={data}
                locateItem={locateJobItem}
                initLocateItem={initLocateItem}
              ></BasicMap>
            </Splitter.Panel>
          </Splitter>
        </Flex>
        <Flex>
          <Spin spinning={loading} delay={100}>
            <Pagination
              className={styles.pagging}
              total={total}
              showSizeChanger
              showTotal={(total) => `共 ${total} 条记录`}
              onChange={(page, pageSize) => {
                setPage(page);
                setPageSize(pageSize);
              }}
              pageSizeOptions={[10, 20, 50, 100, 200, 500, 1000]}
              defaultPageSize={20}
            />
          </Spin>
        </Flex>
      </Flex>
      <JobModal data={jobModalData} refresh={refresh}></JobModal>
    </>
  );
};

export default HistoryJobView;
