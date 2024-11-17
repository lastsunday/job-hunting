<template>
    <el-tabs type="card" class="tabs">
        <el-tab-pane class="tab_panel" label="查看">
            <div class="operation_menu">
                <div class="operation_menu_left">
                    <el-switch v-model="mapMode" active-text="地图模式" inactive-text="列表模式" inline-prompt />
                    <el-popconfirm :title="`确定打开当前所有职位详情页？（共${tableData.length ?? 0}条记录）`"
                        @confirm="onOpenCurrentAllJobDetailPage" confirm-button-text="确定" cancel-button-text="取消"
                        width="380">
                        <template #reference>
                            <el-button class="menuButton" type="warning" size="small" round>
                                <Icon icon="ion:open-outline" />打开当前所有职位详情页
                            </el-button>
                        </template>
                    </el-popconfirm>
                </div>
            </div>
            <div v-if="!mapMode" class="content">
                <el-scrollbar ref="scrollbar" class="tableScrollbar" v-loading="searchLoading">
                    <el-table :data="tableData" :default-sort="{ prop: 'createDatetime', order: 'descending' }" stripe
                        sortable="custom">
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
                                    <el-descriptions class="margin-top" :column="1" size="small" border
                                        direction="vertical">
                                        <el-descriptions-item>
                                            <template #label>
                                                <div class="cell-item">职位标签</div>
                                            </template>
                                            <div>
                                                <el-text v-if="
                                                    props.row.jobTagDTOList &&
                                                    props.row.jobTagDTOList.length > 0
                                                " class="compang_tag">
                                                    <el-tag v-for="(value, key, index) in props.row
                                                        .jobTagDTOList" type="primary">{{ value.tagName }}</el-tag>
                                                </el-text>
                                                <el-text v-else>-</el-text>
                                            </div>
                                        </el-descriptions-item>
                                    </el-descriptions>
                                    <el-descriptions class="margin-top" :column="1" size="small" border
                                        direction="vertical">
                                        <el-descriptions-item>
                                            <template #label>
                                                <div class="cell-item">公司标签</div>
                                            </template>
                                            <div>
                                                <el-text v-if="
                                                    props.row.companyTagDTOList &&
                                                    props.row.companyTagDTOList.length > 0
                                                " class="compang_tag">
                                                    <el-tag v-for="(value, key, index) in props.row
                                                        .companyTagDTOList" type="warning">{{ value.tagName }}</el-tag>
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
                        <el-table-column prop="jobFirstPublishDatetime" label="发布时间" width="110">
                            <template #default="scope">
                                <el-text line-clamp="1">
                                    {{ datetimeFormat(scope.row.jobFirstPublishDatetime) }}
                                </el-text>
                            </template>
                        </el-table-column>
                        <el-table-column prop="jobTagDTOList" label="职位标签数" show-overflow-tooltip width="100">
                            <template #default="scope">
                                <el-text line-clamp="1">
                                    {{
                                        scope.row.jobTagDTOList
                                            ? scope.row.jobTagDTOList.length
                                            : 0
                                    }}
                                </el-text>
                            </template>
                        </el-table-column>
                        <el-table-column prop="companyTagDTOList" label="公司标签数" show-overflow-tooltip width="100">
                            <template #default="scope">
                                <el-text line-clamp="1">
                                    {{
                                        scope.row.companyTagDTOList
                                            ? scope.row.companyTagDTOList.length
                                            : 0
                                    }}
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
                        <el-table-column label="最低薪资" prop="jobSalaryMin" width="120">
                            <template #default="scope">
                                <el-text line-clamp="1">
                                    {{ scope.row.jobSalaryMin }}
                                </el-text>
                            </template>
                        </el-table-column>
                        <el-table-column label="最高薪资" prop="jobSalaryMax" width="120">
                            <template #default="scope">
                                <el-text line-clamp="1">
                                    {{ scope.row.jobSalaryMax }}
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
            <div v-if="mapMode" class="mapContent">
                <el-scrollbar ref="scrollbar" class="left" v-loading="searchLoading">
                    <JobItemCard v-for="(item, index) in tableData" :item="item" :key="item.jobId"
                        @map-locate="onJobMapLocate(item)"></JobItemCard>
                </el-scrollbar>
                <div class="middle">
                    <div class="mapWrapper">
                        <l-map ref="map" v-model:zoom="zoom" :center="[39.906217, 116.3912757]">
                            <l-tile-layer
                                url="http://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}"
                                :subdomains="['1', '2', '3', '4']"></l-tile-layer>
                            <l-marker-cluster-group>
                                <l-marker v-for="(item, index) in jobsFilterEmptyLocation"
                                    :lat-lng="[item.jobLatitude, item.jobLongitude]">
                                    <l-popup ref="popups" :lat-lng="[item.jobLatitude, item.jobLongitude]">
                                        <MapJobDetail :key="item.jobId" :item="item"></MapJobDetail>
                                    </l-popup>
                                    <l-icon className="icon" :key="item.jobId">
                                        <MapJobIcon :key="item.jobId" :item="item"></MapJobIcon>
                                    </l-icon>
                                </l-marker>
                            </l-marker-cluster-group>
                        </l-map>
                    </div>
                </div>
            </div>
            <el-row>
                <el-pagination v-model:current-page="currentPage" v-model:page-size="pageSize"
                    :page-sizes="[10, 20, 50, 100, 200, 500, 1000]" :small="small" :disabled="disabled"
                    :background="background" layout="total, sizes, prev, pager, next" :total="total"
                    @size-change="handleSizeChange" @current-change="handleCurrentChange" />
            </el-row>
        </el-tab-pane>
        <el-tab-pane class="tab_panel" label="设置">
            <el-form :model="form" label-width="auto" style="max-width: 600px">
                <el-form-item label="职位名关键字">
                    <TagInput ref="jobNameTagRef" v-model="form.nameKeywordList" :settings="tagSettings"
                        placeholder="请输入职位名关键字"></TagInput>
                </el-form-item>
                <el-form-item label="职位名排除关键字">
                    <TagInput ref="jobNameDislikeTagRef" v-model="form.nameDislikeKeywordList" :settings="tagSettings"
                        placeholder="请输入职位名排除关键字"></TagInput>
                </el-form-item>
                <el-form-item label="预期工资/月">
                    <el-input type="number" v-model="form.salary" />
                </el-form-item>
                <el-form-item label="工作地点">
                    <TagInput ref="jobAddressTagRef" v-model="form.addressKeywordList" :settings="tagSettings"
                        placeholder="请输入工作地点关键字"></TagInput>
                </el-form-item>
                <el-form-item label="职位描述关键字">
                    <TagInput ref="jobDescTagRef" v-model="form.descKeywordList" :settings="tagSettings"
                        placeholder="请输入职位描述关键字"></TagInput>
                </el-form-item>
                <el-form-item label="职位描述排除关键字">
                    <TagInput ref="jobDescDislikeTagRef" v-model="form.descDislikeKeywordList" :settings="tagSettings"
                        placeholder="请输入职位描述排除关键字"></TagInput>
                </el-form-item>
                <el-form-item label="招聘人职位排除关键字">
                    <TagInput ref="bossPositionDislikeTagRef" v-model="form.bossPositionDislikeKeywordList"
                        :whitelist="bossPositionDislikeWhitelist" :settings="tagSettings" placeholder="招聘人职位排除关键字">
                    </TagInput>
                </el-form-item>
                <el-form-item label="喜欢的职位标签">
                    <TagInput ref="likeJobTagRef" v-model="form.likeJobTagList" :settings="tagSettings"
                        :whitelist="whitelist" placeholder="请选择喜欢的职位标签"></TagInput>
                </el-form-item>
                <el-form-item label="不喜欢的职位标签">
                    <TagInput ref="dislikeJobTagRef" v-model="form.dislikeJobTagList" :settings="tagSettings"
                        :whitelist="whitelist" placeholder="请选择不喜欢的职位标签"></TagInput>
                </el-form-item>
                <el-form-item label="不喜欢的公司标签">
                    <TagInput ref="dislikeCompanyTagRef" v-model="form.dislikeCompanyTagList" :settings="tagSettings"
                        :whitelist="whitelist" placeholder="请选择不喜欢的公司标签"></TagInput>
                </el-form-item>
                <el-form-item label="职位发布时间">
                    <el-radio-group v-model="form.publishDateOffset">
                        <el-radio v-for="(item) in publishDateOffsetOptions" :value="item.value" :key="item.value">{{
                            item.label
                        }}</el-radio>
                    </el-radio-group>
                </el-form-item>
                <el-form-item label="排序">
                    <el-radio-group v-model="form.sortMode">
                        <el-radio v-for="(item) in sortModeOptions" :value="item.value" :key="item.value">{{
                            item.label
                        }}</el-radio>
                    </el-radio-group>
                </el-form-item>
                <el-form-item>
                    <el-button type="primary" @click="onSubmit">保存</el-button>
                    <el-button @click="onReset">恢复</el-button>
                </el-form-item>
            </el-form>
        </el-tab-pane>
    </el-tabs>
