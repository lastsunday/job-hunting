import { TAG_SOURCE_TYPE_CUSTOM, TAG_SOURCE_TYPE_PLATFORM } from "@/common";
import { JobApi, TagApi } from "@/common/api";
import { JobTagBO } from "@/common/data/bo/jobTagBO";
import { JobTagDTO } from "@/common/data/dto/jobTagDTO";
import { jobTagDataToExcelJSONArrayForView } from "@/common/excel";
import { dateToStr } from "@/common/utils";
import {
  Button,
  Col,
  Flex,
  Form,
  Modal,
  Select,
  Space,
  TableColumnsType,
  Tag,
  Typography, message
} from "antd";
import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";
import BasicTable from "../../components/BasicTable";
import CustomTag from "../../components/CustomTag";
import { JobTagData } from "../../data/JobTagData";
import { JobTagEditData } from "../../data/JobTagEditData";
import { WhitelistData } from "../../data/WhitelistData";
import { useJob } from "../../hooks/job";
import { useJobTag } from "../../hooks/jobTag";
import { useTag } from "../../hooks/tag";
import JobTagEdit from "./JobTagEdit";
import styles from "./JobTagView.module.css";
const { platformFormat } = useJob();

const { Text } = Typography;
const { convertToTagData } = useTag();
const { convertToJobTagDataList, convertSortField } = useJobTag();
dayjs.extend(duration)

const fillSearchParam = (searchParam, values) => {
  const { tags } = values;
  searchParam.tagNames = tags;
}

