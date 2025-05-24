import { DataSourceMetadataApi } from "@/common/api";
import { DataSourceMetadata } from "@/common/data/domain/dataSourceMetadata";
import { dateToStr, emptyReturnUndefined } from "@/common/utils";
import {
  Col,
  DatePicker,
  Form,
  Input,
  Switch,
  TableColumnsType,
  Typography, message
} from "antd";
import { Popover } from "antd/lib";
import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";
import BasicTable from "../../components/BasicTable";
import { useDataSourceMetadata } from "../../hooks/dataSourceMetadata";
import styles from "./DataSourceMetadataView.module.css";
const { Text } = Typography;
const { RangePicker } = DatePicker;
const { convertSortField } = useDataSourceMetadata();
dayjs.extend(duration)

const fillSearchParam = (searchParam, values) => {
  const { id, name, createDatetime, updateDatetime } = values;
  searchParam.name = emptyReturnUndefined(name);
  searchParam.id = emptyReturnUndefined(id);
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

const DataSourceMetadataView: React.FC = () => {

  const [messageApi, contextHolder] = message.useMessage();
  const tableRef = useRef(null);

  const columns: TableColumnsType<DataSourceMetadata> = [
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
      title: '名称',
      dataIndex: 'name',
      render: (value: string) =>
        <Popover
          content={<Text copyable>{value}</Text>}
          trigger="click"
        >
          <Text
            className={styles.name}
            title={`${value}`}
            ellipsis
          >{value}</Text>
        </Popover>,
      minWidth: 100,
    },
    {
      title: '描述',
      dataIndex: 'description',
      render: (value: string) =>
        <Popover
          content={<Text copyable>{value}</Text>}
          trigger="click"
        >
          <Text
            className={styles.description}
            title={`${value}`}
            ellipsis
          >{value}</Text>
        </Popover>,
      minWidth: 100,
    },
    {
      title: '图标',
      dataIndex: 'icon',
      render: (value: string) =>
        <div className={value}></div>,
      minWidth: 100,
    },
    {
      title: '类型',
      dataIndex: 'type',
      render: (value: string) =>
        <Popover
          content={<Text copyable>{value}</Text>}
          trigger="click"
        >
          <Text
            className={styles.name}
            title={`${value}`}
            ellipsis
          >{value}</Text>
        </Popover>,
      minWidth: 100,
    },
    {
      title: '配置',
      dataIndex: 'config',
      render: (value: object) =>
        <Popover
          content={<Text copyable>{value ? JSON.stringify(value) : ""}</Text>}
          trigger="click"
        >
          <Text
            className={styles.config}
            title={`${value ? JSON.stringify(value) : ""}`}
            ellipsis
          >{value ? JSON.stringify(value) : ""}</Text>
        </Popover>,
      minWidth: 100,
    },
    {
      title: '数据',
      dataIndex: 'data',
      render: (value: object) =>
        <Popover
          className={styles.data}
          content={<Text copyable>{value ? JSON.stringify(value) : ""}</Text>}
          trigger="click"
        >
          <Text
            title={`${value ? JSON.stringify(value) : ""}`}
            ellipsis
          >{value ? JSON.stringify(value) : ""}</Text>
        </Popover>,
      minWidth: 100,
    },
    {
      title: '启用状态',
      dataIndex: 'enable',
      render: (value: boolean) => <Switch disabled value={value}></Switch>,
      minWidth: 100,
    },
    {
      title: '排序',
      dataIndex: 'seq',
      render: (value: string) => <Text>{value}</Text>,
      minWidth: 100,
    },
    {
      title: '自动更新',
      dataIndex: 'autoUpdateEnable',
      render: (value: boolean) => <Switch disabled value={value}></Switch>,
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
      <Col span={8} key="name">
        <Form.Item
          name={`name`}
          label={`名称`}
        >
          <Input allowClear placeholder="请输入名称" />
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
          return await DataSourceMetadataApi.dataSourceMetadataSearch(searchParam);
        },
        orderByColumn: "seq",
        searchParam: {
        }
      }}
      rowKeyFunction={(record) => { return record.id }}
    ></BasicTable>
  </>
}

export default DataSourceMetadataView;
