<template>
    <div class="content">
        <el-row justify="end">
            <div class="menu">
                <div class="statusWrapper" v-if="enableDataSharePlan">
                    <div class="statusWrapperItem">
                        <div class="info">登录状态:
                            <el-text type="success" v-if="login">在线</el-text>
                            <el-text class="offlineButton" type="warning" v-else @click="onClickLogin">离线</el-text>
                        </div>
                        <div v-if="login" class="info">数据上传仓库: <a
                                :href="`${GITHUB_URL}/${username}/${DEFAULT_DATA_REPO}`" target="_blank">{{ username
                                }}/{{ DEFAULT_DATA_REPO }}</a></div>
                    </div>
                    <div class="statusWrapperItem">
                        <span class="group">今天<el-tooltip content="上传记录数"><span>
                                    <Icon icon="material-symbols:cloud-upload" /><span class="number">{{
                                        uploadRecordTotalCountToday }}</span>
                                </span></el-tooltip>
                            <el-tooltip content="下载文件数"><span>
                                    <Icon icon="material-symbols:cloud-download" /><span class="number">{{
                                        downloadFileTotalCountToday }}</span>
                                </span></el-tooltip>
                            <el-tooltip content="合并记录数"><span>
                                    <Icon icon="material-symbols:merge" /><span class="number">{{
                                        mergeRecordTotalCountToday }}</span>
                                </span></el-tooltip>
                        </span>
                        <span class="group">历史<el-tooltip content="上传记录数"><span>
                                    <Icon icon="material-symbols:cloud-upload" /><span class="number">{{
                                        uploadRecordTotalCountAll }}</span>
                                </span></el-tooltip>
                            <el-tooltip content="下载文件数"><span>
                                    <Icon icon="material-symbols:cloud-download" /><span class="number">{{
                                        downloadFileTotalCountAll }}</span>
                                </span></el-tooltip>
                            <el-tooltip content="合并记录数"><span>
                                    <Icon icon="material-symbols:merge" /><span class="number">{{
                                        mergeRecordTotalCountAll }}</span>
                                </span></el-tooltip>
                        </span>
                        <span class="group">伙伴数：
                            <Icon icon="carbon:partnership" /><span class="number">{{ dataSharePartnerCount }}</span>
                        </span>
                    </div>
                </div>
                <el-switch v-model="enableDataSharePlan" active-text="开启数据共享计划" inactive-text="关闭数据共享计划" inline-prompt
                    size="large" />
            </div>
        </el-row>
        <div class="content" v-if="enableDataSharePlan">
            <el-tabs tab-position="left" class="tabs">
                <el-tab-pane class="tab_panel">
                    <template #label>
                        <div class="menuItem" ref="favoriteMenuRef">
                            <span>任务</span>
                            <Icon icon="fluent-mdl2:taskboard" width="25" height="25" />
                        </div>
                    </template>
                    <TaskList></TaskList>
                </el-tab-pane>
                <el-tab-pane class="tab_panel">
                    <template #label>
                        <div class="menuItem" ref="automateMenuRef">
                            <span>伙伴</span>
                            <Icon icon="carbon:partnership" width="25" height="25" />
                        </div>
                    </template>
                    <PartnerList></PartnerList>
                </el-tab-pane>
            </el-tabs>

        </div>
        <div class="content" v-else>
            <swiper-container navigation="true" centered-slides="true" :autoplay-delay="5000"
                :autoplay-disable-on-interaction="true" :pagination="true" :pagination-dynamic-bullets="true">
                <swiper-slide>
                    <div class="introductionFirst">
                        <vue-particles id="tsparticles" :options="firstPageOption" pagination="true" />
                        <div class="desc">开启数据共享计划，掌握更加全面的职位信息。</div>
                    </div>
                </swiper-slide>
                <swiper-slide>
                    <div class="introductionSecond">
                        <vue-particles id="tsparticles2" :options="secondPageOption" pagination="true" />
                        <div class="desc">
                            <div class="title">
                                <Icon icon="material-symbols:follow-the-signs-sharp" />可协助你
                            </div>
                            <div>
                                <Icon icon="material-symbols:counter-1" /> 自动创建数据共享仓库。
                            </div>
                            <div>
                                <Icon icon="material-symbols:counter-2" /> 定时上传职位，公司，公司标签数据。
                            </div>
                            <div>
                                <Icon icon="material-symbols:counter-3" /> 定时获取来自小伙伴的共享数据。
                            </div>
                        </div>
                    </div>
                </swiper-slide>
                <swiper-slide>
                    <div class="introductionThird">
                        <vue-particles id="tsparticles3" :options="thirdPageOption" pagination="true" />
                        <div class="desc">
                            <div class="title">
                                <button @click="enableDataSharePlan = true">
                                    <div class="title">现在开启
                                        <Icon icon="material-symbols:electrical-services" />
                                    </div><span></span>
                                </button>
                            </div>
                        </div>
                    </div>
                </swiper-slide>
            </swiper-container>
        </div>
    </div>
