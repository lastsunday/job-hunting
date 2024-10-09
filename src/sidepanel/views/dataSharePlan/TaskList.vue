<template>
    <el-tabs type="card" class="tabs">
        <el-tab-pane class="tab_panel" label="任务列表">
            <div class="search">
                <div>
                    <div>
                        <el-select v-model="form.typeList" multiple clearable collapse-tags placeholder="请选择任务类型"
                            style="width: 240px" @change="onClickSearch">
                            <el-option v-for="item in typeWhitelist" :key="item.code" :label="item.value"
                                :value="item.code" />
                        </el-select>
                        <el-select v-model="form.statusList" multiple clearable collapse-tags placeholder="请选择任务状态"
                            style="width: 240px" @change="onClickSearch">
                            <el-option v-for="item in statusWhitelist" :key="item.code" :label="item.value"
                                :value="item.code" />
                        </el-select>
                    </div>
                    <div class="operation_menu">
                        <div class="operation_menu_left">
                            <el-switch v-model="showAdvanceSearch" active-text="高级搜索" inactive-text="普通搜索"
                                inline-prompt />
                            <el-collapse :hidden="!showAdvanceSearch" v-model="activeNames">
                                <el-collapse-item title="高级搜索条件" name="advanceCondition">
                                    <div class="flex gap-4 mb-4">
                                        <el-date-picker type="daterange" range-separator="到" start-placeholder="创建开始时间"
                                            end-placeholder="创建结束时间" v-model="form.datetimeForCreateRange" clearable
                                            @change="onClickSearch" />
                                        <el-date-picker type="daterange" range-separator="到" start-placeholder="更新开始时间"
                                            end-placeholder="更新结束时间" v-model="form.datetimeForUpdateRange" clearable
                                            @change="onClickSearch" />
                                    </div>
                                </el-collapse-item>
                            </el-collapse>
                        </div>
                        <div>
                            <el-button @click="reset">重置</el-button>
                            <el-button @click="onClickSearch"><el-icon>
                                    <Search />
                                </el-icon></el-button>
                        </div>
                    </div>
                </div>
            </div>
            <div class="content">
                <el-scrollbar ref="scrollbar" class="tableScrollbar" v-loading="searchLoading">
                    <el-table :data="tableData" stripe>
                        <el-table-column label="编号" width="120" show-overflow-tooltip>
                            <template #default="scope">
                                <el-text line-clamp="1">
                                    {{ scope.row.id }}
                                </el-text>
                            </template>
                        </el-table-column>
                        <el-table-column label="类型" width="150" show-overflow-tooltip>
                            <template #default="scope">
                                <el-text line-clamp="1">
                                    {{ taskFormat(scope.row.type) }}
                                </el-text>
                            </template>
                        </el-table-column>
                        <el-table-column label="状态" width="120" show-overflow-tooltip>
                            <template #default="scope">
                                <el-text line-clamp="1" :type="getColorForStatus(scope.row.status)">
                                    {{ statusFormat(scope.row.status) }}
                                </el-text>
                            </template>
                        </el-table-column>
                        <el-table-column label="执行耗时" width="120" show-overflow-tooltip>
                            <template #default="scope">
                                <el-text line-clamp="1">
                                    {{ scope.row.costTime }}ms
                                </el-text>
                            </template>
                        </el-table-column>
                        <el-table-column label="重试次数" width="120">
                            <template #default="scope">
                                <el-text line-clamp="1">
                                    {{ scope.row.retryCount }}
                                </el-text>
                            </template>
                        </el-table-column>
                        <el-table-column label="执行信息" show-overflow-tooltip width="120">
                            <template #default="scope">
                                <el-text line-clamp="1">
                                    {{ scope.row.errorReason }}
                                </el-text>
                            </template>
                        </el-table-column>
                        <el-table-column label="任务摘要" show-overflow-tooltip>
                            <template #default="scope">
                                <div v-if="scope.row.detail">
                                    <el-text v-if="isDownloadType(scope.row.detail.type)" line-clamp="1">
                                        下载 {{ scope.row.detail.username }}({{ scope.row.detail.reponame
                                        }})于{{ datetimeFormat(
                                            scope.row.detail.datetime) }}的数据文件
                                    </el-text>
                                    <el-text v-if="isUploadType(scope.row.detail.type)" line-clamp="1">
                                        上传 {{ datetimeFormat(
                                            scope.row.detail.startDatetime) }}至{{ datetimeFormat(
                                            scope.row.detail.endDatetime) }}共{{ scope.row.detail.dataCount }}条数据到 {{
                                            scope.row.detail.username }}({{ scope.row.detail.reponame }})
                                    </el-text>
                                    <el-text v-if="isMergeType(scope.row.detail.type)" line-clamp="1">
                                        合并 来自{{
                                            scope.row.detail.username }}({{ scope.row.detail.reponame }}) {{ datetimeFormat(
                                            scope.row.detail.datetime) }}共{{ scope.row.detail.dataCount }}条数据
                                    </el-text>
                                </div>
                            </template>
                        </el-table-column>
                        <el-table-column label="创建时间" width="180" show-overflow-tooltip>
                            <template #default="scope">
                                <el-text line-clamp="1">
                                    {{ scope.row.createDatetime }}
                                </el-text>
                            </template>
                        </el-table-column>
                        <el-table-column label="更新时间" width="180" show-overflow-tooltip>
                            <template #default="scope">
                                <el-text line-clamp="1">
                                    {{ scope.row.updateDatetime }}
                                </el-text>
                            </template>
                        </el-table-column>
                    </el-table>
                </el-scrollbar>
            </div>
            <el-row>
                <el-pagination v-model:current-page="currentPage" v-model:page-size="pageSize"
                    :page-sizes="[10, 20, 50, 100, 200, 500, 1000]" :small="small" :disabled="disabled"
                    :background="background" layout="total, sizes, prev, pager, next" :total="total"
                    @size-change="handleSizeChange" @current-change="handleCurrentChange" />
            </el-row>
        </el-tab-pane>
    </el-tabs>
