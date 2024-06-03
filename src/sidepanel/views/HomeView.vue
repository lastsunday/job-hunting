<template>
  <el-row v-loading="loading">
    <el-col :span="8">
      <el-statistic title="今天职位扫描次数" :value="todayBrowseCount" />
    </el-col>
    <el-col :span="8">
      <el-statistic title="职位扫描总数" :value="totalBrowseCount" />
    </el-col>
    <el-col :span="8">
      <el-statistic title="总职位数" :value="totalJobCount" />
    </el-col>
  </el-row>
  <el-col class="search">
    <div class="flex">
      <el-input
        placeholder="名称"
        v-model="jobSearchName"
        clearable
        @change="onClickSearch"
      />
      <div class="operation_menu">
        <div class="operation_menu_left">
          <el-switch
            v-model="showAdvanceSearch"
            active-text="高级搜索"
            inactive-text="普通搜索"
            inline-prompt
          />
        </div>
        <div>
          <el-button @click="showDialogAvgSalary">统计薪酬区间职位数</el-button>
          <el-button @click="searchResultExport">导出</el-button>
          <el-button @click="reset">重置</el-button>
          <el-button @click="onClickSearch"
            ><el-icon><Search /></el-icon
          ></el-button>
        </div>
      </div>
    </div>
    <el-collapse :hidden="!showAdvanceSearch">
      <el-collapse-item title="高级搜索条件">
        <div class="flex gap-4 mb-4">
          <el-input
            style="width: 240px"
            placeholder="公司"
            v-model="jobSearchCompanyName"
            clearable
            @change="onClickSearch"
          />
          <el-input
            style="width: 240px"
            placeholder="地区"
            v-model="jobSearchLocationName"
            clearable
            @change="onClickSearch"
          />
          <el-input
            style="width: 240px"
            placeholder="地址"
            v-model="jobSearchAddress"
            clearable
            @change="onClickSearch"
          />
          <el-date-picker
            type="daterange"
            range-separator="到"
            start-placeholder="首次扫描开始时间"
            end-placeholder="首次扫描结束时间"
            v-model="jobSearchDatetime"
            clearable
            @change="onClickSearch"
          />
          <el-date-picker
            type="daterange"
            range-separator="到"
            start-placeholder="发布开始时间"
            end-placeholder="发布结束时间"
            v-model="jobSearchFirstPublishDatetime"
            clearable
            @change="onClickSearch"
          />
        </div>
      </el-collapse-item>
    </el-collapse>
  </el-col>
  <el-row>
    <el-table
      :data="tableData"
      :default-sort="{ prop: 'createDatetime', order: 'descending' }"
      style="width: 100%"
      stripe
      @sort-change="sortChange"
      sortable="custom"
    >
      <el-table-column type="expand" width="30">
        <template #default="props">
          <div m="4" class="expand">
            <el-descriptions class="margin-top" :column="2" size="small" border>
              <el-descriptions-item>
                <template #label>
                  <div class="cell-item">名称</div>
                </template>
                <a
                  :href="props.row.jobUrl"
                  target="_blank"
                  :title="props.row.jobUrl"
                >
                  {{ props.row.jobName }}
                </a>
              </el-descriptions-item>
              <el-descriptions-item>
                <template #label>
                  <div class="cell-item">公司</div>
                </template>
                {{ props.row.jobCompanyName }}
              </el-descriptions-item>
              <el-descriptions-item>
                <template #label>
                  <div class="cell-item">学历</div>
                </template>
                {{ props.row.jobDegreeName }}
              </el-descriptions-item>
              <el-descriptions-item>
                <template #label>
                  <div class="cell-item">薪资</div>
                </template>
                {{ props.row.jobSalaryMin }}-{{ props.row.jobSalaryMax }}
              </el-descriptions-item>
              <el-descriptions-item>
                <template #label>
                  <div class="cell-item">招聘人</div>
                </template>
                {{ props.row.bossName }}【 {{ props.row.bossPosition }} 】
              </el-descriptions-item>
              <el-descriptions-item>
                <template #label>
                  <div class="cell-item">招聘平台</div>
                </template>
                {{ props.row.jobPlatform }}
              </el-descriptions-item>
              <el-descriptions-item>
                <template #label>
                  <div class="cell-item">工作地址</div>
                </template>
                {{ props.row.jobAddress }}
              </el-descriptions-item>
            </el-descriptions>
            <textarea
              m="t-0 b-2"
              style="width: 100%; height: 300px"
              disabled
              :value="props.row.jobDescription.replace(/<\/?.+?\/?>/g, '')"
            >
            </textarea>
          </div>
        </template>
      </el-table-column>
      <el-table-column
        prop="createDatetime"
        sortable="custom"
        label="首次扫描时间"
        width="140"
      >
        <template #default="scope">
          {{ datetimeFormat(scope.row.createDatetime) }}
        </template>
      </el-table-column>
      <el-table-column
        prop="jobFirstPublishDatetime"
        sortable="custom"
        label="发布时间"
        width="110"
      >
        <template #default="scope">
          {{ datetimeFormat(scope.row.jobFirstPublishDatetime) }}
        </template>
      </el-table-column>
      <el-table-column label="名称">
        <template #default="scope">
          <a :href="scope.row.jobUrl" target="_blank" :title="scope.row.jobUrl">
            <el-text line-clamp="1">
              {{ scope.row.jobName }}
            </el-text>
          </a>
        </template>
      </el-table-column>
      <el-table-column label="公司">
        <template #default="scope">
          <el-text line-clamp="1">
            {{ scope.row.jobCompanyName }}
          </el-text>
        </template>
      </el-table-column>
      <el-table-column label="地区" width="120">
        <template #default="scope">
          <el-text line-clamp="1">
            {{ scope.row.jobLocationName }}
          </el-text>
        </template>
      </el-table-column>
      <el-table-column
        label="最低薪资"
        prop="jobSalaryMin"
        sortable="custom"
        width="120"
      >
        <template #default="scope">
          <el-text line-clamp="1">
            {{ scope.row.jobSalaryMin }}
          </el-text>
        </template>
      </el-table-column>
      <el-table-column
        label="最高薪资"
        prop="jobSalaryMax"
        sortable="custom"
        width="120"
      >
        <template #default="scope">
          <el-text line-clamp="1">
            {{ scope.row.jobSalaryMax }}
          </el-text>
        </template>
      </el-table-column>
      <el-table-column
        label="几薪"
        prop="jobSalaryTotalMonth"
        sortable="custom"
        width="80"
      >
        <template #default="scope">
          <el-text line-clamp="1">
            {{ scope.row.jobSalaryTotalMonth }}
          </el-text>
        </template>
      </el-table-column>
      <el-table-column label="学历" prop="jobDegreeName" sortable width="120">
        <template #default="scope">
          <el-text line-clamp="1">
            {{ scope.row.jobDegreeName }}
          </el-text>
        </template>
      </el-table-column>
    </el-table>
  </el-row>
  <el-row>
    <el-pagination
      v-model:current-page="currentPage"
      v-model:page-size="pageSize"
      :page-sizes="[10, 50, 100, 200, 500, 1000]"
      :small="small"
      :disabled="disabled"
      :background="background"
      layout="total, sizes, prev, pager, next"
      :total="total"
      @size-change="handleSizeChange"
      @current-change="handleCurrentChange"
    />
  </el-row>
  <el-dialog
    v-model="dialogAvgSalaryVisible"
    title="统计薪酬区间职位数"
    width="90%"
  >
    <v-chart
      :loading="avgSalaryEchartLoading"
      v-if="dialogAvgSalaryEchartVisible"
      class="dialog_avg_salary"
      :option="avgSalaryOption"
    />
  </el-dialog>
