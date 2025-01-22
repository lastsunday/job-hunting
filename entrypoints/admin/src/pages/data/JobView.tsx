import { TAG_SOURCE_TYPE_CUSTOM, TAG_SOURCE_TYPE_PLATFORM } from "@/common";
import { JobApi, TagApi } from "@/common/api";
import { JobTagBO } from "@/common/data/bo/jobTagBO";
import { JobTagDTO } from "@/common/data/dto/jobTagDTO";
import { jobDataToExcelJSONArray } from "@/common/excel";
import { dateToStr } from "@/common/utils";
import {
  Button,
  Col,
  DatePicker,
  Flex,
  Form,
  Input,
  Modal,
  Space,
  TableColumnsType,
  Tag,
  Typography, message
} from "antd";
import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";
import BasicTable from "../../components/BasicTable";
import CustomTag from "../../components/CustomTag";
import JobItemTable from "../../components/JobItemTable";
import { CompanyData } from "../../data/CompanyData";
import { JobData } from "../../data/JobData";
import { JobTagEditData } from "../../data/JobTagEditData";
import { WhitelistData } from "../../data/WhitelistData";
import { useJob } from "../../hooks/job";
import { useTag } from "../../hooks/tag";
import JobTagEdit from "./JobTagEdit";
const { RangePicker } = DatePicker;
const { Text } = Typography;
const { convertToJobDataList, platformFormat, convertSortField } = useJob();
dayjs.extend(duration)
const { convertToTagData } = useTag();

import styles from "./JobView.module.css";

const searchFields =
{
  common: [
    <Col span={8} key="name">
      <Form.Item
        name={`name`}
        label={`名称`}
      >
        <Input allowClear placeholder="请输入名称" />
      </Form.Item>
    </Col>,
    <Col span={8} key="companyName">
      <Form.Item
        name={`companyName`}
        label={`公司名`}
      >
        <Input allowClear placeholder="请输入公司名" />
      </Form.Item>
    </Col>,
    <Col span={8} key="location">
      <Form.Item
        name={`location`}
        label={`地区`}
      >
        <Input allowClear placeholder="请输入地区" />
      </Form.Item>
    </Col>,
  ],
  expand: [<Col span={8} key="address">
    <Form.Item
      name={`address`}
      label={`地址`}
    >
      <Input allowClear placeholder="请输入地址" />
    </Form.Item>
  </Col>,
  <Col span={8} key="createDatetime">
    <Form.Item
      name={`createDatetime`}
      label={`首次扫描时间`}
    >
      <RangePicker allowClear />
    </Form.Item>
  </Col>,
  <Col span={8} key="publishDatetime">
    <Form.Item
      name={`publishDatetime`}
      label={`发布时间`}
    >
      <RangePicker allowClear />
    </Form.Item>
  </Col>,]
}

const fillSearchParam = (searchParam, values) => {
  const { name, location, address, companyName, createDatetime, publishDatetime } = values;
  searchParam.jobName = name;
  searchParam.jobLocationName = location;
  searchParam.jobAddress = address;
  searchParam.jobCompanyName = companyName;
  if (createDatetime && createDatetime.length > 0) {
    searchParam.startDatetime = createDatetime[0];
    searchParam.endDatetime = createDatetime[1];
  } else {
    searchParam.startDatetime = null;
    searchParam.endDatetime = null;
  }
  if (publishDatetime && publishDatetime.length > 0) {
    searchParam.firstPublishStartDatetime = publishDatetime[0];
    searchParam.firstPublishEndDatetime = publishDatetime[1];
  } else {
    searchParam.firstPublishStartDatetime = null;
    searchParam.firstPublishEndDatetime = null;
  }
}

