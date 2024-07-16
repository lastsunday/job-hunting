<template>
  <el-row v-loading="loading" class="statistic">
    <el-col :span="6">
      <el-statistic title="今天职位查看数" :value="todayBrowseDetailCount" />
    </el-col>
    <el-col :span="6">
      <el-statistic title="职位查看总数" :value="totalBrowseDetailCount" />
    </el-col>
    <el-col :span="6">
      <el-statistic title="总职位数" :value="totalJobCount" />
    </el-col>
    <el-col :span="6">
      <div class="el-statistic">
        <div class="el-statistic__head">今天/总职位扫描数</div>
        <div class="el-statistic__content">
          {{ todayBrowseCountSource }}/{{ totalBrowseCountSource }}
        </div>
      </div>
    </el-col>
  </el-row>
  <div class="search">
    <div class="flex">
      <el-input placeholder="名称" v-model="jobSearchName" clearable @change="onClickSearch" />
      <div class="operation_menu">
        <div class="operation_menu_left">
          <el-switch v-model="showAdvanceSearch" active-text="高级搜索" inactive-text="普通搜索" inline-prompt />
          <el-switch v-model="mapMode" active-text="地图模式" inactive-text="列表模式" inline-prompt />
        </div>
        <div>
          <el-button @click="showDialogAvgSalary">统计薪酬区间职位数</el-button>
          <el-button @click="searchResultExport">导出</el-button>
          <el-button @click="reset">重置</el-button>
          <el-button @click="onClickSearch"><el-icon>
              <Search />
            </el-icon></el-button>
        </div>
      </div>
    </div>
    <el-collapse :hidden="!showAdvanceSearch" v-model="activeNames">
      <el-collapse-item title="高级搜索条件" name="advanceCondition">
        <div class="flex gap-4 mb-4">
          <el-input style="width: 240px" placeholder="公司" v-model="jobSearchCompanyName" clearable
            @change="onClickSearch" />
          <el-input style="width: 240px" placeholder="地区" v-model="jobSearchLocationName" clearable
            @change="onClickSearch" />
          <el-input style="width: 240px" placeholder="地址" v-model="jobSearchAddress" clearable
            @change="onClickSearch" />
          <el-date-picker type="daterange" range-separator="到" start-placeholder="首次扫描开始时间" end-placeholder="首次扫描结束时间"
            v-model="jobSearchDatetime" clearable @change="onClickSearch" />
          <el-date-picker type="daterange" range-separator="到" start-placeholder="发布开始时间" end-placeholder="发布结束时间"
            v-model="jobSearchFirstPublishDatetime" clearable @change="onClickSearch" />
        </div>
      </el-collapse-item>
    </el-collapse>
  </div>
  <div class="content" v-if="!mapMode">
    <el-scrollbar class="tableScrollbar">
      <el-table :data="tableData" :default-sort="{ prop: 'createDatetime', order: 'descending' }"
        stripe @sort-change="sortChange" sortable="custom">
        <el-table-column type="expand" width="30">
          <template #default="props">
            <div m="4" class="expand">
              <el-descriptions class="margin-top" :column="3" size="small" border>
                <el-descriptions-item>
                  <template #label>
                    <div class="cell-item">名称</div>
                  </template>
                  <a :href="props.row.jobUrl" target="_blank" :title="props.row.jobUrl">
                    {{ props.row.jobName }}
                  </a>
                </el-descriptions-item>
                <el-descriptions-item>
                  <template #label>
                    <div class="cell-item">学历</div>
                  </template>
                  {{ props.row.jobDegreeName }}
                </el-descriptions-item>
                <el-descriptions-item>
                  <template #label>
                    <div class="cell-item">招聘平台</div>
                  </template>
                  {{ props.row.jobPlatform }}
                </el-descriptions-item>
                <el-descriptions-item>
                  <template #label>
                    <div class="cell-item">公司</div>
                  </template>
                  {{ props.row.jobCompanyName }}
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
                    <div class="cell-item">工作地址</div>
                  </template>
                  {{ props.row.jobAddress }}
                </el-descriptions-item>
                <el-descriptions-item>
                  <template #label>
                    <div class="cell-item">经度</div>
                  </template>
                  {{ props.row.jobLongitude }}
                </el-descriptions-item>
                <el-descriptions-item>
                  <template #label>
                    <div class="cell-item">纬度</div>
                  </template>
                  {{ props.row.jobLatitude }}
                </el-descriptions-item>
              </el-descriptions>
              <el-descriptions class="margin-top" :column="1" size="small" border direction="vertical">
                <el-descriptions-item>
                  <template #label>
                    <div class="cell-item">公司标签</div>
                  </template>
                  <div>
                    <el-text v-if="props.row.companyTagDTOList && props.row.companyTagDTOList.length > 0"
                      class="compang_tag">
                      <el-tag v-for="(value, key, index) in props.row.companyTagDTOList" type="primary">{{
                        value.tagName
                        }}</el-tag>
                    </el-text>
                    <el-text v-else>-</el-text>
                  </div>
                </el-descriptions-item>
              </el-descriptions>
              <textarea m="t-0 b-2" style="width: 100%; height: 300px" disabled
                :value="props.row.jobDescription?.replace(/<\/?.+?\/?>/g, '')"></textarea>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="createDatetime" sortable="custom" label="首次扫描时间" width="140">
          <template #default="scope">
            <el-text line-clamp="1">
              {{ datetimeFormat(scope.row.createDatetime) }}
            </el-text>
          </template>
        </el-table-column>
        <el-table-column prop="jobFirstPublishDatetime" sortable="custom" label="发布时间" width="110">
          <template #default="scope">
            <el-text line-clamp="1">
              {{ datetimeFormat(scope.row.jobFirstPublishDatetime) }}
            </el-text>
          </template>
        </el-table-column>
        <el-table-column label="查看数" prop="browseDetailCount" sortable width="90">
          <template #default="scope">
            <el-text line-clamp="1">
              {{ scope.row.browseDetailCount }}
            </el-text>
          </template>
        </el-table-column>
        <el-table-column prop="latestBrowseDetailDatetime" sortable="custom" label="最近查看时间" width="160">
          <template #default="scope">
            <el-text line-clamp="1">
              {{ datetimeFormatHHMM(scope.row.latestBrowseDetailDatetime) }}
            </el-text>
          </template>
        </el-table-column>
        <el-table-column label="名称" show-overflow-tooltip>
          <template #default="scope">
            <a :href="scope.row.jobUrl" target="_blank" :title="scope.row.jobUrl">
              <el-text line-clamp="1">
                {{ scope.row.jobName }}
              </el-text>
            </a>
          </template>
        </el-table-column>
        <el-table-column label="公司" show-overflow-tooltip>
          <template #default="scope">
            <el-text line-clamp="1" :title="scope.row.jobCompanyName">
              {{ scope.row.jobCompanyName }}
            </el-text>
          </template>
        </el-table-column>
        <el-table-column prop="companyTagDTOList" label="标签数" show-overflow-tooltip width="70">
          <template #default="scope">
            <el-text line-clamp="1">
              {{ scope.row.companyTagDTOList ? scope.row.companyTagDTOList.length : 0 }}
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
        <el-table-column label="最低薪资" prop="jobSalaryMin" sortable="custom" width="120">
          <template #default="scope">
            <el-text line-clamp="1">
              {{ scope.row.jobSalaryMin }}
            </el-text>
          </template>
        </el-table-column>
        <el-table-column label="最高薪资" prop="jobSalaryMax" sortable="custom" width="120">
          <template #default="scope">
            <el-text line-clamp="1">
              {{ scope.row.jobSalaryMax }}
            </el-text>
          </template>
        </el-table-column>
        <el-table-column label="几薪" prop="jobSalaryTotalMonth" sortable="custom" width="80">
          <template #default="scope">
            <el-text line-clamp="1">
              {{ scope.row.jobSalaryTotalMonth }}
            </el-text>
          </template>
        </el-table-column>
        <el-table-column label="学历" prop="jobDegreeName" sortable width="100">
          <template #default="scope">
            <el-text line-clamp="1">
              {{ scope.row.jobDegreeName }}
            </el-text>
          </template>
        </el-table-column>
        <el-table-column label="招聘平台" prop="jobPlatform" width="100">
          <template #default="scope">
            <el-text line-clamp="1">
              {{ jobPlatformFormat(scope.row.jobPlatform) }}
            </el-text>
          </template>
        </el-table-column>
      </el-table>
    </el-scrollbar>
  </div>
  <div class="content" v-show="mapMode">
      <el-scrollbar class="left">
      <el-table :data="tableData" :default-sort="{ prop: 'createDatetime', order: 'descending' }" style="width: 100%"
        stripe @sort-change="sortChange" sortable="custom">
        <el-table-column label="名称" show-overflow-tooltip width="100">
          <template #default="scope">
            <a :href="scope.row.jobUrl" target="_blank" :title="scope.row.jobUrl">
              <el-text line-clamp="1">
                {{ scope.row.jobName }}
              </el-text>
            </a>
          </template>
        </el-table-column>
        <el-table-column label="公司" show-overflow-tooltip width="200">
          <template #default="scope">
            <el-text line-clamp="1" :title="scope.row.jobCompanyName">
              {{ scope.row.jobCompanyName }}
            </el-text>
          </template>
        </el-table-column>
        <el-table-column prop="companyTagDTOList" label="标签数" show-overflow-tooltip width="70">
          <template #default="scope">
            <el-text line-clamp="1">
              {{ scope.row.companyTagDTOList ? scope.row.companyTagDTOList.length : 0 }}
            </el-text>
          </template>
        </el-table-column>
        <el-table-column fixed="right" label="操作" width="120">
          <template #default="scope">
            <el-link v-if="scope.row.jobLongitude && scope.row.jobLatitude" type="primary"
              @click="onJobMapLocate(scope.row)">
              <Icon icon="mdi:location" />定位
            </el-link>
          </template>
        </el-table-column>
      </el-table>
    </el-scrollbar>
    <div class="middle">
      <div class="mapWrapper">
        <l-map ref="map" v-model:zoom="zoom">
          <l-tile-layer
            url="http://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}"
            :subdomains="['1', '2', '3', '4']"></l-tile-layer>
          <l-marker v-for="(item, index) in jobsFilterEmptyLocation" :lat-lng="[item.jobLatitude, item.jobLongitude]">
            <l-popup ref="popups" :lat-lng="[item.jobLatitude, item.jobLongitude]">
              <el-row>
                <el-text line-clamp="1">职位名： <el-link type="primary" :href="item.jobUrl" target="_blank">{{ item.jobName
                    }}</el-link></el-text>
              </el-row>
              <el-row>
                <el-text line-clamp="1">发布时间：{{ datetimeFormat(item.jobFirstPublishDatetime)
                  }}</el-text>
              </el-row>
              <el-row>
                <el-text line-clamp="1">薪资：💵{{ item.jobSalaryMin }} - 💵{{ item.jobSalaryMax
                  }}</el-text>
              </el-row>
              <el-row>
                <el-text line-clamp="1">学历：{{ item.jobDegreeName }}</el-text>
              </el-row>
              <el-row>
                <el-text line-clamp="1">招聘平台：{{ item.jobPlatform }}</el-text>
              </el-row>
              <el-row>
                <el-text line-clamp="1">地址：{{ item.jobAddress }}</el-text>
              </el-row>
              <el-row>
                <el-text line-clamp="1">公司名：{{ item.jobCompanyName }}</el-text>
              </el-row>
              <el-row v-if="item.companyTagDTOList && item.companyTagDTOList.length > 0">
                <el-text line-clamp="1">公司标签({{ item.companyTagDTOList.length }})：</el-text>
                <el-text class="tagItem" v-for="(item, index) in item.companyTagDTOList">
                  <el-tag type="primary">
                    <Icon icon="mdi:tag" />{{
                      item.tagName }}
                  </el-tag>
                </el-text>
              </el-row>
            </l-popup>
            <l-icon className="icon">
              <div class="mapIcon">
                <el-row>
                  <el-text line-clamp="1"> {{ item.jobName }}</el-text>
                </el-row>
                <el-row>
                  <el-text line-clamp="1">💵{{ item.jobSalaryMin }} - 💵{{ item.jobSalaryMax
                    }}</el-text>
                </el-row>
                <el-row>
                  <el-text line-clamp="1">{{ item.jobCompanyName }}</el-text>
                </el-row>
              </div>
            </l-icon>
          </l-marker>
        </l-map>
      </div>
    </div>
  </div>
  <el-row>
    <el-pagination v-model:current-page="currentPage" v-model:page-size="pageSize"
      :page-sizes="[10, 50, 100, 200, 500, 1000]" :small="small" :disabled="disabled" :background="background"
      layout="total, sizes, prev, pager, next" :total="total" @size-change="handleSizeChange"
      @current-change="handleCurrentChange" />
  </el-row>
  <el-dialog v-model="dialogAvgSalaryVisible" title="统计薪酬区间职位数" width="90%">
    <v-chart :loading="avgSalaryEchartLoading" v-if="dialogAvgSalaryEchartVisible" class="dialog_avg_salary"
      :option="avgSalaryOption" />
  </el-dialog>
