import { DataSourceMetadataApi } from "@/common/api";
import { DataSourceMetadata, TYPE_GIT_METADATA } from "@/common/data/domain/dataSourceMetadata";
import { clone, dateToStr, emptyReturnUndefined, toJSONStringPretty } from "@/common/utils";
import {
  Col,
  DatePicker,
  Flex,
  Form,
  FormProps,
  Input,
  Switch,
  TableColumnsType,
  Typography, message,
  notification
} from "antd";
import { Button, Modal, Popover, Space } from "antd/lib";
import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";
import BasicTable from "../../components/BasicTable";
import { useDataSourceMetadata } from "../../hooks/dataSourceMetadata";
import DataSourceMetadataEditView from "./DataSourceMetadataEditView";
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

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editData, setEditData] = useState<DataSourceMetadata>();
  const [mode, setMode] = useState<"add" | "update">("update");

  const [notificationApi, notificationContextHolder] =
    notification.useNotification({ stack: { threshold: 5 } });

  const accept = '.json';
  const [importByFileLoading, setImportByFileLoading] = useState(false);
  const [isImportByFileModalOpen, setIsImportByFileModalOpen] = useState(false);
  const [files, setFiles] = useState([]);
  const [importByNetworkLoading, setImportByNetworkLoading] = useState(false);
  const [isImportByNetworkModalOpen, setIsImportByNetworkModalOpen] = useState(false);
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
        <div className={styles.icon} style={{ backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(value)}")` }}></div>,
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
      sorter: true,
      defaultSortOrder: "ascend"
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
    {
      title: '操作',
      key: 'action',
      fixed: "right",
      render: (_, record) => (
        <Space size="middle">
          <Button type="link" onClick={() => {
            onEdit(record);
          }}>编辑</Button>
        </Space>
      ),
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

  const onAdd = () => {
    setMode("add");
    setEditData({
      type: TYPE_GIT_METADATA,
      enable: true,
      autoUpdateEnable: true,
    });
    setIsEditModalOpen(true);
  }

  const onEdit = (record: DataSourceMetadata) => {
    setMode("update");
    const cloneRecord = clone(record);
    cloneRecord.config = toJSONStringPretty(cloneRecord.config);
    cloneRecord.data = toJSONStringPretty(cloneRecord.data) ?? "";
    setEditData(cloneRecord);
    setIsEditModalOpen(true);
  }

  const onSave = async (data: DataSourceMetadata) => {
    await DataSourceMetadataApi.dataSourceMetadataAddOrUpdate(data);
    setIsEditModalOpen(false);
    tableRef?.current.refresh();
  }

  const onDelete = async (keys: React.Key[]) => {
    await DataSourceMetadataApi.dataSourceMetadataDeleteByIds(keys);
    tableRef?.current.refresh();
  }

  const handleImportByFile = async (e) => {
    setFiles(e.target.files);
  };

  const showNotification = ({
    key = null,
    type = 'info',
    message = dayjs().format('YYYY-MM-DD HH:mm:ss'),
    description,
    duration = 10,
  }) => {
    notificationApi.open({
      key,
      type,
      message,
      description,
      duration,
      pauseOnHover: true,
      showProgress: true,
    });
  };

  const handleData = async (text: string) => {
    const object = JSON.parse(text);
    //TODO check object is DataSourceMetadata Object
    await DataSourceMetadataApi.dataSourceMetadataAddOrUpdate(object);
  }

  const confirmImportByFile = async () => {
    if (files && files.length > 0) {
      setImportByFileLoading(true);
      setTimeout(async () => {
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const reader = new FileReader();
          reader.readAsText(file);
          reader.onload = async function (event) {
            const result = event?.target?.result as string;
            try {
              await handleData(result);
              setIsImportByFileModalOpen(false);
              tableRef.current.refresh();
            } catch (e) {
              showNotification({
                key: `handleData`,
                type: 'error',
                description: `导入失败,${e}`,
              });
            }
          };
          reader.onerror = function (event) {
            showNotification({
              key: `${i}`,
              type: 'error',
              description: `读取元数据文件失败`,
            });
            setImportByFileLoading(false);
          };
        }
      }, 0);
    } else {
      showNotification({
        type: 'error',
        description: `请选择有效的元数据文件`,
      });
    }
  };

  const confirmImportByNetwork: FormProps<any>["onFinish"] = async (values) => {
    setImportByFileLoading(true);
    setTimeout(async () => {
      let result = null
      try {
        result = await (await fetch(values.url)).text();
        try {
          await handleData(result);
          setIsImportByNetworkModalOpen(false);
          tableRef.current.refresh();
        } catch (e) {
          showNotification({
            key: `handleData`,
            type: 'error',
            description: `导入失败,${e}`,
          });
        }
      } catch (e) {
        showNotification({
          key: `confirmImportByNetwork`,
          type: 'error',
          description: `读取元数据文件失败,${e}`,
        });
      }
    }, 0);
  };

  return <>
    {contextHolder}
    {notificationContextHolder}
    <BasicTable
      ref={tableRef}
      mode={["c", "r", "d"]}
      onAdd={onAdd}
      onDelete={onDelete}
      searchProps={{
        columns,
        searchFields,
        fillSearchParam,
        convertSortField,
        search: async (searchParam) => {
          return await DataSourceMetadataApi.dataSourceMetadataSearch(searchParam);
        },
      }}
      rowKeyFunction={(record) => { return record.id }}
      additionMenu={
        <Flex gap={5}>
          <Button color="default" variant="dashed" onClick={() => {
            setImportByFileLoading(false);
            setIsImportByFileModalOpen(true);
          }}>从文件导入</Button>
          <Button color="default" variant="dashed" onClick={() => {
            setImportByNetworkLoading(false);
            setIsImportByNetworkModalOpen(true);
          }}>从网络导入</Button>
        </Flex>
      }
    ></BasicTable>
    <Modal
      title={`${mode == "update" ? "编辑" : "新增"}`}
      open={isEditModalOpen}
      onCancel={() => {
        setIsEditModalOpen(false);
      }}
      maskClosable={false}
      footer={null}
      style={{ maxWidth: "1000px" }}
      width="80%"
      destroyOnClose
    >
      <DataSourceMetadataEditView
        mode={mode}
        data={editData}
        onSave={onSave}
      ></DataSourceMetadataEditView>
    </Modal>
    <Modal
      title={`从文件导入`}
      open={isImportByFileModalOpen}
      onCancel={() => {
        setIsImportByFileModalOpen(false);
      }}
      footer={null}
      style={{ maxWidth: '500px' }}
      width="80%"
      destroyOnClose
    >
      <Flex vertical gap={5}>
        <Text>请选择元数据文件</Text>
        <Flex vertical gap={10}>
          <Input
            type="file"
            accept={accept}
            multiple
            onChange={handleImportByFile}
          ></Input>
          <Flex justify="end">
            <Button
              type="primary"
              onClick={confirmImportByFile}
              loading={importByFileLoading}
            >
              确定
            </Button>
          </Flex>
        </Flex>
      </Flex>
    </Modal>
    <Modal
      title={`从网络导入`}
      open={isImportByNetworkModalOpen}
      onCancel={() => {
        setIsImportByNetworkModalOpen(false);
      }}
      footer={null}
      style={{ maxWidth: '500px' }}
      width="80%"
      destroyOnClose
    >
      <Flex vertical gap={5}>
        <Flex vertical gap={10}>
          <Form
            layout="vertical"
            onFinish={confirmImportByNetwork}
          >
            <Form.Item
              name="url"
              label="元数据文件链接"
              rules={[{ type: "url", message: "请输入有效的链接" }]}
            >
              <Input
                placeholder="https://raw.githubusercontent.com/lastsunday/job-hunting-data-source/refs/heads/main/metadata.json"
              ></Input>
            </Form.Item>
            <Form.Item label={null}>
              <Flex justify="end">
                <Space>
                  <Button
                    loading={importByNetworkLoading}
                    htmlType="submit">保存</Button>
                </Space>
              </Flex>
            </Form.Item>
          </Form>
        </Flex>
      </Flex>
    </Modal>
  </>
}

export default DataSourceMetadataView;
