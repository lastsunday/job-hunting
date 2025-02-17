import {
  PLATFORM_51JOB,
  PLATFORM_BOSS,
  PLATFORM_JOBSDB,
  PLATFORM_LAGOU,
  PLATFORM_LIEPIN,
  PLATFORM_ZHILIAN,
} from '@/common';
import { CompanyApi, JobApi, TagApi } from '@/common/api';
import { convertToAbbreviation } from '@/common/utils';
import {
  JobStatisticGroupByPublishDateBO,
  TYPE_ENUM_DAY,
  TYPE_ENUM_HOUR,
  TYPE_ENUM_MONTH,
  TYPE_ENUM_WEEK,
} from '@/common/data/bo/jobStatisticGroupByPublishDateBO';
import { SearchJobBO } from '@/common/data/bo/searchJobBO';
import { Icon } from '@iconify/react';
import { Card, Col, Flex, Row, Select, Typography } from 'antd';
import ReactEChartsCore from 'echarts-for-react/lib/core';
import { BarChart } from 'echarts/charts';
import {
  GridComponent,
  TitleComponent,
  TooltipComponent,
} from 'echarts/components';
import * as echarts from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { useJob } from '../hooks/job';
import './DashboardView.css';
echarts.use([
  TitleComponent,
  TooltipComponent,
  GridComponent,
  BarChart,
  CanvasRenderer,
]);

const { Text, Link } = Typography;

type BasicChartData = {
  name: string;
  count: number;
  total?: number;
  percentage?: number;
};

type BasicChartProps = {
  title: string;
  data: BasicChartData[];
  showAll: boolean;
};

const BasicChart: React.FC<BasicChartProps> = (props) => {
  const data = props.data;
  const nameArray = data.map((item) => item.name);
  const totalArray = data.map((item) => item.total);
  let xAxis = {};
  if (props.showAll) {
    xAxis = {
      data: nameArray,
      axisLabel: {
        overflow: 'truncate',
        interval: 0,
        rotate: 30,
      },
    };
  } else {
    xAxis = {
      overflow: 'truncate',
      interval: 0,
      data: nameArray,
    };
  }
  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'cross' },
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true,
    },
    xAxis,
    yAxis: {},
    series: [
      {
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#83bff6' },
            { offset: 0.5, color: '#188df0' },
            { offset: 1, color: '#188df0' },
          ]),
        },
        type: 'bar',
        data: totalArray,
      },
    ],
  };
  return (
    <>
      <Card title={props.title} style={{ margin: 10 }}>
        <ReactEChartsCore echarts={echarts} option={option} />
      </Card>
    </>
  );
};

type BackgroundChartData = {
  items: BasicChartData[];
  total?: number | number[];
};

type BackgroundChartProps = {
  title: string | ReactNode;
  data: BackgroundChartData;
  xSize?: number;
  loading: boolean;
};

const BackgroundChart: React.FC<BackgroundChartProps> = ({
  title,
  data,
  loading = true,
}) => {
  const { total, items } = data;
  let sortItems = items.toReversed();
  const nameArray = sortItems.map((item) => item.name);
  const countArray = sortItems.map((item) => item.count);
  let calTotal = 0;
  if (total == null) {
    countArray.forEach((item) => {
      calTotal += item;
    });
  } else {
    calTotal = total as number;
  }
  const option = {
    title: [{}],
    tooltip: {},
    grid: [
      {
        left: 100,
        top: 0,
        bottom: 20,
        right: 0,
      },
    ],
    xAxis: [
      {
        type: 'value',
        max: calTotal,
        splitLine: {
          show: false,
        },
        axisLabel: {
          hideOverlap: true,
          formatter: function (value, index) {
            return convertToAbbreviation(value);
          },
        },
      },
    ],
    yAxis: [
      {
        type: 'category',
        data: nameArray,
        axisLabel: {
          width: 100,
          overflow: 'truncate',
          margin: 0,
          padding: 5,
        },
        splitLine: {
          show: false,
        },
      },
    ],
    series: [
      {
        type: 'bar',
        stack: 'chart',
        z: 3,
        label: {
          position: 'right',
          show: true,
          formatter: (param) => {
            return `${((param.data / calTotal) * 100).toFixed(2)}%`;
          },
        },
        data: countArray,
      },
      {
        type: 'bar',
        stack: 'chart',
        silent: true,
        itemStyle: {
          color: '#eee',
        },
        data: countArray.map((item) => {
          return calTotal - item;
        }),
      },
    ],
  };
  return (
    <Card loading={loading} title={title} style={{ margin: 10 }}>
      <ReactEChartsCore echarts={echarts} option={option} />
    </Card>
  );
};

