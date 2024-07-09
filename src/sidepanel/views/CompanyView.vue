<template>
    <el-row v-loading="loading">
        <el-col :span="12">
            <el-statistic title="今日新增记录" :value="todayAddCount" />
        </el-col>
        <el-col :span="12">
            <el-statistic title="公司总数" :value="totalCompanyCount" />
        </el-col>
    </el-row>
    <el-col class="search">
        <div class="flex">
            <el-input placeholder="公司名" v-model="searchName" clearable @change="onClickSearch" />
            <div class="operation_menu">
                <div class="operation_menu_left">
                    <el-switch v-model="showAdvanceSearch" active-text="高级搜索" inactive-text="普通搜索" inline-prompt />
                </div>
                <div>
                    <el-button @click="onExportHandle">导出</el-button>
                    <el-button @click="reset">重置</el-button>
                    <el-button @click="onClickSearch"><el-icon>
                            <Search />
                        </el-icon></el-button>
                </div>
            </div>
        </div>
        <el-collapse :hidden="!showAdvanceSearch" v-model="activeNames">
            <el-collapse-item title="高级搜索条件" name="advanceCondition">
                <el-date-picker type="daterange" range-separator="到" start-placeholder="成立时间开始时间"
                    end-placeholder="成立时间结束时间" v-model="startDateDatetime" clearable @change="onClickSearch" />
            </el-collapse-item>
        </el-collapse>
    </el-col>
    <el-row>
        <el-table ref="tableRef" :data="tableData" :default-sort="{ prop: 'updateDatetime', order: 'descending' }"
            style="width: 100%" stripe @sort-change="sortChange" sortable="custom">
            <el-table-column type="expand" width="30">
                <template #default="props">
                    <div m="4" class="expand">
                        <el-descriptions class="margin-top" :column="4" size="small" border>
                            <el-descriptions-item>
                                <template #label>
                                    <div class="cell-item">公司全称</div>
                                </template>
                                <el-link :href="props.row.sourceUrl" target="_blank">
                                    {{ props.row.companyName }}
                                </el-link>
                            </el-descriptions-item>
                            <el-descriptions-item>
                                <template #label>
                                    <div class="cell-item">经营状态</div>
                                </template>
                                {{ props.row.companyStatus }}
                            </el-descriptions-item>
                            <el-descriptions-item>
                                <template #label>
                                    <div class="cell-item">成立时间</div>
                                </template>
                                {{ datetimeFormat(props.row.companyStartDate) }}
                            </el-descriptions-item>
                            <el-descriptions-item>
                                <template #label>
                                    <div class="cell-item">所属行业</div>
                                </template>
                                {{ props.row.companyIndustry }}
                            </el-descriptions-item>
                            <el-descriptions-item>
                                <template #label>
                                    <div class="cell-item">统一社会信用代码</div>
                                </template>
                                {{ props.row.companyUnifiedCode }}
                            </el-descriptions-item>
                            <el-descriptions-item>
                                <template #label>
                                    <div class="cell-item">纳税人识别号</div>
                                </template>
                                {{ props.row.companyTaxNo }}
                            </el-descriptions-item>
                            <el-descriptions-item>
                                <template #label>
                                    <div class="cell-item">工商注册号</div>
                                </template>
                                {{ props.row.companyLicenseNumber }}
                            </el-descriptions-item>
                            <el-descriptions-item>
                                <template #label>
                                    <div class="cell-item">法人</div>
                                </template>
                                {{ props.row.companyLegalPerson }}
                            </el-descriptions-item>
                            <el-descriptions-item>
                                <template #label>
                                    <div class="cell-item">官网</div>
                                </template>
                                <el-link v-if="props.row.companyWebSite != '-'"
                                    :href="'http://' + props.row.companyWebSite" target="_blank">{{
                                        props.row.companyWebSite }}</el-link>
                                <el-text v-else>-</el-text>
                            </el-descriptions-item>
                            <el-descriptions-item>
                                <template #label>
                                    <div class="cell-item">社保人数</div>
                                </template>
                                {{ props.row.companyInsuranceNum }}
                            </el-descriptions-item>
                            <el-descriptions-item>
                                <template #label>
                                    <div class="cell-item">自身风险数</div>
                                </template>
                                {{ props.row.companySelfRisk }}
                            </el-descriptions-item>
                            <el-descriptions-item>
                                <template #label>
                                    <div class="cell-item">关联风险数</div>
                                </template>
                                {{ props.row.companyUnionRisk }}
                            </el-descriptions-item>
                            <el-descriptions-item>
                                <template #label>
                                    <div class="cell-item">地址</div>
                                </template>
                                {{ props.row.companyAddress }}
                            </el-descriptions-item>
                            <el-descriptions-item>
                                <template #label>
                                    <div class="cell-item">经度</div>
                                </template>
                                {{ props.row.companyLongitude }}
                            </el-descriptions-item>
                            <el-descriptions-item>
                                <template #label>
                                    <div class="cell-item">维度</div>
                                </template>
                                {{ props.row.companyLatitude }}
                            </el-descriptions-item>
                        </el-descriptions>
                        <el-descriptions class="margin-top" :column="1" size="small" border>
                            <el-descriptions-item>
                                <template #label>
                                    <div class="cell-item">经营范围</div>
                                </template>
                                {{ props.row.companyScope }}
                            </el-descriptions-item>
                        </el-descriptions>
                    </div>
                </template>
            </el-table-column>
            <el-table-column label="公司全称" show-overflow-tooltip width="260" property="companyName">
                <template #default="scope">
                    <el-text line-clamp="1">
                        <el-link :href="scope.row.sourceUrl" target="_blank">{{ scope.row.companyName }}</el-link>
                    </el-text>
                </template>
            </el-table-column>
            <el-table-column prop="companyStatus" label="经营状态" width="80">
                <template #default="scope">
                    <el-text line-clamp="1">
                        {{ scope.row.companyStatus }}
                    </el-text>
                </template>
            </el-table-column>
            <el-table-column prop="companyStartDate" sortable="custom" label="成立时间" width="110">
                <template #default="scope">
                    <el-text line-clamp="1">
                        {{ datetimeFormat(scope.row.companyStartDate) }}
                    </el-text>
                </template>
            </el-table-column>
            <el-table-column prop="companyUnifiedCode" label="统一社会信用代码" show-overflow-tooltip width="200">
                <template #default="scope">
                    <el-text line-clamp="1">
                        {{ scope.row.companyUnifiedCode }}
                    </el-text>
                </template>
            </el-table-column>
            <el-table-column prop="companyLegalPerson" label="法人" show-overflow-tooltip width="100">
                <template #default="scope">
                    <el-text line-clamp="1">
                        {{ scope.row.companyLegalPerson }}
                    </el-text>
                </template>
            </el-table-column>
            <el-table-column prop="companyInsuranceNum" label="社保人数" width="100">
                <template #default="scope">
                    <el-text line-clamp="1">
                        {{ scope.row.companyInsuranceNum ?? "-" }}
                    </el-text>
                </template>
            </el-table-column>
            <el-table-column prop="companyWebSite" label="官网" show-overflow-tooltip>
                <template #default="scope">
                    <el-link v-if="scope.row.companyWebSite != '-'" :href="'http://' + scope.row.companyWebSite"
                        target="_blank">{{ scope.row.companyWebSite }}</el-link>
                    <el-text v-else>-</el-text>
                </template>
            </el-table-column>
            <el-table-column prop="companyAddress" label="地址" show-overflow-tooltip>
                <template #default="scope">
                    <el-text line-clamp="1">
                        {{ scope.row.companyAddress }}
                    </el-text>
                </template>
            </el-table-column>
            <el-table-column prop="companyIndustry" label="所属行业" show-overflow-tooltip>
                <template #default="scope">
                    <el-text line-clamp="1">
                        {{ scope.row.companyIndustry }}
                    </el-text>
                </template>
            </el-table-column>
            <el-table-column prop="updateDatetime" sortable="custom" label="更新时间" width="160">
                <template #default="scope">
                    <el-text line-clamp="1">
                        {{ datetimeFormatHHMM(scope.row.updateDatetime) }}
                    </el-text>
                </template>
            </el-table-column>
        </el-table>
    </el-row>
    <el-row>
        <el-pagination v-model:current-page="currentPage" v-model:page-size="pageSize"
            :page-sizes="[10, 50, 100, 200, 500, 1000]" :small="small" :disabled="disabled" :background="background"
            layout="total, sizes, prev, pager, next" :total="total" @size-change="handleSizeChange"
            @current-change="handleCurrentChange" />
    </el-row>
