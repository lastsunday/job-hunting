<template>
    <div class="wrapper">
        <div v-if="!show" class="issuesCommentMenu" @click="show = !show"><el-button size="small">查看评论
                <Icon icon="solar:alt-arrow-down-outline" />
            </el-button></div>
        <div v-if="show" class="issuesCommentMenu" @click="show = !show"><el-button size="small">收起评论
                <Icon icon="solar:alt-arrow-up-outline" />
            </el-button></div>
        <div v-if="show" v-loading="loading">
            <el-divider />
            <el-empty v-if="!firstQuery && dataList.length == 0" description="没有数据" />
            <div v-for="(item, index) in dataList" class="issuesCommentWrapper">
                <div class="avatarWrapper">
                    <el-avatar :size="30" :src="item.user.avatar_url" />
                </div>
                <div class="commentHeaderWrapper">
                    <div class="commentHeader">
                        <div class="username">{{ item.user.login }}
                            <span v-if="!isMe(item.user.login)">
                                <span class="partnerExists" v-if="isDataSharePlanPartner(item.user.login)">
                                    <el-tooltip :content="`${item.user.login}已加入你的数据共享计划伙伴名单`">
                                        <Icon icon="carbon:partnership" width="20" height="20" />
                                    </el-tooltip>
                                </span>
                                <span v-else class="partnerAdd">
                                    <el-popconfirm width="300" :title="`确认将${item.user.login}加入你的数据共享计划伙伴名单？`"
                                        @confirm="handleAddPartner(item.user.login)" confirm-button-text="确定"
                                        cancel-button-text="取消">
                                        <template #reference>
                                            <Icon icon="basil:add-outline" width="20" height="20" />
                                        </template>
                                    </el-popconfirm>
                                </span>
                            </span>
                        </div>
                        <div class="createTime"><el-tooltip :content="datetimeFormatHHMMSS(item.created_at)">{{
                            convertTimeOffsetToHumanReadable(item.created_at) }} </el-tooltip></div>
                        <el-link :href="item.html_url" target="_blank" class="source">来源</el-link>
                    </div>
                    <div class="commentBottom">
                        <div class="commentContent" v-html="item.body"></div>
                    </div>
                </div>
            </div>
            <div class="pagingWrapper">
                <el-text>共{{ maxPageNum ?? 1 }}页</el-text>
                <Icon :class="firstPageButtonClass" icon="solar:double-alt-arrow-left-outline" @click="onPageFirst" />
                <Icon :class="previousPageButtonClass" icon="solar:alt-arrow-left-outline" @click="onPagePrevious" />
                <Icon :class="nextPageButtonClass" icon="solar:alt-arrow-right-outline" @click="onPageNext" />
                <Icon :class="lastPageButtonClass" icon="solar:double-alt-arrow-right-outline" @click="onPageLast" />
            </div>
            <div class="commentAddWrapper">
                <div class="avatarWrapper">
                    <el-avatar :size="50" :src="myInfo.avatarUrl" />
                </div>
                <div class="commentHeaderWrapper">
                    <div class="commentHeader">
                        <div class="addCommentTitle">添加新的评论</div>
                    </div>
                    <div class="commentBottom">
                        <el-input v-model="commentData" style="width: 100%" :rows="5" type="textarea"
                            placeholder="请输入评论" />
                    </div>
                    <div class="operationMenu">
                        <el-button type="primary" @click="onCommit" :loading="commitLoading">提交评论</el-button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
<script setup lang="ts">
import { onMounted, ref, computed, watch, reactive } from "vue";
import dayjs from "dayjs";
import { GithubApi } from "../../common/api/github"
import { UserApi } from "../../common/api";
import { Icon } from '@iconify/vue';
import { ElMessage } from "element-plus";
import { COMMENT_PAGE_SIZE, DEFAULT_DATA_REPO, DEFAULT_REPO_TYPE } from "../../common/config";
import { convertTimeOffsetToHumanReadable } from "../../common/utils";
import { MAX_RECORD_COUNT } from "../../common";
import { DataSharePartner } from "../../common/data/domain/dataSharePartner";
import { SearchDataSharePartnerBO } from "../../common/data/bo/searchDataSharePartnerBO";
import { DataSharePartnerApi } from "../../common/api";
import { errorLog } from "../../common/log";

const props = defineProps(["issues"]);
const item = ref({});
const datetimeFormatHHMMSS = computed(() => {
    return function (value: string) {
        return dayjs(value).isValid() ? dayjs(value).format("YYYY-MM-DD HH:mm:ss") : "-";
    };
});

const show = ref(false);
const firstQuery = ref(true);
const dataList = ref([])
const nextPageNum = ref();
const prevPageNum = ref();
const firstPageNum = ref();
const lastPageNum = ref();
const maxPageNum = ref();
const previousPageButtonClass = reactive({
    "paging_icon": true,
    "paging_icon_disable": true
})

const nextPageButtonClass = reactive({
    "paging_icon": true,
    "paging_icon_disable": true
})

const firstPageButtonClass = reactive({
    "paging_icon": true,
    "paging_icon_disable": true
})

const lastPageButtonClass = reactive({
    "paging_icon": true,
    "paging_icon_disable": true
})

const searchParam = reactive({
    issueNumber: null,
    pageNum: 1,
    pageSize: COMMENT_PAGE_SIZE,
})
const loading = ref(true);
const myInfo = ref();
const commentData = ref();
const commitLoading = ref(false);

