<template>
    <div class="main">
        <div v-if="item.isCreateByToday" class="newBadge">
            <el-tooltip effect="customized" content="今日新发现" placement="top-start">
                <Icon icon="foundation:burst-new" width="45" height="45" />
            </el-tooltip>
        </div>
        <div class="top">
            <div class="jobName">
                <el-popover placement="right" :width="800" trigger="click">
                    <template #reference>
                        <el-link type="primary">
                            <Icon icon="hugeicons:permanent-job" /> {{ item.jobName }}
                        </el-link>
                    </template>
                    <el-descriptions class="margin-top" :column="3" size="small" border>
                        <el-descriptions-item>
                            <template #label>
                                <div class="cell-item">名称</div>
                            </template>
                            <a :href="item.jobUrl" target="_blank" :title="item.jobUrl">
                                {{ item.jobName }}
                            </a>
                        </el-descriptions-item>
                        <el-descriptions-item>
                            <template #label>
                                <div class="cell-item">学历</div>
                            </template>
                            {{ item.jobDegreeName }}
                        </el-descriptions-item>
                        <el-descriptions-item>
                            <template #label>
                                <div class="cell-item">招聘平台</div>
                            </template>
                            {{ item.jobPlatform }}
                        </el-descriptions-item>
                        <el-descriptions-item>
                            <template #label>
                                <div class="cell-item">公司</div>
                            </template>
                            {{ item.jobCompanyName }}
                        </el-descriptions-item>
                        <el-descriptions-item>
                            <template #label>
                                <div class="cell-item">薪资</div>
                            </template>
                            {{ item.jobSalaryMin }}-{{ item.jobSalaryMax }}
                        </el-descriptions-item>
                        <el-descriptions-item>
                            <template #label>
                                <div class="cell-item">招聘人</div>
                            </template>
                            {{ item.bossName }}【 {{ item.bossPosition }} 】
                        </el-descriptions-item>
                        <el-descriptions-item>
                            <template #label>
                                <div class="cell-item">工作地址</div>
                            </template>
                            {{ item.jobAddress }}
                        </el-descriptions-item>
                        <el-descriptions-item>
                            <template #label>
                                <div class="cell-item">经度</div>
                            </template>
                            {{ item.jobLongitude }}
                        </el-descriptions-item>
                        <el-descriptions-item>
                            <template #label>
                                <div class="cell-item">纬度</div>
                            </template>
                            {{ item.jobLatitude }}
                        </el-descriptions-item>
                    </el-descriptions>
                    <el-descriptions class="margin-top" :column="1" size="small" border direction="vertical">
                        <el-descriptions-item>
                            <template #label>
                                <div class="cell-item">公司标签</div>
                            </template>
                            <div>
                                <el-text v-if="
                                    item.companyTagDTOList &&
                                    item.companyTagDTOList.length > 0
                                " class="tagItem">
                                    <el-tag v-for="(value, key, index) in item
                                        .companyTagDTOList" type="warning">
                                        <el-link v-if="value.sourceUrl" :href="value.sourceUrl" target="_blank">
                                            <Icon icon="mdi:tag" />{{
                                                value.tagName
                                            }}
                                        </el-link>
                                        <div v-else>
                                            <Icon icon="mdi:tag" />{{ value.tagName }}
                                        </div>
                                    </el-tag>
                                </el-text>
                                <el-text v-else>-</el-text>
                            </div>
                        </el-descriptions-item>
                    </el-descriptions>
                    <el-input class="desc" type="textarea" v-model="item.jobDescription" :rows="20"></el-input>
                </el-popover>
            </div>
            <div class="salary">{{ item.jobSalaryMin }}-{{ item.jobSalaryMax }}</div>
        </div>
        <div class="middle" v-if="item.companyTagDTOList?.length > 0">
            <div class="tag">
                <el-text v-if="
                    item.companyTagDTOList &&
                    item.companyTagDTOList.length > 0
                " class="tagItem">
                    <el-tag v-for="(value, key, index) in item
                        .companyTagDTOList" type="warning" size="small" effect="plain">
                        <el-link v-if="value.sourceUrl" :href="value.sourceUrl" target="_blank">
                            <Icon icon="mdi:tag" />{{
                                value.tagName
                            }}
                        </el-link>
                        <div v-else>
                            <Icon icon="mdi:tag" />{{ value.tagName }}
                        </div>
                    </el-tag>
                </el-text>
            </div>
        </div>
        <div class="bottom">
            <div class="info">
                <div v-if="!item.companyDTO">
                    <el-link type="warning"
                        :href="`https://aiqicha.baidu.com/s?q=${encodeURIComponent(item.jobCompanyName)}`"
                        target="_blank">
                        <Icon icon="ph:question" />
                        <Icon icon="mdi:company" /> {{ item.jobCompanyName }}
                    </el-link>
                </div>
                <el-popover v-else placement="right" :width="800" trigger="click">
                    <template #reference>
                        <el-link type="warning">
                            <Icon icon="mdi:company" /> {{ item.jobCompanyName }}
                        </el-link>
                    </template>
                    <el-descriptions class="margin-top" :column="4" size="small" border>
                        <el-descriptions-item>
                            <template #label>
                                <div class="cell-item">公司全称</div>
                            </template>
                            <el-link type="primary" :href="item.companyDTO.sourceUrl" target="_blank">
                                {{ item.companyDTO.companyName }}
                            </el-link>
                        </el-descriptions-item>
                        <el-descriptions-item>
                            <template #label>
                                <div class="cell-item">经营状态</div>
                            </template>
                            {{ item.companyDTO.companyStatus }}
                        </el-descriptions-item>
                        <el-descriptions-item>
                            <template #label>
                                <div class="cell-item">成立时间</div>
                            </template>
                            {{ datetimeFormat(item.companyDTO.companyStartDate) }}
                        </el-descriptions-item>
                        <el-descriptions-item>
                            <template #label>
                                <div class="cell-item">所属行业</div>
                            </template>
                            {{ item.companyDTO.companyIndustry }}
                        </el-descriptions-item>
                        <el-descriptions-item>
                            <template #label>
                                <div class="cell-item">统一社会信用代码</div>
                            </template>
                            {{ item.companyDTO.companyUnifiedCode }}
                        </el-descriptions-item>
                        <el-descriptions-item>
                            <template #label>
                                <div class="cell-item">纳税人识别号</div>
                            </template>
                            {{ item.companyDTO.companyTaxNo }}
                        </el-descriptions-item>
                        <el-descriptions-item>
                            <template #label>
                                <div class="cell-item">工商注册号</div>
                            </template>
                            {{ item.companyDTO.companyLicenseNumber }}
                        </el-descriptions-item>
                        <el-descriptions-item>
                            <template #label>
                                <div class="cell-item">法人</div>
                            </template>
                            {{ item.companyDTO.companyLegalPerson }}
                        </el-descriptions-item>
                        <el-descriptions-item>
                            <template #label>
                                <div class="cell-item">官网</div>
                            </template>
                            <el-link v-if="item.companyDTO.companyWebSite != '-'"
                                :href="'http://' + item.companyDTO.companyWebSite" target="_blank">{{
                                    item.companyDTO.companyWebSite }}</el-link>
                            <el-text v-else>-</el-text>
                        </el-descriptions-item>
                        <el-descriptions-item>
                            <template #label>
                                <div class="cell-item">社保人数</div>
                            </template>
                            {{ item.companyDTO.companyInsuranceNum }}
                        </el-descriptions-item>
                        <el-descriptions-item>
                            <template #label>
                                <div class="cell-item">自身风险数</div>
                            </template>
                            {{ item.companyDTO.companySelfRisk }}
                        </el-descriptions-item>
                        <el-descriptions-item>
                            <template #label>
                                <div class="cell-item">关联风险数</div>
                            </template>
                            {{ item.companyDTO.companyUnionRisk }}
                        </el-descriptions-item>
                        <el-descriptions-item>
                            <template #label>
                                <div class="cell-item">地址</div>
                            </template>
                            {{ item.companyDTO.companyAddress }}
                        </el-descriptions-item>
                        <el-descriptions-item>
                            <template #label>
                                <div class="cell-item">经度</div>
                            </template>
                            {{ item.companyDTO.companyLongitude }}
                        </el-descriptions-item>
                        <el-descriptions-item>
                            <template #label>
                                <div class="cell-item">纬度</div>
                            </template>
                            {{ item.companyDTO.companyLatitude }}
                        </el-descriptions-item>
                    </el-descriptions>
                    <el-descriptions class="margin-top" :column="1" size="small" border direction="vertical">
                        <el-descriptions-item>
                            <template #label>
                                <div class="cell-item">标签</div>
                            </template>
                            <div>
                                <el-text v-if="item.companyDTO.tagNameArray.length > 0" class="compang_tag">
                                    <el-tag v-for="(value, key, index) in item.companyDTO.tagNameArray"
                                        type="primary">{{ value
                                        }}</el-tag>
                                </el-text>
                                <el-text v-else>-</el-text>
                            </div>
                        </el-descriptions-item>
                    </el-descriptions>
                    <el-descriptions class="margin-top" :column="1" size="small" border direction="vertical">
                        <el-descriptions-item>
                            <template #label>
                                <div class="cell-item">经营范围</div>
                            </template>
                            {{ item.companyDTO.companyScope }}
                        </el-descriptions-item>
                    </el-descriptions>
                </el-popover>
            </div>
            <div class="address">
                <div class="label">{{ item.jobAddress }}</div>
                <el-link v-if="item.jobLongitude && item.jobLatitude" type="primary" @click="emits('mapLocate')">
                    <Icon icon="mdi:location" />定位
                </el-link>
            </div>
            <div class="publish">
                <div class="timeTag" :style="getTimeTagStyle(item.jobFirstPublishDatetime)" size="small" effect="plain">
                    <div v-if="item.jobFirstPublishDatetime">
                        <Icon icon="fluent-mdl2:date-time-2" />{{
                            convertTimeOffsetToHumanReadable(item.jobFirstPublishDatetime) }}发布
                    </div>
                    <div v-else>
                        <Icon icon="mdi:tag" />发布时间未知
                    </div>
                </div>
                <div class="platform">
                    {{ platformFormat(item.jobPlatform) }}
                </div>
            </div>
        </div>
    </div>
