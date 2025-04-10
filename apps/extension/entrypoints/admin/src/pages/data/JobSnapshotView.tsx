import { JobSnapshotApi } from '@/common/api';
import { JobSnapshot } from '@/common/data/domain/jobSnapshot';
import { dateToStr, convertEmptyStringToNull } from '@/common/utils';
import {
  Button,
  Col,
  DatePicker,
  Form,
  Input,
  Modal,
  Space,
  TableColumnsType,
  Typography,
  message,
} from 'antd';
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
import BasicTable from '../../components/BasicTable';
import { useJob } from '../../hooks/job';
import { useJobSnapshot } from '../../hooks/jobSnapshot';
const { platformFormat } = useJob();

const { convertSortField, convertToDataList } = useJobSnapshot();
import { jobSnapshotDataToExcelJSONArray } from '@/common/excel';

const { Text } = Typography;
const { RangePicker } = DatePicker;

dayjs.extend(duration);
import { errorLog } from '@/common/log';
import { downloadBlob } from '@/common/file';
import styles from './JobSnapshotView.module.css';

const fillSearchParam = (searchParam, values) => {
  const { createDatetimeRange, updateDatetimeRange, jobId } = values;
  if (convertEmptyStringToNull(jobId)) {
    searchParam.jobIds = [jobId];
  } else {
    searchParam.jobIds = [];
  }
  if (createDatetimeRange && createDatetimeRange.length > 0) {
    searchParam.startDatetimeForCreate = dayjs(createDatetimeRange[0]);
    searchParam.endDatetimeForCreate = dayjs(createDatetimeRange[1]);
  } else {
    searchParam.startDatetimeForCreate = null;
    searchParam.endDatetimeForCreate = null;
  }
  if (updateDatetimeRange && updateDatetimeRange.length > 0) {
    searchParam.startDatetimeForUpdate = dayjs(updateDatetimeRange[0]);
    searchParam.endDatetimeForUpdate = dayjs(updateDatetimeRange[1]);
  } else {
    searchParam.startDatetimeForUpdate = null;
    searchParam.endDatetimeForUpdate = null;
  }
};

const JobSnapshotView: React.FC = () => {
  const [messageApi, contextHolder] = message.useMessage();

  const tableRef = useRef();
  const [previewFileName, setPreviewFileName] = useState('');
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewContent, setPreviewContent] = useState(``);

  const columns: TableColumnsType<JobSnapshot> = [
    {
      title: '职位快照编号',
      dataIndex: 'id',
      render: (value: string) => <Text copyable>{value}</Text>,
      minWidth: 100,
    },
    {
      title: '职位编号',
      dataIndex: 'jobId',
      render: (value: string) => <Text copyable>{value}</Text>,
      minWidth: 100,
    },
    {
      title: '职位链接',
      dataIndex: 'url',
      render: (value: string) => <Text copyable>{value}</Text>,
      minWidth: 100,
    },
    {
      title: '招聘平台',
      dataIndex: 'platform',
      render: (value: string) => <Text>{platformFormat(value)}</Text>,
      minWidth: 100,
    },
    {
      title: '更新时间',
      dataIndex: 'updateDatetime',
      render: (value: Date) => (
        <Text title={dateToStr(value)}>{dateToStr(value, 'YYYY-MM-DD')}</Text>
      ),
      minWidth: 100,
      sorter: true,
    },
    {
      title: '操作',
      key: 'action',
      fixed: 'right',
      render: (_, record) => (
        <Space size="middle">
          <Button
            type="link"
            onClick={async () => {
              const { id, jobId } = record;
              const { content, createDatetime } =
                await JobSnapshotApi.jobSnapshotGetById(id);
              setPreviewFileName(
                `${jobId}-${dateToStr(createDatetime, 'YYYYMMDDHHmmss')}`
              );
              setPreviewContent(content);
              setIsPreviewModalOpen(true);
            }}
          >
            预览
          </Button>
          <Button
            type="link"
            onClick={async () => {
              const { id, jobId } = record;
              try {
                const { content, createDatetime } =
                  await JobSnapshotApi.jobSnapshotGetById(id);
                downloadBlob(
                  new Blob([content], { type: 'plain/text' }),
                  `${jobId}-${dateToStr(
                    createDatetime,
                    'YYYYMMDDHHmmss'
                  )}.html`,
                  'application/octet-stream'
                );
              } catch (e) {
                errorLog(e);
                messageApi.error(e.message);
              }
            }}
          >
            下载
          </Button>
        </Space>
      ),
    },
  ];

  const searchFields = {
    common: [
      <Col span={8} key="jobId">
        <Form.Item name={`jobId`} label={`职位编号`}>
          <Input allowClear placeholder="请输入职位编号" />
        </Form.Item>
      </Col>,
    ],
    expand: [
      <Col span={8} key="createDatetimeRange">
        <Form.Item name={`createDatetimeRange`} label={`创建时间`}>
          <RangePicker />
        </Form.Item>
      </Col>,
      <Col span={8} key="updateDatetimeRange">
        <Form.Item name={`updateDatetimeRange`} label={`更新时间`}>
          <RangePicker />
        </Form.Item>
      </Col>,
    ],
  };

  const onDelete = async (keys: React.Key[]) => {
    await JobSnapshotApi.jobSnapshotDeleteByIds(keys);
    tableRef?.current.refresh();
  };

  const getFullDataFunction = async (originData: JobSnapshot[]) => {
    const result = [];
    const batchSize = 10;
    const ids = originData.map((item) => item.id);
    const totalBatches = Math.ceil(ids.length / batchSize);
    for (let i = 0; i < totalBatches; i++) {
      const start = i * batchSize;
      const end = Math.min(start + batchSize, ids.length);
      const rangeIds = ids.slice(start, end);
      const items = await JobSnapshotApi.jobSnapshotGetByIds(rangeIds);
      result.push(...items);
    }
    return result;
  };

  return (
    <>
      {contextHolder}
      <BasicTable
        ref={tableRef}
        mode={['r', 'd']}
        onDelete={onDelete}
        searchProps={{
          columns,
          searchFields,
          fillSearchParam,
          convertSortField,
          search: async (searchParam) => {
            return await JobSnapshotApi.jobSnapshotSearch(searchParam);
          },
          searchParam: {
            skipContent: true,
          },
          convertToDataList,
        }}
        rowKeyFunction={(record) => {
          return record.id;
        }}
        exportProps={{
          dataToExcelJSONArray: jobSnapshotDataToExcelJSONArray,
          title: '职位快照',
          getFullDataFunction,
          format: 'json',
          zipFormat: 'tar.xz',
        }}
      ></BasicTable>
      <Modal
        title={`预览${previewFileName}`}
        open={isPreviewModalOpen}
        onCancel={() => {
          setIsPreviewModalOpen(false);
        }}
        maskClosable={false}
        footer={null}
        width="90%"
        destroyOnClose
      >
        <iframe className={styles.content} srcDoc={previewContent}></iframe>
      </Modal>
    </>
  );
};

export default JobSnapshotView;
