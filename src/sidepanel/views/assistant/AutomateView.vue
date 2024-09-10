<template>
    <el-tabs type="card" class="tabs">
        <el-tab-pane class="tab_panel" label="任务">
            <div class="menu">
                <el-tooltip content="并发执行">
                    <el-button circle type="primary" @click="concurrentBatchAutomateFetchJobItemData">
                        <Icon icon="material-symbols:double-arrow" width="20" height="20" />
                    </el-button>
                </el-tooltip>
                <el-tooltip content="顺序执行">
                    <el-button circle type="primary" @click="batchAutomateFetchJobItemData">
                        <Icon icon="material-symbols:play-arrow" width="20" height="20" />
                    </el-button>
                </el-tooltip>
                <el-button type="primary" @click="onAddHandle">新增任务</el-button>
                <el-switch v-model="sort" active-text="开启排序" inactive-text="关闭排序" inline-prompt />
            </div>
            <el-scrollbar ref="scrollbar" v-loading="missionLoading">
                <div class="cardMain">
                    <draggable v-if="missionRules && missionRules.length > 0" v-model="missionRules" item-key="id"
                        class="el-row" :sort="sort" @end="sortEnd" :disabled="!sort">
                        <template #item="{ element }">
                            <div>
                                <el-card class="cardItem">
                                    <template #header>
                                        <div :class="element.classHeaderObject">
                                            <div class="cardHeader">
                                                <div class="cardHeaderItem">
                                                    <div v-if="element?.missionLogDetial">
                                                        <div class="headerIcon"
                                                            v-if="element.missionLogDetial.missionStatus == MISSION_STATUS_SUCCESS">
                                                            <Icon icon="mdi:success-circle-outline" width="30"
                                                                height="30" />
                                                        </div>
                                                        <div v-else class="headerIcon">
                                                            <Icon icon="mi:circle-error" width="30" height="30" />
                                                        </div>
                                                    </div>
                                                    <Icon icon="material-symbols:pending-actions" width="25"
                                                        height="25" />
                                                    <span>{{ element.missionName }}</span>
                                                </div>
                                                <div class="cardHeaderItem">
                                                    <Icon v-if="sort" icon="material-symbols:sort" width="25"
                                                        height="25" />
                                                    <el-tooltip content="查看执行历史">
                                                        <el-button circle type="info"
                                                            @click="onShowLogHistory(element)">
                                                            <Icon icon="material-symbols:history" width="20"
                                                                height="20" />
                                                        </el-button>
                                                    </el-tooltip>
                                                </div>
                                            </div>
                                        </div>
                                    </template>
                                    <div class="missionType">任务类型：{{ missionTypeFormat(element.missionType) }}</div>
                                    <div class="missionPlatform">运行平台：{{ missionPlatformFormat(element.missionPlatform)
                                        }}</div>
                                    <template #footer>
                                        <div class="footerMain">
                                            <div>
                                                <el-tooltip content="编辑">
                                                    <el-button circle type="warning" @click="onUpdateHandle(element)">
                                                        <Icon icon="mdi:edit" width="20" height="20" />
                                                    </el-button>
                                                </el-tooltip>
                                                <el-popconfirm title="确认删除任务？" @confirm="onDeleteHandle(element)"
                                                    confirm-button-text="确定" cancel-button-text="取消">
                                                    <template #reference>
                                                        <el-button circle type="danger">
                                                            <Icon icon="mdi:delete" width="20" height="20" />
                                                        </el-button>
                                                    </template>
                                                </el-popconfirm>
                                                <el-tooltip :content="`访问目标地址：${element.missionConfig.url}`">
                                                    <el-button circle type="warning" @click="onAccessUrl(element)">
                                                        <Icon icon="ion:open-outline" width="20" height="20" />
                                                    </el-button>
                                                </el-tooltip>
                                            </div>
                                            <div>
                                                <el-tooltip content="显示日志" v-if="element.missionLogDetial">
                                                    <el-button circle type="info" @click="onShowLogDetail(element)">
                                                        <Icon icon="pajamas:log" width="20" height="20" />
                                                    </el-button>
                                                </el-tooltip>
                                                <el-tooltip content="执行任务">
                                                    <el-button circle :type="element.missionButtonType ?? `primary`"
                                                        @click="automateFetchJobItemData(element)"
                                                        :loading="element.loading">
                                                        <Icon icon="mdi:play" width="20" height="20" />
                                                    </el-button>
                                                </el-tooltip>
                                            </div>
                                        </div>
                                    </template>
                                </el-card>
                            </div>
                        </template>
                    </draggable>
                    <div v-else class="emptyMissionWrapper">
                        <el-empty description="暂无任务" />
                    </div>
                </div>
            </el-scrollbar>
        </el-tab-pane>
    </el-tabs>
    <el-dialog v-model="dialogFormVisible" :title="formTitle" width="800px">
        <el-form ref="formRef" :model="form" label-width="auto" :rules="rules">
            <el-form-item label="类型" prop="type">
                <el-select v-model="form.type" placeholder="请选择任务类型">
                    <el-option v-for="item in missionTypes" :label="item.label" :value="item.value" />
                </el-select>
            </el-form-item>
            <el-form-item label="运行平台" prop="platform">
                <el-radio-group v-model="form.platform">
                    <el-radio-button v-for="item in missionPlatforms[form.type]" :label="item.label"
                        :value="item.value" />
                </el-radio-group>
            </el-form-item>
            <el-form-item label="标题" prop="name">
                <el-input v-model="form.name" placeholder="请输入任务标题" />
            </el-form-item>
            <el-form-item label="访问地址" prop="url">
                <el-input v-model="form.url" placeholder="请输入任务访问地址" />
            </el-form-item>
            <el-form-item label="翻页延迟时间" prop="delay">
                <el-slider v-model="form.delay" :marks="marks" :max="20" />
            </el-form-item>
            <el-form-item label="额外随机时间范围" prop="delayRange">
                <el-slider v-model="form.delayRange" :marks="marks" :max="20" />
            </el-form-item>
            <el-form-item label="最大翻页数" prop="maxPage">
                <el-slider v-model="form.maxPage" :marks="marksPage" :max="100" />
            </el-form-item>
        </el-form>
        <template #footer>
            <div class="dialog-footer">
                <el-button @click="dialogFormVisible = false">取消</el-button>
                <el-button type="primary" @click="confirmAdd(formRef)" :loading="confirmLoading">
                    确定
                </el-button>
            </div>
        </template>
    </el-dialog>
    <el-dialog v-if="dialogLogDetailFormVisible" v-model="dialogLogDetailFormVisible" :title="formLogTitle"
        width="1024px">
        <div>任务时间：{{ currentMission.missionLogDetial ?
            datetimeFormat(currentMission.missionLogDetial.startDatetime) : "" }} - {{
                currentMission.missionLogDetial ?
                    datetimeFormat(currentMission.missionLogDetial.endDatetime) : "" }}</div>
        <div v-if="currentMission?.missionLogDetial?.missionStatus">运行结果：
            {{ missionStatusFormat(currentMission.missionLogDetial.missionStatus) }}
        </div>
        <div v-if="currentMission?.missionLogDetial?.missionStatusReason">错误原因：
            {{ missionErrorFormat(currentMission.missionLogDetial.missionStatusReason) }}
        </div>
        <div>
            耗时：{{
                dayjs.duration(dayjs(currentMission.missionLogDetial.endDatetime).diff(currentMission.missionLogDetial.startDatetime)).minutes()
            }}分{{
                dayjs.duration(dayjs(currentMission.missionLogDetial.endDatetime).diff(currentMission.missionLogDetial.startDatetime)).seconds()
            }}秒</div>
        <div>查看页数：{{ currentMission.missionLogDetial ? currentMission.missionLogDetial.count - 1 :
            ""
            }}页</div>
        <div v-if="currentMission.screenshotList && currentMission.screenshotList.length > 0">
            <el-carousel type="card" indicator-position="outside">
                <el-carousel-item v-for="imageUrl in currentMission.screenshotList">
                    <el-image :src="imageUrl" :preview-src-list="currentMission.screenshotList" fit="cover"
                        :preview-teleported="true" />
                </el-carousel-item>
            </el-carousel>
        </div>
        <div>日志({{ currentMission.missionLogDetial ?
            currentMission.missionLogDetial.logList.length :
            "" }})：</div>
        <div v-if="currentMission.missionLogDetial">
            <div v-for="log in currentMission.missionLogDetial.logList">
                <div>{{ log }}</div>
            </div>
        </div>
    </el-dialog>
    <el-dialog v-model="dialogLogHistoryFormVisible" :title="formLogHistoryTitle" width="800px">
        <MissionHistoryLog v-if="dialogLogHistoryFormVisible" v-model="currentShowMissionHistory"></MissionHistoryLog>
    </el-dialog>

