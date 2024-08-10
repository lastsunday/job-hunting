<template>
    <el-scrollbar ref="scrollbar" class="tableScrollbar" v-loading="searchLoading">
        <div>
            <el-popconfirm title="确认删除选中的数据？" @confirm="onBatchDelete" confirm-button-text="确定" cancel-button-text="取消">
                <template #reference>
                    <el-button type="danger">删除</el-button>
                </template>
            </el-popconfirm>
        </div>
        <el-table ref="tableRef" :data="tableData" :default-sort="{ prop: 'updateDatetime', order: 'descending' }"
            style="width: 100%" stripe>
            <el-table-column type="selection" width="55" />
            <el-table-column type="expand" width="30">
                <template #default="props">
                    <div m="4" class="expand">
                        <el-descriptions class="margin-top" :column="3" size="small" border>
                            <el-descriptions-item>
                                <template #label>
                                    <div class="cell-item">开始时间</div>
                                </template>
                                <div>{{ datetimeFormatHHMMSS(props.row.detail.startDatetime) }}</div>
                            </el-descriptions-item>
                            <el-descriptions-item>
                                <template #label>
                                    <div class="cell-item">结束时间</div>
                                </template>
                                <div>{{ datetimeFormatHHMMSS(props.row.detail.endDatetime) }}</div>
                            </el-descriptions-item>
                            <el-descriptions-item>
                                <template #label>
                                    <div class="cell-item">浏览页数</div>
                                </template>
                                <div>{{ props.row.detail.count - 1 }}</div>
                            </el-descriptions-item>
                        </el-descriptions>
                        <h1>运行日志</h1>
                        <div v-for="log in props.row.detail.logList">
                            <div>{{ log }}</div>
                        </div>
                    </div>
                </template>
            </el-table-column>
            <el-table-column prop="createDatetime" label="创建时间" width="160">
                <template #default="scope">
                    <el-text line-clamp="1">
                        {{ datetimeFormatHHMMSS(scope.row.createDatetime) }}
                    </el-text>
                </template>
            </el-table-column>
            <el-table-column prop="createDatetime" label="运行结果" width="160">
                <template #default="scope">
                    <el-tag v-if="scope.row.missionStatus == MISSION_STATUS_SUCCESS" type="success"> {{
                        missionStatusFormat(scope.row.missionStatus)
                    }}</el-tag>
                    <el-tag v-else type="danger"> {{ missionStatusFormat(scope.row.missionStatus) }}
                    </el-tag>
                </template>
            </el-table-column>
            <el-table-column label="耗时">
                <template #default="scope">
                    <el-text line-clamp="1">
                        {{
                            dayjs.duration(dayjs(scope.row.detail.endDatetime).diff(scope.row.detail.startDatetime)).minutes()
                        }}分{{
                            dayjs.duration(dayjs(scope.row.detail.endDatetime).diff(scope.row.detail.startDatetime)).seconds()
                        }}秒
                    </el-text>
                </template>
            </el-table-column>
            <el-table-column prop="createDatetime" label="错误原因">
                <template #default="scope">
                    <el-text line-clamp="1">
                        {{ missionErrorFormat(scope.row.missionStatusReason) }}
                    </el-text>
                </template>
            </el-table-column>
            <el-table-column fixed="right" label="操作" width="120">
                <template #default="scope">
                    <el-popconfirm title="确认删除此行数据？" @confirm="onDeleteHandle(scope.row)" confirm-button-text="确定"
                        cancel-button-text="取消">
                        <template #reference>
                            <el-button link type="primary" size="small">删除</el-button>
                        </template>
                    </el-popconfirm>
                </template>
            </el-table-column>
        </el-table>
    </el-scrollbar>
    <el-row>
        <el-pagination v-model:current-page="currentPage" v-model:page-size="pageSize"
            :page-sizes="[10, 20, 50, 100, 200, 500, 1000]" :small="small" :disabled="disabled" :background="background"
            layout="total, sizes, prev, pager, next" :total="total" @size-change="handleSizeChange"
            @current-change="handleCurrentChange" />
    </el-row>