</template>
<script lang="ts" setup>
import {
    reactive,
    onMounted,
    ref,
    computed,
    nextTick,
    watch,
    toRaw,
} from 'vue'
import TagInput from "../../components/TagInput.vue";
import { TagApi, AssistantApi, SystemApi } from "../../../common/api/index";
import dayjs from "dayjs";
import { SearchFaviousJobBO } from "../../../common/data/bo/searchFaviousJobBO.js";
import {
    PLATFORM_51JOB,
    PLATFORM_BOSS,
    PLATFORM_LAGOU,
    PLATFORM_LIEPIN,
    PLATFORM_ZHILIAN,
} from "../../../common";
import "leaflet/dist/leaflet.css";
import {
    LMap,
    LIcon,
    LTileLayer,
    LMarker,
    LPopup,
} from "@vue-leaflet/vue-leaflet";
import { LMarkerClusterGroup } from "vue-leaflet-markercluster";
import "vue-leaflet-markercluster/dist/style.css";
import { ElMessage } from "element-plus";
import { JobFaviousSettingDTO } from "../../../common/data/dto/jobFaviousSettingDTO";
import { JobDTO } from "../../../common/data/dto/jobDTO";
import { UI_DEFAULT_PAGE_SIZE } from "../../../common/config";
import JobItemCard from '../../components/JobItemCard.vue';
import { Icon } from "@iconify/vue";
import { useJob } from "../../hook/job";
import MapJobIcon from "../../components/MapJobIcon.vue";
import MapJobDetail from "../../components/MapJobDetail.vue";
const { platformFormat, platformLogo } = useJob()

