import { Icon } from '@iconify/react';
import { getInfoFromJobDetailUrl, PLATFORM_JOBONLINE } from '@/common';
import { JobSnapshotApi } from '@/common/api';
import { JOB_SNAPSHOT_DATA_EXPRIE_DAY } from '@/common/config';
import { JobSnapshotSearchBO } from '@/common/data/bo/jobSnapshotSearchBO';
import { JobSnapshot } from '@/common/data/domain/jobSnapshot';
import { infoLog, errorLog } from '@/common/log';
import dayjs from 'dayjs';
import { getPageData } from 'single-file-core/single-file';
import { Button, Tabs } from 'antd';
import './JobSnapshotAssistant.css';
import { dateToStr } from '@/common/utils';

type Props = {
  className?: string;
};

const JobSnapshotAssistant: React.FC<Props> = (props) => {
  const SNAPSHOT_STATE_LOADING = 'LOADING';
  const SNAPSHOT_STATE_SAVED = 'SAVED';
  const SNAPSHOT_STATE_NOT_SAVE = 'NOT_SAVE';
  const SNAPSHOT_STATE_NOT_ERROR = 'ERROR';

  const [snapshotState, setSnapshotState] = useState(SNAPSHOT_STATE_LOADING);
  const [snapshotTotal, setSnapshotTotal] = useState(0);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [jobId, setJobId] = useState();
  const [historyItems, setHistoryItems] = useState([]);
  const [currentSnapshotContent, setCurrentSnapshotContent] = useState();
  const [activeSnapshotId, setActiveSnapshotId] = useState(``);

  const checkIsSaveJobSnapshot = (jobSnapshot: JobSnapshot): boolean => {
    if (jobSnapshot) {
      const now = dayjs();
      if (
        now.isBefore(
          dayjs(jobSnapshot.updateDatetime).add(
            JOB_SNAPSHOT_DATA_EXPRIE_DAY,
            'day'
          )
        )
      ) {
        return false;
      } else {
        return true;
      }
    } else {
      return true;
    }
  };
  const getLatestJobSnapshot = async (jobId: string) => {
    const jobSnapshotSearchBO = new JobSnapshotSearchBO();
    jobSnapshotSearchBO.pageNum = 1;
    jobSnapshotSearchBO.pageSize = 1;
    jobSnapshotSearchBO.orderByColumn = 'updateDatetime';
    jobSnapshotSearchBO.orderBy = 'DESC';
    jobSnapshotSearchBO.jobId = jobId;
    jobSnapshotSearchBO.skipContent = true;
    const { items, total } = await JobSnapshotApi.jobSnapshotSearch(
      jobSnapshotSearchBO
    );
    if (items.length > 0) {
      return { item: items[0], total };
    } else {
      return { item: null, total: 0 };
    }
  };

  const saveJobSnapshot = async (force: boolean) => {
    try {
      setSnapshotState(SNAPSHOT_STATE_LOADING);
      const href = window.location.href;
      const { platform, jobId, url } = getInfoFromJobDetailUrl(new URL(href));
      setJobId(jobId);
      let getPageDataConfig;
      if (platform == PLATFORM_JOBONLINE) {
        getPageDataConfig = {
          removeUnusedStyles: true,
          removeUnusedFonts: true,
          removeImports: true,
          compressHTML: true,
          removeAudioSrc: true,
          removeVideoSrc: true,
          removeAlternativeFonts: true,
          removeAlternativeMedias: true,
          removeAlternativeImages: true,
          groupDuplicateImages: true,
          blockScripts: true,
        };
      } else {
        getPageDataConfig = {
          removeUnusedStyles: true,
          removeUnusedFonts: true,
          removeImports: true,
          removeScripts: true,
          compressHTML: true,
          removeAudioSrc: true,
          removeVideoSrc: true,
          removeAlternativeFonts: true,
          removeAlternativeMedias: true,
          removeAlternativeImages: true,
          groupDuplicateImages: true,
          blockScripts: true,
        };
      }
      //check job data save timing
      //> x days to save
      //show saving procecss bar
      //force save job snapshot
      const { item: latestJobSnapshot, total } = await getLatestJobSnapshot(
        jobId
      );
      setSnapshotTotal(total);
      if (force || checkIsSaveJobSnapshot(latestJobSnapshot)) {
        infoLog('[Job Snapshot] job snapshot save');
        const data = await getPageData(getPageDataConfig);
        const jobSnapshot = new JobSnapshot();
        jobSnapshot.jobId = jobId;
        jobSnapshot.url = url;
        jobSnapshot.platform = platform;
        jobSnapshot.content = data.content;
        await JobSnapshotApi.jobSnapshotAddOrUpdate(jobSnapshot);
        setSnapshotState(SNAPSHOT_STATE_SAVED);
        setSnapshotTotal(total + 1);
      } else {
        infoLog('[Job Snapshot] job snapshot not save');
        setSnapshotState(SNAPSHOT_STATE_NOT_SAVE);
      }
    } catch (e) {
      errorLog(`[Job Snapshot] error = ${e}`);
      setSnapshotState(SNAPSHOT_STATE_NOT_ERROR);
    }
  };

  const getSnapshotStateElement = () => {
    if (snapshotState == SNAPSHOT_STATE_LOADING) {
      return (
        <Icon icon="eos-icons:three-dots-loading" width="18" height="18" />
      );
    } else if (snapshotState == SNAPSHOT_STATE_SAVED) {
      return <Icon icon="ix:success" width="18" height="18" />;
    } else if (snapshotState == SNAPSHOT_STATE_NOT_SAVE) {
      return <Icon icon="line-md:question" width="18" height="18" />;
    } else {
      return (
        <Icon icon="material-symbols:error-outline" width="18" height="18" />
      );
    }
  };

  const getBadgeColorBySnapshotState = () => {
    if (snapshotState == SNAPSHOT_STATE_LOADING) {
      return 'bg-stone-600';
    } else if (snapshotState == SNAPSHOT_STATE_SAVED) {
      return 'bg-green-600';
    } else if (snapshotState == SNAPSHOT_STATE_NOT_SAVE) {
      return 'bg-yellow-600';
    } else {
      return 'bg-red-600';
    }
  };

  const getSnapshotButtonDisabledBySnapshotState = () => {
    if (snapshotState == SNAPSHOT_STATE_LOADING) {
      return true;
    } else if (snapshotState == SNAPSHOT_STATE_SAVED) {
      return true;
    } else if (snapshotState == SNAPSHOT_STATE_NOT_SAVE) {
      return false;
    } else {
      return false;
    }
  };

  const getBadgeTitleStateBySnapshotState = (): string => {
    if (snapshotState == SNAPSHOT_STATE_LOADING) {
      return '加载中';
    } else if (snapshotState == SNAPSHOT_STATE_SAVED) {
      return '保存成功';
    } else if (snapshotState == SNAPSHOT_STATE_NOT_SAVE) {
      return '存在有效的快照，是否需要保存';
    } else {
      return '运行异常';
    }
  };

  const getHistoryButtonDisabledByHistoryTotal = () => {
    if (snapshotTotal > 0) {
      return false;
    } else {
      return true;
    }
  };

  const showHistoryModal = async () => {
    if (snapshotTotal) {
      setHistoryModalOpen(true);
      const jobSnapshotSearchBO = new JobSnapshotSearchBO();
      jobSnapshotSearchBO.orderByColumn = 'updateDatetime';
      jobSnapshotSearchBO.orderBy = 'DESC';
      jobSnapshotSearchBO.jobId = jobId;
      jobSnapshotSearchBO.skipContent = true;
      const { items } = await JobSnapshotApi.jobSnapshotSearch(
        jobSnapshotSearchBO
      );
      setHistoryItems(items);
      await displayJobHistorySnapshot(items[0].id);
    }
  };

  const closeHistoryModal = async () => {
    setTimeout(() => {
      setHistoryModalOpen(false);
    }, 0);
  };

  const displayJobHistorySnapshot = async (id: string) => {
    const result = await JobSnapshotApi.jobSnapshotGetById(id);
    setActiveSnapshotId(id);
    setCurrentSnapshotContent(result.content);
  };

  useEffect(() => {
    saveJobSnapshot(false);
  }, []);

  return (
    <div className={props.className}>
      <div className="flex flex-col items-center gap-3">
        <div className="relative flex justify-center">
          <div>
            <button
              onClick={() => {
                saveJobSnapshot(true);
              }}
              disabled={getSnapshotButtonDisabledBySnapshotState()}
              className={`inline-grid place-items-center border align-middle select-none font-sans font-medium text-center transition-all duration-300 ease-in disabled:opacity-50 disabled:shadow-none disabled:pointer-events-none text-sm min-w-[38px] min-h-[38px] rounded-md shadow-sm hover:shadow-md bg-stone-200 border-stone-200 text-stone-800 hover:bg-stone-100`}
            >
              <Icon
                icon="qlementine-icons:snapshot-16"
                width="32"
                height="32"
              />
            </button>
            <span
              title={getBadgeTitleStateBySnapshotState()}
              className={`absolute -top-2 -right-2 px-0.5 py-0.5 text-xs border leading-none grid place-items-center rounded-full text-stone-50 border-white ${getBadgeColorBySnapshotState()}`}
            >
              {getSnapshotStateElement()}
            </span>
          </div>
        </div>
        <div className="relative flex justify-center">
          <div
            onClick={() => {
              showHistoryModal();
            }}
          >
            <button
              disabled={getHistoryButtonDisabledByHistoryTotal()}
              className="inline-grid place-items-center border align-middle select-none font-sans font-medium text-center transition-all duration-300 ease-in disabled:opacity-50 disabled:shadow-none disabled:pointer-events-none text-sm min-w-[38px] min-h-[38px] rounded-md shadow-sm hover:shadow-md bg-stone-200 border-stone-200 text-stone-800 hover:bg-stone-100"
            >
              <Icon icon="ix:history-list" width="32" height="32" />
            </button>
            {snapshotTotal > 0 ? (
              <span
                className={`absolute -top-2 -right-2 px-0.5 py-0.5 text-xs border leading-none grid place-items-center rounded-full min-w-3 min-h-3 text-stone-50 border-white bg-red-600`}
              >
                <div>{snapshotTotal > 99 ? `99+` : snapshotTotal}</div>
              </span>
            ) : null}
            {historyModalOpen ? (
              <div className="fixed inset-0 z-[999] grid h-screen w-screen place-items-center bg-black bg-opacity-60 backdrop-blur-sm transition-opacity duration-300">
                <div className="relative flex flex-col m-4 p-4 w-1 min-w-[90%] max-w-[90%] min-h-[90%] max-h-[90%] rounded-lg bg-white shadow-sm">
                  <iframe
                    className="flex-auto"
                    srcDoc={currentSnapshotContent}
                  ></iframe>
                  <Tabs
                    activeKey={activeSnapshotId}
                    tabBarExtraContent={
                      <Button
                        type="primary"
                        danger
                        onClick={() => {
                          closeHistoryModal();
                        }}
                      >
                        关闭
                      </Button>
                    }
                    tabPosition="bottom"
                    onChange={(key: string) => {
                      displayJobHistorySnapshot(key);
                    }}
                    items={historyItems.map((item) => {
                      return {
                        label: `${dateToStr(
                          item.updateDatetime,
                          'YYYY-MM-DD HH:mm:ss'
                        )}`,
                        key: item.id,
                        children: ``,
                      };
                    })}
                  />
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};

export default JobSnapshotAssistant;