</template>

<script lang="ts" setup>
import { onMounted, ref, computed } from "vue";
import { useTransition } from "@vueuse/core";
import { CompanyApi, TagApi } from "../../common/api/index";
import dayjs from "dayjs";
import TagInput from "../components/TagInput.vue";
import { SearchCompanyBO } from "../../common/data/bo/searchCompanyBO";

import { ElTable, ElMessage } from "element-plus";
import { utils, writeFileXLSX } from "xlsx";

const todayAddCountSource = ref(0);
const todayAddCount = useTransition(todayAddCountSource, {
    duration: 1000,
});
const totalCompanyCountSource = ref(0);
const totalCompanyCount = useTransition(totalCompanyCountSource, {
    duration: 1000,
});
const loading = ref(true);
const firstTimeLoading = ref(true);

const tableRef = ref<InstanceType<typeof ElTable>>()
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
const searchName = ref(null);
const startDateDatetime = ref([]);
const searchOrderByColumn = ref("updateDatetime");
const searchOrderBy = ref("DESC");

const showAdvanceSearch = ref(false);

const activeNames = ref(["advanceCondition"]);
const whitelist = ref([]);

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

const sortChange = function (column) {
    if (column.order !== null && column.prop) {
        searchOrderByColumn.value = column.prop;
        if (column.order === "descending") {
            searchOrderBy.value = "DESC";
        } else if (column.order === "ascending") {
            searchOrderBy.value = "ASC";
        } else {
            searchOrderByColumn.value = "updateDatetime";
            searchOrderBy.value = "DESC";
        }
    }
    search();
};

