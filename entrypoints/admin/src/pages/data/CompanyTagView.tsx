import { TAG_SOURCE_TYPE_CUSTOM, TAG_SOURCE_TYPE_PLATFORM } from "@/common";
import { CompanyApi, TagApi } from "@/common/api";
import { CompanyTagBO } from "@/common/data/bo/companyTagBO";
import { CompanyTagDTO } from "@/common/data/dto/companyTagDTO";
import { companyTagDataToExcelJSONArrayForView } from "@/common/excel";
import { dateToStr, genIdFromText } from "@/common/utils";
import {
  Button,
  Col,
  Flex,
  Form,
  Input,
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
import { CompanyTagData } from "../../data/CompanyTagData";
import { CompanyTagEditData } from "../../data/CompanyTagEditData";
import { WhitelistData } from "../../data/WhitelistData";
import { useCompanyTag } from "../../hooks/companyTag";
import CompanyTagEdit from "./CompanyTagEdit";
import styles from "./CompanyTagView.module.css";

import { useTag } from "../../hooks/tag";
const { convertToTagData } = useTag();

const { Text } = Typography;
const { convertToCompanyTagDataList, convertSortField } = useCompanyTag();
dayjs.extend(duration)

const fillSearchParam = (searchParam, values) => {
  const { name, tags } = values;
  searchParam.companyName = name;
  searchParam.tagNames = tags;
}

const CompanyTagView: React.FC = () => {

  const [messageApi, contextHolder] = message.useMessage();
  const [isCompanyTagEditModalOpen, setIsCompanyTagEditModalOpen] = useState(false);
  const [editCompanyTagData, setEditCompanyTagData] = useState<CompanyTagEditData>();
  const [mode, setMode] = useState<"add" | "update">("update");
  const [whitelist, setWhitelist] = useState<WhitelistData[]>([]);
  const tableRef = useRef();

  const searchFields = {
    common: [
      <Col span={8} key="name">
        <Form.Item
          name={`name`}
          label={`公司名`}
        >
          <Input placeholder="请输入公司名" />
        </Form.Item>
      </Col>,
      <Col span={8} key="tags">
        <Form.Item
          name={`tags`}
          label={`标签`}
        >
          <Select
            allowClear
            mode="tags"
            style={{ width: "100%" }}
            placeholder="请输入公司标签"
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

  const onCompanyTagSave = async (data: CompanyTagEditData) => {
    const { name, tags } = data;
    let companyTagBO = new CompanyTagBO();
    companyTagBO.companyName = name;
    companyTagBO.tags = tags;
    await CompanyApi.addOrUpdateCompanyTag(companyTagBO);
    setIsCompanyTagEditModalOpen(false);
    tableRef?.current.refresh();
  }

  const columns: TableColumnsType<CompanyTagData> = [
    {
      title: '公司全称',
      dataIndex: 'companyName',
      render: (value: string) => <Text copyable>{value}</Text>,
      minWidth: 200,
    },
    {
      title: '标签(平台)',
      dataIndex: 'tagArray',
      render: (value: CompanyTagDTO[]) => {
        const result = [];
        value.filter(item => item.sourceType == TAG_SOURCE_TYPE_PLATFORM).map((item, index) => {
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
      render: (value: CompanyTagDTO[]) => {
        const result = [];
        const tagData = convertToTagData(value.filter(item => item.sourceType == TAG_SOURCE_TYPE_CUSTOM && item.source == null));
        tagData.map((item, index) => {
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
      render: (value: CompanyTagDTO[]) => {
        const result = [];
        const tagData = convertToTagData(value.filter(item => item.sourceType == TAG_SOURCE_TYPE_CUSTOM && item.source != null));
        tagData.map((item, index) => {
          result.push(
            <CustomTag item={item} key={index}></CustomTag>
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
      minWidth: 50,
    },
    {
      title: '更新时间',
      dataIndex: 'updateDatetime',
      render: (value: Date) => <Text title={dateToStr(value)}>{dateToStr(value,"YYYY-MM-DD")}</Text>,
      minWidth: 80,
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
            setEditCompanyTagData({
              name: record.companyName,
              tags: record.tagArray.filter(item => (item.sourceType == TAG_SOURCE_TYPE_CUSTOM && item.source == null)).map(item => item.tagName),
            });
            setIsCompanyTagEditModalOpen(true);
          }}>编辑标签</Button>
        </Space>
      ),
    },
  ];

  const onCompanyTagAdd = () => {
    setMode("add");
    setEditCompanyTagData(null);
    setIsCompanyTagEditModalOpen(true);
  }
  const onCompanyTagDelete = async (keys: React.Key[]) => {
    await CompanyApi.deleteCompanyTagByCompanyIds(keys);
    tableRef?.current.refresh();
  }

  return <>
    {contextHolder}
    <BasicTable
      mode={["r", "c", "d"]}
      onAdd={onCompanyTagAdd}
      onDelete={onCompanyTagDelete}
      ref={tableRef}
      searchProps={{
        columns,
        searchFields,
        fillSearchParam,
        convertSortField,
        search: async (searchParam) => {
          return await CompanyApi.searchCompanyTag(searchParam);
        },
        convertToDataList: convertToCompanyTagDataList,
      }}
      rowKeyFunction={(record) => { return record.companyId }}
      exportProps={{
        dataToExcelJSONArray: companyTagDataToExcelJSONArrayForView,
        title: "公司标签"
      }}
    ></BasicTable>
    <Modal
      title={`${mode == "update" ? "编辑公司标签" : "新增公司标签"}`}
      open={isCompanyTagEditModalOpen}
      onCancel={() => {
        setIsCompanyTagEditModalOpen(false);
      }}
      maskClosable={false}
      footer={null}
      style={{ maxWidth: "1000px" }}
      width="80%"
      destroyOnClose
    >
      <CompanyTagEdit
        mode={mode}
        data={editCompanyTagData}
        whitelist={whitelist}
        onSave={onCompanyTagSave}
        validCompanyName={async (value) => {
          return (await CompanyApi.getAllCompanyTagDTOByCompanyId(genIdFromText(value))).length <= 0;
        }}
      ></CompanyTagEdit>
    </Modal>
  </>
}

export default CompanyTagView;