import { ReactNode } from 'react';
import { logo } from '../assets';
import StatisticCard from '../components/StatisticCard';
import { WhitelistData } from '../data/WhitelistData';

const publicJobWebsiteList = [
  {
    url: 'https://www.jobonline.cn/position',
    label: '就业在线',
    logo: logo.jobonline,
    desc: `
    “就业在线”平台是由人力资源社会保障部组织建设的国家级招聘求职服务平台。汇聚各地、各类人力资源服务机构的“旗舰店”，发挥公共就业人才服务机构和经营性人力资源服务机构的作用，实现招聘求职信息实时、全面汇聚、共享和发布，支持跨区域、跨层级开展招聘求职服务。
    `,
  },
  {
    url: 'https://ggfw.hrss.gd.gov.cn/recruitment/internet/main/#/search?type=1',
    label: '广东公共求职招聘服务平台',
    logo: logo.ggfw_hrss_gd,
    desc: `面向求职者和用人单位的公共服务平台，为招聘单位提供发布岗位、搜索人才、面试管理等招聘人才的服务。求职者在求职招聘管理模块实现发布求职意向、查找岗位、简历管理等求职功能。开展招聘会、直播带岗等活动，细化求职招聘服务，为求职者和用人单位提供了高效、便捷、专业的求职招聘一体化服务`,
  },
];
const jobWebsiteList = [
  {
    url: 'https://www.zhipin.com/web/geek/job',
    label: 'BOSS直聘',
    logo: logo.boss,
    desc: ``,
  },
  {
    url: 'https://we.51job.com/pc/search ',
    label: '前程无忧',
    logo: logo.job51,
    desc: ``,
  },
  {
    url: 'https://sou.zhaopin.com/',
    label: '智联招聘',
    logo: logo.zhilian,
    desc: `智联招聘（北京网聘咨询有限公司）创建于1994年，是深受企业信赖的人才平台，更受职场人喜爱的职业发展平台，为个人用户的整个职业生涯提供相关职业发展机会，为企业提供一站式专业人力资源服务，包括网络招聘、校园招聘(机考)、海外招聘（线上海外）、智联卓聘（RPO、猎头、背调）、人力资源服务外包、教育培训、人才测评与咨询、职Q社区、雇主品牌、大数据报告（人才供需、行业薪酬）等，是人才生态的构建者，是拥有政府颁发的人力资源服务服务许可证和劳务派遣许可证的专业服务机构，在全国拥有39家分公司，南北两大互动营销中心，6000+员工，覆盖200多座城市。`,
  },
  {
    url: 'https://www.lagou.com/wn/zhaopin',
    label: '拉钩网',
    logo: logo.lagou,
    desc: `拉勾是互联网人的职业成长平台，专门为互联网人才提供求职机会、提高职业能力，同时为各行业培养和输送互联网人才。平台活跃着100w+家优秀企业，覆盖领域包括电子商务、游戏、O2O、大数据、云计算、社交网络、金融、快消、制造业、教育、旅游等全行业。`,
  },
  {
    url: 'https://www.liepin.com/zhaopin',
    label: '猎聘网',
    logo: logo.liepin,
    desc: `猎聘作为专业的招聘平台，始终以“让职场人更成功”为使命，为企业、人才和猎头提供精准高效的招聘求职服务。`,
  },
  {
    url: 'https://hk.jobsdb.com/',
    label: 'Jobsdb-HK',
    logo: logo.jobsdb,
    desc: ``,
  },
];