const JobTagView: React.FC = () => {

  const [messageApi, contextHolder] = message.useMessage();
  const [isJobTagEditModalOpen, setIsJobTagEditModalOpen] = useState(false);
  const [editJobTagData, setEditJobTagData] = useState<JobTagEditData>();
  const [mode, setMode] = useState<"add" | "update">("update");
  const [whitelist, setWhitelist] = useState<WhitelistData[]>([]);
  const tableRef = useRef();

  const columns: TableColumnsType<JobTagData> = [
    {
      title: '职位编号',
      dataIndex: 'jobId',
      render: (value: string) =>  <Text copyable style={{ width: 100 }} title={value}>{`${value && value.length > 5 ? value.slice(0, 5)+"..." : value}`}</Text>,
      minWidth: 100,
    },
    {
      title: '职位名称',
      dataIndex: 'name',
      render: (value: string) => <Text>{value}</Text>,
      minWidth: 100,
    },
    {
      title: '公司全称',
      dataIndex: 'companyName',
      render: (value: string) => <Text>{value}</Text>,
      minWidth: 100,
    },
    {
      title: '招聘平台',
      dataIndex: 'platform',
      render: (value: string) => <Text>{platformFormat(value)}</Text>,
      minWidth: 100,
    },
    {
      title: '标签(平台)',
      dataIndex: 'tagArray',
      render: (value: JobTagDTO[]) => {
        const result = [];
        value.filter(item => item.sourceType == TAG_SOURCE_TYPE_PLATFORM).map((item,index) => {
          result.push(
            <Tag className={styles.tag} key={index}>{item.tagName}</Tag>
          );
        })
        return <Flex wrap gap={2}>{result}</Flex>;
      },
      minWidth: 200,
    },
    {
      title: '标签(我)',
      dataIndex: 'tagArray',
      render: (value: JobTagDTO[]) => {
        const result = [];
        const tagData = convertToTagData(value.filter(item => item.sourceType == TAG_SOURCE_TYPE_CUSTOM && item.source == null));
        tagData.map((item,index) => {
          result.push(
            <CustomTag item={item} key={index}></CustomTag>
          );
        })
        return <Flex wrap gap={2}>{result}</Flex>;
      },
      minWidth: 200,
    },
    {
      title: '标签(伙伴)',
      dataIndex: 'tagArray',
      render: (value: JobTagDTO[]) => {
        const result = [];
        const tagData = convertToTagData(value.filter(item => item.sourceType == TAG_SOURCE_TYPE_CUSTOM && item.source != null));
        tagData.map((item) => {
          result.push(
            <CustomTag item={item}></CustomTag>
          );
        })
        return <Flex wrap gap={2}>{result}</Flex>;
      },
      minWidth: 200,
    },
    {
      title: '标签数',
      dataIndex: 'nameArray',
      render: (value: string[]) => <Text>{value.length}</Text>,
      minWidth: 80,
    },
    {
      title: '更新时间',
      dataIndex: 'updateDatetime',
      render: (value: Date) => <Text title={dateToStr(value)}>{dateToStr(value,"YYYY-MM-DD")}</Text>,
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
            setMode("update");
            setEditJobTagData({
              id: record.jobId,
              name: record.name,
              tags: record.tagArray.filter(item => (item.sourceType == TAG_SOURCE_TYPE_CUSTOM && item.source == null)).map(item => item.tagName),
            });
            setIsJobTagEditModalOpen(true);
          }}>编辑标签</Button>
        </Space>
      ),
    },
  ];

  const searchFields = {
    common: [
      <Col span={8} key="tags">
        <Form.Item
          name={`tags`}
          label={`标签`}
        >
          <Select
            allowClear
            mode="tags"
            style={{ width: "100%" }}
            placeholder="请输入职位标签"
            options={whitelist}
          />
        </Form.Item>
      </Col>,
    ]
  }

  useEffect(() => {
    const getWhitelist = async () => {
      let allTags = await TagApi.getAllTag();
      let tagItems = [];
      allTags.forEach((item) => {
        tagItems.push({ value: item.tagName, code: item.tagId });
      });
      setWhitelist(tagItems);
    };
    getWhitelist();
  }, []);

  const onJobTagSave = async (data: JobTagEditData) => {
    const { id, tags } = data;
    let bo = new JobTagBO();
    bo.jobId = id;
    bo.tags = tags;
    await JobApi.jobTagAddOrUpdate(bo);
    setIsJobTagEditModalOpen(false);
    tableRef?.current.refresh();
  }

  const onJobTagAdd = () => {
    setMode("add");
    setEditJobTagData(null);
    setIsJobTagEditModalOpen(true);
  }
  const onJobTagDelete = async (keys: React.Key[]) => {
    await JobApi.jobTagDeleteByJobIds(keys);
    tableRef?.current.refresh();
  }

  return <>
    {contextHolder}
    <BasicTable
      ref={tableRef}
      mode={["r", "c", "d"]}
      onAdd={onJobTagAdd}
      onDelete={onJobTagDelete}
      searchProps={{
        columns,
        searchFields,
        fillSearchParam,
        convertSortField,
        search: async (searchParam) => {
          return await JobApi.jobTagSearch(searchParam);
        },
        convertToDataList: convertToJobTagDataList,
      }}
      rowKeyFunction={(record) => { return record.jobId }}
      exportProps={{
        dataToExcelJSONArray: jobTagDataToExcelJSONArrayForView,
        title: "职位标签"
      }}
    ></BasicTable>
    <Modal
      title={`${mode == "update" ? "编辑职位标签" : "新增职位标签"}`}
      open={isJobTagEditModalOpen}
      onCancel={() => {
        setIsJobTagEditModalOpen(false);
      }}
      maskClosable={false}
      footer={null}
      style={{ maxWidth: "1000px" }}
      width="80%"
      destroyOnClose
    >
      <JobTagEdit
        mode={mode}
        data={editJobTagData}
        whitelist={whitelist}
        onSave={onJobTagSave}
        validJobId={async (value) => {
          return (await JobApi.jobTagGetAllDTOByJobIds([value])).length <= 0;
        }}
      ></JobTagEdit>
    </Modal>
  </>
}

export default JobTagView;