</template>
<script lang="ts" setup>
import { onMounted, ref, watch, onUnmounted } from "vue";
import { Icon } from '@iconify/vue';
import { register } from 'swiper/element/bundle';
register();

import { Option } from "./data/tsparticlesOption";
import { ConfigApi, AuthApi, UserApi, DataSharePartnerApi, TaskApi } from "../../common/api"
import { GITHUB_URL, CONFIG_KEY_DATA_SHARE_PLAN, DEFAULT_DATA_REPO } from "../../common/config";
import { DataSharePlanConfigDTO } from "../../common/data/dto/dataSharePlanConfigDTO";
import { Config } from "../../common/data/domain/config";
import { errorLog } from "../../common/log";
import PartnerList from "./dataSharePlan/PartnerList.vue";
import TaskList from "./dataSharePlan/TaskList.vue";
import { StatisticDataSharePartnerDTO } from "../../common/data/dto/statisticDataSharePartnerDTO";
import dayjs from "dayjs";
import { StatisticTaskBO } from "../../common/data/bo/statisticTaskBO";

const enableDataSharePlan = ref(false);
const tourOpen = ref(false);
const firstPageOption = Option.linkStyle;
const secondPageOption = Option.popStyle;
const thirdPageOption = Option.pop2Style;
const config = ref(<DataSharePlanConfigDTO>{});

const login = ref(false);
const username = ref("");
let refreshIntervalId = null;

const dataSharePartnerCount = ref(0);

const uploadRecordTotalCountToday = ref(0);
const downloadFileTotalCountToday = ref(0);
const mergeRecordTotalCountToday = ref(0);
const uploadRecordTotalCountAll = ref(0);
const downloadFileTotalCountAll = ref(0);
const mergeRecordTotalCountAll = ref(0);

onMounted(async () => {
    try {
        let configValue = await ConfigApi.getConfigByKey(CONFIG_KEY_DATA_SHARE_PLAN);
        if (configValue && configValue.value) {
            config.value = JSON.parse(configValue.value);
            enableDataSharePlan.value = config.value.enable;
        }
    } catch (e) {
        errorLog(e);
    }
    await checkLoginStatus();
    await refresh();
    refreshIntervalId = setInterval(refresh, 10000);
})

onUnmounted(() => {
    if (refreshIntervalId) {
        clearInterval(refreshIntervalId);
        refreshIntervalId = null;
    }
});

const refresh = async () => {
    try {
        if (login.value) {
            let statisticDataSharePartnerDTO = await DataSharePartnerApi.statisticDataSharePartner({});
            dataSharePartnerCount.value = statisticDataSharePartnerDTO.totalCount;
            let now = dayjs();
            let todayStart = now.startOf("day").format("YYYY-MM-DD HH:mm:ss");
            let todayEnd = now
                .startOf("day")
                .add(1, "day")
                .format("YYYY-MM-DD HH:mm:ss");
            let todayParam = new StatisticTaskBO();
            todayParam.startDatetime = todayStart;
            todayParam.endDatetime = todayEnd;
            let statisticTaskToday = await TaskApi.statisticTask(todayParam);
            uploadRecordTotalCountToday.value = statisticTaskToday.uploadRecordTotalCount;
            downloadFileTotalCountToday.value = statisticTaskToday.downloadFileTotalCount;
            mergeRecordTotalCountToday.value = statisticTaskToday.mergeRecordTotalCount;
            let allParam = new StatisticTaskBO();
            let statisticTaskAll = await TaskApi.statisticTask(allParam);
            uploadRecordTotalCountAll.value = statisticTaskAll.uploadRecordTotalCount;
            downloadFileTotalCountAll.value = statisticTaskAll.downloadFileTotalCount;
            mergeRecordTotalCountAll.value = statisticTaskAll.mergeRecordTotalCount;
        }
    } catch (e) {
        errorLog(e);
    }
};

