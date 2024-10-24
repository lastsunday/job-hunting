<template>
    <div v-loading="loading">
        <div class="menu">
            <el-popconfirm title="确认添加选中的数据？" @confirm="onBatchAdd" confirm-button-text="确定" cancel-button-text="取消">
                <template #reference>
                    <el-button type="primary">批量添加</el-button>
                </template>
            </el-popconfirm>
        </div>
        <el-table ref="tableRef" :data="tableData" :row-class-name="tableRowClassName">
            <el-table-column type="selection" width="55" :selectable="repoNameSelectable" />
            <el-table-column label="状态" width="60">
                <template #default="scope">
                    <div v-if="scope.row.owner.login == myInfo.login">
                        <el-tooltip content="不能添加自己">
                            <Icon icon="icon-park-outline:invalid-files" width="20" height="20" />
                        </el-tooltip>
                    </div>
                    <div v-else>
                        <div v-if="scope.row.name == DEFAULT_DATA_REPO">
                            <el-tooltip v-if="dataSharePartnerMap.has(scope.row.owner.login)" content="已添加到伙伴列表">
                                <Icon class="partnerExists" icon="carbon:partnership" width="20" height="20" />
                            </el-tooltip>
                            <el-tooltip v-else content="可添加到伙伴列表">
                                <Icon class="partnerAdd" icon="basil:add-outline" width="20" height="20" />
                            </el-tooltip>
                        </div>
                        <el-tooltip v-else content="仓库名不符合条件">
                            <Icon icon="icon-park-outline:invalid-files" width="20" height="20" />
                        </el-tooltip>
                    </div>
                </template>
            </el-table-column>
            <el-table-column label="头像" width="70">
                <template #default="scope">
                    <el-avatar :src="scope.row.owner.avatarUrl" />
                </template>
            </el-table-column>
            <el-table-column label="用户名" width="120" show-overflow-tooltip>
                <template #default="scope">
                    <el-link :href="`${GITHUB_URL}/${scope.row.owner.login}`" type="primary" target="_blank">{{
                        scope.row.owner.login }}
                    </el-link>
                </template>
            </el-table-column>
            <el-table-column label="仓库名" show-overflow-tooltip>
                <template #default="scope">
                    <el-link :href="`${GITHUB_URL}/${scope.row.owner.login}/${scope.row.name}`" type="primary"
                        target="_blank">{{
                            scope.row.name }}
                    </el-link>
                </template>
            </el-table-column>
            <el-table-column label="星数" width="60" show-overflow-tooltip>
                <template #default="scope">
                    <el-text line-clamp="1">
                        {{ scope.row.stargazerCount }}
                    </el-text>
                </template>
            </el-table-column>
            <el-table-column label="最近更新时间" width="120" show-overflow-tooltip>
                <template #default="scope">
                    <el-text line-clamp="1">
                        {{ datetimeFormat(scope.row.updatedAt) }}
                    </el-text>
                </template>
            </el-table-column>
            <el-table-column label="创建时间" width="120" show-overflow-tooltip>
                <template #default="scope">
                    <el-text line-clamp="1">
                        {{ datetimeFormat(scope.row.createdAt) }}
                    </el-text>
                </template>
            </el-table-column>
        </el-table>
        <el-pagination v-model:current-page="currentPage" v-model:page-size="pageSize"
            :page-sizes="[10, 20, 50, 100, 200, 500, 1000]" :small="small" :disabled="disabled" :background="background"
            layout="total, sizes, prev,next" :total="total" @size-change="handleSizeChange" @prev-click="onPagePrevious"
            @next-click="onPageNext" />
    </div>
</template>
<script lang="ts" setup>
import { ref, onMounted, reactive, toRaw, computed } from 'vue'
import { MAX_RECORD_COUNT } from "../../../common";
import { DEFAULT_DATA_REPO, COMMENT_PAGE_SIZE, DEFAULT_REPO_TYPE, GITHUB_URL } from "../../../common/config"
import { UserApi } from "../../../common/api";
import { GithubApi, EXCEPTION } from "../../../common/api/github";
import dayjs from "dayjs";
import { SearchDataSharePartnerBO } from "../../../common/data/bo/searchDataSharePartnerBO";
import { DataSharePartnerApi } from "../../../common/api";
import { ElTable, ElMessage } from "element-plus";
import { DataSharePartner } from "../../../common/data/domain/dataSharePartner";
import { errorLog } from "../../../common/log"
import { Icon } from '@iconify/vue';

const emits = defineEmits(["batchAddSuccess"]);

const datetimeFormat = computed(() => {
    return function (value: string) {
        return dayjs(value).isValid() ? dayjs(value).format("YYYY-MM-DD") : "-";
    };
});

const currentPage = ref(1);
const loading = ref(false);
const pageSize = ref(COMMENT_PAGE_SIZE);
const total = ref(0);
const tableData = ref([]);
const background = ref(false);
const disabled = ref(false);
const tableRef = ref<InstanceType<typeof ElTable>>()

