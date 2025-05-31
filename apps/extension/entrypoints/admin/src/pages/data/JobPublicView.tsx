import { JobPublicApi } from "@/common/api";
import { JobPublic } from "@/common/data/domain/jobPublic";
import { dateToStr, convertEmptyStringToNull } from "@/common/utils";
import {
  Col,
  Form,
  Input,
  TableColumnsType,
  Typography, message
} from "antd";
import { Popover } from "antd/lib";
import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";
import BasicTable from "../../components/BasicTable";
import { useJobPublic } from "../../hooks/jobPublic";
const { Text } = Typography;
const { convertSortField } = useJobPublic();
dayjs.extend(duration)

const fillSearchParam = (searchParam, values) => {
  const { jobId, sourceType, source } = values;
  if (jobId) {
    searchParam.jobIds = [jobId];
  } else {
    searchParam.jobIds = null;
  }
  const targetSourceType = Number.parseInt(sourceType);
  if (Number.isNaN(targetSourceType)) {
    searchParam.sourceType = null;
  } else {
    searchParam.sourceType = targetSourceType;
  }
  if (source === undefined || source === null || source === '') {
    searchParam.source = undefined;
  } else {
    if (source.trim() === '') {
      searchParam.source = null;
    } else {
      searchParam.source = source;
    }
  }
}

const JobPublicView: React.FC = () => {

  const [messageApi, contextHolder] = message.useMessage();
  const tableRef = useRef(null);

  const columns: TableColumnsType<JobPublic> = [
    {
      title: '编号',
      dataIndex: 'id',
      render: (value: string) =>
        <Popover
          content={<Text copyable>{value}</Text>}
          trigger="click"
        >
          <Text
            title={`${value}`}
            ellipsis
          >{`${value?.length > 8 ? value.substring(0, 8) : value}`}</Text>
        </Popover>,
      minWidth: 100,
    },
    {
      title: '职位编号',
      dataIndex: 'jobId',
      render: (value: string) =>
        <Popover
          content={<Text copyable>{value}</Text>}
          trigger="click"
        >
          <Text
            title={`${value}`}
            ellipsis
          >{value}</Text>
        </Popover>,
      minWidth: 100,
    },
    {
      title: '来源类型',
      dataIndex: 'sourceType',
      render: (value: string) =>
        <Popover
          content={<Text copyable>{value}</Text>}
          trigger="click"
        >
          <Text
            title={`${value}`}
            ellipsis
          >{value}</Text>
        </Popover>,
      minWidth: 100,
    },
    {
      title: '来源',
      dataIndex: 'source',
      render: (value: string) =>
        <Popover
          content={<Text copyable>{value}</Text>}
          trigger="click"
        >
          <Text
            title={`${value}`}
            ellipsis
          >{value}</Text>
        </Popover>,
      minWidth: 100,
    },
    {
      title: '首次扫描时间',
      dataIndex: 'createDatetime',
      render: (value: Date) => <Text title={dateToStr(value)}>{dateToStr(value, "YYYY-MM-DD")}</Text>,
      minWidth: 100,
      sorter: true,
    },
    {
      title: '更新时间',
      dataIndex: 'updateDatetime',
      render: (value: Date) => <Text title={dateToStr(value)}>{dateToStr(value, "YYYY-MM-DD")}</Text>,
      minWidth: 100,
      sorter: true,
    },
  ];

  const searchFields = {
    common: [
      <Col span={8} key="jobId">
        <Form.Item
          name={`jobId`}
          label={`职位编号`}
        >
          <Input allowClear placeholder="请输入职位编号" />
        </Form.Item>
      </Col>,
      <Col span={8} key="sourceType">
        <Form.Item
          name={`sourceType`}
          label={`来源类型`}
        >
          <Input allowClear placeholder="请输入来源类型" />
        </Form.Item>
      </Col>,
      <Col span={8} key="source">
        <Form.Item
          name={`source`}
          label={`来源`}
        >
          <Input allowClear placeholder="请输入来源" />
        </Form.Item>
      </Col>,
    ]
  }

  return <>
    {contextHolder}
    <BasicTable
      ref={tableRef}
      mode={["r"]}
      searchProps={{
        columns,
        searchFields,
        fillSearchParam,
        convertSortField,
        search: async (searchParam) => {
          return await JobPublicApi.jobPublicSearch(searchParam);
        },
        orderByColumn: "updateDatetime",
        searchParam: {
        }
      }}
      rowKeyFunction={(record) => { return record.id }}
    ></BasicTable>
  </>
}

export default JobPublicView;
