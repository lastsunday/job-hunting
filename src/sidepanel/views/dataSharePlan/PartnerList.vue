<template>
    <el-tabs type="card" class="tabs">
        <el-tab-pane class="tab_panel" label="伙伴列表">
            <div class="search">
                <div>
                    <div>
                        <el-input placeholder="用户名" v-model="searchForm.username" clearable @change="onClickSearch" />
                    </div>
                    <div class="operation_menu">
                        <div class="operation_menu_left">
                            <el-switch v-model="showAdvanceSearch" active-text="高级搜索" inactive-text="普通搜索"
                                inline-prompt />
                        </div>
                        <div>
                            <el-button type="primary" @click="onAddHandle">新增</el-button>
                            <el-popconfirm title="确认删除选中的数据？" @confirm="onBatchDelete" confirm-button-text="确定"
                                cancel-button-text="取消">
                                <template #reference>
                                    <el-button type="danger">删除</el-button>
                                </template>
                            </el-popconfirm>
                            <el-button @click="reset">重置</el-button>
                            <el-button @click="onClickSearch"><el-icon>
                                    <Search />
                                </el-icon></el-button>
                        </div>
                    </div>
                    <el-collapse :hidden="!showAdvanceSearch" v-model="activeNames">
                        <el-collapse-item title="高级搜索条件" name="advanceCondition">
                            <div class="flex gap-4 mb-4">
                                <el-date-picker type="daterange" range-separator="到" start-placeholder="创建开始时间"
                                    end-placeholder="创建结束时间" v-model="searchForm.datetimeForCreateRange" clearable
                                    @change="onClickSearch" />
                                <el-date-picker type="daterange" range-separator="到" start-placeholder="更新开始时间"
                                    end-placeholder="更新结束时间" v-model="searchForm.datetimeForUpdateRange" clearable
                                    @change="onClickSearch" />
                            </div>
                        </el-collapse-item>
                    </el-collapse>
                </div>
            </div>
            <div class="content">
                <el-scrollbar ref="scrollbar" class="tableScrollbar" v-loading="searchLoading">
                    <el-table ref="tableRef" :data="tableData" stripe>
                        <el-table-column type="selection" width="55" />
                        <el-table-column label="编号" width="120" show-overflow-tooltip>
                            <template #default="scope">
                                <el-text line-clamp="1">
                                    {{ scope.row.id }}
                                </el-text>
                            </template>
                        </el-table-column>
                        <el-table-column label="用户名" width="180" show-overflow-tooltip>
                            <template #default="scope">
                                <el-text line-clamp="1">
                                    {{ scope.row.username }}
                                </el-text>
                            </template>
                        </el-table-column>
                        <el-table-column label="仓库名" show-overflow-tooltip>
                            <template #default="scope">
                                <el-text line-clamp="1">
                                    {{ scope.row.reponame }}
                                </el-text>
                            </template>
                        </el-table-column>
                        <el-table-column label="仓库类型" width="180" show-overflow-tooltip>
                            <template #default="scope">
                                <el-text line-clamp="1">
                                    {{ scope.row.repoType }}
                                </el-text>
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
                        <el-table-column fixed="right" label="操作" width="120">
                            <template #default="scope">
                                <el-button link type="primary" size="small" @click="onUpdateHandle(scope.row)">
                                    编辑
                                </el-button>
                                <el-popconfirm title="确认删除此行数据？" @confirm="onDeleteHandle(scope.row)"
                                    confirm-button-text="确定" cancel-button-text="取消">
                                    <template #reference>
                                        <el-button link type="primary" size="small">删除</el-button>
                                    </template>
                                </el-popconfirm>
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
    <el-dialog v-model="dialogFormVisible" :title="formTitle" width="800px">
        <el-form ref="formRef" :model="form" label-width="auto" :rules="rules">
            <el-form-item label="用户名" prop="username">
                <el-input :disabled="!formAddMode" v-model="form.username" placeholder="请输入用户名" />
            </el-form-item>
            <el-form-item label="仓库名" prop="reponame">
                <el-input v-model="form.reponame" placeholder="请输入仓库名" />
            </el-form-item>
        </el-form>
        <template #footer>
            <div class="dialog-footer">
                <el-button @click="dialogFormVisible = false">取消</el-button>
                <el-button type="primary" @click="confirmAdd(formRef)">
                    确定
                </el-button>
            </div>
        </template>
    </el-dialog>
