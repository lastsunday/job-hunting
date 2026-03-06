import { TaskApi } from '@/common/api';
import { TaskDTO } from '@/common/data/dto/taskDTO';
import { dateToStr } from '@/common/utils';
import {
  Col,
  DatePicker,
  Form,
  Popover,
  Select,
  TableColumnsType,
  Typography,
} from 'antd';
import dayjs from 'dayjs';
import BasicTable from '../../components/BasicTable';
import { useDataSharePlan } from '../../hooks/dataSharePlan';
const { Text } = Typography;
const { RangePicker } = DatePicker;
import {
  TASK_TYPE_METADATA_DATA_DOWNLOAD,
  TASK_TYPE_METADATA_DATA_MERGE,
} from '@/common';
import styles from './TaskDetailView.module.css';
const fillSearchParam = (searchParam, values) => {
  const { createDatetimeRange, updateDatetimeRange, type, status } = values;
  searchParam.typeList = type;
  searchParam.statusList = status;
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

const TaskDetailView: React.FC = () => {
  const tableRef = useRef();
  const {
    taskFormat,
    statusFormat,
    getColorForStatus,
    getIconStringForStatus,
    isDownloadType,
    isUploadType,
    isMergeType,
    typeWhitelist,
    statusWhitelist,
  } = useDataSharePlan();

  const searchFields = {
    common: [
      <Col span={8} key="type">
        <Form.Item name={`type`} label={`任务类型`}>
          <Select
            mode="multiple"
            allowClear
            style={{ width: '100%' }}
            placeholder="请选择任务类型"
            options={typeWhitelist}
            fieldNames={{ label: 'value', value: 'code' }}
          />
        </Form.Item>
      </Col>,
      <Col span={8} key="status">
        <Form.Item name={`status`} label={`任务状态`}>
          <Select
            mode="multiple"
            allowClear
            style={{ width: '100%' }}
            placeholder="请选择任务状态"
            options={statusWhitelist}
            fieldNames={{ label: 'value', value: 'code' }}
          />
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

  const columns: TableColumnsType<TaskDTO> = [
    {
      title: '编号',
      dataIndex: 'id',
      render: (value: string) => (
        <Popover content={<Text copyable>{value}</Text>} trigger="click">
          <Text title={`${value}`} ellipsis>{`${
            value?.length > 8 ? value.substring(0, 8) : value
          }`}</Text>
        </Popover>
      ),
      minWidth: 100,
    },
    {
      title: '类型',
      dataIndex: 'type',
      render: (value: string) => <Text>{taskFormat(value)}</Text>,
      minWidth: 130,
    },
    {
      title: '状态',
      dataIndex: 'status',
      render: (value: string) => (
        <Text style={{ color: getColorForStatus(value) }}>
          <div className={`${getIconStringForStatus(value)} inline-flex`} />
          {statusFormat(value)}
        </Text>
      ),
      minWidth: 100,
    },
    {
      title: '任务摘要',
      dataIndex: 'detail',
      render: (value: any) => (
        <>
          {isDownloadType(value.type) ? (
            TASK_TYPE_METADATA_DATA_DOWNLOAD == value.type ? (
              <Col>
                <div>
                  <div className="i-fluent:book-number-16-regular inline-flex" />
                  元数据编号：
                  <Popover
                    content={<Text copyable>{value.typeId}</Text>}
                    trigger="click"
                  >
                    <Text title={`${value.typeId}`} ellipsis>{`${
                      value.typeId?.length > 8
                        ? value.typeId.substring(0, 8)
                        : value.typeId
                    }`}</Text>
                  </Popover>
                </div>
                <div>
                  <div className="i-fluent-mdl2:date-time inline-flex" />
                  日期：{dateToStr(value.datetime, 'YYYY-MM-DD') ?? `N/A`}
                </div>
              </Col>
            ) : (
              <Col>
                <div>
                  <div className="i-mdi:git-repository inline-flex" />
                  仓库：{value.username}/{value.reponame}
                </div>
                <div>
                  <div className="i-fluent-mdl2:date-time inline-flex" />
                  日期：{dateToStr(value.datetime, 'YYYY-MM-DD') ?? `N/A`}
                </div>
              </Col>
            )
          ) : null}
          {isUploadType(value.type) ? (
            <Col>
              <div>
                <div className="i-mdi:git-repository inline-flex" />
                仓库：{value.username}/{value.reponame}
              </div>
              <div>
                <div className="i-fluent-mdl2:date-time inline-flex" />
                日期：{dateToStr(value.startDatetime, 'YYYY-MM-DD') ?? `N/A`}-
                {dateToStr(value.endDatetime, 'YYYY-MM-DD') ?? `N/A`}
              </div>
              <div>
                {value.dataCount > 0 ? (
                  <div>
                    <div>
                      <div className="i-mdi:database-arrow-up inline-flex" />
                      数据页数：{value.dataPageNum}/
                      {Math.ceil(value.dataCount / value.dataPageSize)}
                    </div>
                    <div>
                      <div className="i-mdi:database-arrow-up inline-flex" />
                      每页记录数：{value.dataPageSize}
                    </div>
                  </div>
                ) : null}
                <div>
                  <div className="i-mdi:database-arrow-up inline-flex" />
                  总数据量：{value.dataCount ?? 0}
                </div>
              </div>
            </Col>
          ) : null}
          {isMergeType(value.type) ? (
            TASK_TYPE_METADATA_DATA_MERGE == value.type ? (
              <Col>
                <div>
                  <div className="i-stash:data-date inline-flex" />
                  日期：{dateToStr(value.datetime, 'YYYY-MM-DD') ?? `N/A`}
                </div>
                <div>
                  <div className="i-material-symbols:dataset inline-flex" />
                  数据源编号：
                  <Popover
                    content={<Text copyable>{value.typeId}</Text>}
                    trigger="click"
                  >
                    <Text title={`${value.typeId}`} ellipsis>{`${
                      value.typeId?.length > 8
                        ? value.typeId.substring(0, 8)
                        : value.typeId
                    }`}</Text>
                  </Popover>
                </div>
                <div>
                  <div className="i-mdi:file inline-flex" />
                  文件编号：<Text copyable>{value.dataId}</Text>
                </div>
              </Col>
            ) : (
              <Col>
                <div>
                  <div className="i-mdi:git-repository inline-flex" />
                  仓库：{value.username}/{value.reponame}
                </div>
                <div>
                  <div className="i-stash:data-date inline-flex" />
                  日期：{dateToStr(value.datetime, 'YYYY-MM-DD') ?? `N/A`}
                </div>
                <div>
                  <div className="i-mdi:database-plus inline-flex" />
                  数据量：{value.dataCount ?? 0}
                </div>
                <div>
                  <div className="i-mdi:file inline-flex" />
                  文件编号：<Text copyable>{value.dataId}</Text>
                </div>
              </Col>
            )
          ) : null}
        </>
      ),
      minWidth: 300,
    },
    {
      title: '执行耗时',
      dataIndex: 'costTime',
      render: (value: string) => <Text>{`${value} ms`}</Text>,
      minWidth: 100,
    },
    {
      title: '重试次数',
      dataIndex: 'retryCount',
      render: (value: string) => <Text>{value}</Text>,
      minWidth: 100,
    },
    {
      title: '执行信息',
      dataIndex: 'errorReason',
      render: (value: string) => <Text>{value}</Text>,
      minWidth: 100,
    },
    {
      title: '创建时间',
      dataIndex: 'createDatetime',
      render: (value: string) => (
        <Text title={dateToStr(value)}>{dateToStr(value, 'YYYY-MM-DD')}</Text>
      ),
      minWidth: 100,
    },
    {
      title: '更新时间',
      dataIndex: 'updateDatetime',
      render: (value: string) => (
        <Text title={dateToStr(value)}>{dateToStr(value, 'YYYY-MM-DD')}</Text>
      ),
      minWidth: 100,
    },
  ];

  return (
    <>
      <BasicTable
        ref={tableRef}
        mode={['r']}
        searchProps={{
          columns,
          searchFields,
          fillSearchParam,
          search: async (searchParam) => {
            return await TaskApi.searchTaskWithDetail(searchParam);
          },
        }}
      ></BasicTable>
    </>
  );
};

export default TaskDetailView;