</template>

<script lang="ts" setup>
import { onMounted, ref, computed, provide, nextTick } from "vue";
import { useTransition } from "@vueuse/core";
import { JobApi } from "@/api/index.js";
import { SearchJobBO } from "@/data/bo/searchJobBO.js";
import dayjs from "dayjs";
import { utils, writeFileXLSX } from "xlsx";
import { use } from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";
import { BarChart } from "echarts/charts";
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
} from "echarts/components";
import VChart from "vue-echarts";
import { toLine } from "@/utils";

use([
  CanvasRenderer,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  BarChart,
]);

const todayBrowseCountSource = ref(0);
const totalBrowseCountSource = ref(0);
const totalJobCountSource = ref(0);
const todayBrowseCount = useTransition(todayBrowseCountSource, {
  duration: 1000,
});
const totalBrowseCount = useTransition(totalBrowseCountSource, {
  duration: 1000,
});

const totalJobCount = useTransition(totalJobCountSource, {
  duration: 1000,
});
const loading = ref(true);
const firstTimeLoading = ref(true);

const tableData = ref([]);
const currentPage = ref(1);
const pageSize = ref(10);
const total = ref(0);
const small = ref(false);
const background = ref(false);
const disabled = ref(false);
const datetimeFormat = computed(() => {
  return function (value: string) {
    return dayjs(value).isValid() ? dayjs(value).format("YYYY-MM-DD") : "未知";
  };
});
const jobSearchName = ref(null);
const jobSearchCompanyName = ref(null);
const jobSearchLocationName = ref(null);
const jobSearchAddress = ref(null);
const jobSearchDatetime = ref([]);
const jobSearchFirstPublishDatetime = ref([]);
const jobSearchOrderByColumn = ref("create_datetime");
const jobSearchOrderBy = ref("DESC");

