<template>
    <div :title="`${item.jobDescription}`">
        <el-row>
            <el-text line-clamp="1">职位名：
                <a :href="item.jobUrl" target="_blank">{{ item.jobName }}</a>
            </el-text>
        </el-row>
        <el-row>
            <el-text line-clamp="1">发布时间：{{
                datetimeFormat(item.jobFirstPublishDatetime)
            }}</el-text>
        </el-row>
        <el-row>
            <el-text line-clamp="1">薪资：💵{{ item.jobSalaryMin }} - 💵{{
                item.jobSalaryMax
            }}</el-text>
        </el-row>
        <el-row>
            <el-text line-clamp="1">学历：{{ item.jobDegreeName }}</el-text>
        </el-row>
        <el-row>
            <el-text line-clamp="1">招聘平台：{{
                platformFormat(item.jobPlatform)
            }}</el-text>
        </el-row>
        <el-row>
            <el-text line-clamp="1">地址：{{ item.jobAddress }}</el-text>
        </el-row>
        <el-row>
            <el-text line-clamp="1">公司名：{{ item.jobCompanyName }}</el-text>
        </el-row>
        <el-row v-if="
            item.jobTagDTOList && item.jobTagDTOList.length > 0
        ">
            <el-text line-clamp="1">职位标签({{ item.jobTagDTOList.length }})：</el-text>
            <el-text class="tagItem" v-for="(item, index) in item.jobTagDTOList">
                <el-tag type="primary">
                    <Icon icon="mdi:tag" />{{ item.tagName }}
                </el-tag>
            </el-text>
        </el-row>
        <el-row v-if="
            item.companyTagDTOList && item.companyTagDTOList.length > 0
        ">
            <el-text line-clamp="1">公司标签({{ item.companyTagDTOList.length }})：</el-text>
            <el-text class="tagItem" v-for="(item, index) in item.companyTagDTOList">
                <el-tag type="warning">
                    <Icon icon="mdi:tag" />{{ item.tagName }}
                </el-tag>
            </el-text>
        </el-row>
    </div>
</template>
<script lang="ts" setup>
import { onMounted, ref, computed } from "vue";
import { JobDTO } from "../../common/data/dto/jobDTO";
import dayjs from "dayjs";
import { useJob } from "../hook/job";

const { platformFormat, platformLogo } = useJob()

const props = defineProps({
    item: JobDTO,
});
const item = ref({});
item.value = props.item;

const datetimeFormat = computed(() => {
    return function (value: string) {
        return dayjs(value).isValid() ? dayjs(value).format("YYYY-MM-DD") : "-";
    };
});

</script>
<style lang="css" scoped></style>
