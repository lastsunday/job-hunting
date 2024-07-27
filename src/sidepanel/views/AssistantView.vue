<template>
  <el-row ref="statisticRef" v-loading="loading" class="statistic">
    <el-col :span="12">
      <el-statistic title="今天偏好职位发现数" :value="todayFaviousJobCount" />
    </el-col>
    <el-col :span="12">
      <el-statistic title="偏好职位总数" :value="totalFaviousJob" />
    </el-col>
  </el-row>
  <el-divider content-position="right" class="divider">
    <el-tooltip content="帮助">
      <Icon icon="ph:question" class="icon" @click="tourOpen = true" />
    </el-tooltip>
    <el-tour v-model="tourOpen">
      <el-tour-step :target="statisticRef?.$el" title="统计">
        <el-row>
          <el-text>统计偏好职位的数量</el-text>
        </el-row>
      </el-tour-step>
      <el-tour-step :target="favoriteMenuRef" title="职位偏好">
        <el-row>
          <el-text>设置职位偏好，查看感兴趣的职位</el-text>
        </el-row>
      </el-tour-step>
    </el-tour>
  </el-divider>
  <div class="content">
    <el-tabs tab-position="left" class="tabs">
      <el-tab-pane class="tab_panel">
        <template #label>
          <div ref="favoriteMenuRef">
            <Icon icon="fluent-emoji-flat:red-heart" />
            <span>职位偏好</span>
          </div>
        </template>
        <FavoriteJobView></FavoriteJobView>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script lang="ts" setup>
import {
  onMounted,
  ref,
  onUnmounted,
} from "vue";
import FavoriteJobView from "./assistant/FavoriteJobView.vue";
import { Icon } from "@iconify/vue";
import { useTransition } from "@vueuse/core";
import { AssistantApi } from "../../common/api/index";

const loading = ref(false);
const tourOpen = ref(false);

const statisticRef = ref();
const favoriteMenuRef = ref();

const todayFaviousJobCountSource = ref(0);
const todayFaviousJobCount = useTransition(todayFaviousJobCountSource, {
  duration: 1000,
});
const totalFaviousJobSource = ref(0);
const totalFaviousJob = useTransition(totalFaviousJobSource, {
  duration: 1000,
});

let refreshIntervalId = null;

onMounted(async () => {
  await refresh();
  refreshIntervalId = setInterval(refresh, 10000);
})

const refresh = async () => {
  loading.value = true;
  let result = await AssistantApi.assistantStatistic();
  todayFaviousJobCountSource.value = result.todayFaviousJobCount
  totalFaviousJobSource.value = result.totalFaviousJob
  loading.value = false;
};

onUnmounted(() => {
  if (refreshIntervalId) {
    clearInterval(refreshIntervalId);
    refreshIntervalId = null;
  }
});


</script>

<style scoped>
.statistic {
  .el-col {
    text-align: center;
  }

  padding-top: 10px;
}

.content {
  display: flex;
  flex-direction: row;
  flex: 1;
  overflow: hidden;
  width: 100%;
}

.divider {
  margin: 16px;
}

.icon {
  cursor: pointer;
  width: 24px;
  height: 24px;
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
</style>