//init
item.value = props.issues;
searchParam.issueNumber = item.value.number;

onMounted(async () => {
    myInfo.value = await UserApi.userGet();
})

watch(show, async (newValue, oldValue) => {
    if (newValue) {
        queryComment();
    }
});

const dataSharePartnerMap = ref(new Map());
const isDataSharePlanPartner = computed(() => {
    return function (value: string) {
        return dataSharePartnerMap.value.has(value);
    };
})

const isMe = computed(() => {
    return function (value: string) {
        if (myInfo.value) {
            return myInfo.value.login == value;
        } else {
            return false;
        }
    }
})

const search = async () => {
    await queryComment();
}

const queryComment = async () => {
    firstQuery.value = false;
    try {
        loading.value = true;
        let result = await GithubApi.listIssueComment(searchParam.issueNumber, { pageSize: searchParam.pageSize, pageNum: searchParam.pageNum });
        dataList.value = result.items;
        nextPageNum.value = result.nextPageNum;
        prevPageNum.value = result.prevPageNum;
        firstPageNum.value = result.firstPageNum;
        lastPageNum.value = result.lastPageNum;
        if (result.lastPageNum) {
            maxPageNum.value = result.lastPageNum;
        }
        previousPageButtonClass["paging_icon_disable"] = !prevPageNum.value;
        nextPageButtonClass["paging_icon_disable"] = !nextPageNum.value;
        firstPageButtonClass["paging_icon_disable"] = !firstPageNum.value;
        lastPageButtonClass["paging_icon_disable"] = !lastPageNum.value;
        if (dataList.value.length > 0) {
            //获取数据共享计划伙伴
            let searchParam = new SearchDataSharePartnerBO();
            searchParam.pageNum = 1;
            searchParam.pageSize = MAX_RECORD_COUNT;
            searchParam.usernameList = dataList.value.flatMap(item => item.user.login);
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
        ElMessage({
            message: '查询失败',
            type: 'error',
        })
        throw e;
    } finally {
        loading.value = false;
    }
}

const onPageNext = async () => {
    if (nextPageNum.value) {
        searchParam.pageNum = nextPageNum.value;
        await search();
    }
}

const onPagePrevious = async () => {
    if (prevPageNum.value) {
        searchParam.pageNum = prevPageNum.value;
        await search();
    }
}

const onPageFirst = async () => {
    if (firstPageNum.value) {
        searchParam.pageNum = firstPageNum.value;
        await search();
    }
}

const onPageLast = async () => {
    if (lastPageNum.value) {
        searchParam.pageNum = lastPageNum.value;
        await search();
    }
}

const onCommit = async () => {
    if (commentData.value && commentData.value.length > 10) {
        try {
            commitLoading.value = true;
            await GithubApi.createIssueComment(searchParam.issueNumber, commentData.value);
            ElMessage({
                message: '评论提交成功',
                type: 'success',
            })
            searchParam.pageNum = maxPageNum.value || 1;
            await search();
        } finally {
            commitLoading.value = false;
        }
    } else {
        ElMessage({
            message: '评论内容长度过短，至少10个字符',
            type: 'warning',
        })
    }

}

const handleAddPartner = async (username) => {
    try {
        let entity = new DataSharePartner();
        entity.username = username;
        entity.reponame = DEFAULT_DATA_REPO;
        entity.repoType = DEFAULT_REPO_TYPE;
        await DataSharePartnerApi.dataSharePartnerAddOrUpdate(entity);
        ElMessage({
            message: `添加数据合作计划伙伴${username}成功`,
            type: 'success',
        })
        search();
    } catch (e) {
        errorLog(e);
        ElMessage({
            message: `添加数据合作计划伙伴${username}失败`,
            type: 'error',
        })
    }
}

</script>
<style lang="css" scoped>
.wrapper {
    display: flex;
    flex-direction: column;
    flex: 1;
}

.issuesCommentMenu {
    align-self: end;
}

.issuesCommentWrapper {
    display: flex;
    flex-direction: row;
    padding: 5px;
}

.avatarWrapper {
    padding: 5px;
}

.commentHeaderWrapper {
    display: flex;
    flex-direction: column;
    flex: 1;
}

.commentHeader {
    display: flex;
    flex-direction: row;
    padding: 5px;
    border-top-left-radius: 5px;
    border-top-right-radius: 5px;
    border-bottom: 0.5px solid black;
}

.username {
    display: flex;
    padding-right: 5px;
}

.createTime {
    flex: 1;
}

.source {
    padding-right: 5px;
}

.commentBottom {
    border-top-width: 0;
    padding: 5px;
    border-end-start-radius: 5px;
    border-end-end-radius: 5px;
}

.pagingWrapper {
    display: flex;
    justify-content: end;
    padding: 5px;
    padding: 5px;
    padding-top: 0;
    padding-bottom: 10px;
}

.paging_icon {
    width: 20px;
    height: 20px;
    cursor: pointer;
}

.paging_icon_disable {
    color: gray;
    cursor: no-drop;
}

.commentAddWrapper {
    display: flex;
    flex-direction: row;
}

.addCommentTitle {
    padding-right: 5px;
}

.operationMenu {
    padding: 5px;
    display: flex;
    justify-content: end;
}

.commentContent {
    font-size: 14px;
}

.partnerExists {
    color: var(--el-color-success);
}

.partnerAdd {
    color: var(--el-color-primary);
}
</style>