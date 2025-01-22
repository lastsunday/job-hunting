import { TAG_SOURCE_TYPE_CUSTOM } from "@/common";
import { cleanHTMLTag, dateToStr } from "@/common/utils";
import { QuestionCircleOutlined } from "@ant-design/icons";
import { Descriptions, DescriptionsProps, Flex, Tag, Typography } from "antd";
import Link from "antd/es/typography/Link";
import Markdown from "marked-react";
import { CompanyData } from "../data/CompanyData";
import { JobData } from "../data/JobData";
import { useJob } from "../hooks/job";
import CustomTag from "./CustomTag";
import styles from "./JobItemTable.module.css";
const { platformFormat } = useJob();
const { Text } = Typography;

import { useTag } from "../hooks/tag";
const { convertToTagData } = useTag();

export type JobItemTableProps = {
  data: JobData;
  onCompanyClick?: (data: CompanyData) => void;
};
const JobItemTable: React.FC<JobItemTableProps> = (props) => {
  const {
    name,
    url,
    salaryMin,
    salaryMax,
    company,
    jobTagList,
    address,
    publishDatetime,
    bossName,
    bossPosition,
    platform,
    desc,
    longitude,
    latitude,
    degree,
    skillTagList,
    welfareTagList,
  } = props.data;
  const { name: companyName, companyTagList, url: companyUrl } = company;

  const genJobTag = (jobTagList) => {
    if (jobTagList) {
      const result = [];
      convertToTagData(jobTagList?.filter(item => item.sourceType == TAG_SOURCE_TYPE_CUSTOM)).map((item, index) => {
        result.push(
          <CustomTag item={item} color="#1677ff" key={index}></CustomTag>
        );
      })
      return result.length > 0 ? result : <Text>无</Text>;
    } else {
      return <Text>无</Text>;
    }
  }

  const genCompanyTag = (companyTagList) => {
    if (companyTagList) {
      const result = [];
      convertToTagData(companyTagList).map((item, index) => {
        result.push(
          <CustomTag key={index} item={item} color="#faad14"></CustomTag>
        );
      })
      return result.length > 0 ? result : <Text>无</Text>;
    } else {
      return <Text>无</Text>;
    }
  }

  const items: DescriptionsProps["items"] = [
    {
      key: "name",
      label: "名称",
      span: 1,
      children: (
        <>
          <Link
            onClick={(event) => {
              event.stopPropagation();
            }}
            ellipsis
            underline
            className={name}
            href={url}
            target="_blank"
          >
            <Text copyable className={styles.name}>
              {name}
            </Text>
          </Link>
        </>
      ),
    },
    {
      key: "degree",
      label: "学历",
      span: 1,
      children: <>{degree}</>,
    },
    {
      key: "platform",
      label: "招聘平台",
      span: 1,
      children: <>{platformFormat(platform)}</>,
    },
    {
      key: "Company",
      label: "公司",
      span: 1,
      children: (
        <>
          {companyUrl ? (
            <Link
              onClick={(event) => {
                event.stopPropagation();
              }}
              ellipsis
              type="warning"
              underline
              target="_blank"
            >
              <Text
                onClick={() => {
                  if (props.onCompanyClick) {
                    props.onCompanyClick(company);
                  }
                }}
                copyable
                ellipsis
                type="warning"
              >
                {companyName}
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
                  companyName
                )}`}
                target="_blank"
              >
                {companyName}
              </Link>
            </>
          )}
        </>
      ),
    },
    {
      key: "salary",
      label: "薪资",
      span: 1,
      children: (
        <>
          <Text strong type="danger">
            {Math.ceil(salaryMin)} - {Math.ceil(salaryMax)}
          </Text>
        </>
      ),
    },
    {
      key: "boss",
      label: "招聘人",
      span: 1,
      children: (
        <>
          <Text ellipsis>{`${bossName}【${bossPosition}】`}</Text>
        </>
      ),
    },
    {
      key: "address",
      label: "工作地址",
      span: 1,
      children: (
        <>
          <Text copyable ellipsis>
            {address}
          </Text>
        </>
      ),
    },
    {
      key: "longitude",
      label: "经纬度",
      span: 1,
      children: (
        <>
          <Text copyable>
            {longitude},{latitude}
          </Text>
        </>
      ),
    },
    {
      key: "publishDate",
      label: "发布时间",
      span: 1,
      children: (
        <>{publishDatetime ? dateToStr(publishDatetime, "YYYY-MM-DD") : `-`}</>
      ),
    },
    {
      key: "jobSkillTag",
      label: "技能标签",
      span: 3,
      children: (
        <>
          <Flex wrap={true} gap={2}>
            {skillTagList && skillTagList.length > 0
              ? skillTagList.map((item, index) => (
                <Tag className={styles.tag} bordered={false} key={index} color="processing">
                  {item}
                </Tag>
              ))
              : <Text>无</Text>}
          </Flex>
        </>
      ),
    },
    {
      key: "jobWelfareTag",
      label: "福利标签",
      span: 3,
      children: (
        <>
          <Flex wrap={true} gap={2}>
            {welfareTagList && welfareTagList.length > 0
              ? welfareTagList.map((item, index) => (
                <Tag className={styles.tag} bordered={false} key={index} color="gold">
                  {item}
                </Tag>
              ))
              : <Text>无</Text>}
          </Flex>
        </>
      ),
    },
    {
      key: "jobTag",
      label: "职位标签",
      span: 3,
      children: (
        <>
          <Flex wrap={true} gap={2}>
            {genJobTag(jobTagList)}
          </Flex>
        </>
      ),
    },
    {
      key: "companyTag",
      label: "公司标签",
      span: 3,
      children: (
        <>
          <Flex wrap={true} gap={2}>
            {genCompanyTag(companyTagList)}
          </Flex>
        </>
      ),
    },
    {
      key: "desc",
      span: 3,
      label: "职位描述",
      children: (
        <>
          <Text className={styles.desc}>
            <Markdown gfm={true} breaks={true} isInline={true}>
              {cleanHTMLTag(desc)}
            </Markdown>
          </Text>
        </>
      ),
    },
  ];

  return (
    <>
      <Descriptions
        size="small"
        title={`${name}-${company.name}`}
        layout="vertical"
        items={items}
      />
    </>
  );
};

export default JobItemTable;