</template>
<script lang="ts" setup>
import { onMounted, ref, computed } from "vue";
import { JobDTO } from "../../common/data/dto/jobDTO";
import { Icon } from "@iconify/vue";
import { convertTimeOffsetToHumanReadable } from "../../common/utils"
import dayjs from "dayjs";
import { useJob } from "../hook/job";
import { getUrlByTagAndCompanyName } from "../../common"

const { platformFormat } = useJob()

const props = defineProps({
    item: JobDTO,
});
const emits = defineEmits(["mapLocate"]);
const item = ref({});
item.value = props.item;

const isToday = (value: string | Date) => {
    return dayjs().startOf("day").isSame(dayjs(value).startOf("day"));
}

onMounted(async () => {
    if (item.value.companyTagDTOList && item.value.companyTagDTOList.length > 0) {
        item.value.companyTagDTOList.forEach(item => {
            item.sourceUrl = getSourceUrl(item.tagName, item.companyName);
        });
    }
    item.value.isCreateByToday = isToday(item.value.createDatetime);
})

const getSourceUrl = (tagName, companyName) => {
    return getUrlByTagAndCompanyName(tagName, companyName);
}

const getTimeTagStyle = (datetime) => {
    return `background-color:${getTimeColorByOffsetTimeDay(datetime)};`
}