const form = reactive({
    nameKeywordList: [],
    nameDislikeKeywordList: [],
    salary: null,
    addressKeywordList: [],
    descKeywordList: [],
    descDislikeKeywordList: [],
    dislikeCompanyTagList: [],
    likeJobTagList: [],
    dislikeJobTagList: [],
    publishDateOffset: -1,
    bossPositionDislikeKeywordList: [],
    sortMode: 0,
})

const bossPositionDislikeWhitelist = ref([]);

const tagSettings = {
    dropdown: {
        maxItems: 30,
        classname: 'tags-look', // <- custom classname for this dropdown, so it could be targeted
        enabled: 0,             // <- show suggestions on focus
        closeOnSelect: false    // <- do not hide the suggestions dropdown once an item has been selected
    }
};

const publishDateOffsetOptions = [
    { label: "没要求", value: -1 },
    { label: "一周内", value: 604800000 },
    { label: "两周内", value: 1209600000 },
    { label: "一个月内", value: 2620800000 },
    { label: "两个月内", value: 5241600000 },
    { label: "三个月内", value: 7862400000 },
    { label: "半年内", value: 15724800000 },
    { label: "一年内", value: 31449600000 },
]

const sortModeOptions = [
    { label: "最近发现在前面", value: 0 },
    { label: "最近发布在前面", value: 1 },
]

const whitelist = ref([]);
const bossPositionDislikeArray = ["猎头", "顾问"]