const showAdvanceSearch = ref(false);

const dialogAvgSalaryVisible = ref(false);
const dialogAvgSalaryEchartVisible = ref(false);
const avgSalaryEchartLoading = ref(true);

const handleSizeChange = (val: number) => {
  search();
};

const handleCurrentChange = (val: number) => {
  search();
};

onMounted(async () => {
  await refreshStatistic();
  setInterval(refreshStatistic, 10000);
  search();
});

const avgSalaryOption = ref({
  tooltip: {},
  legend: {},
  xAxis: {
    type: "category",
    data: [],
  },
  yAxis: {
    type: "value",
  },
  series: [
    {
      name: "职位数",
      data: [],
      type: "bar",
      label: {
        show: true,
      },
    },
  ],
});

const showDialogAvgSalary = async () => {
  avgSalaryEchartLoading.value = true;
  dialogAvgSalaryVisible.value = true;
  let result = await JobApi.statisticJobSearchGroupByAvgSalary(
    getSearchParam()
  );
  let xAxisArray = [
    "6k-9k",
    "9k-12k",
    "12k-15k",
    "15k-18k",
    "18k-21k",
    "21k-24k",
    ">24k",
  ];
  avgSalaryOption.value.xAxis.data = xAxisArray;
  let seriesArray = [];
  for (let i = 0; i < xAxisArray.length; i++) {
    seriesArray.push(result[xAxisArray[i]]);
  }
  avgSalaryOption.value.series[0].data = seriesArray;
  nextTick(() => {
    avgSalaryEchartLoading.value = false;
    dialogAvgSalaryEchartVisible.value = true;
  });
};

const sortChange = function (column) {
  if (column.order !== null && column.prop) {
    jobSearchOrderByColumn.value = toLine(column.prop);
    if (column.order === "descending") {
      jobSearchOrderBy.value = "DESC";
    } else if (column.order === "ascending") {
      jobSearchOrderBy.value = "ASC";
    } else {
      jobSearchOrderByColumn.value = "create_datetime";
      jobSearchOrderBy.value = "DESC";
    }
  }
  search();
};