</template>
<script lang="ts" setup>
import { ref, reactive, nextTick, onMounted, computed } from "vue";
import { AutomateApi, MissionApi, MissionLogApi, SystemApi } from "../../../common/api/index";
import {
    PLATFORM_51JOB, PLATFORM_BOSS, PLATFORM_ZHILIAN, PLATFORM_LAGOU, PLATFORM_LIEPIN, MISSION_AUTO_BROWSE_JOB_SEARCH_PAGE,
    MISSION_STATUS_SUCCESS, MISSION_STATUS_FAILURE, AUTOMATE_ERROR_HUMAN_VALID, AUTOMATE_ERROR_UNKNOW
} from "../../../common";
import draggable from 'vuedraggable'
import { Icon } from "@iconify/vue";
import type { FormInstance, FormRules } from "element-plus";
import { Mission } from "../../../common/data/domain/mission";
import { MissionConfigJobPageDTO } from "../../../common/data/dto/missionConfigJobPageDTO";
import { errorLog } from "../../../common/log";
import { ElMessage } from "element-plus";
import { MissionLog } from "../../../common/data/domain/missionLog";
import { MissionLogJobPageDetailDTO } from "../../../common/data/dto/missionLogJobPageDetailDTO";
import MissionHistoryLog from "../components/MissionHistoryLog.vue";
import dayjs from "dayjs";
import duration from 'dayjs/plugin/duration'
dayjs.extend(duration);

