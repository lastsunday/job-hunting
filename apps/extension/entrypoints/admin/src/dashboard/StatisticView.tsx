
import {
  PLATFORM_51JOB,
  PLATFORM_BOSS,
  PLATFORM_GGFW_HRSS_GD,
  PLATFORM_JOBONLINE,
  PLATFORM_JOBSDB,
  PLATFORM_LAGOU,
  PLATFORM_LIEPIN,
  PLATFORM_ZHILIAN,
} from '@/common';
import { CompanyApi, JobApi, TagApi } from '@/common/api';
import {
  JobStatisticGroupByPublishDateBO,
  TYPE_ENUM_DAY,
  TYPE_ENUM_HOUR,
  TYPE_ENUM_MONTH,
  TYPE_ENUM_WEEK,
} from '@/common/data/bo/jobStatisticGroupByPublishDateBO';
import { SearchJobBO } from '@/common/data/bo/searchJobBO';
import { convertToAbbreviation } from '@/common/utils';
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
echarts.use([
  TitleComponent,
  TooltipComponent,
  GridComponent,
  BarChart,
  CanvasRenderer,
]);

const { Text } = Typography;

import { ReactNode } from 'react';
import { WhitelistData } from '../data/WhitelistData';

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
  const sortItems = items.toReversed();
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

const genNumberArray = (start, count) => {
  const result = [];
  for (let i = start; i <= count; i++) {
    result.push(i.toString().padStart(2, '0'));
  }
  return result;
};
const MONTH_NAME_OBJECT = {
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

const WEEK_NAME_OBJECT = {
  '1': '星期一',
  '2': '星期二',
  '3': '星期三',
  '4': '星期四',
  '5': '星期五',
  '6': '星期六',
  '7': '星期日',
};
const WEEK_NAME_ARRAY = ['1', '2', '3', '4', '5', '6', '7'];
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
  PLATFORM_JOBONLINE,
  PLATFORM_GGFW_HRSS_GD,
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
const COMPANY_INSURANCE_OBJECT = {
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
  const result = [];
  const nameArray = [];
  const nameMap = new Map();
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
    const filterItem = queryResult.filter((item) => {
      return item.name == name;
    });
    const obj = {};
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

const StatisticView: React.FC = () => {
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
      const allTags = await TagApi.getAllTag();
      const tagItems = [];
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
        const chartResult = [];
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
          const tagNameGroupDataResult = await JobApi.jobTagNameStatistic({
            pageNum: 1,
            pageSize: 15,
          });
          setTagNameGroupData(tagNameGroupDataResult);
        } finally {
          setTagNameGroupDataLoading(false);
        }
      };
      statistic();
      return () => { };
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
      const jobStatisticJobCompanyTagGroupByPlatformResult =
        await JobApi.jobStatisticJobCompanyTagGroupByPlatform({
          tagName: jobStatisticJobCompanyTagGroupByPlatformValue,
        });
      const jobStatisticJobGroupByPlatformResult =
        await JobApi.jobStatisticJobCompanyTagGroupByPlatform({});
      const result = convertToChartData({
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
        const obj: any = Object.assign(
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
        const aValue = a.total == 0 ? 0 : a.count / a.total;
        const bValue = b.total == 0 ? 0 : b.count / b.total;
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
      const jobStatisticJobCompanyTagGroupByCompanyResult =
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

export default StatisticView;
