import { DataSharePartnerApi } from "@/common/api";
import { DEFAULT_DATA_REPO, DEFAULT_REPO_TYPE } from "@/common/config";
import { Config, DataSharePartner } from "@/common/data/domain/dataSharePartner";
import { dateToStr } from "@/common/utils";
import { Button, Col, DatePicker, Flex, Form, Input, Modal, Popover, Space, Switch, TableColumnsType, Tag, Typography } from "antd";
import dayjs from "dayjs";
import BasicTable from "../../components/BasicTable";
import { useTask } from "../../hooks/task";
import DataSourceEdit from "./DataSourceEdit";
import DataSourceFind from "./DataSourceFind";
import styles from "./DataSourceView.module.css";
const { Text } = Typography;
const { RangePicker } = DatePicker;
const { getDisplayNameByTaskType } = useTask();
const fillSearchParam = (searchParam, values) => {
  const { username, createDatetimeRange, updateDatetimeRange } = values;
  searchParam.username = username;
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
}

const DataSourceView: React.FC = () => {

  const [isDataSourceEditModalOpen, setIsDataSourceEditModalOpen] = useState(false);
  const [editDataSourceData, setEditDataSourceData] = useState<DataSharePartner>();
  const [mode, setMode] = useState<"add" | "update">("update");
  const tableRef = useRef(null);

  const [isDataSourceFindModalOpen, setIsDataSourceFindModalOpen] = useState(false);
  const genTaskTypeTag = (taskTypeList) => {
    return taskTypeList ?
      taskTypeList.map(item =>
        <Popover
          content={<Flex vertical>
            <Tag className={styles.tag} color="#108ee9">
              {getDisplayNameByTaskType(item.type)}
            </Tag>
            {item.description ? <Text>{item.description}</Text> : null}
          </Flex>}
          trigger="hover"
        >
          <Tag className={styles.tag} color={item.name ? "#f50" : "#108ee9"}>
            {item.name ? item.name : getDisplayNameByTaskType(item.type)}
          </Tag>
        </Popover>
      )
      : <Tag className={styles.tag}>缺省值</Tag>;
  }

  const searchFields =
  {
    common: [
      <Col span={8} key="username">
        <Form.Item
          name={`username`}
          label={`用户名`}
        >
          <Input placeholder="请输入用户名" allowClear></Input>
        </Form.Item>
      </Col>,
    ],
    expand: [
      <Col span={8} key="createDatetimeRange">
        <Form.Item
          name={`createDatetimeRange`}
          label={`创建时间`}
        >
          <RangePicker />
        </Form.Item>
      </Col>,
      <Col span={8} key="updateDatetimeRange">
        <Form.Item
          name={`updateDatetimeRange`}
          label={`更新时间`}
        >
          <RangePicker />
        </Form.Item>
      </Col>
    ]
  }

  const columns: TableColumnsType<DataSharePartner> = [
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
    },
    {
      title: '用户名',
      dataIndex: 'username',
      render: (value: string) => <Text >{value}</Text>,
      minWidth: 120,
    },
    {
      title: '仓库名',
      dataIndex: 'reponame',
      render: (value: string) => <Text >{value}</Text>,
      minWidth: 150,
    },
    {
      title: '仓库类型',
      dataIndex: 'repoType',
      render: (value: string) => <Text >{value}</Text>,
      minWidth: 100,
    },
    {
      title: '启用状态',
      dataIndex: 'enable',
      render: (value: boolean) => <Switch checked={value} disabled checkedChildren="开启" unCheckedChildren="关闭"></Switch>,
      minWidth: 100,
    },
    {
      title: '配置',
      dataIndex: 'config',
      render: (value: Config) => <Flex wrap> {genTaskTypeTag(value.taskTypeList)}</Flex>,
      minWidth: 100,
    },
    {
      title: '创建时间',
      dataIndex: 'createDatetime',
      render: (value: string) => <Text title={dateToStr(value)}>{dateToStr(value, "YYYY-MM-DD")}</Text>,
      minWidth: 100,
    },
    {
      title: '更新时间',
      dataIndex: 'updateDatetime',
      render: (value: string) => <Text title={dateToStr(value)}>{dateToStr(value, "YYYY-MM-DD")}</Text>,
      minWidth: 100,
    },
    {
      title: '操作',
      key: 'action',
      fixed: "right",
      render: (_, record) => (
        <Space size="middle">
          <Button type="link" onClick={() => {
            setMode("update");
            setEditDataSourceData({
              id: record.id,
              username: record.username,
              reponame: record.reponame,
              repoType: record.repoType,
              enable: record.enable,
              config: record.config,
            });
            setIsDataSourceEditModalOpen(true);
          }}>编辑</Button>
        </Space>
      ),
    },
  ];

  const onDataSourceAdd = () => {
    setMode("add");
    setEditDataSourceData({
      reponame: DEFAULT_DATA_REPO,
      repoType: DEFAULT_REPO_TYPE,
      enable: true,
    });
    setIsDataSourceEditModalOpen(true);
  }

  const onDataSourceSave = async (data: DataSharePartner) => {
    const { id, username, reponame, repoType, enable, config } = data;
    let entity = new DataSharePartner();
    entity.id = id;
    entity.username = username;
    entity.reponame = reponame;
    entity.repoType = repoType;
    entity.enable = enable;
    entity.config = config;
    await DataSharePartnerApi.dataSharePartnerAddOrUpdate(entity);
    setIsDataSourceEditModalOpen(false);
    tableRef?.current.refresh();
  }

  const onDataSourceDelete = async (keys: React.Key[]) => {
    await DataSharePartnerApi.dataSharePartnerDeleteByIds(keys);
    tableRef?.current.refresh();
  }

  return <>
    <BasicTable
      ref={tableRef}
      mode={["r", "c", "d"]}
      onAdd={onDataSourceAdd}
      onDelete={onDataSourceDelete}
      searchProps={{
        columns,
        searchFields,
        fillSearchParam,
        search: async (searchParam) => {
          return await DataSharePartnerApi.searchDataSharePartner(searchParam);
        },
      }}
      rowKeyFunction={(record) => { return record.id }}
      additionMenu={<Flex><Button icon={<div className="i-fluent-mdl2:search-data"></div>} color="pink" variant="dashed" onClick={
        () => {
          setIsDataSourceFindModalOpen(true);
        }
      }>搜寻数据源</Button></Flex>}
    ></BasicTable>
    <Modal
      title={`${mode == "update" ? "编辑" : "新增"}`}
      open={isDataSourceEditModalOpen}
      onCancel={() => {
        setIsDataSourceEditModalOpen(false);
      }}
      maskClosable={false}
      footer={null}
      style={{ maxWidth: "1000px" }}
      width="80%"
      destroyOnClose
    >
      <DataSourceEdit
        mode={mode}
        data={editDataSourceData}
        onSave={onDataSourceSave}
      ></DataSourceEdit>
    </Modal>
    <Modal
      title={`搜寻数据源`}
      open={isDataSourceFindModalOpen}
      onCancel={() => {
        setIsDataSourceFindModalOpen(false);
      }}
      maskClosable={false}
      footer={null}
      style={{ maxWidth: "1500px" }}
      width="80%"
      destroyOnClose
    >
      <DataSourceFind

      ></DataSourceFind>
    </Modal>
  </>
}

export default DataSourceView;