const onClickSearch = async () => {
    currentPage.value = 1;
    search();
};

const reset = async () => {
    currentPage.value = 1;
    searchName.value = null;
    startDateDatetime.value = [];
    search();
};

const search = async () => {
    let searchResult = await CompanyApi.searchCompany(getSearchParam());
    tableData.value = searchResult.items;
    total.value = parseInt(searchResult.total);
};

function getSearchParam() {
    let searchParam = new SearchCompanyBO();
    searchParam.pageNum = currentPage.value;
    searchParam.pageSize = pageSize.value;
    searchParam.companyName = searchName.value;
    if (
        startDateDatetime.value &&
        startDateDatetime.value.length > 0
    ) {
        searchParam.startDateStartDatetime = dayjs(
            startDateDatetime.value[0]
        );
        searchParam.startDateEndDatetime = dayjs(
            startDateDatetime.value[1]
        );
    } else {
        searchParam.startDateStartDatetime = null;
        searchParam.startDateEndDatetime = null;
    }
    searchParam.orderByColumn = searchOrderByColumn.value;
    searchParam.orderBy = searchOrderBy.value;
    return searchParam;
}

const refreshStatistic = async () => {
    if (firstTimeLoading.value) {
        loading.value = true;
        firstTimeLoading.value = false;
    }
    const statisticCompany = await CompanyApi.statisticCompany();
    todayAddCountSource.value = statisticCompany.todayAddCount;
    totalCompanyCountSource.value = statisticCompany.totalCompany;
    loading.value = false;
};

const onExportHandle = () => {
    let list = tableData.value;
    let result = [];
    for (let i = 0; i < list.length; i++) {
        let item = list[i];
        result.push({
            公司: item.companyName,
            公司描述: item.companyDesc,
            成立时间: item.companyStartDate,
            经营状态: item.companyStatus,
            法人: item.companyLegalPerson,
            统一社会信用代码: item.companyUnifiedCode,
            官网: item.companyWebSite,
            社保人数: item.companyInsuranceNum,
            自身风险数: item.companySelfRisk,
            关联风险数: item.companyUnionRisk,
            地址: item.companyAddress,
            经营范围: item.companyScope,
            纳税人识别号: item.companyTaxNo,
            所属行业: item.companyIndustry,
            工商注册号: item.companyLicenseNumber,
            经度: item.companyLongitude,
            维度: item.companyLatitude,
            数据来源地址: item.sourceUrl,
            数据来源平台: item.sourcePlatform,
            数据来源记录编号: item.sourceRecordId,
            数据来源更新时间: item.sourceRefreshDatetime,
        });
    }
    const ws = utils.json_to_sheet(result);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, "Data");
    writeFileXLSX(wb, dayjs(new Date()).format("公司-YYYYMMDDHHmmss") + ".xlsx");
}

</script>

<style scoped>
.el-col {
    text-align: center;
}

.el-row {
    padding-top: 10px;
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

</style>