</template>
<script lang="ts" setup>
import {
    onMounted,
    ref,
    computed,
    reactive,
    toRaw,
} from 'vue'
import { UI_DEFAULT_PAGE_SIZE, DEFAULT_DATA_REPO } from "../../../common/config";
import { SearchDataSharePartnerBO } from "../../../common/data/bo/searchDataSharePartnerBO";
import { DataSharePartnerApi } from "../../../common/api";
import { DataSharePartner } from "../../../common/data/domain/dataSharePartner";
import dayjs from "dayjs";
import { ElTable, ElMessage } from "element-plus";

const scrollbar = ref();
const tableRef = ref<InstanceType<typeof ElTable>>()
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

onMounted(async () => {
    search();
});

const onClickSearch = async () => {
    currentPage.value = 1;
    search();
};

const reset = async () => {
    currentPage.value = 1;
    searchForm.username = null;
    searchForm.datetimeForCreateRange = [];
    searchForm.datetimeForUpdateRange = [];
    search();
};

const searchForm = reactive({
    username: null,
    datetimeForCreateRange: [],
    datetimeForUpdateRange: [],
})

const search = async () => {
    searchLoading.value = true;
    let searchResult = await DataSharePartnerApi.searchDataSharePartner(getSearchParam());
    tableData.value = searchResult.items;
    total.value = parseInt(searchResult.total);
    scrollbar.value.setScrollTop(0);
    searchLoading.value = false;
};

function getSearchParam() {
    let searchParam = new SearchDataSharePartnerBO();
    searchParam.pageNum = currentPage.value;
    searchParam.pageSize = pageSize.value;
    searchParam.username = searchForm.username;
    if (searchForm.datetimeForCreateRange && searchForm.datetimeForCreateRange.length > 0) {
        searchParam.startDatetimeForCreate = dayjs(searchForm.datetimeForCreateRange[0]);
        searchParam.endDatetimeForCreate = dayjs(searchForm.datetimeForCreateRange[1]);
    } else {
        searchParam.startDatetimeForCreate = null;
        searchParam.endDatetimeForCreate = null;
    }
    if (searchForm.datetimeForUpdateRange && searchForm.datetimeForUpdateRange.length > 0) {
        searchParam.startDatetimeForUpdate = dayjs(searchForm.datetimeForUpdateRange[0]);
        searchParam.endDatetimeForUpdate = dayjs(searchForm.datetimeForUpdateRange[1]);
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

const formRef = ref<FormInstance>()
const dialogFormVisible = ref(false);
const formTitle = ref("");
const formAddMode = ref(true);

const REPO_TYPE_GITHUB = "GITHUB";

const form = reactive({
    id: null,
    username: null,
    reponame: DEFAULT_DATA_REPO,
    repoType: REPO_TYPE_GITHUB,
})

const onAddHandle = async () => {
    formAddMode.value = true;
    formTitle.value = "新增伙伴信息";
    dialogFormVisible.value = true;
    resetForm();
    resetFormValue();
}

const onUpdateHandle = async (row: any) => {
    formAddMode.value = false;
    formTitle.value = "编辑伙伴信息";
    dialogFormVisible.value = true;
    resetForm();
    resetFormValue();
    form.id = row.id;
    form.username = row.username;
    form.reponame = row.reponame;
    form.repoType = row.repoType;
}

const resetFormValue = () => {
    form.id = null;
    form.username =  null;
    form.reponame = DEFAULT_DATA_REPO;
    form.repoType = REPO_TYPE_GITHUB;
}

const resetForm = () => {
    if (formRef.value) {
        formRef.value.resetFields();
    }
}

const onDeleteHandle = async (row: any) => {
    await DataSharePartnerApi.dataSharePartnerDeleteByIds([row.id]);
    ElMessage({
        message: '数据删除成功',
        type: 'success',
    });
    search();
}

const onBatchDelete = async () => {
    let selectedRows = tableRef.value.getSelectionRows();
    if (selectedRows.length > 0) {
        let ids = selectedRows.map(item => { return item.id });
        await DataSharePartnerApi.dataSharePartnerDeleteByIds(ids);
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

const rules = reactive<FormRules<typeof form>>({
    username: [
        { required: true, message: "请输入用户名", trigger: 'blur' }
    ],
    reponame: [
        { required: true, message: "请输入仓库名", trigger: 'blur' }
    ],
})

const confirmAdd = async (formEl: FormInstance | undefined) => {
    if (!formEl) return
    formEl.validate(async (valid) => {
        if (valid) {
            //save
            let entity = new DataSharePartner();
            entity.username = form.username;
            entity.reponame = form.reponame;
            entity.repoType = form.repoType;
            await DataSharePartnerApi.dataSharePartnerAddOrUpdate(entity);
            dialogFormVisible.value = false;
            reset();
        }
    })
}

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