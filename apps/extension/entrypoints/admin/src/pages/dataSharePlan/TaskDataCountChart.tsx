import ReactEChartsCore from 'echarts-for-react';
import { BarChart } from 'echarts/charts';
import {
  DataZoomComponent,
  DataZoomSliderComponent,
  GridComponent,
  LegendComponent,
  TooltipComponent,
} from 'echarts/components';
import * as echarts from 'echarts/core';
import { use } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { StackBarData } from '../../data/chart/StackBarData';

use([
  CanvasRenderer,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  DataZoomComponent,
  DataZoomSliderComponent,
  BarChart,
]);

interface TaskDataCountChartProps {
  data: StackBarData;
}

const TaskDataCountChart: React.FC<TaskDataCountChartProps> = ({ data }) => {
  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        // Use axis to trigger tooltip
        type: 'shadow', // 'shadow' as default; can also be 'line' or 'shadow'
      },
    },
    legend: {},
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true,
    },
    dataZoom: [
      {
        id: 'dataZoomY',
        type: 'slider',
        yAxisIndex: [0],
        filterMode: 'empty',
      },
    ],
    xAxis: {
      type: 'value',
    },
    yAxis: {
      type: 'category',
      data: [...data.dateData],
    },
    series: data.seriesData.map((item) => {
      return {
        name: item.name,
        type: 'bar',
        stack: 'total',
        label: {
          show: true,
        },
        color: item.color,
        emphasis: {
          focus: 'series',
        },
        data: item.data,
      };
    }),
  };

  return (
    <>
      <ReactEChartsCore echarts={echarts} option={option} />
    </>
  );
};

export default TaskDataCountChart;