</template>
<script lang="ts" setup>
import {
    onMounted,
    ref,
    computed,
    reactive,
    toRaw,
} from 'vue'
import { UI_DEFAULT_PAGE_SIZE } from "../../../common/config";
import { SearchTaskBO } from "../../../common/data/bo/searchTaskBO";
import { TaskApi } from "../../../common/api";
import {
    TASK_STATUS_READY, TASK_STATUS_RUNNING, TASK_STATUS_FINISHED,
    TASK_STATUS_FINISHED_BUT_ERROR, TASK_STATUS_ERROR, TASK_STATUS_CANCEL,
    TASK_TYPE_JOB_DATA_UPLOAD, TASK_TYPE_COMPANY_DATA_UPLOAD, TASK_TYPE_COMPANY_TAG_DATA_UPLOAD,
    TASK_TYPE_JOB_DATA_DOWNLOAD, TASK_TYPE_COMPANY_DATA_DOWNLOAD, TASK_TYPE_COMPANY_TAG_DATA_DOWNLOAD,
    TASK_TYPE_JOB_DATA_MERGE, TASK_TYPE_COMPANY_DATA_MERGE, TASK_TYPE_COMPANY_TAG_DATA_MERGE
} from "../../../common";
import TagInput from "../../components/TagInput.vue";
import dayjs from "dayjs";

const scrollbar = ref();
const tableData = ref([]);
const currentPage = ref(1);
const pageSize = ref(UI_DEFAULT_PAGE_SIZE);
const total = ref(0);
const small = ref(false);
const background = ref(false);
const disabled = ref(false);
const searchLoading = ref(false);
const showAdvanceSearch = ref(false);
const activeNames = ref(["advanceCondition"]);

const statusWhitelist = [
    { value: "准备", code: TASK_STATUS_READY },
    { value: "运行中", code: TASK_STATUS_RUNNING },
    { value: "完成", code: TASK_STATUS_FINISHED },
    { value: "异常完成", code: TASK_STATUS_FINISHED_BUT_ERROR },
    { value: "错误", code: TASK_STATUS_ERROR },
    { value: "取消", code: TASK_STATUS_CANCEL }
];

const statusCodeNameMap = new Map();
statusWhitelist.forEach((item) => {
    statusCodeNameMap.set(item.code, item.value);
});

const statusFormat = computed(() => {
    return function (value: string) {
        if (statusCodeNameMap.has(value)) {
            return statusCodeNameMap.get(value);
        } else {
            return value;
        }
    };
});

const isDownloadType = computed(() => {
    return function (value: string) {
        return value == TASK_TYPE_JOB_DATA_DOWNLOAD || value == TASK_TYPE_COMPANY_DATA_DOWNLOAD || value == TASK_TYPE_COMPANY_TAG_DATA_DOWNLOAD;
    }
});

const isUploadType = computed(() => {
    return function (value: string) {
        return value == TASK_TYPE_JOB_DATA_UPLOAD || value == TASK_TYPE_COMPANY_DATA_UPLOAD || value == TASK_TYPE_COMPANY_TAG_DATA_UPLOAD;
    }
});

const isMergeType = computed(() => {
    return function (value: string) {
        return value == TASK_TYPE_JOB_DATA_MERGE || value == TASK_TYPE_COMPANY_DATA_MERGE || value == TASK_TYPE_COMPANY_TAG_DATA_MERGE;
    }
});

const datetimeFormat = computed(() => {
    return function (value: string) {
        return dayjs(value).isValid() ? dayjs(value).format("YYYY年MM月DD日") : "-";
    };
});

