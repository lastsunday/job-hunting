import { TagApi } from "@/common/api";
import { Tag } from "@/common/data/domain/tag";
import { dateToStr } from "@/common/utils";
import {
  Col,
  Form,
  Input,
  Modal,
  Select,
  Switch,
  TableColumnsType,
  Typography, message
} from "antd";
import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";
import BasicTable from "../../components/BasicTable";
import { TagData } from "../../data/TagData";
import { TagEditData } from "../../data/TagEditData";
import { useTag } from "../../hooks/tag";
import TagEdit from "./TagEdit";

const { Text } = Typography;
const { convertSortField } = useTag();
dayjs.extend(duration)

const fillSearchParam = (searchParam, values) => {
  const { tagName, isPublic } = values;
  searchParam.tagName = tagName;
  searchParam.isPublic = isPublic;
}

const TagView: React.FC = () => {

  const [messageApi, contextHolder] = message.useMessage();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editData, setEditData] = useState<TagEditData>();
  const [mode, setMode] = useState<"add" | "update">("update");
  const tableRef = useRef();

  const columns: TableColumnsType<TagData> = [
    {
      title: '编号',
      dataIndex: 'tagId',
      render: (value: string) => <Text copyable ellipsis title={value}>{`${value && value.length > 5 ? value.slice(0, 5) + "..." : value}`}</Text>,
      minWidth: 100,
    },
    {
      title: '名称',
      dataIndex: 'tagName',
      render: (value: string) => <Text>{value}</Text>,
      minWidth: 300,
    },
    {
      title: '标签私密性',
      dataIndex: 'isPublic',
      render: (value: boolean, record: TagData) => <Switch checkedChildren="公开" unCheckedChildren="私有" value={value} onChange={async (checked, event) => {
        let entity = new Tag();
        entity.tagId = record.tagId;
        entity.tagName = record.tagName;
        entity.isPublic = checked ? true : false;
        await TagApi.addOrUpdateTag(entity);
        tableRef.current.refresh();
      }}></Switch>,
      minWidth: 100,
    },
    {
      title: '创建时间',
      dataIndex: 'createDatetime',
      render: (value: Date) => <Text title={dateToStr(value)}>{dateToStr(value,"YYYY-MM-DD")}</Text>,
      minWidth: 100,
      sorter: true,
    },
    {
      title: '更新时间',
      dataIndex: 'updateDatetime',
      render: (value: Date) => <Text title={dateToStr(value)}>{dateToStr(value,"YYYY-MM-DD")}</Text>,
      minWidth: 100,
      sorter: true,
    },
  ];

  const searchFields = {
    common: [
      <Col span={8} key="tagName">
        <Form.Item
          name={`tagName`}
          label={`名称`}
        >
          <Input allowClear placeholder="请输入名称" />
        </Form.Item>
      </Col>,
      <Col span={8} key="isPublic">
        <Form.Item
          name={`isPublic`}
          label={`标签私密性`}
        >
          <Select allowClear options={[{ value: false, label: <span>私有</span> }, { value: true, label: <span>公有</span> }]} />
        </Form.Item>
      </Col>,
    ]
  }

  const onSave = async (data: TagEditData) => {
    try {
      const { tagName, isPublic } = data;
      let entity = new Tag();
      entity.tagName = tagName;
      entity.isPublic = isPublic;
      await TagApi.addOrUpdateTag(entity);
      setIsEditModalOpen(false);
      tableRef?.current.refresh();
    } catch (e) {
      messageApi.open({
        type: 'error',
        content: e.message,
      });
    }
  }

  const onAdd = () => {
    setMode("add");
    setEditData({
      isPublic: false,
    });
    setIsEditModalOpen(true);
  }
  const onDelete = async (keys: React.Key[]) => {
    await TagApi.tagDeleteByIds(keys);
    tableRef?.current.refresh();
  }

  return <>
    {contextHolder}
    <BasicTable
      ref={tableRef}
      mode={["r", "c", "d"]}
      onAdd={onAdd}
      onDelete={onDelete}
      searchProps={{
        columns,
        searchFields,
        fillSearchParam,
        convertSortField,
        search: async (searchParam) => {
          return await TagApi.tagSearch(searchParam);
        },
        orderByColumn: "createDatetime",
        searchParam: {
        }
      }}
      rowKeyFunction={(record) => { return record.tagId }}
    ></BasicTable>
    <Modal
      title={`${mode == "update" ? "编辑标签" : "新增标签"}`}
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
      <TagEdit
        mode={mode}
        data={editData}
        onSave={onSave}
        validTagName={async (value) => {
          return await TagApi.tagGetByName([value]) == null;
        }}
      ></TagEdit>
    </Modal>
  </>
}

export default TagView;