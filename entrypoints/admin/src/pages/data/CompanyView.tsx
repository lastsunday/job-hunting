import { CompanyApi, TagApi } from "@/common/api";
import { CompanyTagBO } from "@/common/data/bo/companyTagBO";
import { companyDataToExcelJSONArray } from "@/common/excel";
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
  Typography, message
} from "antd";
import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";
import React from "react";
import BasicTable from "../../components/BasicTable";
import CompanyItemTable from "../../components/CompanyItemTable";
import CustomTag from "../../components/CustomTag";
import { CompanyData } from "../../data/CompanyData";
import { CompanyTagEditData } from "../../data/CompanyTagEditData";
import { WhitelistData } from "../../data/WhitelistData";
import { useCompany } from "../../hooks/company";
import CompanyTagEdit from "./CompanyTagEdit";
const { RangePicker } = DatePicker;
const { Text } = Typography;
const { convertToCompanyDataList, convertSortField } = useCompany();
dayjs.extend(duration)

import { CompanyTagDTO } from "@/common/data/dto/companyTagDTO";

import { useTag } from "../../hooks/tag";
const { convertToTagData } = useTag();

const searchFields =
{
  common: [<Col span={8} key="name">
    <Form.Item
      name={`name`}
      label={`公司名`}
    >
      <Input allowClear placeholder="请输入公司名" />
    </Form.Item>
  </Col>,
  <Col span={8} key="startDate">
    <Form.Item
      name={`startDate`}
      label={`成立时间`}
    >
      <RangePicker allowClear />
    </Form.Item>
  </Col>,],
}

const fillSearchParam = (searchParam, values) => {
  const { name, startDate } = values;
  searchParam.companyName = name;
  if (startDate && startDate.length > 0) {
    searchParam.startDateStartDatetime = startDate[0];
    searchParam.startDateEndDatetime = startDate[1];
  } else {
    searchParam.startDateStartDatetime = null;
    searchParam.startDateEndDatetime = null;
  }
}

const CompanyView: React.FC = () => {

  const [messageApi, contextHolder] = message.useMessage();
  const [isCompanyTagEditModalOpen, setIsCompanyTagEditModalOpen] = useState(false);
  const [editCompanyTagData, setEditCompanyTagData] = useState<CompanyTagEditData>();
  const [whitelist, setWhitelist] = useState<WhitelistData[]>([]);

  const tableRef = useRef();

  const columns: TableColumnsType<CompanyData> = [
    {
      title: '编号',
      dataIndex: 'id',
      render: (value: string) =>  <Text copyable style={{ width: 100 }} title={value}>{`${value && value.length > 5 ? value.slice(0, 5)+"..." : value}`}</Text>,
      minWidth: 100,
    },
    {
      title: '公司全称',
      dataIndex: 'name',
      render: (value: string) => <Text>{value}</Text>,
      minWidth: 150,
    },
    {
      title: '经营状态',
      dataIndex: 'status',
      render: (value: string) => <Text>{value}</Text>,
      minWidth: 80,
    },
    {
      title: '所属行业',
      dataIndex: 'industry',
      render: (value: string) => <Text>{value}</Text>,
      minWidth: 100,
    },
    {
      title: '成立时间',
      dataIndex: 'startDate',
      render: (value: Date) => <Text title={dateToStr(value)}>{dateToStr(value, "YYYY-MM-DD")}</Text>,
      minWidth: 120,
      sorter: true,
    },
    {
      title: '地址',
      dataIndex: 'address',
      render: (value: string) => <Text>{value}</Text>,
      minWidth: 100,
    },
    {
      title: '公司标签',
      dataIndex: 'companyTagList',
      render: (value: CompanyTagDTO[]) => {
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
      title: '社保人数',
      dataIndex: 'insuranceNum',
      render: (value: string) => <Text>{value}</Text>,
      minWidth: 80,
    },
    {
      title: '统一社会信用代码',
      dataIndex: 'unifiedCode',
      render: (text: string) => <Text>{text}</Text>,
      minWidth: 100,
    },
    {
      title: '法人',
      dataIndex: 'legalPerson',
      render: (value: string) => <Text>{value}</Text>,
      minWidth: 70,
    },
    {
      title: '更新时间',
      dataIndex: 'updateDatetime',
      render: (value: Date) => <Text title={dateToStr(value)}>{dateToStr(value, "YYYY-MM-DD")}</Text>,
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
            setEditCompanyTagData({
              name: record.name,
              tags: record.companyTagList?.map(item => item.tagName)
            });
            setIsCompanyTagEditModalOpen(true);
          }}>编辑标签</Button>
        </Space>
      ),
    },
  ];

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
          return CompanyApi.searchCompany(searchParam);
        },
        convertToDataList: convertToCompanyDataList,
      }}
      expandedRowRender={(record) => {
        return <CompanyItemTable data={record}></CompanyItemTable>
      }}
      exportProps={{
        dataToExcelJSONArray: companyDataToExcelJSONArray,
        title: "公司"
      }}
    ></BasicTable>
    <Modal
      title={"编辑公司标签"}
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
        data={editCompanyTagData}
        whitelist={whitelist}
        onSave={onCompanyTagSave}
      ></CompanyTagEdit>
    </Modal>
  </>
}

export default CompanyView;