</template>
<script setup lang="ts">
import { onMounted, ref, watch, computed } from "vue";
import dayjs from "dayjs";
import { ElTable, ElMessage } from "element-plus";
import { UI_DEFAULT_PAGE_SIZE } from "../../../common/config";
import { SearchMissionLogBO } from "../../../common/data/bo/searchMissionLogBO";
import { MissionLogJobPageDetailDTO } from "../../../common/data/dto/missionLogJobPageDetailDTO";
import { MissionLogApi } from "../../../common/api/index";
import {
    MISSION_STATUS_SUCCESS, MISSION_STATUS_FAILURE, AUTOMATE_ERROR_HUMAN_VALID, AUTOMATE_ERROR_UNKNOW
} from "../../../common";

const tableRef = ref<InstanceType<typeof ElTable>>()
const tableData = ref([]);
const currentPage = ref(1);
const pageSize = ref(UI_DEFAULT_PAGE_SIZE);
const total = ref(0);
const small = ref(false);
const background = ref(false);
const disabled = ref(false);

const model = defineModel()
const datetimeFormatHHMMSS = computed(() => {
    return function (value: string) {
        return dayjs(value).isValid()
            ? dayjs(value).format("YYYY-MM-DD HH:mm:ss")
            : "-";
    };
});

const missionStatusFormat = computed(() => {
    return function (value: string) {
        if (value == MISSION_STATUS_SUCCESS) {
            return "成功";
        } else if (value == MISSION_STATUS_FAILURE) {
            return "失败";
        } else {
            return value;
        }
    };
});


const missionErrorFormat = computed(() => {
    return function (value: string) {
        if (value == AUTOMATE_ERROR_HUMAN_VALID) {
            return "人机验证错误";
        } else if (value == AUTOMATE_ERROR_UNKNOW) {
            return "未知错误";
        } else {
            return value;
        }
    };
});

onMounted(() => {
    search();
});

watch(model, async (newValue, oldValue) => {
    if (JSON.stringify(newValue) !== JSON.stringify(oldValue)) {
        search();
    }
}
)

const scrollbar = ref();

const searchLoading = ref(false);

const search = async () => {
    searchLoading.value = true;
    let searchResult = await MissionLogApi.searchMissionLog(getSearchParam());
    tableData.value = searchResult.items;
    tableData.value.forEach(item => {
        let missionLogJobPageDetailDTO = new MissionLogJobPageDetailDTO();
        item.detail = Object.assign(missionLogJobPageDetailDTO, JSON.parse(item.missionLogDetial));
    });
    total.value = parseInt(searchResult.total);
    scrollbar.value.setScrollTop(0);
    searchLoading.value = false;
};

function getSearchParam() {
    let searchParam = new SearchMissionLogBO();
    searchParam.pageNum = currentPage.value;
    searchParam.pageSize = pageSize.value;
    searchParam.missionId = model.value.missionId;
    searchParam.orderByColumn = "update_datetime"
    searchParam.orderBy = "DESC";
    return searchParam;
}

const handleSizeChange = (val: number) => {
    search();
};

const handleCurrentChange = (val: number) => {
    search();
};

const onDeleteHandle = async (row: any) => {
    await MissionLogApi.missionLogDeleteById([row.missionLogId]);
    ElMessage({
        message: '数据删除成功',
        type: 'success',
    });
    search();
}

const onBatchDelete = async () => {
    let selectedRows = tableRef.value.getSelectionRows();
    if (selectedRows.length > 0) {
        let ids = selectedRows.map(item => { return item.missionLogId });
        await MissionLogApi.missionLogDeleteByIds(ids);
        ElMessage({
            message: `数据删除成功,共${ids.length}条`,
            type: 'success',
        });
        search();
    } else {
        ElMessage({
            message: '请选择需要删除的数据',
            type: 'warning',
        })
    }
}
</script>
<style lang="css" scoped></style>