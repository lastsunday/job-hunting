import { Descriptions, DescriptionsProps, Tag, Typography } from "antd";
import { useJob } from "../hooks/job";
import { CompanyData } from "../data/CompanyData";
import Link from "antd/es/typography/Link";
import { QuestionCircleOutlined } from "@ant-design/icons";
const { platformLogo, platformFormat } = useJob();
const { Text } = Typography;
import { dateToStr } from "@/common/utils";
import Markdown from "marked-react";

export type CompanytemTableProps = {
  data: CompanyData;
};
const JobItemTable: React.FC<CompanytemTableProps> = (props) => {
  const {
    name,
    companyTagList,
    url,
    status,
    startDate,
    industry,
    unifiedCode,
    taxNo,
    licenseNumber,
    legalPerson,
    webSite,
    insuranceNum,
    selfRisk,
    unionRisk,
    address,
    longitude,
    latitude,
    desc,
  } = props.data;

  const items: DescriptionsProps["items"] = [
    {
      key: "name",
      label: "公司全称",
      span: 1,
      children: (
        <>
          {url ? (
            <Link
              onClick={(event) => {
                event.stopPropagation();
              }}
              ellipsis
              type="warning"
              underline
              target="_blank"
              href={url}
            >
              <Text underline copyable ellipsis type="warning">
                {name}
              </Text>
            </Link>
          ) : (
            <>
              <QuestionCircleOutlined />
              <Link
                onClick={(event) => {
                  event.stopPropagation();
                }}
                ellipsis
                type="warning"
                underline
                href={`https://aiqicha.baidu.com/s?q=${encodeURIComponent(
                  name
                )}`}
                target="_blank"
              >
                {name}
              </Link>
            </>
          )}
        </>
      ),
    },
    {
      key: "status",
      label: "经营状态",
      span: 1,
      children: <>{status}</>,
    },
    {
      key: "startDate",
      label: "成立时间",
      span: 1,
      children: <>{dateToStr(startDate,"YYYY-MM-DD")}</>,
    },
    {
      key: "industry",
      label: "所属行业",
      span: 1,
      children: <>{industry}</>,
    },
    {
      key: "unifiedCode",
      label: "统一社会信用代码",
      span: 1,
      children: (
        <>
          <Text copyable>{unifiedCode}</Text>
        </>
      ),
    },
    {
      key: "taxNo",
      label: "纳税人识别号",
      span: 1,
      children: (
        <>
          <Text copyable>{taxNo}</Text>
        </>
      ),
    },
    {
      key: "licenseNumber",
      label: "工商注册号",
      span: 1,
      children: (
        <>
          <Text copyable>{licenseNumber}</Text>
        </>
      ),
    },
    {
      key: "legalPerson",
      label: "法人",
      span: 1,
      children: (
        <>
          <Text copyable>{legalPerson}</Text>
        </>
      ),
    },
    {
      key: "degree",
      label: "官网",
      span: 1,
      children: (
        <>
          {webSite != null ? (
            <Link ellipsis underline href={`http://${webSite}`} target="_blank">
              {webSite}
            </Link>
          ) : (
            `-`
          )}
        </>
      ),
    },
    {
      key: "insuranceNum",
      label: "社保人数",
      span: 1,
      children: <>{insuranceNum}</>,
    },
    {
      key: "selfRisk",
      label: "自身风险数",
      span: 1,
      children: <>{selfRisk}</>,
    },
    {
      key: "unionRisk",
      label: "关联风险数",
      span: 1,
      children: <>{unionRisk}</>,
    },
    {
      key: "address",
      label: "地址",
      span: 1,
      children: (
        <>
          <Text copyable>{address}</Text>
        </>
      ),
    },
    {
      key: "longitudeAndLatitude",
      label: "经纬度",
      span: 2,
      children: (
        <>
          {longitude != null && latitude != null ? (
            <Text copyable>
              {longitude},{latitude}
            </Text>
          ) : (
            `-`
          )}
        </>
      ),
    },
    {
      key: "companyTagList",
      label: "标签",
      span: 3,
      children: (
        <>
          {companyTagList
            ? companyTagList.map((item, index) => (
                <Tag key={index} color="processing">
                  {item.tagName}
                </Tag>
              ))
            : `无`}
        </>
      ),
    },
    {
      key: "desc",
      label: "经营范围",
      span: "filled",
      children: (
        <>
          <Markdown gfm={true} breaks={true} isInline={true}>
            {desc}
          </Markdown>
        </>
      ),
    },
  ];

  return (
    <>
      <Descriptions size="small" title={name} layout="vertical" items={items} />
    </>
  );
};

export default JobItemTable;
