import { Button, Badge, Card, Dropdown, Flex, Modal, Space, Tag, Typography } from 'antd';
const { Text, Link, Paragraph } = Typography;

import {
  cleanHTMLTag,
  convertTimeOffsetToHumanReadable,
  isToday,
} from '@/common/utils';
import styles from './JobItemCard.module.css';
import dayjs from 'dayjs';
import { useJob } from '../hooks/job';
import { useTag } from '../hooks/tag';

import { TAG_SOURCE_TYPE_CUSTOM } from '@/common';
import { DownOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import { JobData } from '../data/JobData';
import { CompanyComment } from "@/common/data/domain/companyComment";
import CustomTag from './CustomTag';
import './JobItemCard.css';
//TODO 直接引用analysis包的JobAnalysisComponent会报错,这里使用的由项目重新lit react包装的组件，需要研究
import { JobAnalysisComponent } from './JobAnalysisComponent';
import { Source } from '../hooks/analysis';
import JobTagEdit from '../pages/data/JobTagEdit';
import { JobTagEditData } from '../data/JobTagEditData';
import { WhitelistData } from '../data/WhitelistData';
import { CompanyTagEditData } from '../data/CompanyTagEditData';
import CompanyTagEdit from '../pages/data/CompanyTagEdit';

const { platformLogo, platformFormat } = useJob();
const { convertToTagData } = useTag();

const getTimeColorByOffsetTimeDay = (datetime) => {
  let offsetTimeDay = -1;
  if (datetime) {
    offsetTimeDay = dayjs().diff(dayjs(datetime), 'day');
  }
  if (offsetTimeDay >= 0) {
    if (offsetTimeDay <= 7) {
      return 'yellowgreen';
    } else if (offsetTimeDay <= 14) {
      return 'green';
    } else if (offsetTimeDay <= 28) {
      return 'orange';
    } else if (offsetTimeDay <= 56) {
      return 'red';
    } else {
      return 'gray';
    }
  } else {
    return 'black';
  }
};

export type JobItemCardProps = {
  data: JobData;
  className?: string;
  onCardClick?: (data: JobData) => void;
  onLocate?: (data: JobData) => void;
  analysisConfig?: {
    url?: string;
    model?: string;
    token?: string;
    demand?: string;
    resume?: string;
    source?: Source;
    auto?: boolean;
  };
  historyElement?: React.ReactNode;
  companyCommentElement?: React.ReactNode;
  validJobId: (value: string) => Promise<boolean>;
  getAllTagFunction: () => Promise<WhitelistData[]>;
  onJobTagSave: (data: JobTagEditData) => Promise<void>;
  validCompanyName: (value: string) => Promise<boolean>;
  onCompanyTagSave: (data: CompanyTagEditData) => Promise<void>;
  onLlmRequest?: (url: string, body: string | object) => Promise<object>;
};
const JobItemCard: React.FC<JobItemCardProps> = (props) => {
  const {
    id,
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
  const { onLocate, validJobId, getAllTagFunction, onJobTagSave, validCompanyName, onCompanyTagSave } = props;

  const [isJobTagEditModalOpen, setIsJobTagEditModalOpen] = useState(false);
  const [editJobTagData, setEditJobTagData] = useState<JobTagEditData>();


  const [isCompanyTagEditModalOpen, setIsCompanyTagEditModalOpen] =
    useState(false);
  const [editCompanyTagData, setEditCompanyTagData] =
    useState<CompanyTagEditData>();

  const genJobTag = (jobTagList) => {
    if (jobTagList) {
      const result = [];
      convertToTagData(
        jobTagList?.filter((item) => item.sourceType == TAG_SOURCE_TYPE_CUSTOM)
      ).map((item, index) => {
        result.push(
          <CustomTag item={item} color="#1677ff" key={index}></CustomTag>
        );
      });
      return result;
    } else {
      return null;
    }
  };

  const genCompanyTag = (companyTagList) => {
    if (companyTagList && companyTagList.length > 0) {
      const result = [];
      convertToTagData(companyTagList).map((item, index) => {
        result.push(
          <CustomTag item={item} color="#faad14" key={index}></CustomTag>
        );
      });
      return result;
    } else {
      return null;
    }
  };

  const setEditJobTagDataAndOpenModal = () => {
    setEditJobTagData({
      id: id,
      name: name,
      tags: jobTagList?.filter(item => (item.sourceType == TAG_SOURCE_TYPE_CUSTOM && item.source == null)).map(item => item.tagName)
    });
    setIsJobTagEditModalOpen(true);
  }

  const setEditCompanyTagDataAndOpenModal = () => {
    setEditCompanyTagData({
      name: company.name,
      tags: company.companyTagList?.map((item) => item.tagName),
    });
    setIsCompanyTagEditModalOpen(true);
  }
  return (
    <>
      <Card
        title={
          browseTime
            ? `浏览时间:${convertTimeOffsetToHumanReadable(browseTime)}`
            : null
        }
        size="small"
        hoverable={props.onCardClick ? true : false}
        className={`${styles.main} ${props.className ? props.className : ''}`}
        onClick={() => {
          props.onCardClick(props.data);
        }}
      >
        <Flex justify="space-between" align="center">
          <Tag
            icon={<div className="i-formkit:datetime inline-flex" />}
            style={{
              backgroundColor: getTimeColorByOffsetTimeDay(publishDatetime),
              color: 'white',
            }}
          >
            {publishDatetime
              ? ` ${convertTimeOffsetToHumanReadable(publishDatetime)}发布`
              : ` 发布时间未知`}
          </Tag>
          {props.analysisConfig ? (
            props.analysisConfig.source == Source.EXTENSION ?
              <JobAnalysisComponent
                {...props.analysisConfig}
                className={styles.analysis}
                getResponse={async (url: string, body: string | object) => {
                  return {
                    json: async () => {
                      return await props.onLlmRequest(url, body);
                    }
                  }
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                }}
              /> : <JobAnalysisComponent
                {...props.analysisConfig}
                className={styles.analysis}
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                }}
              />
          ) : null}
        </Flex>
        <Flex className={styles.item}>
          {isToday(createDatetime) ? (
            <div className={styles.newBadge}>
              <div
                className={`${styles.newBadgeIcon} i-foundation:burst-new`}
              />
            </div>
          ) : null}
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
        <Flex className={styles.marginTop} justify='space-between'>
          {companyUrl ? (
            <Flex>
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
            </Flex>
          ) : (
            <Flex>
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
            </Flex>
          )}
          {<div>{props.companyCommentElement}</div>}
        </Flex>
        <Flex className={styles.marginTop} wrap={true} gap={2}>
          {skillTagList &&
            skillTagList.map((item, index) => (
              <Tag
                className={styles.tag}
                bordered={false}
                key={index}
                color="processing"
              >
                {item}
              </Tag>
            ))}
        </Flex>
        <Flex className={styles.marginTop} wrap={true} gap={2}>
          {welfareTagList &&
            welfareTagList.map((item, index) => (
              <Tag
                className={styles.tag}
                bordered={false}
                key={index}
                color="gold"
              >
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
            <div className="i-entypo:address inline-flex" /> {address}
          </Text>
          <Text style={{ color: '#1677ff' }}>
            <div className="i-mdi:location inline-flex" />
            定位
          </Text>
        </Flex>
        <Flex className={`${styles.marginTop} ${styles.item}`}>
          <Paragraph
            className={styles.desc}
            ellipsis={{ rows: 3, expandable: false }}
            title={cleanHTMLTag(desc)}
          >
            {cleanHTMLTag(desc)}
          </Paragraph>
        </Flex>
        <Flex
          className={`${styles.marginTop} ${styles.item}`}
          flex={1}
          style={{ alignItems: 'end' }}
        >
          <Flex
            flex={1}
            align="end"
            justify="end"
            style={{ overflow: 'visible' }}
          >
            <Flex flex={1} gap={10} onClick={(e) => {
              e.stopPropagation();
            }}>
              <div>{props.historyElement}</div>
              <Dropdown menu={
                {
                  items: [
                    { label: "职位标签", key: "jobTag" },
                    companyUrl ? { label: "公司标签", key: "companyTag" } : null,
                  ], onClick: (e) => {
                    e.domEvent.stopPropagation();
                    const key = e.key;
                    if (key == "jobTag") {
                      setEditJobTagDataAndOpenModal();
                    } else {
                      setEditCompanyTagDataAndOpenModal();
                    }
                  }
                }
              }>
                <Button size='small' color='primary' variant='dashed' onClick={(e) => {
                  e.stopPropagation();
                  setEditJobTagDataAndOpenModal();
                }}>
                  <Space>
                    编辑
                    <DownOutlined />
                  </Space>
                </Button>
              </Dropdown>
              <Modal
                title={"编辑职位标签"}
                open={isJobTagEditModalOpen}
                onCancel={(e) => {
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
                  onSave={async (data) => {
                    const result = await onJobTagSave(data);
                    setIsJobTagEditModalOpen(false);
                    return result;
                  }}
                  getWhitelistFunction={getAllTagFunction}
                  validJobId={validJobId}
                ></JobTagEdit>
              </Modal>
              <Modal
                title={'编辑公司标签'}
                open={isCompanyTagEditModalOpen}
                onCancel={() => {
                  setIsCompanyTagEditModalOpen(false);
                }}
                maskClosable={false}
                footer={null}
                style={{ maxWidth: '1000px' }}
                width="80%"
                destroyOnClose
              >
                <CompanyTagEdit
                  data={editCompanyTagData}
                  onSave={async (data) => {
                    const result = await onCompanyTagSave(data);
                    setIsCompanyTagEditModalOpen(false);
                    return result;
                  }}
                  getWhitelistFunction={getAllTagFunction}
                  validCompanyName={validCompanyName}
                ></CompanyTagEdit>
              </Modal>
            </Flex>
            <Text ellipsis>{`${bossName ?? ''}【${bossPosition ?? ''}】`}</Text>
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
