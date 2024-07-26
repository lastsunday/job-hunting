<template>
    <div class="main">
        <div class="top">
            <div class="jobName">{{ item.jobName }}</div>
            <div class="salary">{{ item.jobSalaryMin }}-{{ item.jobSalaryMax }}</div>
        </div>
        <div class="middle">
            <div class="tag">
                <div class="tagItem" v-for="(item, index) in item.companyTagDTOList">
                    <el-tag type="warning" size="small" effect="plain">
                        <Icon icon="mdi:tag" />{{ item.tagName }}
                    </el-tag>
                </div>
            </div>
        </div>
        <div class="bottom">
            <div class="info">
                <div>{{ item.jobCompanyName }}</div>
                <el-popover placement="right" :width="800" trigger="click">
                    <template #reference>
                        <el-link type="primary">
                            <Icon icon="material-symbols:description-outline" />职位描述
                        </el-link>
                    </template>
                    <el-input type="textarea" v-model="item.jobDescription" :rows="20"></el-input>
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
<script setup>
import { onMounted, ref, defineEmits } from "vue";
import { JobDTO } from "../../common/data/dto/jobDTO";
import { Icon } from "@iconify/vue";
import { convertTimeOffsetToHumanReadable } from "../../common/utils"
import dayjs from "dayjs";
import { useJob } from "../hook/job";

const { platformFormat } = useJob()

const props = defineProps({
    item: JobDTO,
});
const emits = defineEmits(["mapLocate"]);
const item = ref({});
item.value = props.item;

onMounted(async () => {

})

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
    padding: 2px;
    padding-left: 5px;
    padding-right: 5px;
    border-radius: 5px;
    color: white;
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
    max-width: 230px;
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
</style>