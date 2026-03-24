import { createFileRoute } from '@tanstack/react-router';
import {
  Title,
  Card,
  Tabs,
  Grid,
  Text,
  Skeleton,
  Stack,
  Group,
  Select,
} from '@mantine/core';
import { useEffect, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import { jobStatsApi, companyStatsApi, StatItem } from '@/api/statistics';

export const Route = createFileRoute('/_pathlessLayout/admin/')({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <Stack gap="md">
      <Title order={2}>数据统计</Title>
      <Tabs defaultValue="job">
        <Tabs.List>
          <Tabs.Tab value="job">职位统计</Tabs.Tab>
          <Tabs.Tab value="company">公司统计</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="job" pt="md">
          <JobStats />
        </Tabs.Panel>

        <Tabs.Panel value="company" pt="md">
          <CompanyStats />
        </Tabs.Panel>
      </Tabs>
    </Stack>
  );
}

function JobStats() {
  const currentYear = new Date().getFullYear();
  const [loading, setLoading] = useState(true);
  const [scanTimeYear, setScanTimeYear] = useState<string | null>(
    currentYear.toString()
  );
  const [scanTimeData, setScanTimeData] = useState<StatItem[]>([]);
  const [salaryData, setSalaryData] = useState<StatItem[]>([]);
  const [locationData, setLocationData] = useState<StatItem[]>([]);
  const [platformData, setPlatformData] = useState<StatItem[]>([]);
  const [degreeData, setDegreeData] = useState<StatItem[]>([]);
  const [yearData, setYearData] = useState<StatItem[]>([]);

  const fetchScanTime = async (year?: number) => {
    const data = await jobStatsApi.getScanTime(year);
    setScanTimeData(data);
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [salary, location, platform, degree, year] = await Promise.all([
          jobStatsApi.getSalary(),
          jobStatsApi.getLocation(),
          jobStatsApi.getPlatform(),
          jobStatsApi.getDegree(),
          jobStatsApi.getYear(),
        ]);
        setSalaryData(salary);
        setLocationData(location);
        setPlatformData(platform);
        setDegreeData(degree);
        setYearData(year);
        await fetchScanTime(scanTimeYear ? parseInt(scanTimeYear) : undefined);
      } catch (error) {
        console.error('Failed to load job stats:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (!loading) {
      fetchScanTime(scanTimeYear ? parseInt(scanTimeYear) : undefined);
    }
  }, [scanTimeYear]);

  const yearOptions = [
    { value: '', label: '全部' },
    ...Array.from({ length: 5 }, (_, i) => ({
      value: (currentYear - i).toString(),
      label: (currentYear - i).toString(),
    })),
  ];

  if (loading) {
    return (
      <Grid>
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Grid.Col key={i} span={{ base: 12, md: 6, lg: 4 }}>
            <Skeleton height={300} radius="md" />
          </Grid.Col>
        ))}
      </Grid>
    );
  }

  return (
    <Grid>
      <Grid.Col span={{ base: 12, md: 6, lg: 4 }}>
        <StatCard
          title="扫描时间分布"
          extra={
            <Select
              size="xs"
              value={scanTimeYear}
              onChange={setScanTimeYear}
              data={yearOptions}
              style={{ width: 80 }}
              allowDeselect={false}
            />
          }
        >
          <ReactECharts
            option={getLineChartOption(scanTimeData, '扫描数量')}
            style={{ height: 280 }}
          />
        </StatCard>
      </Grid.Col>
      <Grid.Col span={{ base: 12, md: 6, lg: 4 }}>
        <StatCard title="薪资分布">
          <ReactECharts
            option={getBarChartOption(salaryData, '职位数量')}
            style={{ height: 280 }}
          />
        </StatCard>
      </Grid.Col>
      <Grid.Col span={{ base: 12, md: 6, lg: 4 }}>
        <StatCard title="地区分布 (Top 10)">
          <ReactECharts
            option={getBarChartOption(locationData.slice(0, 10), '职位数量')}
            style={{ height: 280 }}
          />
        </StatCard>
      </Grid.Col>
      <Grid.Col span={{ base: 12, md: 6, lg: 4 }}>
        <StatCard title="平台分布">
          <ReactECharts
            option={getPieChartOption(platformData)}
            style={{ height: 280 }}
          />
        </StatCard>
      </Grid.Col>
      <Grid.Col span={{ base: 12, md: 6, lg: 4 }}>
        <StatCard title="学历分布">
          <ReactECharts
            option={getBarChartOption(degreeData, '职位数量')}
            style={{ height: 280 }}
          />
        </StatCard>
      </Grid.Col>
      <Grid.Col span={{ base: 12, md: 6, lg: 4 }}>
        <StatCard title="工作年限分布">
          <ReactECharts
            option={getBarChartOption(yearData, '职位数量')}
            style={{ height: 280 }}
          />
        </StatCard>
      </Grid.Col>
    </Grid>
  );
}