const JobView: React.FC = () => {

  const [messageApi, contextHolder] = message.useMessage();
  const [isJobTagEditModalOpen, setIsJobTagEditModalOpen] = useState(false);
  const [editJobTagData, setEditJobTagData] = useState<JobTagEditData>();
  const [whitelist, setWhitelist] = useState<WhitelistData[]>([]);
  const tableRef = useRef();

  const columns: TableColumnsType<JobData> = [
    {
      title: '编号',
      dataIndex: 'id',
      render: (value: string) => <Text copyable style={{ width: 100 }} title={value}>{`${value && value.length > 5 ? value.slice(0, 5)+"..." : value}`}</Text>,
      minWidth: 100,
    },
    {
      title: '名称',
      dataIndex: 'name',
      render: (text: string) => <Text copyable title={text}>{text}</Text>,
      minWidth: 200,
    },
    {
      title: '公司',
      dataIndex: 'company',
      render: (value: CompanyData) => <Text copyable title={value.name}>{value.name}</Text>,
      minWidth: 200,
    },
    {
      title: '发布时间',
      dataIndex: 'publishDatetime',
      render: (value: Date) => <Text title={dateToStr(value)}>{dateToStr(value, "YYYY-MM-DD")}</Text>,
      minWidth: 100,
      sorter: true,
    },
    {
      title: '职位标签(平台)',
      dataIndex: 'jobTagList',
      render: (value: JobTagDTO[]) => {
        const result = [];
        const tagData = convertToTagData(value ? value.filter(item => item.sourceType == TAG_SOURCE_TYPE_PLATFORM) : []);
        tagData.map((item, index) => {
          result.push(
            <Tag className={styles.tag} key={index}>{item.tagName}</Tag>
          );
        })
        return <Flex wrap gap={2}>{result}</Flex>;
      },
      minWidth: 200,
    },
    {
      title: '职位标签',
      dataIndex: 'jobTagList',
      render: (value: JobTagDTO[]) => {
        const result = [];
        const tagData = convertToTagData(value ? value.filter(item => item.sourceType == TAG_SOURCE_TYPE_CUSTOM) : []);
        tagData.map((item, index) => {
          result.push(
            <CustomTag key={index} item={item}></CustomTag>
          );
        })
        return <Flex wrap gap={2}>{result}</Flex>;
      },
      minWidth: 200,
    },
    {
      title: '公司标签',
      dataIndex: 'company',
      render: (obj: CompanyData) => {
        const value = obj.companyTagList;
        const result = [];
        const tagData = convertToTagData(value || []);
        tagData.map((item, index) => {
          result.push(
            <CustomTag key={index} item={item}></CustomTag>
          );
        })
        return <Flex wrap gap={2}>{result}</Flex>;
      },
      minWidth: 200,
    },
    {
      title: '地区',
      dataIndex: 'location',
      render: (text: string) => <Text>{text}</Text>,
      minWidth: 100,
    },
    {
      title: '最低薪资',
      dataIndex: 'salaryMin',
      render: (value: number) => <Text>{Math.ceil(value)}</Text>,
      minWidth: 100,
      sorter: true,
    },
    {
      title: '最高薪资',
      dataIndex: 'salaryMax',
      render: (value: number) => <Text>{Math.ceil(value)}</Text>,
      minWidth: 100,
      sorter: true,
    },
    {
      title: '几薪',
      dataIndex: 'salaryTotalMonth',
      render: (text: string) => <Text>{text}</Text>,
      minWidth: 60,
      sorter: true,
    },

    {
      title: '学历',
      dataIndex: 'degree',
      render: (text: string) => <Text>{text}</Text>,
      minWidth: 80,
      sorter: true,
    },
    {
      title: '招聘平台',
      dataIndex: 'platform',
      render: (text: string) => <Text>{platformFormat(text)}</Text>,
      minWidth: 100,
    },
    {
      title: '首次扫描时间',
      dataIndex: 'createDatetime',
      render: (value: Date) => <Text title={dateToStr(value)}>{dateToStr(value, "YYYY-MM-DD")}</Text>,
      minWidth: 120,
      sorter: true,
    },
    {
      title: '查看数',
      dataIndex: 'browseCount',
      render: (text: string) => <Text>{text}</Text>,
      minWidth: 80,
      sorter: true,
    },
    {
      title: '最近查看时间',
      dataIndex: 'browseTime',
      render: (value?: Date) => <Text title={dateToStr(value)}>{dateToStr(value, "YYYY-MM-DD")}</Text>,
      minWidth: 120,
      sorter: true,
    },
    {
      title: '操作',
      key: 'action',
      fixed: "right",
      render: (_, record) => (
        <Space size="middle">
          <Button type="link" onClick={() => {
            setEditJobTagData({
              id: record.id,
              name: record.name,
              tags: record.jobTagList?.filter(item => (item.sourceType == TAG_SOURCE_TYPE_CUSTOM && item.source == null)).map(item => item.tagName)
            });
            setIsJobTagEditModalOpen(true);
          }}>编辑职位标签</Button>
        </Space>
      ),
    },
  ];

  const onJobTagSave = async (data: JobTagEditData) => {
    const { id, tags } = data;
    let bo = new JobTagBO();
    bo.jobId = id;
    bo.tags = tags;
    await JobApi.jobTagAddOrUpdate(bo);
    setIsJobTagEditModalOpen(false);
    tableRef?.current.refresh();
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
          return JobApi.searchJob(searchParam);
        },
        convertToDataList: convertToJobDataList,
      }}
      expandedRowRender={(record) => {
        return <JobItemTable data={record}></JobItemTable>
      }}
      exportProps={{
        dataToExcelJSONArray: jobDataToExcelJSONArray,
        title: "职位"
      }}
    ></BasicTable>
    <Modal
      title={"编辑职位标签"}
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
        data={editJobTagData}
        whitelist={whitelist}
        onSave={onJobTagSave}
      ></JobTagEdit>
    </Modal>
  </>
}

export default JobView;