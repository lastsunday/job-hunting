import { TAG_SOURCE_TYPE_CUSTOM } from "@/common";
import { cleanHTMLTag, dateToStr } from "@/common/utils";
import { Popup } from "@vis.gl/react-maplibre";
import { Flex, Tag, Typography } from "antd";
import Link from "antd/es/typography/Link";
import * as React from "react";
import { JobData } from "../../data/JobData";
import { useJob } from "../../hooks/job";
import CustomTag from "../CustomTag";
import styles from "./JobPopup.module.css";

import { useTag } from "../../hooks/tag";
const { convertToTagData } = useTag();

const { Text } = Typography;

const { platformFormat } = useJob();

export type JobPopupProps = {
  data: JobData;
  onClick?: (data) => void;
};
const JobPopup: React.FC<JobPopupProps> = ({ data, onClick }) => {
  const {
    longitude,
    latitude,
    name,
    desc,
    url,
    publishDatetime,
    salaryMin,
    salaryMax,
    degree,
    platform,
    address,
    jobTagList,
    skillTagList,
    welfareTagList,
  } = data;
  const { name: companyName, companyTagList } = data.company ?? {};

  const genJobTag = (jobTagList) => {
    if (jobTagList) {
      const result = [];
      convertToTagData(jobTagList?.filter(item => item.sourceType == TAG_SOURCE_TYPE_CUSTOM)).map((item) => {
        result.push(
          <CustomTag item={item} color="#1677ff"></CustomTag>
        );
      })
      return result;
    } else {
      return null;
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
      return result.length > 0 ? result : null;
    } else {
      return null;
    }
  }

  return (
    <>
      <Popup
        style={{ width: "400px" }}
        maxWidth="400px"
        anchor="bottom"
        longitude={Number(longitude)}
        latitude={Number(latitude)}
        onClose={() => onClick(data)}
      >
        <Flex vertical title={cleanHTMLTag(desc)}>
          <Flex>
            <Text>职位名：</Text>
            <Link style={{ flex: 1 }} ellipsis target="_blank" href={url}>
              {name}
            </Link>
          </Flex>
          <Flex>
            <Text>发布时间：</Text>
            <Text ellipsis>{dateToStr(publishDatetime,"YYYY-MM-DD")}</Text>
          </Flex>
          <Flex>
            <Text>薪资：</Text>
            <Text ellipsis>
              💵{Math.ceil(salaryMin)} - 💵{Math.ceil(salaryMax)}
            </Text>
          </Flex>
          <Flex>
            <Text>学历：</Text>
            <Text ellipsis>{degree}</Text>
          </Flex>
          <Flex>
            <Text>招聘平台：</Text>
            <Text ellipsis>{platformFormat(platform)}</Text>
          </Flex>
          <Flex>
            <Text>地址：</Text>
            <Text ellipsis>{address}</Text>
          </Flex>
          <Flex>
            <Text>公司名：</Text>
            <Text ellipsis>{companyName}</Text>
          </Flex>
          <Flex style={{ marginTop: "5px" }} wrap={true} gap={2}>
            {skillTagList != null && skillTagList.length > 0 ? (
              <>
                <Text>技能标签：</Text>
                {skillTagList.map((item, index) => (
                  <Tag className={styles.tag} bordered={false} color="processing" key={`${index}`}>
                    {item}
                  </Tag>
                ))}
              </>
            ) : null}
          </Flex>
          <Flex style={{ marginTop: "5px" }} wrap={true} gap={2}>
            {welfareTagList != null && welfareTagList.length > 0 ? (
              <>
                <Text>福利标签：</Text>
                {welfareTagList.map((item, index) => (
                  <Tag className={styles.tag} bordered={false} color="gold" key={`${index}`}>
                    {item}
                  </Tag>
                ))}
              </>
            ) : null}
          </Flex>
          <Flex style={{ marginTop: "5px" }} wrap={true} gap={2}>
            {jobTagList != null && jobTagList?.filter(item => item.sourceType == TAG_SOURCE_TYPE_CUSTOM).length > 0 ? (
              <>
                <Text>职位标签：</Text>
                {genJobTag(jobTagList?.filter(item => item.source == null))}
              </>
            ) : null}
          </Flex>
          <Flex style={{ marginTop: "5px" }} wrap={true} gap={2}>
            {companyTagList && companyTagList.length > 0 ?
              <>
                <Text>公司标签：</Text>
                {genCompanyTag(companyTagList)}
              </> : null}
          </Flex>
        </Flex>
      </Popup>
    </>
  );
};

export default JobPopup;