function CompanyStats() {
  const currentYear = new Date().getFullYear();
  const [loading, setLoading] = useState(true);
  const [sourceUpdateYear, setSourceUpdateYear] = useState<string | null>(
    currentYear.toString()
  );
  const [insuranceData, setInsuranceData] = useState<StatItem[]>([]);
  const [industryData, setIndustryData] = useState<StatItem[]>([]);
  const [statusData, setStatusData] = useState<StatItem[]>([]);
  const [sourceUpdateData, setSourceUpdateData] = useState<StatItem[]>([]);

  const fetchSourceUpdate = async (year?: number) => {
    const data = await companyStatsApi.getSourceUpdate(year);
    setSourceUpdateData(data);
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [insurance, industry, status] = await Promise.all([
          companyStatsApi.getInsurance(),
          companyStatsApi.getIndustry(),
          companyStatsApi.getStatus(),
        ]);
        setInsuranceData(insurance);
        setIndustryData(industry);
        setStatusData(status);
        await fetchSourceUpdate(
          sourceUpdateYear ? parseInt(sourceUpdateYear) : undefined
        );
      } catch (error) {
        console.error('Failed to load company stats:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (!loading) {
      fetchSourceUpdate(
        sourceUpdateYear ? parseInt(sourceUpdateYear) : undefined
      );
    }
  }, [sourceUpdateYear]);

  const yearOptions = [
    { value: '', label: '全部' },
    ...Array.from({ length: 5 }, (_, i) => ({
      value: (currentYear - i).toString(),
      label: (currentYear - i).toString(),
    })),
  ];

  if (loading) {
    return (
      <Grid>
        {[1, 2, 3, 4].map((i) => (
          <Grid.Col key={i} span={{ base: 12, md: 6 }}>
            <Skeleton height={300} radius="md" />
          </Grid.Col>
        ))}
      </Grid>
    );
  }

  return (
    <Grid>
      <Grid.Col span={{ base: 12, md: 6 }}>
        <StatCard title="社保人数分布">
          <ReactECharts
            option={getBarChartOption(insuranceData, '公司数量')}
            style={{ height: 280 }}
          />
        </StatCard>
      </Grid.Col>
      <Grid.Col span={{ base: 12, md: 6 }}>
        <StatCard title="行业分布 (Top 10)">
          <ReactECharts
            option={getBarChartOption(industryData.slice(0, 10), '公司数量')}
            style={{ height: 280 }}
          />
        </StatCard>
      </Grid.Col>
      <Grid.Col span={{ base: 12, md: 6 }}>
        <StatCard title="公司状态分布">
          <ReactECharts
            option={getPieChartOption(statusData)}
            style={{ height: 280 }}
          />
        </StatCard>
      </Grid.Col>
      <Grid.Col span={{ base: 12, md: 6 }}>
        <StatCard
          title="数据来源更新时间分布"
          extra={
            <Select
              size="xs"
              value={sourceUpdateYear}
              onChange={setSourceUpdateYear}
              data={yearOptions}
              style={{ width: 80 }}
              allowDeselect={false}
            />
          }
        >
          <ReactECharts
            option={getLineChartOption(sourceUpdateData, '更新数量')}
            style={{ height: 280 }}
          />
        </StatCard>
      </Grid.Col>
    </Grid>
  );
}

function StatCard({
  title,
  extra,
  children,
}: {
  title: string;
  extra?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card shadow="sm" padding="md" radius="md" withBorder h="100%">
      <Group justify="space-between" mb="sm">
        <Text fw={500} size="sm">
          {title}
        </Text>
        {extra}
      </Group>
      {children}
    </Card>
  );
}

function getLineChartOption(data: StatItem[], name: string) {
  return {
    tooltip: {
      trigger: 'axis',
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: data.map((item) => item.name),
      axisLabel: {
        rotate: 45,
        fontSize: 10,
      },
    },
    yAxis: {
      type: 'value',
    },
    series: [
      {
        name,
        type: 'line',
        data: data.map((item) => item.value),
        smooth: true,
        itemStyle: {
          color: '#228be6',
        },
        areaStyle: {
          color: 'rgba(34, 139, 230, 0.1)',
        },
      },
    ],
  };
}

function getBarChartOption(data: StatItem[], name: string) {
  return {
    tooltip: {
      trigger: 'axis',
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: data.map((item) => item.name),
      axisLabel: {
        rotate: 45,
        fontSize: 10,
      },
    },
    yAxis: {
      type: 'value',
    },
    series: [
      {
        name,
        type: 'bar',
        data: data.map((item) => item.value),
        itemStyle: {
          color: '#228be6',
        },
      },
    ],
  };
}

function getPieChartOption(data: StatItem[]) {
  const colors = [
    '#228be6',
    '#40c057',
    '#fab005',
    '#fd7e14',
    '#fa5252',
    '#be4bdb',
    '#868e96',
    '#20c997',
    '#e599f7',
    '#ff8787',
  ];
  return {
    tooltip: {
      trigger: 'item',
    },
    legend: {
      orient: 'vertical',
      right: 10,
      top: 'center',
      textStyle: {
        fontSize: 10,
      },
    },
    series: [
      {
        name: '数量',
        type: 'pie',
        radius: ['40%', '70%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 5,
          borderColor: '#fff',
          borderWidth: 2,
        },
        label: {
          show: false,
          position: 'center',
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 14,
            fontWeight: 'bold',
          },
        },
        labelLine: {
          show: false,
        },
        data: data.map((item, index) => ({
          value: item.value,
          name: item.name,
          itemStyle: {
            color: colors[index % colors.length],
          },
        })),
      },
    ],
  };
}