</template>

<script lang="ts" setup>
import { onMounted, ref, computed, provide, nextTick, onUnmounted, watch } from "vue";
import { useTransition } from "@vueuse/core";
import { JobApi } from "../../common/api/index.js";
import { SearchJobBO } from "../../common/data/bo/searchJobBO.js";
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
import {
  PLATFORM_51JOB,
  PLATFORM_BOSS,
  PLATFORM_LAGOU,
  PLATFORM_LIEPIN,
  PLATFORM_ZHILIAN,
} from "../../common";
import "leaflet/dist/leaflet.css";
import {
  LMap,
  LIcon,
  LTileLayer,
  LMarker,
  LControlLayers,
  LTooltip,
  LPopup,
  LPolyline,
  LPolygon,
  LRectangle,
} from "@vue-leaflet/vue-leaflet";
import { wgs84ToGcj02 } from '@pansy/lnglat-transform';
import { Icon } from '@iconify/vue';

use([
  CanvasRenderer,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  BarChart,
]);

const todayBrowseCountSource = ref(0);
const totalBrowseCountSource = ref(0);
const todayBrowseDetailCountSource = ref(0);
const totalBrowseDetailCountSource = ref(0);
const totalJobCountSource = ref(0);
const todayBrowseCount = useTransition(todayBrowseCountSource, {
  duration: 0,
});
const totalBrowseCount = useTransition(totalBrowseCountSource, {
  duration: 0,
});
const todayBrowseDetailCount = useTransition(todayBrowseDetailCountSource, {
  duration: 1000,
});
const totalBrowseDetailCount = useTransition(totalBrowseDetailCountSource, {
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
    return dayjs(value).isValid() ? dayjs(value).format("YYYY-MM-DD") : "-";
  };
});
const datetimeFormatHHMM = computed(() => {
  return function (value: string) {
    return dayjs(value).isValid() ? dayjs(value).format("YYYY-MM-DD HH:mm") : "-";
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
const activeNames = ref(["advanceCondition"]);

const jobPlatformFormat = computed(() => {
  return function (value: string) {
    switch (value) {
      case PLATFORM_BOSS:
        return "BOSS直聘";
      case PLATFORM_51JOB:
        return "前程无忧";
      case PLATFORM_LAGOU:
        return "拉钩网";
      case PLATFORM_LIEPIN:
        return "猎聘网";
      case PLATFORM_ZHILIAN:
        return "智联招聘";
      default:
        return value;
    }
  };
});

const handleSizeChange = (val: number) => {
  search();
};

const handleCurrentChange = (val: number) => {
  search();
};

let refreshIntervalId = null;

onMounted(async () => {
  await refreshStatistic();
  refreshIntervalId = setInterval(refreshStatistic, 10000);
  search();
});

onUnmounted(() => {
  if (refreshIntervalId) {
    clearInterval(refreshIntervalId);
    refreshIntervalId = null;
  }
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
    "<3k",
    "3k-6k",
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
    jobSearchOrderByColumn.value = column.prop;
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
      纬度: item.jobLatitude,
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
  todayBrowseDetailCountSource.value =
    statisticJobBrowseDTO.todayBrowseDetailCount;
  totalBrowseDetailCountSource.value =
    statisticJobBrowseDTO.totalBrowseDetailCount;
  totalJobCountSource.value = statisticJobBrowseDTO.totalJob;
  loading.value = false;
};

const mapMode = ref(false);

const map = ref();
const zoom = ref(10);
const jobsFilterEmptyLocation = computed(() => tableData.value.filter((item) => (item.jobLatitude && item.jobLongitude)))
const idAndPopupIndexMap = computed(() => {
  let result = new Map();
  let filtered = tableData.value.filter((item) => (item.jobLatitude && item.jobLongitude));
  filtered.forEach((element, index) => {
    result.set(element.jobId, index);
  });
  return result;
})
const onJobMapLocate = (item) => {
  let popUpIndex = idAndPopupIndexMap.value.get(item.jobId);
  let popUpObject = popups.value[popUpIndex];
  popUpObject.leafletObject.openOn(map.value.leafletObject);
  map.value.leafletObject.flyTo(popUpObject.latLng, 14);
}
const popups = ref([])

watch(mapMode, async (newValue, oldValue) => {
  if (newValue) {
    nextTick(() => {
      map.value.leafletObject.invalidateSize();
      if(popups.value.length > 0){
        map.value.leafletObject.fitBounds(popups.value.map(item => item.latLng));
      }else{
        map.value.leafletObject.setView([39.906217,116.3912757],4)
      }
      if (popups.value && popups.value.length > 0) {
        let firstPopup = popups.value[0];
        firstPopup.leafletObject.openOn(map.value.leafletObject);
        //TODO clean the timeout
        setTimeout(() => {
          map.value.leafletObject.flyTo(firstPopup.latLng);
        }, 300);
      }
    });
  }
})

</script>

<style scoped>
.el-col {
  text-align: center;
}

.el-row {
  /* padding-top: 10px; */
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

.statistic {
  .el-col {
    text-align: center;
  }

  padding-top: 10px;
}

.mapWrapper {
  flex: 1;
}

.mapIcon {
  width: 200px;
  background-color: lightgoldenrodyellow;
  padding: 5px;
  border-radius: 5px;
  border: 1px solid yellowgreen;
}

.content {
  display: flex;
  flex-direction: row;
  flex: 1;
  overflow: hidden;
}

.tableScrollbar {
  width: 100%;
}

.left {
  display: flex;
  overflow: scroll;
  padding-right: 10px;
  scrollbar-width: thin;
  min-width: 200px;
  max-width: 35%;
}

.middle {
  display: flex;
  flex-direction: column;
  flex: 1;
  margin-right: 10px;
}
</style>