const repoNameSelectable = (row: any, index: number) => {
    return row.name == DEFAULT_DATA_REPO && !(row.owner.login == myInfo.value.login) && !dataSharePartnerMap.value.has(row.owner.login);
}

const tableRowClassName = ({
    row,
    rowIndex,
}) => {
    if (row.name == DEFAULT_DATA_REPO && !(row.owner.login == myInfo.value.login) && !dataSharePartnerMap.value.has(row.owner.login)) {
        return ''
    } else {
        return 'disabled'
    }
}

const searchParam = reactive({
    first: COMMENT_PAGE_SIZE,
    after: null,
    last: null,
    before: null,
    repo: DEFAULT_DATA_REPO,
})

const pageInfo = reactive({
    endCursor: null,
    hasNextPage: null,
    hasPreviousPage: null,
    startCursor: null,
});

const dataSharePartnerMap = ref(new Map());

const myInfo = ref();

const search = async () => {
    loading.value = true;
    let param = getSearchParam();
    try {
        let result = await GithubApi.queryRepository(param);
        total.value = result.search.repositoryCount;
        tableData.value = result.search.nodes;
        const { startCursor, endCursor, hasNextPage, hasPreviousPage, } = result.search.pageInfo;
        pageInfo.startCursor = startCursor;
        pageInfo.endCursor = endCursor;
        pageInfo.hasNextPage = hasNextPage;
        pageInfo.hasPreviousPage = hasPreviousPage;
        if (tableData.value.length > 0) {
            //获取数据共享计划伙伴
            let searchParam = new SearchDataSharePartnerBO();
            searchParam.pageNum = 1;
            searchParam.pageSize = MAX_RECORD_COUNT;
            searchParam.usernameList = tableData.value.flatMap(item => item.owner.login);
            searchParam.orderByColumn = "updateDatetime";
            searchParam.orderBy = "DESC";
            let partnerResult = await DataSharePartnerApi.searchDataSharePartner(searchParam);
            let partnerResultItems = partnerResult.items;
            dataSharePartnerMap.value.clear();
            for (let i = 0; i < partnerResultItems.length; i++) {
                let item = partnerResultItems[i];
                dataSharePartnerMap.value.set(item.username, null);
            }
        }
    } catch (e) {
        if (e == EXCEPTION.NO_LOGIN) {
            ElMessage({
                message: '需要登录GitHub',
                type: 'warning',
            })
        } else {
            ElMessage({
                message: '查询失败',
                type: 'error',
            })
            throw e;
        }
    } finally {
        loading.value = false;
    }
}

const onPageNext = () => {
    if (pageInfo.hasNextPage) {
        searchParam.first = pageSize.value;
        searchParam.last = null;
        searchParam.after = toRaw(pageInfo).endCursor;
        searchParam.before = null;
        search();
    }
}

const onPagePrevious = () => {
    if (pageInfo.hasPreviousPage) {
        searchParam.first = null;
        searchParam.last = pageSize.value;
        searchParam.after = null;
        searchParam.before = toRaw(pageInfo).startCursor;
        search();
    }
}

const getSearchParam = () => {
    return toRaw(searchParam);
}

const resetParam = () => {
    searchParam.first = pageSize.value;
    searchParam.after = null;
    searchParam.last = null;
    searchParam.before = null;
    searchParam.repo = DEFAULT_DATA_REPO;
}

const reset = () => {
    resetParam();
    search();
}

onMounted(async () => {
    myInfo.value = await UserApi.userGet();
    search();
});

const handleSizeChange = (val: number) => {
    reset();
};

const onBatchAdd = async () => {
    let selectedRows = tableRef.value.getSelectionRows();
    if (selectedRows.length > 0) {
        try {
            const entityList = [];
            for (let i = 0; i < selectedRows.length; i++) {
                const item = selectedRows[i];
                const entity = new DataSharePartner();
                entity.username = item.owner.login;
                entity.reponame = item.name;
                entity.repoType = DEFAULT_REPO_TYPE;
                entityList.push(entity);
            }
            await DataSharePartnerApi.dataSharePartnerBatchAddOrUpdate(entityList);
            emits('batchAddSuccess')
            ElMessage({
                message: `伙伴名单添加成功,共${selectedRows.length}条`,
                type: 'success',
            });
            search();
        } catch (e) {
            errorLog(e);
            ElMessage({
                message: '添加伙伴失败',
                type: 'error',
            })
        }
    } else {
        ElMessage({
            message: '请选择需要添加的伙伴',
            type: 'warning',
        })
    }
}

</script>
<style lang="scss" scoped>
.menu {
    display: flex;
    justify-content: right;
}

.partnerExists {
    color: var(--el-color-success);
}

.partnerAdd {
    color: var(--el-color-primary);
}
</style>

<style lang="scss">
.el-table .disabled {
    --el-table-tr-bg-color: rgba(0, 0, 0, .02);
}
</style>