const datetimeFormat = computed(() => {
    return function (value: string) {
        return dayjs(value).isValid() ? dayjs(value).format("YYYY-MM-DD HH:mm:ss") : "-";
    };
});

const missionTypes = ref([{
    label: "自动浏览职位搜索页", value: MISSION_AUTO_BROWSE_JOB_SEARCH_PAGE
}]);

const missionTypeFormat = computed(() => {
    return function (value: string) {
        if (value == MISSION_AUTO_BROWSE_JOB_SEARCH_PAGE) {
            return "自动浏览职位搜索页";
        } else {
            return value;
        }
    };
});


const missionPlatforms = ref({
    MISSION_AUTO_BROWSE_JOB_SEARCH_PAGE: [
        { label: "前程无忧", value: PLATFORM_51JOB },
        { label: "BOSS直聘", value: PLATFORM_BOSS },
        { label: "智联招聘", value: PLATFORM_ZHILIAN },
        { label: "拉钩网", value: PLATFORM_LAGOU },
        { label: "猎聘网", value: PLATFORM_LIEPIN },
    ]
});

const missionPlatformFormat = computed(() => {
    return function (value: string) {
        if (value == PLATFORM_51JOB) {
            return "前程无忧";
        } else if (value == PLATFORM_BOSS) {
            return "BOSS直聘";
        } else if (value == PLATFORM_ZHILIAN) {
            return "智联招聘";
        } else if (value == PLATFORM_LAGOU) {
            return "拉钩网";
        } else if (value == PLATFORM_LIEPIN) {
            return "猎聘网";
        } else {
            return value;
        }
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

const missionRules = ref([]);

onMounted(async () => {
    search();
})

const search = async () => {
    missionRules.value.length = 0;
    let result = await MissionApi.missionGetAll();
    result.forEach(item => {
        let targetItem = Object.assign({}, item);
        targetItem.missionConfig = JSON.parse(targetItem.missionConfig);
        missionRules.value.push(targetItem);
    });
}

const missionLoading = ref(false);

const automateFetchJobItemData = async (item) => {
    item.loading = true;
    item.missionLogDetial = null;
    item.screenshotList = [];
    try {
        let result = await AutomateApi.automateFetchJobItemData({
            url: item.missionConfig.url,
            platform: item.missionPlatform,
            delay: item.missionConfig.delay * 1000,
            delayRandomRange: item.missionConfig.delayRandomRange * 1000,
            maxPage: item.missionConfig.maxPage,
        });
        let missionLog = new MissionLog();
        missionLog.missionId = item.missionId;
        if (result.error) {
            missionLog.missionStatus = MISSION_STATUS_FAILURE;
            missionLog.missionStatusReason = result.error;
        } else {
            missionLog.missionStatus = MISSION_STATUS_SUCCESS;
        }
        let missionLogJobPageDetailDTO = new MissionLogJobPageDetailDTO();
        missionLogJobPageDetailDTO.logList = result.logList;
        missionLogJobPageDetailDTO.count = result.count;
        missionLogJobPageDetailDTO.startDatetime = result.startDatetime;
        missionLogJobPageDetailDTO.endDatetime = result.endDatetime;
        missionLog.missionLogDetial = JSON.stringify(missionLogJobPageDetailDTO);
        result.screenshotList.forEach(element => {
            item.screenshotList.push(`data:image/jpeg;base64,${element}`)
        });
        await MissionLogApi.missionLogAddOrUpdate(missionLog);
        item.missionLogDetial = missionLogJobPageDetailDTO;
        item.missionLogDetial.missionStatus = missionLog.missionStatus;
        item.missionLogDetial.missionStatusReason = missionLog.missionStatusReason;
        if (result.error) {
            item.missionButtonType = "danger";
            item.classHeaderObject = {};
            item.classHeaderObject.missionSuccess = false;
            item.classHeaderObject.missionFailure = true;
        } else {
            item.missionButtonType = "success";
            item.classHeaderObject = {};
            item.classHeaderObject.missionSuccess = true;
            item.classHeaderObject.missionFailure = false;
        }
    } catch (e) {
        errorLog(e);
        item.missionButtonType = "danger";
        item.classHeaderObject = {};
        item.classHeaderObject.missionSuccess = false;
        item.classHeaderObject.missionFailure = true;
    } finally {
        item.loading = false;
    }
}

const sort = ref(false);

const sortEnd = async () => {
    await MissionLogApi.missionSort(missionRules.value.flatMap(item => item.missionId));
    search();
}

const formRef = ref<FormInstance>();
const dialogFormVisible = ref(false);
const formTitle = ref("");
const formAddMode = ref(true);
const form = reactive({
    id: "",
    name: "",
    type: MISSION_AUTO_BROWSE_JOB_SEARCH_PAGE,
    platform: "",
    url: "",
    delay: 0,
    delayRange: 0,
    maxPage: 0,
});
const marks = reactive<Marks>({
    0: '0秒',
    5: '5秒',
    10: '10秒',
    15: '15秒',
    20: '20秒',
})

const marksPage = reactive<Marks>({
    0: '无限制',
    5: '5页',
    10: '10页',
    20: '20页',
    40: '40页',
    80: '80页',
    100: '100页',
})

const rules = reactive<FormRules<typeof form>>({
    name: [
        {
            required: true,
            trigger: "blur",
            message: "请输入任务名",
        },
    ],
    type: [
        {
            required: true,
            trigger: "blur",
            message: "请选择任务类型",
        },
    ],
    platform: [
        {
            required: true,
            trigger: "blur",
            message: "请选择任务执行平台",
        },
    ],
    url: [
        {
            required: true,
            trigger: "blur",
            message: "请输入访问页面地址",
        },
    ]
});

const onAddHandle = async () => {
    formAddMode.value = true;
    formTitle.value = "新增任务";
    dialogFormVisible.value = true;
    resetForm();
    nextTick(async () => {
        resetFormValue();
    })
}

const onUpdateHandle = async (row: any) => {
    formAddMode.value = false;
    formTitle.value = "编辑任务";
    dialogFormVisible.value = true;
    resetForm();
    resetFormValue();
    fillForm(row);
}

const fillForm = (item) => {
    form.id = item.missionId;
    form.name = item.missionName;
    form.type = item.missionType;
    form.platform = item.missionPlatform;
    let config = item.missionConfig;
    form.url = config.url;
    form.delay = config.delay;
    form.delayRange = config.delayRange;
    form.maxPage = config.maxPage;
}

const confirmLoading = ref(false);

const confirmAdd = async (formEl: FormInstance | undefined) => {
    if (!formEl) return;
    formEl.validate(async (valid) => {
        if (valid) {
            //save
            confirmLoading.value = true;
            try {
                let mission = new Mission();
                mission.missionId = form.id;
                mission.missionName = form.name;
                mission.missionType = form.type;
                mission.missionPlatform = form.platform;
                let missionConfig = new MissionConfigJobPageDTO()
                missionConfig.url = form.url;
                missionConfig.delay = form.delay;
                missionConfig.delayRange = form.delayRange;
                missionConfig.maxPage = form.maxPage;
                mission.missionConfig = JSON.stringify(missionConfig);
                mission.seq = 0;
                await MissionApi.missionAddOrUpdate(mission)
                dialogFormVisible.value = false;
                reset();
                search();
            } catch (e) {
                errorLog(e)
                ElMessage({
                    message: formAddMode.value ? '新增任务失败' : "编辑任务失败",
                    type: 'error',
                });
            } finally {
                confirmLoading.value = false;
            }
        }
    });
};

const onDeleteHandle = async (row: any) => {
    await MissionApi.missionDeleteById([row.missionId]);
    ElMessage({
        message: '任务删除成功',
        type: 'success',
    });
    search();
}

const resetForm = () => {
    if (formRef.value) {
        formRef.value.resetFields();
    }
}

const reset = async () => {
    resetForm();
};

const resetFormValue = () => {
    form.id = "";
    form.name = "";
    form.type = MISSION_AUTO_BROWSE_JOB_SEARCH_PAGE;
    form.platform = "";
    form.url = "";
    form.delay = 0;
    form.delayRange = 0;
    form.maxPage = 0;
}

const formLogTitle = ref();
const dialogLogDetailFormVisible = ref(false);


const currentMission = ref();

const onShowLogDetail = (item) => {
    dialogLogDetailFormVisible.value = true;
    formLogTitle.value = `任务日志(${item.missionName})`;
    currentMission.value = item;
}


const dialogLogHistoryFormVisible = ref(false);
const currentShowMissionHistory = ref();
const formLogHistoryTitle = ref();

const onShowLogHistory = async (item) => {
    dialogLogHistoryFormVisible.value = true;
    formLogHistoryTitle.value = `任务日志历史(${item.missionName})`;
    currentShowMissionHistory.value = item;
}

const batchAutomateFetchJobItemData = async () => {
    const items = missionRules.value;
    for (let i = 0; i < items.length; i++) {
        await automateFetchJobItemData(items[i]);
    }
}

const concurrentBatchAutomateFetchJobItemData = () => {
    const items = missionRules.value;
    for (let i = 0; i < items.length; i++) {
        automateFetchJobItemData(items[i]);
    }
}

const onAccessUrl = (item) => {
    SystemApi.systemTabCreate({ url: item.missionConfig.url, active: true })
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

.cardHeader {
    font-size: 16px;
    display: flex;
    justify-content: space-between;
}

.cardHeaderItem {
    align-items: center;
    display: flex;
}

.cardMain {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
}

.cardItem {
    margin: 10px;
}

.footerMain {
    display: flex;
    justify-content: space-between;
}

.menu {
    display: flex;
    gap: 10px;
    padding: 10px;
}

.missionSuccess {
    color: green;
}

.missionFailure {
    color: red;
}

.missionType {
    font-size: 20px;
}

.missionPlatform {
    font-size: 20px;
}

.headerIcon {
    display: flex;
}

.emptyMissionWrapper {
    width: 100%;
}
</style>
<style lang="scss">
.el-tabs__content {
    display: flex;
    flex: 1;
    width: 100%
}
</style>