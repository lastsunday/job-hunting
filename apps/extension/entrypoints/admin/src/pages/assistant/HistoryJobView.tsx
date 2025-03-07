import { JobApi } from '@/common/api';
import { SearchJobBO } from '@/common/data/bo/searchJobBO';
import { Empty, Flex, Modal, Pagination, Spin, Splitter } from 'antd';
import React from 'react';
import JobItemCard from '../../components/JobItemCard';

import BasicMap from '../../components/BasicMap';
import CompanyItemTable from '../../components/CompanyItemTable';
import JobItemTable from '../../components/JobItemTable';
import { CompanyData } from '../../data/CompanyData';
import { JobData } from '../../data/JobData';
import { useJob } from '../../hooks/job';
import './FavoriteJobView.css';
import styles from './FavoriteJobView.module.css';
import { Page, useAnalysis } from '../../hooks/analysis';
const { queryAnalysisConfig } = useAnalysis();
import { AnalysisConfigDTO } from '@/common/data/dto/analysisConfigDTO';

const { convertToJobDataList, convertToJobData } = useJob();

const HistoryJobView: React.FC = () => {
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [isJobModalOpen, setIsJobModalOpen] = useState(false);
  const [jobModalData, setJobModalData] = useState<JobData>();
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
  const [companyModalData, setCompanyModalData] = useState<CompanyData>();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = React.useState<boolean>(false);

  const [locateJobItem, setLocateJobItem] = useState(null);
  const [initLocateItem, setInitLocateItem] = useState(null);

  const [analysisConfig, setAnalysisConfig] = useState<AnalysisConfigDTO>(null);

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
    setIsJobModalOpen(true);
  };

  const onJobItemLocateHandle = (data: JobData) => {
    setLocateJobItem(data);
  };

  const handleJobModalCancel = () => {
    setIsJobModalOpen(false);
    setJobModalData(null);
  };

  const onCompanyClickHandle = (data: CompanyData) => {
    setCompanyModalData(data);
    setIsCompanyModalOpen(true);
  };

  const handleCompanyModalCancel = () => {
    setIsCompanyModalOpen(false);
    setCompanyModalData(null);
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
      <Modal
        open={isJobModalOpen}
        onCancel={handleJobModalCancel}
        footer={null}
        width="80%"
      >
        <JobItemTable
          data={jobModalData}
          onCompanyClick={onCompanyClickHandle}
        ></JobItemTable>
      </Modal>

      <Modal
        open={isCompanyModalOpen}
        onCancel={handleCompanyModalCancel}
        footer={null}
        width="80%"
      >
        <CompanyItemTable data={companyModalData}></CompanyItemTable>
      </Modal>
    </>
  );
};

export default HistoryJobView;
