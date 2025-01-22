import { Flex, Tag, Typography } from "antd";
const { Text } = Typography;

import { cleanHTMLTag, convertTimeOffsetToHumanReadable, isToday } from "@/common/utils";
import Link from "antd/es/typography/Link";
import styles from "./JobItemCard.module.css";

import { Icon } from "@iconify/react";
import Card from "antd/es/card/Card";
import Paragraph from "antd/es/typography/Paragraph";
import dayjs from "dayjs";
import { useJob } from "../hooks/job";
import { useTag } from "../hooks/tag";

import { TAG_SOURCE_TYPE_CUSTOM } from "@/common";
import { QuestionCircleOutlined } from "@ant-design/icons";
import { JobData } from "../data/JobData";
import CustomTag from "./CustomTag";
import "./JobItemCard.css";

const { platformLogo, platformFormat } = useJob();
const { convertToTagData } = useTag();

const getTimeColorByOffsetTimeDay = (datetime) => {
  let offsetTimeDay = -1;
  if (datetime) {
    offsetTimeDay = dayjs().diff(dayjs(datetime), "day");
  }
  if (offsetTimeDay >= 0) {
    if (offsetTimeDay <= 7) {
      return "yellowgreen";
    } else if (offsetTimeDay <= 14) {
      return "green";
    } else if (offsetTimeDay <= 28) {
      return "orange";
    } else if (offsetTimeDay <= 56) {
      return "red";
    } else {
      return "gray";
    }
  } else {
    return "black";
  }
};

export type JobItemCardProps = {
  data: JobData;
  className?: string;
  onCardClick?: (data: JobData) => void;
  onLocate?: (data: JobData) => void;
};
const JobItemCard: React.FC<JobItemCardProps> = (props) => {
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
    browseTime,
    createDatetime,
    skillTagList,
    welfareTagList,
  } = props.data;
  const { name: companyName, companyTagList, url: companyUrl } = company;
  const { onLocate } = props;


  const genJobTag = (jobTagList) => {
    if (jobTagList) {
      const result = [];
      convertToTagData(jobTagList?.filter(item => item.sourceType == TAG_SOURCE_TYPE_CUSTOM)).map((item,index) => {
        result.push(
          <CustomTag item={item} color="#1677ff" key={index}></CustomTag>
        );
      })
      return result;
    } else {
      return null;
    }
  }

  const genCompanyTag = (companyTagList) => {
    if (companyTagList && companyTagList.length > 0) {
      const result = [];
      convertToTagData(companyTagList).map((item,index) => {
        result.push(
          <CustomTag item={item} color="#faad14" key={index}></CustomTag>
        );
      })
      return result;
    } else {
      return null;
    }
  }

  return (
    <>
      <Card
        title={browseTime ? `浏览时间:${convertTimeOffsetToHumanReadable(browseTime)}` : null}
        size="small"
        hoverable={props.onCardClick ? true : false}
        className={`${styles.main} ${props.className ? props.className : ""}`}
        onClick={() => {
          props.onCardClick(props.data);
        }}
      >
        <Flex className={styles.item}>
          {isToday(createDatetime) ? <div className={styles.newBadge}>
            <Icon className={styles.newBadgeIcon} icon="foundation:burst-new" />
          </div> : null}
          <Link
            onClick={(event) => {
              event.stopPropagation();
            }}
            ellipsis
            underline
            className={styles.name}
            href={url}
            target="_blank"
          >
            {name}
          </Link>
          <Text type="warning" className={styles.salary}>
            {Math.ceil(salaryMin)} - {Math.ceil(salaryMax)}
          </Text>
        </Flex>
        <Flex className={styles.marginTop} wrap={true} gap={2}>
          {genCompanyTag(companyTagList)}
        </Flex>
        <Flex className={styles.marginTop}>
          {companyUrl ? (
            <Link
              onClick={(event) => {
                event.stopPropagation();
              }}
              ellipsis
              type="warning"
              underline
              href={companyUrl}
              target="_blank"
            >
              {companyName}
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
        </Flex>
        <Flex className={styles.marginTop} wrap={true} gap={2}>
          {skillTagList &&
            skillTagList.map((item, index) => (
              <Tag className={styles.tag} bordered={false} key={index} color="processing">
                {item}
              </Tag>
            ))}
        </Flex>
        <Flex className={styles.marginTop} wrap={true} gap={2}>
          {welfareTagList &&
            welfareTagList.map((item, index) => (
              <Tag className={styles.tag} bordered={false} key={index} color="gold">
                {item}
              </Tag>
            ))}
        </Flex>
        <Flex className={styles.marginTop} wrap={true} gap={2}>
          {genJobTag(jobTagList)}
        </Flex>
        <Flex
          onClick={(e) => {
            e.stopPropagation();
            onLocate(props.data);
          }}
          className={`${styles.marginTop} ${styles.item}`}
        >
          <Text ellipsis className={styles.address}>
            <Icon icon="entypo:address" /> {address}
          </Text>
          <Text style={{ color: "#1677ff" }}>
            <Icon icon="mdi:location" />
            定位
          </Text>
        </Flex>
        <Flex className={`${styles.marginTop} ${styles.item}`}>
          <Paragraph className={styles.desc} ellipsis={{ rows: 3, expandable: false }} title={cleanHTMLTag(desc)}>
            {cleanHTMLTag(desc)}
          </Paragraph>
        </Flex>
        <Flex
          className={`${styles.marginTop} ${styles.item}`}
          flex={1}
          style={{ alignItems: "end" }}
        >
          <Tag
            icon={<Icon icon="formkit:datetime" />}
            style={{
              backgroundColor: getTimeColorByOffsetTimeDay(publishDatetime),
              color: "white",
            }}
          >
            {publishDatetime
              ? ` ${convertTimeOffsetToHumanReadable(publishDatetime)}发布`
              : ` 发布时间未知`}
          </Tag>
          <Flex
            flex={1}
            align="end"
            justify="end"
            style={{ overflow: "hidden" }}
          >
            <Text ellipsis>{`${bossName}【${bossPosition ?? ""}】`}</Text>
            <img
              className={styles.platformLogo}
              src={platformLogo(platform)}
              alt="logo"
            />
            <Text className={styles.platformName}>
              {platformFormat(platform)}
            </Text>
          </Flex>
        </Flex>
      </Card>
    </>
  );
};

export default JobItemCard;