const checkLoginStatus = async () => {
    let oauthDTO = await AuthApi.authGetToken();
    if (oauthDTO) {
        login.value = true;
    } else {
        login.value = false;
    }
    let userDTO = await UserApi.userGet();
    if (userDTO) {
        username.value = userDTO.login;
    }
}

const handleChange = async (value) => {
    let configFromStorage = await ConfigApi.getConfigByKey(CONFIG_KEY_DATA_SHARE_PLAN);
    let configDTO = new DataSharePlanConfigDTO();
    let configObject = configFromStorage;
    if (!configObject) {
        configObject = new Config();
        configObject.key = CONFIG_KEY_DATA_SHARE_PLAN;
    } else {
        if (configObject.value) {
            try {
                configDTO = JSON.parse(configObject.value);
            } catch (e) {
                errorLog(e);
            }
        }
    }
    configDTO.enable = value;
    configObject.value = JSON.stringify(configDTO);
    await ConfigApi.addOrUpdateConfig(configObject);
}

watch(enableDataSharePlan, async (newValue, oldValue) => {
    handleChange(newValue);
}
)

const onClickLogin = async () => {
    await AuthApi.authOauth2Login();
    await checkLoginStatus();
}

</script>

<style scoped>
.menu {
    display: flex;
    align-items: center;
    padding: 5px;
}

.menuItem {
    display: flex;
    align-items: center;
}

.tabs {
    display: flex;
    height: 100%;
    width: 100%;
}

.tab_panel {
    height: 100%;
    width: 100%;
}

.icon {
    cursor: pointer;
    width: 24px;
    height: 24px;
}

.content {
    display: flex;
    flex-direction: column;
    flex: 1;
    overflow: auto;

    .desc {
        z-index: 9999;
        margin-top: -300px;
    }

    .introductionFirst {
        display: flex;
        flex-direction: column;
        font-size: 50px;
        text-align: center;
        height: 100%;
        align-items: center;
        justify-content: center;
    }

    .introductionSecond {
        display: flex;
        background-color: aquamarine;
        font-size: 25px;
        height: 100%;
        align-items: center;
        justify-content: center;
        font-size: 25px;

        .title {
            font-size: 50px;
            padding-bottom: 10px;
        }
    }

    .introductionThird {
        display: flex;
        background-color: aquamarine;
        height: 100%;
        align-items: center;
        justify-content: center;

        .title {
            font-size: 50px;
            display: flex;
            align-items: center;
        }

        button {
            border: none;
            display: block;
            position: relative;
            padding: 0.7em 2.4em;
            font-size: 18px;
            background: transparent;
            cursor: pointer;
            user-select: none;
            overflow: hidden;
            color: royalblue;
            z-index: 1;
            font-family: inherit;
            font-weight: 500;
        }

        button span {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            background: transparent;
            z-index: -1;
            border: 4px solid royalblue;
        }

        button span::before {
            content: "";
            display: block;
            position: absolute;
            width: 8%;
            height: 500%;
            background: var(--lightgray);
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-60deg);
            transition: all 0.3s;
        }

        button:hover span::before {
            transform: translate(-50%, -50%) rotate(-90deg);
            width: 100%;
            background: royalblue;
        }

        button:hover {
            color: white;
        }

        button:active span::before {
            background: #2751cd;
        }
    }

    swiper-container {
        width: 100%;
        height: 100%;
    }
}



.statusWrapper {
    display: flex;
    flex-direction: column;
    font-size: 15px;
}

.statusWrapperItem {
    display: flex;
    justify-content: end;

    span {
        display: flex;
    }

}

.info {
    padding-right: 10px;
}

.offlineButton {
    cursor: pointer;
}

.group {
    margin-right: 5px;
    margin-top: 2px;
    padding: 1px;
    border: 1px solid rgba(0, 0, 0, 0.1);
    border-radius: 5px;
}

.number {
    font-weight: bold;
    color: var(--el-color-primary);
    padding-left: 4px;
}
</style>