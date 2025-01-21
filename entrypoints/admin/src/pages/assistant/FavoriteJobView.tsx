import { AssistantApi, TagApi } from "@/common/api";
import { SearchFaviousJobBO } from "@/common/data/bo/searchFaviousJobBO";
import { Empty, Flex, FloatButton, Modal, Pagination, Spin, Splitter } from "antd";
import React from "react";
import JobItemCard from "../../components/JobItemCard";

import { SearchOutlined } from "@ant-design/icons";
import type { DraggableData, DraggableEvent } from "react-draggable";
import Draggable from "react-draggable";
import CompanyItemTable from "../../components/CompanyItemTable";
import JobItemTable from "../../components/JobItemTable";
import { CompanyData } from "../../data/CompanyData";
import { FavoriteJobSettingData } from "../../data/FavoriteJobSettingData";
import { JobData } from "../../data/JobData";
import FavoriteJobSettingView from "./FavoriteJobSettingView";
import "./FavoriteJobView.css";
import styles from "./FavoriteJobView.module.css";
import BasicMap from "../../components/BasicMap";
import { useJob } from "../../hooks/job";
import { toLine } from "@/common/utils";

const { convertToJobDataList, convertToJobData } = useJob();

const FavoriteJobView: React.FC = () => {
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [isJobModalOpen, setIsJobModalOpen] = useState(false);
  const [jobModalData, setJobModalData] = useState<JobData>();
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
  const [companyModalData, setCompanyModalData] = useState<CompanyData>();
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
    let searchParam = new SearchFaviousJobBO();
    searchParam.pageNum = page;
    searchParam.pageSize = pageSize;
    Object.assign(searchParam, favoriteJobSetting);
    if (searchParam.sortMode == 1) {
      searchParam.orderByColumn =
        `${toLine('jobFirstPublishDatetime')} DESC, ${toLine('createDatetime')} DESC`;
    } else {
      searchParam.orderByColumn =
        `${toLine('createDatetime')} DESC, ${toLine('jobFirstPublishDatetime')} DESC `;
    }
    searchParam.orderBy = "";
    return searchParam;
  };

  useEffect(() => {
    const getWhitelist = async () => {
      let allTags = await TagApi.getAllTag();
      let tagItems = [];
      allTags.forEach((item) => {
        tagItems.push({ value: item.tagName, code: item.tagId });
      });
      setWhitelist(tagItems);
    };
    getWhitelist();
  }, []);

  useEffect(() => {
    const getSetting = async () => {
      let favoriteJobSetting =
        await AssistantApi.assistantGetJobFaviousSetting();
      setFavoriteJobSetting(favoriteJobSetting);
    };

    getSetting();
  }, []);

  useEffect(() => {
    setLoading(true);
    const search = async () => {
      try {
        let searchResult = await AssistantApi.assistantSearchFaviousJob(
          getSearchParam()
        );
        const filter = data.filter(item => (item.longitude == null || item.latitude == null));
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
    return () => { };
  }, [
    //这里的值改变时，会执行上面return的匿名函数
    page,
    pageSize,
    favoriteJobSetting,
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

  const onFavoriteJobSettingClickHandle = (data: any) => {
    setCompanyModalData(data);
    setIsFavoriteJobSettingModalOpen(true);
  };

  const handleFavoriteJobSettingModalCancel = () => {
    setIsFavoriteJobSettingModalOpen(false);
    setCompanyModalData(null);
  };

  return (
    <>
      <FloatButton
        type="primary"
        icon={<SearchOutlined />}
        onClick={() => {
          onFavoriteJobSettingClickHandle(null);
        }}
      ></FloatButton>
      <Flex vertical className={styles.main}>
        <Flex
          flex={1}
          vertical={false}
          gap="small"
          wrap
          style={{ overflow: "hidden" }}
        >
          <Splitter style={{ boxShadow: "0 0 10px rgba(0, 0, 0, 0.1)" }}>
            <Splitter.Panel
              collapsible
              defaultSize={380}
              min={380}
              style={{ overflow: "hidden" }}
            >
              <Flex wrap className={styles.itemList} align="center" justify="center">
                <Spin
                  spinning={loading}
                  delay={100}
                  prefixCls="FavoriteJobView"
                >
                  {data && data.length > 0 ? data.map((item, index) => (
                    <JobItemCard
                      key={item.id}
                      data={item}
                      className={styles.item}
                      onCardClick={onCardClickHandle}
                      onLocate={onJobItemLocateHandle}
                    ></JobItemCard>
                  )) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />}
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
      <Modal
        title={
          <div
            style={{ width: "100%", cursor: "move" }}
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
        style={{ maxWidth: "700px" }}
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
