import { CompanyCommentApi } from "@/common/api";
import { CompanyComment } from "@/common/data/domain/companyComment";
import { dateToStr, emptyReturnUndefined, emptyReturnUndefinedOrNull, notNumberReturnUndefinedOrNull } from "@/common/utils";
import {
  Col,
  DatePicker,
  Form,
  Input,
  TableColumnsType,
  Typography, message
} from "antd";
import { Popover } from "antd/lib";
import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";
import BasicTable from "../../components/BasicTable";
import { useCompanyComment } from "../../hooks/companyComment";
import styles from "./CompanyCommentView.module.css";
const { Text } = Typography;
const { RangePicker } = DatePicker;
const { convertSortField } = useCompanyComment();
dayjs.extend(duration)

const fillSearchParam = (searchParam, values) => {
  const { id, companyId, companyName, sourceType, source, sourceDataName, createDatetime, updateDatetime } = values;
  searchParam.companyName = emptyReturnUndefined(companyName);
  searchParam.id = emptyReturnUndefined(id);
  searchParam.companyId = emptyReturnUndefined(companyId);
  searchParam.sourceType = notNumberReturnUndefinedOrNull(sourceType);
  searchParam.source = emptyReturnUndefinedOrNull(source);
  searchParam.sourceDataName = emptyReturnUndefinedOrNull(sourceDataName);
  if (createDatetime && createDatetime.length > 0) {
    searchParam.startDatetimeForCreate = createDatetime[0];
    searchParam.endDatetimeForCreate = createDatetime[1];
  } else {
    searchParam.startDatetimeForCreate = null;
    searchParam.endDatetimeForCreate = null;
  }
  if (updateDatetime && updateDatetime.length > 0) {
    searchParam.startDatetimeForUpdate = updateDatetime[0];
    searchParam.endDatetimeForUpdate = updateDatetime[1];
  } else {
    searchParam.startDatetimeForUpdate = null;
    searchParam.endDatetimeForUpdate = null;
  }
}

const CompanyCommentView: React.FC = () => {

  const [messageApi, contextHolder] = message.useMessage();
  const tableRef = useRef(null);

  const columns: TableColumnsType<CompanyComment> = [
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
      title: '公司编号',
      dataIndex: 'companyId',
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
      title: '公司名称',
      dataIndex: 'companyName',
      render: (value: string) =>
        <Popover
          content={<Text copyable>{value}</Text>}
          trigger="click"
        >
          <Text
            className={styles.companyName}
            title={`${value}`}
            ellipsis
          >{value}</Text>
        </Popover>,
      minWidth: 100,
    },
    {
      title: '评论',
      dataIndex: 'comment',
      render: (value: string) =>
        <Popover
          content={<Text copyable>{value}</Text>}
          trigger="click"
        >
          <Text
            className={styles.comment}
            title={`${value}`}
            ellipsis
          >{value}</Text>
        </Popover>,
      minWidth: 100,
    },
    {
      title: "情感",
      dataIndex: 'emotion',
      render: (value: string) =>
        <Popover
          content={<Text copyable>{value}</Text>}
          trigger="click"
        >
          <Text
            className={styles.comment}
            title={`${value}`}
            ellipsis
          >{value}</Text>
        </Popover>,
      minWidth: 100,
    },
    {
      title: '数据集名称',
      dataIndex: 'sourceDataName',
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
      title: '创建时间',
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
          name={`companyName`}
          label={`公司名称`}
        >
          <Input allowClear placeholder="请输入公司名称" />
        </Form.Item>
      </Col>,
      <Col span={8} key="sourceDataName">
        <Form.Item
          name={`sourceDataName`}
          label={`数据集名称`}
        >
          <Input allowClear placeholder="请输入数据集名称" />
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
    ],
    expand: [
      <Col span={8} key="id">
        <Form.Item
          name={`id`}
          label={`编号`}
        >
          <Input allowClear placeholder="请输入编号" />
        </Form.Item>
      </Col>,
      <Col span={8} key="companyId">
        <Form.Item
          name={`companyId`}
          label={`公司编号`}
        >
          <Input allowClear placeholder="请输入公司编号" />
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
      <Col span={8} key="createDatetime">
        <Form.Item
          name={`createDatetime`}
          label={`创建时间`}
        >
          <RangePicker allowClear />
        </Form.Item>
      </Col>,
      <Col span={8} key="updateDatetime">
        <Form.Item
          name={`updateDatetime`}
          label={`更新时间`}
        >
          <RangePicker allowClear />
        </Form.Item>
      </Col>,]
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
          return await CompanyCommentApi.companyCommentSearch(searchParam);
        },
        orderByColumn: "updateDatetime",
        searchParam: {
        }
      }}
      rowKeyFunction={(record) => { return record.id }}
    ></BasicTable>
  </>
}

export default CompanyCommentView;