const searchResultExport = async () => {
  let list = tableData.value;
  let result = [];
  for (let i = 0; i < list.length; i++) {
    let item = list[i];
    result.push({
      职位自编号: item.jobId,
      发布平台: item.jobPlatform,
      职位访问地址: item.jobUrl,
      职位: item.jobName,
      公司: item.jobCompanyName,
      地区: item.jobLocationName,
      地址: item.jobAddress,
      经度: item.jobLongitude,
      维度: item.jobLatitude,
      职位描述: item.jobDescription,
      学历: item.jobDegreeName,
      所需经验: item.jobYear,
      最低薪资: item.jobSalaryMin,
      最高薪资: item.jobSalaryMax,
      几薪: item.jobSalaryTotalMonth,
      首次发布时间: item.jobFirstPublishDatetime,
      招聘人: item.bossName,
      招聘公司: item.bossCompanyName,
      招聘者职位: item.bossPosition,
      首次扫描日期: item.createDatetime,
      记录更新日期: item.updateDatetime,
    });
  }
  const ws = utils.json_to_sheet(result);
  const wb = utils.book_new();
  utils.book_append_sheet(wb, ws, "Data");
  writeFileXLSX(wb, dayjs(new Date()).format("YYYYMMDDHHmmss") + ".xlsx");
};

const onClickSearch = async () => {
  currentPage.value = 1;
  search();
};

const reset = async () => {
  jobSearchName.value = null;
  jobSearchCompanyName.value = null;
  jobSearchLocationName.value = null;
  jobSearchAddress.value = null;
  jobSearchDatetime.value = [];
  jobSearchFirstPublishDatetime.value = [];
  currentPage.value = 1;
  search();
};

const search = async () => {
  let searchResult = await JobApi.searchJob(getSearchParam());
  tableData.value = searchResult.items;
  total.value = parseInt(searchResult.total);
};

function getSearchParam() {
  let searchParam = new SearchJobBO();
  searchParam.pageNum = currentPage.value;
  searchParam.pageSize = pageSize.value;
  searchParam.jobName = jobSearchName.value;
  searchParam.jobLocationName = jobSearchLocationName.value;
  searchParam.jobAddress = jobSearchAddress.value;
  searchParam.jobCompanyName = jobSearchCompanyName.value;
  if (jobSearchDatetime.value && jobSearchDatetime.value.length > 0) {
    searchParam.startDatetime = dayjs(jobSearchDatetime.value[0]);
    searchParam.endDatetime = dayjs(jobSearchDatetime.value[1]);
  } else {
    searchParam.startDatetime = null;
    searchParam.endDatetime = null;
  }
  if (
    jobSearchFirstPublishDatetime.value &&
    jobSearchFirstPublishDatetime.value.length > 0
  ) {
    searchParam.firstPublishStartDatetime = dayjs(
      jobSearchFirstPublishDatetime.value[0]
    );
    searchParam.firstPublishEndDatetime = dayjs(
      jobSearchFirstPublishDatetime.value[1]
    );
  } else {
    searchParam.startDatetime = null;
    searchParam.endDatetime = null;
  }
  searchParam.orderByColumn = jobSearchOrderByColumn.value;
  searchParam.orderBy = jobSearchOrderBy.value;
  return searchParam;
}

const refreshStatistic = async () => {
  if (firstTimeLoading.value) {
    loading.value = true;
    firstTimeLoading.value = false;
  }
  const statisticJobBrowseDTO = await JobApi.statisticJobBrowse();
  todayBrowseCountSource.value = statisticJobBrowseDTO.todayBrowseCount;
  totalBrowseCountSource.value = statisticJobBrowseDTO.totalBrowseCount;
  totalJobCountSource.value = statisticJobBrowseDTO.totalJob;
  loading.value = false;
};
</script>

<style scoped>
.el-col {
  text-align: center;
}
.el-row {
  padding-top: 10px;
}
.chart {
  height: 400px;
}
.expand {
  padding: 10px;
}
.search {
  padding: 10px;
  text-align: left;
}
.operation_menu {
  display: flex;
  justify-content: end;
  padding: 5px;
}
.operation_menu_left {
  flex: 1;
}
.dialog_avg_salary {
  height: 400px;
}
</style>
