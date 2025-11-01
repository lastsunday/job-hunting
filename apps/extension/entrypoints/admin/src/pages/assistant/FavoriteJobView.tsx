import { AssistantApi, JobSnapshotApi, TagApi, CompanyCommentApi, JobApi, CompanyApi, LlmApi } from '@/common/api';
import { JobSnapshotSearchBO } from '@/common/data/bo/jobSnapshotSearchBO';
import { JobTagBO } from '@/common/data/bo/jobTagBO';
import { CompanyTagBO } from '@/common/data/bo/companyTagBO';
import { SearchFaviousJobBO } from '@/common/data/bo/searchFaviousJobBO';
import { JobSnapshot } from '@/common/data/domain/jobSnapshot';
import { genIdByCompanyName } from '@/common/data/domain/company';
import { AnalysisConfigDTO } from '@/common/data/dto/analysisConfigDTO';
import { toLine, genIdFromText } from '@/common/utils';
import JobSnapshotHistory from '@/entrypoints/components/JobSnapshotHistory';
import { CompanyComment } from '@/common/data/domain/companyComment';
import { SearchOutlined } from '@ant-design/icons';
import {
  Empty,
  Flex,
  FloatButton,
  Modal,
  Pagination,
  Spin,
  Splitter,
} from 'antd';
import React from 'react';
import type { DraggableData, DraggableEvent } from 'react-draggable';
import Draggable from 'react-draggable';
import BasicMap from '../../components/BasicMap';
import JobItemCard from '../../components/JobItemCard';
import JobModal from '../../components/JobModal';
import { FavoriteJobSettingData } from '../../data/FavoriteJobSettingData';
import { JobData } from '../../data/JobData';
import { Page, useAnalysis } from '../../hooks/analysis';
import { useJob } from '../../hooks/job';
import FavoriteJobSettingView from './FavoriteJobSettingView';
import './FavoriteJobView.css';
import styles from './FavoriteJobView.module.css';
import useJobSnapshotStore from '../../store/JobSnapshotStore';
import { useShallow } from 'zustand/shallow';
import CompanyCommentWidget from '@/entrypoints/components/CompanyCommentWidget';
import { JobTagEditData } from '../../data/JobTagEditData';
import { CompanyTagEditData } from '../../data/CompanyTagEditData';
const { queryAnalysisConfig } = useAnalysis();

const { convertToJobDataList, convertToJobData } = useJob();

