<template>
    <div class="wrapper">
        <div v-if="!show" class="issuesCommentMenu" @click="show = !show"><el-button size="small">查看评论
                <Icon icon="solar:alt-arrow-down-outline" />
            </el-button></div>
        <div v-if="show" class="issuesCommentMenu" @click="show = !show"><el-button size="small">收起评论
                <Icon icon="solar:alt-arrow-up-outline" />
            </el-button></div>
        <el-divider />
        <div v-if="show" v-loading="loading">
            <el-empty v-if="!firstQuery && dataList.length == 0" description="没有数据" />
            <div v-for="(item, index) in dataList" class="issuesCommentWrapper">
                <div class="avatarWrapper">
                    <el-avatar :size="50" :src="item.user.avatar_url" />
                </div>
                <div class="commentHeaderWrapper">
                    <div class="commentHeader">
                        <div class="username">{{ item.user.login }}</div>
                        <div class="createTime">{{ datetimeFormatHHMMSS(item.created_at) }}</div>
                        <el-link :href="item.html_url" target="_blank" class="source">来源</el-link>
                    </div>
                    <div class="commentBottom">
                        <div v-html="item.body"></div>
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
import { COMMENT_PAGE_SIZE } from "../../common/config";

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
        if (firstQuery.value || dataList.value.length == 0) {
            queryComment();
        }
    }
});

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
            searchParam.pageNum = maxPageNum.value;
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

</script>
<style lang="css">
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
    border: 0.5px solid black;
    padding: 5px;
    border-top-left-radius: 5px;
    border-top-right-radius: 5px;
}

.username {
    padding-right: 5px;
}

.createTime {
    flex: 1;
}

.source {
    padding-right: 5px;
}

.commentBottom {
    border: 0.5px solid black;
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
</style>