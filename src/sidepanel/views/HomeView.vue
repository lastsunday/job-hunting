<template>
    <el-row v-loading="loading" class="statistic">
        <el-col :span="6">
            <el-statistic title="今天职位查看数" :value="todayBrowseDetailCount" />
        </el-col>
        <el-col :span="6">
            <el-statistic title="职位数" :value="totalJobCount" />
        </el-col>
        <el-col :span="6">
            <el-statistic title="公司数" :value="totalCompanyCount" />
        </el-col>
        <el-col :span="6">
            <el-statistic title="公司标签数" :value="totalTagCompanyCount" />
        </el-col>
    </el-row>
    <el-divider />
    <el-row justify="space-between">
        <el-col :span="6">
            <el-descriptions title="最近查看职位" direction="vertical" :column="1">
                <el-descriptions-item label="" v-loading="loading">
                    <el-timeline v-if="todayJobs.length > 0" style="max-width: 600px">
                        <el-timeline-item v-for="(item, index) in todayJobs" :key="index"
                            :timestamp="item.latestBrowseDetailDatetime" v-show="item.latestBrowseDetailDatetime">
                            <el-row>
                                <el-link type="primary" :href="item.jobUrl" target="_blank">{{ item.jobName }}-{{
                                    item.jobCompanyName }}</el-link>
                            </el-row>
                            <el-row justify="end"> <el-link v-if="item.jobLongitude && item.jobLatitude" type="primary"
                                    @click="onJobMapLocate(item)">📍定位</el-link></el-row>
                        </el-timeline-item>
                    </el-timeline>
                    <el-text v-else>无</el-text>
                </el-descriptions-item>
            </el-descriptions>
        </el-col>
        <el-col :span="14">
            <div class="mapWrapper">
                <l-map ref="map" v-model:zoom="zoom" :center="[39.906217, 116.3912757]" style="height:600px;">
                    <l-tile-layer
                        url="http://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}"
                        :subdomains="['1', '2', '3', '4']"></l-tile-layer>
                    <l-marker v-for="(item, index) in todayJobsFilterEmptyLocation"
                        :lat-lng="[item.jobLatitude, item.jobLongitude]">
                        <l-popup ref="popups" :lat-lng="[item.jobLatitude, item.jobLongitude]">
                            <el-row>
                                <el-text line-clamp="1">职位名：{{ item.jobName }}</el-text>
                            </el-row>
                            <el-row>
                                <el-text line-clamp="1">薪资：💵{{ item.jobSalaryMin }} - 💵{{ item.jobSalaryMax
                                    }}</el-text>
                            </el-row>
                            <el-row>
                                <el-text line-clamp="1">学历：{{ item.jobDegreeName }}</el-text>
                            </el-row>
                            <el-row>
                                <el-text line-clamp="1">招聘平台：{{ item.jobPlatform }}</el-text>
                            </el-row>
                            <el-row>
                                <el-text line-clamp="1">公司名：{{ item.jobCompanyName }}</el-text>
                            </el-row>
                        </l-popup>
                        <l-icon className="icon">
                            <div class="mapIcon">
                                <el-row>
                                    <el-text line-clamp="1"> {{ item.jobName }}</el-text>
                                </el-row>
                                <el-row>
                                    <el-text line-clamp="1">💵{{ item.jobSalaryMin }} - 💵{{ item.jobSalaryMax
                                        }}</el-text>
                                </el-row>
                                <el-row>
                                    <el-text line-clamp="1">{{ item.jobCompanyName }}</el-text>
                                </el-row>
                            </div>
                        </l-icon>
                    </l-marker>
                </l-map>
            </div>
        </el-col>
        <el-col :span="4">
            <el-descriptions direction="vertical" :column="1" size="small" border>
                <el-descriptions-item label="招聘网站">
                    <el-row v-for="(item, index) in jobWebsiteList">
                        <el-link :key="index" type="primary" :href="item.url" target="_blank">{{ item.label }}</el-link>
                    </el-row>
                </el-descriptions-item>
                <el-descriptions-item label="公司搜索">
                    <el-row v-for="(item, index) in companyWebsiteList">
                        <el-link :key="index" type="primary" :href="item.url" target="_blank">{{ item.label }}</el-link>
                    </el-row>
                </el-descriptions-item>
            </el-descriptions>
        </el-col>
    </el-row>
</template>
<script lang="ts" setup>
import { ref, onMounted, computed } from "vue";
import { useTransition } from "@vueuse/core";
import { JobApi, CompanyApi } from "../../common/api/index.js";
import { SearchJobBO } from "../../common/data/bo/searchJobBO";
import "leaflet/dist/leaflet.css";
import {
    LMap,
    LIcon,
    LTileLayer,
    LMarker,
    LControlLayers,
    LTooltip,
    LPopup,
    LPolyline,
    LPolygon,
    LRectangle,
} from "@vue-leaflet/vue-leaflet";