const FavoriteJobView: React.FC = () => {
  const [data, setData] = useState([]);
  const [dataRefresh, setDataRefresh] = useState(true);
  const [total, setTotal] = useState(0);
  const [jobModalData, setJobModalData] = useState<JobData>();
  const [refresh, setRefresh] = useState(false);
  const [isFavoriteJobSettingModalOpen, setIsFavoriteJobSettingModalOpen] =
    useState(false);
  const [favoriteJobSetting, setFavoriteJobSetting] =
    useState<FavoriteJobSettingData>();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = React.useState<boolean>(false);
  const [whitelist, setWhitelist] = useState([]);

  const [disabled, setDisabled] = useState(true);
  const [bounds, setBounds] = useState({
    left: 0,
    top: 0,
    bottom: 0,
    right: 0,
  });
  const draggleRef = useRef<HTMLDivElement>(null);

  const [locateJobItem, setLocateJobItem] = useState(null);
  const [initLocateItem, setInitLocateItem] = useState(null);

  const [analysisConfig, setAnalysisConfig] = useState<AnalysisConfigDTO>(null);
  const [snapshotItems, setSnapshotItems] = useState<JobSnapshot>([]);
  const [jobSnapshotConfig] = useJobSnapshotStore(
    useShallow((state) => [state.config])
  );

  const [companyCommentItems, setCompanyCommentItems] = useState<CompanyComment>([]);

  const onStart = (_event: DraggableEvent, uiData: DraggableData) => {
    const { clientWidth, clientHeight } = window.document.documentElement;
    const targetRect = draggleRef.current?.getBoundingClientRect();
    if (!targetRect) {
      return;
    }
    setBounds({
      left: -targetRect.left + uiData.x,
      right: clientWidth - (targetRect.right - uiData.x),
      top: -targetRect.top + uiData.y,
      bottom: clientHeight - (targetRect.bottom - uiData.y),
    });
  };

  const getSearchParam = () => {
    const searchParam = new SearchFaviousJobBO();
    searchParam.pageNum = page;
    searchParam.pageSize = pageSize;
    Object.assign(searchParam, favoriteJobSetting);
    if (searchParam.sortMode == 1) {
      searchParam.orderByColumn = `${toLine(
        'jobFirstPublishDatetime'
      )} DESC, ${toLine('createDatetime')} DESC`;
    } else {
      searchParam.orderByColumn = `${toLine('createDatetime')} DESC, ${toLine(
        'jobFirstPublishDatetime'
      )} DESC `;
    }
    searchParam.orderBy = '';
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
                ? config.autoAnalysisPages.includes(Page.ADMIN_FAVORITE)
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
    const getWhitelist = async () => {
      const allTags = await TagApi.getAllTag();
      const tagItems = [];
      allTags.forEach((item) => {
        tagItems.push({ value: item.tagName, code: item.tagId });
      });
      setWhitelist(tagItems);
    };
    getWhitelist();
  }, []);

  useEffect(() => {
    const getSetting = async () => {
      const favoriteJobSetting =
        await AssistantApi.assistantGetJobFaviousSetting();
      setFavoriteJobSetting(favoriteJobSetting);
    };

    getSetting();
  }, []);

  useEffect(() => {
    setLoading(true);
    const search = async () => {
      try {
        const searchResult = await AssistantApi.assistantSearchFaviousJob(
          getSearchParam()
        );
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
        const companyCommentResult = await CompanyCommentApi.companyCommentSearch({
          companyId: searchResult.items.map(item => genIdByCompanyName(item.jobCompanyName))
        });
        setCompanyCommentItems([...companyCommentResult.items]);
      } finally {
        setLoading(false);
      }
    };
    search();
    return () => { };
  }, [
    //这里的值改变时，会执行上面return的匿名函数
    page,
    pageSize,
    favoriteJobSetting,
    dataRefresh,
  ]);

  const onCardClickHandle = (data: JobData) => {
    setJobModalData(data);
    setRefresh(!refresh);
  };

  const onJobItemLocateHandle = (data: JobData) => {
    setLocateJobItem(data);
  };

  const onFavoriteJobSettingClickHandle = () => {
    setIsFavoriteJobSettingModalOpen(true);
  };

  const handleFavoriteJobSettingModalCancel = () => {
    setIsFavoriteJobSettingModalOpen(false);
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

  const onJobTagSave = async (data: JobTagEditData) => {
    const { id, tags } = data;
    let bo = new JobTagBO();
    bo.jobId = id;
    bo.tags = tags;
    await JobApi.jobTagAddOrUpdate(bo);
    setDataRefresh(!dataRefresh);
  }

  const getAllTagFunction = async () => {
    let allTags = await TagApi.getAllTag();
    let tagItems = [];
    allTags.forEach((item) => {
      tagItems.push({ value: item.tagName, code: item.tagId });
    });
    return tagItems;
  }

  const onCompanyTagSave = async (data: CompanyTagEditData) => {
    const { name, tags } = data;
    const companyTagBO = new CompanyTagBO();
    companyTagBO.companyName = name;
    companyTagBO.tags = tags;
    await CompanyApi.addOrUpdateCompanyTag(companyTagBO);
    setDataRefresh(!dataRefresh);
  };

  return (
    <>
      <FloatButton
        type="primary"
        icon={<SearchOutlined />}
        onClick={() => {
          onFavoriteJobSettingClickHandle();
        }}
      ></FloatButton>
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
                wrap
                className={styles.itemList}
                align="center"
                justify="center"
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
                        onLlmRequest={async (_url: string, body: string | object) => {
                          return await LlmApi.llmCompletion(body);
                        }}
                        historyElement={
                          jobSnapshotConfig.enable ? (
                            <JobSnapshotHistory
                              key={item.id}
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
                                <div
                                  className="i-ix:history-list w-3.5 h-3.5"
                                />
                              }
                            />
                          ) : null
                        }
                        companyCommentElement={
                          <CompanyCommentWidget
                            companyName={item?.company?.name}
                            companyCommentList={
                              companyCommentItems
                                ? companyCommentItems.filter(companyComment => {
                                  return companyComment.companyId == genIdByCompanyName(item.company.name)
                                })
                                : []
                            }></CompanyCommentWidget>
                        }
                        validJobId={async (value) => {
                          return (await JobApi.jobTagGetAllDTOByJobIds([value])).length <= 0;
                        }}
                        onJobTagSave={onJobTagSave}
                        getAllTagFunction={getAllTagFunction}
                        validCompanyName={async (value) => {
                          return (await CompanyApi.getAllCompanyTagDTOByCompanyId(genIdFromText(value))).length <= 0;
                        }}
                        onCompanyTagSave={onCompanyTagSave}
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
      </Flex >
      <JobModal data={jobModalData} refresh={refresh}></JobModal>
      <Modal
        title={
          <div
            style={{ width: '100%', cursor: 'move' }}
            onMouseOver={() => {
              if (disabled) {
                setDisabled(false);
              }
            }}
            onMouseOut={() => {
              setDisabled(true);
            }}
            // fix eslintjsx-a11y/mouse-events-have-key-events
            // https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/blob/master/docs/rules/mouse-events-have-key-events.md
            onFocus={() => { }}
            onBlur={() => { }}
          // end
          >
            职位偏好设置
          </div>
        }
        open={isFavoriteJobSettingModalOpen}
        onCancel={handleFavoriteJobSettingModalCancel}
        footer={null}
        width="60%"
        style={{ maxWidth: '700px' }}
        mask={false}
        maskClosable={false}
        modalRender={(modal) => (
          <Draggable
            disabled={disabled}
            bounds={bounds}
            nodeRef={draggleRef}
            onStart={(event, uiData) => onStart(event, uiData)}
          >
            <div ref={draggleRef}>{modal}</div>
          </Draggable>
        )}
      >
        <FavoriteJobSettingView
          data={favoriteJobSetting}
          whitelist={whitelist}
          onSave={async (data) => {
            await AssistantApi.assistantSetJobFaviousSetting(data);
            setFavoriteJobSetting(data);
          }}
        ></FavoriteJobSettingView>
      </Modal>
    </>
  );
};

export default FavoriteJobView;
