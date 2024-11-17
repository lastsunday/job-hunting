<template>
    <div class="mapIcon" :title="`${item.jobDescription}`">
        <el-row class="jobNameWrapper">
            <img class="logo" :src="platformLogo(item.jobPlatform)" alt="logo" />
            <el-text type="primary" line-clamp="1"> {{ item.jobName }}</el-text>
        </el-row>
        <el-row>
            <el-text line-clamp="1">💵{{ item.jobSalaryMin }} - 💵{{
                item.jobSalaryMax
                }}</el-text>
        </el-row>
        <el-row>
            <el-text line-clamp="1">{{ item.jobCompanyName }}</el-text>
        </el-row>
        <el-row>
            <div class="tag primary" v-for="(value, key, index) in item
                .jobTagDTOList">
                {{ value.tagName }}
            </div>
            <div class="tag warning" v-for="(value, key, index) in item
                .companyTagDTOList">
                {{ value.tagName }}
            </div>
        </el-row>
    </div>
</template>
<script lang="ts" setup>
import { onMounted, ref, computed } from "vue";
import { JobDTO } from "../../common/data/dto/jobDTO";
import dayjs from "dayjs";
import { useJob } from "../hook/job";

const { platformLogo } = useJob()

const props = defineProps({
    item: JobDTO,
});
const item = ref({});
item.value = props.item;

</script>
<style lang="scss" scoped>
.mapIcon {
    width: 200px;
    background-color: lightgoldenrodyellow;
    padding: 5px;
    border-radius: 5px;
    border: 1px solid yellowgreen;
}

.logo {
    width: 15px;
    height: 15px;
    margin-right: 2px;
}

.jobNameWrapper {
    flex-wrap: nowrap;
    align-items: center;
}

.tag {
    --el-tag-font-size: 12px;
    --el-tag-border-radius: 4px;
    --el-tag-border-radius-rounded: 9999px;
    align-items: center;
    background-color: var(--el-tag-bg-color);
    border-color: var(--el-tag-border-color);
    border-radius: var(--el-tag-border-radius);
    border-style: solid;
    border-width: 1px;
    box-sizing: border-box;
    color: var(--el-tag-text-color);
    display: inline-flex;
    font-size: var(--el-tag-font-size);
    height: 24px;
    justify-content: center;
    line-height: 1;
    padding: 0 9px;
    vertical-align: middle;
    white-space: nowrap;
    --el-icon-size: 14px;
}

.primary {
    --el-tag-text-color: var(--el-color-primary);
    --el-tag-bg-color: var(--el-color-primary-light-9);
    --el-tag-border-color: var(--el-color-primary-light-8);
    --el-tag-hover-color: var(--el-color-primary);
}

.warning {
    --el-tag-text-color: var(--el-color-warning);
    --el-tag-bg-color: var(--el-color-warning-light-9);
    --el-tag-border-color: var(--el-color-warning-light-8);
    --el-tag-hover-color: var(--el-color-warning);
}
</style>