const companyWebsiteList = [
  { url: 'https://aiqicha.baidu.com/s', label: '爱企查', desc: `` },
  { url: 'https://beian.miit.gov.cn', label: '工信部', desc: `` },
  { url: 'https://www.creditchina.gov.cn', label: '信用中国', desc: `` },
  {
    url: 'https://www.gsxt.gov.cn/corp-query-homepage.html',
    label: '企业信用',
    desc: ``,
  },
  { url: 'http://zxgk.court.gov.cn/zhzxgk/', label: '执行信息', desc: `` },
  { url: 'https://wenshu.court.gov.cn', label: '裁判文书', desc: `` },
  { url: 'https://xwqy.gsxt.gov.cn', label: '个体私营', desc: `` },
];

const genNumberArray = (start, count) => {
  let result = [];
  for (let i = start; i <= count; i++) {
    result.push(i.toString().padStart(2, '0'));
  }
  return result;
};
let MONTH_NAME_OBJECT = {
  '01': '一月',
  '02': '二月',
  '03': '三月',
  '04': '四月',
  '05': '五月',
  '06': '六月',
  '07': '七月',
  '08': '八月',
  '09': '九月',
  '10': '十月',
  '11': '十一月',
  '12': '十二月',
};
const MONTH_NAME_ARRAY = genNumberArray(1, 12);
const convertMonthName = (name) => {
  return MONTH_NAME_OBJECT[name] ?? name;
};

let WEEK_NAME_OBJECT = {
  '1': '星期一',
  '2': '星期二',
  '3': '星期三',
  '4': '星期四',
  '5': '星期五',
  '6': '星期六',
  '7': '星期日',
};
let WEEK_NAME_ARRAY = ['1', '2', '3', '4', '5', '6', '7'];
const convertWeekName = (name) => {
  return WEEK_NAME_OBJECT[name] ?? name;
};
const DAY_NAME_ARRAY = genNumberArray(1, 31);
const HOUR_NAME_ARRAY = genNumberArray(0, 23);

const PLATFORM_NAME_ARRAY = [
  PLATFORM_BOSS,
  PLATFORM_51JOB,
  PLATFORM_ZHILIAN,
  PLATFORM_LAGOU,
  PLATFORM_LIEPIN,
  PLATFORM_JOBSDB,
];

const { platformFormat } = useJob();

const COMPANY_START_DATE_NAME_ARRAY = [
  '<1',
  '1-3',
  '3-5',
  '5-10',
  '10-20',
  '>20',
];
const COMPANY_INSURANCE_NAME_ARRAY = [
  '-',
  '<10',
  '10-20',
  '20-50',
  '50-100',
  '100-500',
  '500-1000',
  '>1000',
];
let COMPANY_INSURANCE_OBJECT = {
  '-': '?',
};
const convertCompanyInsuranceName = (name) => {
  return COMPANY_INSURANCE_OBJECT[name] ?? name;
};

const JOB_SALARY_NAME_ARRAY = [
  '<3k',
  '3k-6k',
  '6k-9k',
  '9k-12k',
  '12k-15k',
  '15k-18k',
  '18k-21k',
  '18k-21k',
  '21k-24k',
  '>24k',
];

const convertToChartData = ({
  queryResult,
  convertNameFunction = null,
  defaultNameArray = null,
  countKey = 'total',
  fetchCountKey = 'total',
}) => {
  let result = [];
  let nameArray = [];
  let nameMap = new Map();
  if (defaultNameArray) {
    defaultNameArray.forEach((name) => {
      nameMap.set(name, null);
      nameArray.push(name);
    });
  }
  queryResult.forEach((item) => {
    if (!nameMap.has(item.name)) {
      nameArray.push(item.name);
    }
  });
  nameArray.forEach((name) => {
    let filterItem = queryResult.filter((item) => {
      return item.name == name;
    });
    let obj = {};
    obj[`name`] = convertNameFunction ? convertNameFunction(name) : name;
    obj[`${countKey}`] =
      filterItem.length > 0 ? filterItem[0][`${fetchCountKey}`] : 0;
    result.push(obj);
  });
  return result;
};