const getTimeColorByOffsetTimeDay = (datetime) => {
    let offsetTimeDay = -1;
    if (datetime) {
        offsetTimeDay = dayjs().diff(dayjs(datetime), "day");
    }
    if (offsetTimeDay >= 0) {
        if (offsetTimeDay <= 7) {
            return "yellowgreen";
        } else if (offsetTimeDay <= 14) {
            return "green";
        } else if (offsetTimeDay <= 28) {
            return "orange";
        } else if (offsetTimeDay <= 56) {
            return "red";
        } else {
            return "gray";
        }
    } else {
        return "black";
    }
}

const datetimeFormat = computed(() => {
    return function (value: string) {
        return dayjs(value).isValid() ? dayjs(value).format("YYYY-MM-DD") : "-";
    };
});
</script>
<style lang="css" scoped>
.main {
    position: relative;
    display: flex;
    flex-direction: column;
    /*By default, when using flexbox, the padding property is not included in the calculation of the element's width or height. To include the padding in the calculation, you can set the box-sizing property to border-box. */
    box-sizing: border-box;
    padding: 15px;
    padding-bottom: 10px;
    border: 1px solid black;
    margin-top: 10px;
    border-radius: 5px;
    border: 1px solid yellowgreen;
    min-width: 330px;
    font-size: 12px;
}

.publish {
    padding-top: 10px;
    display: flex;
    justify-content: space-between;

    .platform {
        color: gray;
    }
}

.timeTag {
    display: flex;
    align-items: center;
    padding: 5px;
    padding-left: 5px;
    padding-right: 5px;
    border-radius: 5px;
    color: white;
    line-height: 0px;
}

.top {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    font-size: 16px;
    align-items: center;
}

.middle {}

.bottom {
    display: flex;
    flex-direction: column;
    padding-top: 10px;
}

.info {
    display: flex;
    justify-content: space-between;
}

.jobName {
    width: 210px;
}

.salary {
    color: var(--el-color-primary);
    font-size: 20px;
}

.tag {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    max-width: 320px;
    padding-top: 10px;
}

.tagItem {
    padding: 2px;
}

.address {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    padding-top: 10px;

    .label {
        max-width: 260px;
    }
}

.newBadge {
    position: absolute;
    right: -7px;
    top: -17px;
    color: darkcyan;
}
</style>

<style lang="css">
.el-textarea__inner {
    scrollbar-width: thin;
}

.el-popper.is-customized {
    /* Set padding to ensure the height is 32px */
    padding: 6px 12px;
    background: darkcyan;
    color: white;
}

.el-popper.is-customized .el-popper__arrow::before {
    background: darkcyan;
    right: 0;
    color: white;
}
</style>