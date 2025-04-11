import { JobSnapshot } from '@/common/data/domain/jobSnapshot';
import { dateToStr } from '@/common/utils';
import { Button, Tabs } from 'antd';
import './JobSnapshotHistory.css';

type Props = {
  getSnapshotTotalCallback: () => Promise<number>;
  getSnapshotItemsByJobIdCallback: (jobId: string) => Promise<JobSnapshot[]>;
  getSnapshotItemByIdCallback: (jobId: string) => Promise<JobSnapshot>;
  jobId: string;
  icon?: React.ReactNode;
};

const JobSnapshotHistory: React.FC<Props> = ({
  getSnapshotTotalCallback,
  getSnapshotItemsByJobIdCallback,
  getSnapshotItemByIdCallback,
  jobId,
  icon,
}) => {
  const [historyItems, setHistoryItems] = useState([]);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [currentSnapshotContent, setCurrentSnapshotContent] = useState();
  const [activeSnapshotId, setActiveSnapshotId] = useState(``);
  const [snapshotTotal, setSnapshotTotal] = useState(0);

  const init = async () => {
    setSnapshotTotal(await getSnapshotTotalCallback());
  };

  useEffect(() => {
    init();
  }, []);

  const showHistoryModal = async () => {
    if (snapshotTotal) {
      setHistoryModalOpen(true);
      const result = await getSnapshotItemsByJobIdCallback(jobId);
      setHistoryItems(result);
      await displayJobHistorySnapshot(result[0].id);
    }
  };

  const closeHistoryModal = async () => {
    setTimeout(() => {
      setHistoryModalOpen(false);
    }, 0);
  };

  const displayJobHistorySnapshot = async (id: string) => {
    const result = await getSnapshotItemByIdCallback(id);
    setActiveSnapshotId(id);
    setCurrentSnapshotContent(result.content);
  };

  const getHistoryButtonDisabledByHistoryTotal = () => {
    if (snapshotTotal > 0) {
      return false;
    } else {
      return true;
    }
  };

  return (
    <div className="relative flex justify-center">
      <div
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          showHistoryModal();
        }}
      >
        <button
          disabled={getHistoryButtonDisabledByHistoryTotal()}
          className="inline-grid place-items-center border align-middle select-none font-sans font-medium text-center transition-all duration-300 ease-in disabled:opacity-50 disabled:shadow-none disabled:pointer-events-none text-sm  rounded-md shadow-sm hover:shadow-md bg-stone-200 border-stone-200 text-stone-800 hover:bg-stone-100"
        >
          {icon ? icon : <div className="i-ix:history-list w-8 h-8"/>}
        </button>
        {snapshotTotal > 0 ? (
          <span
            className={`absolute -top-2 -right-2 px-0.5 py-0.5 border leading-none grid place-items-center rounded-full min-w-3 min-h-3 text-stone-50 border-white bg-red-600`}
          >
            <div className=''>{snapshotTotal > 99 ? `99+` : snapshotTotal}</div>
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
  );
};

export default JobSnapshotHistory;
