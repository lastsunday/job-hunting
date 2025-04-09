import { getInfoFromJobDetailUrl, PLATFORM_JOBONLINE } from '@/common';
import { JobSnapshotApi } from '@/common/api';
import { JOB_SNAPSHOT_DATA_EXPRIE_DAY } from '@/common/config';
import { JobSnapshotSearchBO } from '@/common/data/bo/jobSnapshotSearchBO';
import { JobSnapshot } from '@/common/data/domain/jobSnapshot';
import { errorLog, infoLog } from '@/common/log';
import JobSnapshotHistory from '@/entrypoints/components/JobSnapshotHistory';
import { Icon } from '@iconify/react';
import dayjs from 'dayjs';
import { getPageData } from 'single-file-core/single-file';
import './JobSnapshotAssistant.css';

type Props = {
  className?: string;
  style?: React.CSSProperties;
};

const JobSnapshotAssistant: React.FC<Props> = (props) => {
  const SNAPSHOT_STATE_LOADING = 'LOADING';
  const SNAPSHOT_STATE_SAVED = 'SAVED';
  const SNAPSHOT_STATE_NOT_SAVE = 'NOT_SAVE';
  const SNAPSHOT_STATE_NOT_ERROR = 'ERROR';

  const [snapshotState, setSnapshotState] = useState(SNAPSHOT_STATE_LOADING);
  const [snapshotTotal, setSnapshotTotal] = useState(null);
  const [jobId, setJobId] = useState();

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
    jobSnapshotSearchBO.jobIds = [jobId];
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
        infoLog('[Job Snapshot] job snapshot save start');
        const data = await getPageData(getPageDataConfig);
        const jobSnapshot = new JobSnapshot();
        jobSnapshot.jobId = jobId;
        jobSnapshot.url = url;
        jobSnapshot.platform = platform;
        jobSnapshot.content = data.content;
        await JobSnapshotApi.jobSnapshotAddOrUpdate(jobSnapshot);
        setSnapshotState(SNAPSHOT_STATE_SAVED);
        setSnapshotTotal(total + 1);
        infoLog('[Job Snapshot] job snapshot save end');
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

  const getSnapshotItemsByJobIdCallback = async (jobId: string) => {
    const jobSnapshotSearchBO = new JobSnapshotSearchBO();
    jobSnapshotSearchBO.orderByColumn = 'updateDatetime';
    jobSnapshotSearchBO.orderBy = 'DESC';
    jobSnapshotSearchBO.jobIds = [jobId];
    jobSnapshotSearchBO.skipContent = true;
    const { items } = await JobSnapshotApi.jobSnapshotSearch(
      jobSnapshotSearchBO
    );
    return items;
  };

  const getSnapshotItemByIdCallback = async (id: string) => {
    return await JobSnapshotApi.jobSnapshotGetById(id);
  };

  useEffect(() => {
    saveJobSnapshot(false);
  }, []);

  return (
    <div className={props.className} style={props.style}>
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
        {snapshotTotal != null ? (
          <JobSnapshotHistory
            key={snapshotTotal}
            jobId={jobId}
            getSnapshotTotalCallback={async () => {
              return snapshotTotal;
            }}
            getSnapshotItemsByJobIdCallback={getSnapshotItemsByJobIdCallback}
            getSnapshotItemByIdCallback={getSnapshotItemByIdCallback}
          />
        ) : null}
      </div>
    </div>
  );
};

export default JobSnapshotAssistant;