const typeWhitelist = [
    { value: "职位数据上传", code: TASK_TYPE_JOB_DATA_UPLOAD },
    { value: "公司数据上传", code: TASK_TYPE_COMPANY_DATA_UPLOAD },
    { value: "公司标签数据上传", code: TASK_TYPE_COMPANY_TAG_DATA_UPLOAD },
    { value: "职位数据下载", code: TASK_TYPE_JOB_DATA_DOWNLOAD },
    { value: "公司数据下载", code: TASK_TYPE_COMPANY_DATA_DOWNLOAD },
    { value: "公司标签数据下载", code: TASK_TYPE_COMPANY_TAG_DATA_DOWNLOAD },
    { value: "职位数据合并", code: TASK_TYPE_JOB_DATA_MERGE },
    { value: "公司数据合并", code: TASK_TYPE_COMPANY_DATA_MERGE },
    { value: "公司标签数据合并", code: TASK_TYPE_COMPANY_TAG_DATA_MERGE },
];

const taskCodeNameMap = new Map();
typeWhitelist.forEach((item) => {
    taskCodeNameMap.set(item.code, item.value);
});

const taskFormat = computed(() => {
    return function (value: string) {
        if (taskCodeNameMap.has(value)) {
            return taskCodeNameMap.get(value);
        } else {
            return value;
        }
    };
});

onMounted(async () => {
    search();
});

const getColorForStatus = computed(() => {
    return function (value: string) {
        switch (value) {
            case TASK_STATUS_READY:
                return "info";
            case TASK_STATUS_RUNNING:
                return "primary";
            case TASK_STATUS_FINISHED:
                return "success";
            case TASK_STATUS_FINISHED_BUT_ERROR:
                return "warning";
            case TASK_STATUS_ERROR:
                return "danger";
            case TASK_STATUS_ERROR:
                return "info";
            default:
                return "info";
        }
    };
});

const onClickSearch = async () => {
    currentPage.value = 1;
    search();
};

const reset = async () => {
    currentPage.value = 1;
    form.typeList = [];
    form.statusList = [];
    form.datetimeForCreateRange = [];
    form.datetimeForUpdateRange = [];
    search();
};

const form = reactive({
    typeList: [],
    statusList: [],
    datetimeForCreateRange: [],
    datetimeForUpdateRange: [],
})

const search = async () => {
    searchLoading.value = true;
    let searchResult = await TaskApi.searchTaskWithDetail(getSearchParam());
    tableData.value = searchResult.items;
    total.value = parseInt(searchResult.total);
    scrollbar.value.setScrollTop(0);
    searchLoading.value = false;
};

function getSearchParam() {
    let searchParam = new SearchTaskBO();
    searchParam.pageNum = currentPage.value;
    searchParam.pageSize = pageSize.value;
    searchParam.typeList = toRaw(form.typeList);
    searchParam.statusList = toRaw(form.statusList);
    if (form.datetimeForCreateRange && form.datetimeForCreateRange.length > 0) {
        searchParam.startDatetimeForCreate = dayjs(form.datetimeForCreateRange[0]);
        searchParam.endDatetimeForCreate = dayjs(form.datetimeForCreateRange[1]);
    } else {
        searchParam.startDatetimeForCreate = null;
        searchParam.endDatetimeForCreate = null;
    }
    if (form.datetimeForUpdateRange && form.datetimeForUpdateRange.length > 0) {
        searchParam.startDatetimeForUpdate = dayjs(form.datetimeForUpdateRange[0]);
        searchParam.endDatetimeForUpdate = dayjs(form.datetimeForUpdateRange[1]);
    } else {
        searchParam.startDatetimeForUpdate = null;
        searchParam.endDatetimeForUpdate = null;
    }
    searchParam.orderByColumn = "updateDatetime";
    searchParam.orderBy = "DESC";
    return searchParam;
}

const handleSizeChange = (val: number) => {
    search();
};

const handleCurrentChange = (val: number) => {
    search();
};

</script>

<style lang="scss" scoped>
.tabs {
    display: flex;
    flex-direction: column-reverse;
    height: 100%;
}

.tab_panel {
    height: 100%;
    display: flex;
    flex-direction: column;
    width: 100%;
}

.operation_menu {
    display: flex;
    justify-content: end;
    padding: 5px;
}

.operation_menu_left {
    flex: 1;
}

.content {
    flex: 1;
    overflow: hidden;
}

.mapContent {
    display: flex;
    flex: 1;
    overflow: hidden;
}

.left {
    display: flex;
    overflow: auto;
    padding-right: 10px;
    scrollbar-width: thin;

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

.middle {
    display: flex;
    flex-direction: column;
    flex: 1;
    margin-right: 10px;
}

.menuButton {
    margin-left: 5px;
}
</style>
<style lang="scss">
.el-tabs__content {
    display: flex;
    flex: 1;
    width: 100%
}

.tab_panel {
    height: 100%;
    width: 100%;
}
</style>