const todayBrowseDetailCountSource = ref(0);
const todayBrowseDetailCount = useTransition(todayBrowseDetailCountSource, {
    duration: 1000,
});
const totalJobCountSource = ref(0);
const totalJobCount = useTransition(totalJobCountSource, {
    duration: 1000,
});
const totalCompanyCountSource = ref(0);
const totalCompanyCount = useTransition(totalCompanyCountSource, {
    duration: 1000,
});
const totalTagCompanyCountSource = ref(0);
const totalTagCompanyCount = useTransition(totalTagCompanyCountSource, {
    duration: 1000,
});

const loading = ref(true);
const firstTimeLoading = ref(true);

onMounted(async () => {
    await refresh();
    setInterval(refresh, 10000);
    //自动展开popup
    // popups.value.forEach(item => {
    //     item.leafletObject.options.autoClose = false;
    // });
    // popups.value.forEach(item => {
    //     item.leafletObject.openOn(map.value.leafletObject);
    // });
    map.value.leafletObject.fitBounds(popups.value.map(item => item.latLng));
    if (popups.value && popups.value.length > 0) {
        let firstPopup = popups.value[0];
        firstPopup.leafletObject.openOn(map.value.leafletObject);
        //TODO clean the timeout
        setTimeout(() => {
            map.value.leafletObject.flyTo(firstPopup.latLng);
        }, 300);
    }
});


const refresh = async () => {
    if (firstTimeLoading.value) {
        loading.value = true;
        firstTimeLoading.value = false;
    }
    const statisticJobBrowseDTO = await JobApi.statisticJobBrowse();
    todayBrowseDetailCountSource.value =
        statisticJobBrowseDTO.todayBrowseDetailCount;
    totalJobCountSource.value = statisticJobBrowseDTO.totalJob;
    const statisticCompany = await CompanyApi.statisticCompany();
    totalCompanyCountSource.value = statisticCompany.totalCompany;
    const statisticCompanyTag = await CompanyApi.statisticCompanyTag();
    totalTagCompanyCountSource.value = statisticCompanyTag.totalTagCompany;

    await todayJobSearch();

    loading.value = false;
};

const todayJobs = ref([]);

const todayJobSearch = async () => {
    let searchResult = await JobApi.searchJob(getSearchParam());
    todayJobs.value = searchResult.items;
}

function getSearchParam() {
    let searchParam = new SearchJobBO();
    searchParam.pageNum = 1
    searchParam.pageSize = 10;
    searchParam.orderByColumn = "latestBrowseDetailDatetime";
    searchParam.orderBy = "DESC";
    return searchParam;
}

const jobWebsiteList = [
    { url: "https://www.zhipin.com/web/geek/job", label: "BOSS直聘" },
    { url: "https://we.51job.com/pc/search ", label: "前程无忧" },
    { url: "https://sou.zhaopin.com/", label: "智联招聘" },
    { url: "https://www.lagou.com/wn/zhaopin", label: "拉钩网" },
    { url: "https://www.liepin.com/zhaopin", label: "猎聘网" },
    { url: "https://hk.jobsdb.com/", label: "Jobsdb-HK" },
]

const companyWebsiteList = [
    { url: "https://aiqicha.baidu.com/s", label: "爱企查" },
]


const map = ref();
const zoom = ref(10);
const todayJobsFilterEmptyLocation = computed(() => todayJobs.value.filter((item) => (item.jobLatitude && item.jobLongitude)))
const idAndPopupIndexMap = computed(() => {
    let result = new Map();
    let filtered = todayJobs.value.filter((item) => (item.jobLatitude && item.jobLongitude));
    filtered.forEach((element, index) => {
        result.set(element.jobId, index);
    });
    return result;
})
const onJobMapLocate = (item) => {
    let popUpIndex = idAndPopupIndexMap.value.get(item.jobId);
    let popUpObject = popups.value[popUpIndex];
    popUpObject.leafletObject.openOn(map.value.leafletObject);
    map.value.leafletObject.flyTo(popUpObject.latLng, 14);
}
const popups = ref([])
</script>

<style scoped>
.statistic {
    .el-col {
        text-align: center;
    }

    padding-top: 10px;
}

.el-row {}

.mapWrapper {
    margin-left: 10px;
    margin-right: 10px;
}

.icon {}

.mapIcon {
    width: 200px;
    background-color: lightgoldenrodyellow;
    padding: 5px;
    border-radius: 5px;
    border: 1px solid yellowgreen;
}
</style>