onMounted(async () => {
    await loadWhitelist();
    let jobFaviousSetting = await AssistantApi.assistantGetJobFaviousSetting();
    setFormData(jobFaviousSetting);
    await search();
    if (popups.value.length > 0) {
        map.value.leafletObject.fitBounds(popups.value.map((item) => item.latLng));
    } else {
        map.value.leafletObject.setView([39.906217, 116.3912757], 4);
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

const setFormData = (jobFaviousSetting) => {
    form.nameKeywordList = jobFaviousSetting.nameKeywordList.flatMap(item => { return { "value": item } });
    form.nameDislikeKeywordList = jobFaviousSetting.nameDislikeKeywordList.flatMap(item => { return { "value": item } });
    form.salary = jobFaviousSetting.salary;
    form.addressKeywordList = jobFaviousSetting.addressKeywordList.flatMap(item => { return { "value": item } });
    form.descKeywordList = jobFaviousSetting.descKeywordList.flatMap(item => { return { "value": item } });
    form.descDislikeKeywordList = jobFaviousSetting.descDislikeKeywordList.flatMap(item => { return { "value": item } });
    form.dislikeCompanyTagList = jobFaviousSetting.dislikeCompanyTagList.flatMap(item => { return { "value": whitelistCodeValueMap.get(item), "code": item } });
    form.likeJobTagList = jobFaviousSetting.likeJobTagList.flatMap(item => { return { "value": whitelistCodeValueMap.get(item), "code": item } });
    form.dislikeJobTagList = jobFaviousSetting.dislikeJobTagList.flatMap(item => { return { "value": whitelistCodeValueMap.get(item), "code": item } });
    form.publishDateOffset = jobFaviousSetting.publishDateOffset;
    form.bossPositionDislikeKeywordList = jobFaviousSetting.bossPositionDislikeKeywordList.flatMap(item => { return { "value": item } });
    form.sortMode = jobFaviousSetting.sortMode;
    if (form.sortMode == 1) {
        jobSearchOrderByColumn.value = "jobFirstPublishDatetime DESC, createDatetime DESC";
    } else {
        jobSearchOrderByColumn.value = "createDatetime DESC, jobFirstPublishDatetime DESC";
    }
}

const whitelistCodeValueMap = new Map();

const loadWhitelist = async () => {
    bossPositionDislikeWhitelist.value.push(...bossPositionDislikeArray);

    let allTags = await TagApi.getAllTag();
    let tagItems = [];
    allTags.forEach(item => {
        tagItems.push({ value: item.tagName, code: item.tagId });
    });
    whitelist.value.length = 0;
    whitelist.value.push(...tagItems);
    whitelistCodeValueMap.clear();
    whitelist.value.forEach(item => {
        whitelistCodeValueMap.set(item.code, item.value);
    });
}

const onSubmit = async () => {
    try {
        await AssistantApi.assistantSetJobFaviousSetting(getFaviousSettingDTOFromForm());
        let jobFaviousSetting = await AssistantApi.assistantGetJobFaviousSetting();
        setFormData(jobFaviousSetting);
        ElMessage({
            message: "职位偏好设置保存成功",
            type: "success"
        });
    } catch (e) {
        ElMessage({
            message: "职位偏好设置保存失败",
            type: "error",
        });
    }
    search();
}

const getFaviousSettingDTOFromForm = () => {
    let result = new JobFaviousSettingDTO();
    result.nameKeywordList = toRaw(form.nameKeywordList).flatMap(item => item.value);
    result.nameDislikeKeywordList = toRaw(form.nameDislikeKeywordList).flatMap(item => item.value);
    result.salary = Number.parseInt(toRaw(form.salary));
    result.addressKeywordList = toRaw(form.addressKeywordList).flatMap(item => item.value);
    result.descKeywordList = toRaw(form.descKeywordList).flatMap(item => item.value);
    result.descDislikeKeywordList = toRaw(form.descDislikeKeywordList).flatMap(item => item.value);
    result.dislikeCompanyTagList = toRaw(form.dislikeCompanyTagList).flatMap(item => item.code);
    result.likeJobTagList = toRaw(form.likeJobTagList).flatMap(item => item.code);
    result.dislikeJobTagList = toRaw(form.dislikeJobTagList).flatMap(item => item.code);
    result.publishDateOffset = toRaw(form.publishDateOffset);
    result.bossPositionDislikeKeywordList = toRaw(form.bossPositionDislikeKeywordList).flatMap(item => item.value);
    result.sortMode = toRaw(form.sortMode);
    return result;
}

const onReset = async () => {
    try {
        let jobFaviousSetting = await AssistantApi.assistantGetJobFaviousSetting();
        setFormData(jobFaviousSetting);
        ElMessage({
            message: "职位偏好设置恢复成功",
            type: "success"
        });
    } catch (e) {
        ElMessage({
            message: "职位偏好设置恢复失败",
            type: "error",
        });
    }
}

const tableData = ref([]);
const currentPage = ref(1);
const pageSize = ref(UI_DEFAULT_PAGE_SIZE);
const total = ref(0);
const small = ref(false);
const background = ref(false);
const disabled = ref(false);
const jobSearchOrderByColumn = ref("createDatetime DESC, jobFirstPublishDatetime DESC");
const jobSearchOrderBy = ref("");
const datetimeFormat = computed(() => {
    return function (value: string) {
        return dayjs(value).isValid() ? dayjs(value).format("YYYY-MM-DD") : "-";
    };
});

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

const scrollbar = ref();

const searchLoading = ref(false);

const search = async () => {
    searchLoading.value = true;
    let searchResult = await AssistantApi.assistantSearchFaviousJob(getSearchParam());
    tableData.value = searchResult.items;
    total.value = parseInt(searchResult.total);
    scrollbar.value.setScrollTop(0);
    searchLoading.value = false;
};

function getSearchParam() {
    let searchParam = new SearchFaviousJobBO();
    searchParam.pageNum = currentPage.value;
    searchParam.pageSize = pageSize.value;
    searchParam.nameKeywordList = toRaw(form.nameKeywordList).flatMap(item => item.value);
    searchParam.nameDislikeKeywordList = toRaw(form.nameDislikeKeywordList).flatMap(item => item.value);
    searchParam.salary = Number.parseInt(toRaw(form.salary));
    searchParam.addressKeywordList = toRaw(form.addressKeywordList).flatMap(item => item.value);
    searchParam.descKeywordList = toRaw(form.descKeywordList).flatMap(item => item.value);
    searchParam.descDislikeKeywordList = toRaw(form.descDislikeKeywordList).flatMap(item => item.value);
    searchParam.dislikeCompanyTagList = toRaw(form.dislikeCompanyTagList).flatMap(item => item.code);
    searchParam.likeJobTagList = toRaw(form.likeJobTagList).flatMap(item => item.code);
    searchParam.dislikeJobTagList = toRaw(form.dislikeJobTagList).flatMap(item => item.code);
    searchParam.publishDateOffset = toRaw(form.publishDateOffset);
    searchParam.bossPositionDislikeKeywordList = toRaw(form.bossPositionDislikeKeywordList).flatMap(item => item.value);
    searchParam.orderByColumn = jobSearchOrderByColumn.value;
    searchParam.orderBy = jobSearchOrderBy.value;
    return searchParam;
}

const handleSizeChange = (val: number) => {
    search();
};

const handleCurrentChange = (val: number) => {
    search();
};

const mapMode = ref(true);

const map = ref();
const zoom = ref(4);
const jobsFilterEmptyLocation = computed(() =>
    tableData.value.filter((item) => item.jobLatitude && item.jobLongitude)
);
const idAndPopupIndexMap = computed(() => {
    let result = new Map();
    let filtered = tableData.value.filter(
        (item) => item.jobLatitude && item.jobLongitude
    );
    filtered.forEach((element, index) => {
        result.set(element.jobId, index);
    });
    return result;
});
const onJobMapLocate = (item) => {
    let popUpIndex = idAndPopupIndexMap.value.get(item.jobId);
    let popUpObject = popups.value[popUpIndex];
    popUpObject.leafletObject.openOn(map.value.leafletObject);
    map.value.leafletObject.flyTo(popUpObject.latLng, 14);
};
const popups = ref([]);

watch(mapMode, async (newValue, oldValue) => {
    if (newValue) {
        nextTick(() => {
            map.value.leafletObject.invalidateSize();
            if (popups.value.length > 0) {
                map.value.leafletObject.fitBounds(
                    popups.value.map((item) => item.latLng)
                );
            } else {
                map.value.leafletObject.setView([39.906217, 116.3912757], 4);
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
});

const onOpenCurrentAllJobDetailPage = () => {
    tableData.value.forEach(async item => {
        await SystemApi.systemTabCreate({ url: item.jobUrl, active: false })
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
</style>