const convertObjectToChartData = (items) => {
  const result = [];
  const keys = Object.keys(items);
  keys.forEach((key) => {
    result.push({ name: key, total: items[key] });
  });
  return result;
};

const DashboardView: React.FC = () => {
  const [todayStatisticData, setTodayStatisticData] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [tagNameGroupData, setTagNameGroupData] = useState<BackgroundChartData>(
    { items: [], total: 0 }
  );
  const [tagNameGroupDataLoading, setTagNameGroupDataLoading] = useState(true);
  const [
    jobStatisticJobCompanyTagGroupByPlatformData,
    setJobStatisticJobCompanyTagGroupByPlatform,
  ] = useState<BackgroundChartData>({ items: [] });
  const [
    jobStatisticJobCompanyTagGroupByPlatformDataLoading,
    setJobStatisticJobCompanyTagGroupByPlatformLoading,
  ] = useState(true);
  const [
    jobStatisticJobCompanyTagGroupByPlatformValue,
    setJobStatisticJobCompanyTagGroupByPlatformValue,
  ] = useState('外包');
  const [
    jobStatisticJobCompanyTagGroupByCompanyValue,
    setJobStatisticJobCompanyTagGroupByCompanyValue,
  ] = useState('外包');
  const [
    jobStatisticJobCompanyTagGroupByCompanyData,
    setJobStatisticJobCompanyTagGroupByCompany,
  ] = useState<BackgroundChartData>({ items: [], total: 0 });
  const [
    jobStatisticJobCompanyTagGroupByCompanyDataLoading,
    setJobStatisticJobCompanyTagGroupByCompanyLoading,
  ] = useState(true);
  const [whitelist, setWhitelist] = useState<WhitelistData[]>([]);

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

  useEffect(
    () => {
      const statistic = async () => {
        const statisticJobBrowse = await JobApi.statisticJobBrowse();
        const statisticCompany = await CompanyApi.statisticCompany();
        const statisticCompanyTag = await CompanyApi.statisticCompanyTag();
        let todayResult = [];
        todayResult.push({
          name: '今天查看职位',
          count: statisticJobBrowse.todayBrowseDetailCount,
          previousCount: statisticJobBrowse.yesterdayBrowseDetailCount,
          totalCount: statisticJobBrowse.totalBrowseDetailCount,
          unit: '个',
        });
        todayResult.push({
          name: '今天职位新增',
          count: statisticJobBrowse.todayJob,
          previousCount: statisticJobBrowse.yesterdayJob,
          totalCount: statisticJobBrowse.totalJob,
          unit: '个',
        });
        todayResult.push({
          name: '今天扫描职位',
          count: statisticJobBrowse.todayBrowseCount,
          previousCount: statisticJobBrowse.yesterdayBrowseCount,
          totalCount: statisticJobBrowse.totalBrowseCount,
          unit: '次',
        });
        todayResult.push({
          name: '今天公司新增',
          count: statisticCompany.todayAddCount,
          previousCount: statisticCompany.yesterdayAddCount,
          totalCount: statisticCompany.totalCompany,
          unit: '间',
        });
        todayResult.push({
          name: '今天标签公司新增',
          count: statisticCompanyTag.todayTagCompany,
          previousCount: statisticCompanyTag.yesterdayTagCompany,
          totalCount: statisticCompanyTag.totalTagCompany,
          unit: '间',
        });
        todayResult.push({
          name: '今天标签新增',
          count: statisticCompanyTag.todayTag,
          previousCount: statisticCompanyTag.yesterdayTag,
          totalCount: statisticCompanyTag.totalTag,
          unit: '个',
        });
        setTodayStatisticData(todayResult);
        let chartResult = [];
        const statisticJobSearchGroupByAvgSalaryParam = new SearchJobBO();
        const statisticJobSearchGroupByAvgSalaryResult =
          await JobApi.statisticJobSearchGroupByAvgSalary({
            statisticJobSearchGroupByAvgSalaryParam,
          });
        chartResult.push({
          title: '职位薪资分析',
          data: convertToChartData({
            queryResult: convertObjectToChartData(
              statisticJobSearchGroupByAvgSalaryResult
            ),
            defaultNameArray: JOB_SALARY_NAME_ARRAY,
          }),
          showAll: true,
        });
        chartResult.push({
          title: '职位发布时间分析(按月)',
          data: convertToChartData({
            queryResult: await JobApi.jobStatisticGroupByPublishDate(
              new JobStatisticGroupByPublishDateBO(TYPE_ENUM_MONTH)
            ),
            defaultNameArray: MONTH_NAME_ARRAY,
            convertNameFunction: convertMonthName,
          }),
        });
        chartResult.push({
          title: '职位发布时间分析(按周)',
          data: convertToChartData({
            queryResult: await JobApi.jobStatisticGroupByPublishDate(
              new JobStatisticGroupByPublishDateBO(TYPE_ENUM_WEEK)
            ),
            defaultNameArray: WEEK_NAME_ARRAY,
            convertNameFunction: convertWeekName,
          }),
        });
        chartResult.push({
          title: '职位发布时间分析(按日)',
          data: convertToChartData({
            queryResult: await JobApi.jobStatisticGroupByPublishDate(
              new JobStatisticGroupByPublishDateBO(TYPE_ENUM_DAY)
            ),
            defaultNameArray: DAY_NAME_ARRAY,
          }),
        });
        chartResult.push({
          title: '职位发布时间分析(按小时)',
          data: convertToChartData({
            queryResult: await JobApi.jobStatisticGroupByPublishDate(
              new JobStatisticGroupByPublishDateBO(TYPE_ENUM_HOUR)
            ),
            defaultNameArray: HOUR_NAME_ARRAY,
          }),
        });
        chartResult.push({
          title: '职位发布平台分析',
          data: convertToChartData({
            queryResult: await JobApi.jobStatisticGroupByPlatform(),
            defaultNameArray: PLATFORM_NAME_ARRAY,
            convertNameFunction: platformFormat,
          }),
          showAll: true,
        });
        chartResult.push({
          title: '公司成立年份分段分析',
          data: convertToChartData({
            queryResult: await CompanyApi.companyStatisticGroupByStartDate(),
            defaultNameArray: COMPANY_START_DATE_NAME_ARRAY,
          }),
          showAll: true,
        });
        chartResult.push({
          title: '公司社保人数分段分析',
          data: convertToChartData({
            queryResult: await CompanyApi.companyStatisticGroupByInsurance(),
            defaultNameArray: COMPANY_INSURANCE_NAME_ARRAY,
            convertNameFunction: convertCompanyInsuranceName,
          }),
          showAll: true,
        });
        try {
          setTagNameGroupDataLoading(true);
          setChartData(chartResult);
          let tagNameGroupDataResult = await JobApi.jobTagNameStatistic({
            pageNum: 1,
            pageSize: 15,
          });
          setTagNameGroupData(tagNameGroupDataResult);
        } finally {
          setTagNameGroupDataLoading(false);
        }
      };
      statistic();
      return () => {};
    },
    [
      //这里的值改变时，会执行上面return的匿名函数
    ]
  );

  useEffect(() => {
    queryJobStatisticJobTagGroupByPlatform();
  }, [jobStatisticJobCompanyTagGroupByPlatformValue]);

  const queryJobStatisticJobTagGroupByPlatform = async () => {
    try {
      setJobStatisticJobCompanyTagGroupByPlatformLoading(true);
      let jobStatisticJobCompanyTagGroupByPlatformResult =
        await JobApi.jobStatisticJobCompanyTagGroupByPlatform({
          tagName: jobStatisticJobCompanyTagGroupByPlatformValue,
        });
      let jobStatisticJobGroupByPlatformResult =
        await JobApi.jobStatisticJobCompanyTagGroupByPlatform({});
      let result = convertToChartData({
        queryResult: jobStatisticJobCompanyTagGroupByPlatformResult,
        defaultNameArray: PLATFORM_NAME_ARRAY,
        countKey: 'count',
        fetchCountKey: 'count',
      });
      const jobStatisticJobCompanyTagGroupByPlatformResultMap = new Map<
        string,
        { name: string; count: number }
      >(result.map((obj) => [obj.name, obj]));
      const jobStatisticJobGroupByPlatformResultMap = new Map<
        string,
        { name: string; count: number }
      >(jobStatisticJobGroupByPlatformResult.map((obj) => [obj.name, obj]));
      const items = [];
      PLATFORM_NAME_ARRAY.forEach((name) => {
        let obj: any = Object.assign(
          {},
          jobStatisticJobCompanyTagGroupByPlatformResultMap.get(name)
        );
        obj.total =
          jobStatisticJobGroupByPlatformResultMap.get(name)?.count ?? 0;
        items.push(obj);
      });
      items.forEach((item) => {
        item.name = platformFormat(item.name);
        item.percentage =
          item.total == 0 ? 0 : ((item.count / item.total) * 100).toFixed(2);
      });
      items.sort((a, b) => {
        let aValue = a.total == 0 ? 0 : a.count / a.total;
        let bValue = b.total == 0 ? 0 : b.count / b.total;
        return -(aValue - bValue);
      });
      setJobStatisticJobCompanyTagGroupByPlatform({ items });
    } finally {
      setJobStatisticJobCompanyTagGroupByPlatformLoading(false);
    }
  };

  useEffect(() => {
    queryJobStatisticJobTagGroupByCompany();
  }, [jobStatisticJobCompanyTagGroupByCompanyValue]);

  const queryJobStatisticJobTagGroupByCompany = async () => {
    try {
      setJobStatisticJobCompanyTagGroupByCompanyLoading(true);
      let jobStatisticJobCompanyTagGroupByCompanyResult =
        await JobApi.jobStatisticJobCompanyTagGroupByCompany({
          pageNum: 1,
          pageSize: 15,
          tagName: jobStatisticJobCompanyTagGroupByCompanyValue,
        });
      setJobStatisticJobCompanyTagGroupByCompany(
        jobStatisticJobCompanyTagGroupByCompanyResult
      );
    } finally {
      setJobStatisticJobCompanyTagGroupByCompanyLoading(false);
    }
  };

  return (
    <>
      <Row gutter={2}>
        {todayStatisticData.map((item, index) => (
          <StatisticCard
            key={index}
            name={item.name}
            count={item.count}
            previousCount={item.previousCount}
            totalCount={item.totalCount}
            unit={item.unit}
          ></StatisticCard>
        ))}
      </Row>
      <Row gutter={2}>
        <Col sm={24} xl={24}>
          <Card size="small" title="公共招聘网站" style={{ margin: 10 }}>
            <Row>
              {publicJobWebsiteList.map((item, index) => (
                <Col
                  title={item.desc}
                  key={index}
                  xs={12}
                  sm={8}
                  md={6}
                  lg={4}
                  className="cardItem flexCenter"
                >
                  <Link href={item.url} target="_blank" className="flexCenter">
                    <Row>
                      <Col xs={24} className="flexCenter">
                        <img
                          className="companyLogo"
                          src={item.logo}
                          alt="logo"
                        />
                      </Col>
                      <Col xs={24} className="cardLabel flexCenter">
                        <Flex>{item.label}</Flex>
                      </Col>
                    </Row>
                  </Link>
                </Col>
              ))}
            </Row>
          </Card>
        </Col>
        <Col sm={24} xl={12}>
          <Card size="small" title="商业化招聘网站" style={{ margin: 10 }}>
            <Row>
              {jobWebsiteList.map((item, index) => (
                <Col
                  title={item.desc}
                  key={index}
                  xs={12}
                  sm={8}
                  md={6}
                  lg={4}
                  className="cardItem flexCenter"
                >
                  <Link href={item.url} target="_blank" className="flexCenter">
                    <Row>
                      <Col xs={24} className="flexCenter">
                        <img
                          className="companyLogo"
                          src={item.logo}
                          alt="logo"
                        />
                      </Col>
                      <Col xs={24} className="cardLabel flexCenter">
                        <Flex>{item.label}</Flex>
                      </Col>
                    </Row>
                  </Link>
                </Col>
              ))}
            </Row>
          </Card>
        </Col>
        <Col sm={24} xl={12}>
          <Card size="small" title="公司查询" style={{ margin: 10 }}>
            <Row>
              {companyWebsiteList.map((item, index) => (
                <Col
                  title={item.desc}
                  key={index}
                  xs={12}
                  sm={8}
                  md={6}
                  lg={3}
                  className="cardItem flexCenter"
                >
                  <Link href={item.url} target="_blank" className="flexCenter">
                    <Row>
                      <Col xs={24} className="flexCenter">
                        <Icon className="companyLogo" icon="mdi:web" />
                      </Col>
                      <Col xs={24} className="cardLabel flexCenter">
                        <Flex>{item.label}</Flex>
                      </Col>
                    </Row>
                  </Link>
                </Col>
              ))}
            </Row>
          </Card>
        </Col>
      </Row>
      <Row>
        <Col key="tagNameGroup" xs={24} sm={24} md={12} lg={12} xl={8} xxl={6}>
          <BackgroundChart
            title="职位常见标签(公司数/总公司数)"
            data={tagNameGroupData}
            loading={tagNameGroupDataLoading}
          ></BackgroundChart>
        </Col>
        <Col
          key="jobStatisticJobCompanyTagGroupByPlatform"
          xs={24}
          sm={24}
          md={12}
          lg={12}
          xl={8}
          xxl={6}
        >
          <BackgroundChart
            loading={jobStatisticJobCompanyTagGroupByPlatformDataLoading}
            title={
              <Flex align="center" justify="center">
                <Text>标签公司职位占比(职位数/总职位数)</Text>
                <Flex flex={1}>
                  <Select
                    showSearch
                    style={{ width: '100%' }}
                    options={whitelist}
                    defaultValue={jobStatisticJobCompanyTagGroupByPlatformValue}
                    onSelect={(value) => {
                      setJobStatisticJobCompanyTagGroupByPlatformValue(value);
                    }}
                  />
                </Flex>
              </Flex>
            }
            data={jobStatisticJobCompanyTagGroupByPlatformData}
          ></BackgroundChart>
        </Col>
        <Col
          key="jobStatisticJobCompanyTagGroupByCompany"
          xs={24}
          sm={24}
          md={12}
          lg={12}
          xl={8}
          xxl={6}
        >
          <BackgroundChart
            loading={jobStatisticJobCompanyTagGroupByCompanyDataLoading}
            title={
              <Flex align="center" justify="center">
                <Text>标签公司职位TOP(职位数/总职位数)</Text>
                <Flex flex={1}>
                  <Select
                    showSearch
                    style={{ width: '100%' }}
                    options={whitelist}
                    defaultValue={jobStatisticJobCompanyTagGroupByCompanyValue}
                    onSelect={(value) => {
                      setJobStatisticJobCompanyTagGroupByCompanyValue(value);
                    }}
                  />
                </Flex>
              </Flex>
            }
            data={jobStatisticJobCompanyTagGroupByCompanyData}
            xSize={130}
          ></BackgroundChart>
        </Col>
        {chartData.map((item, index) => (
          <Col key={index} xs={24} sm={24} md={12} lg={12} xl={8} xxl={6}>
            <BasicChart
              title={item.title}
              data={item.data}
              showAll={item.showAll}
            />
          </Col>
        ))}
      </Row>
    </>
  );
};

export default DashboardView;
