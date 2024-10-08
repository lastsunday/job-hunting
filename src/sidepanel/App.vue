<template>
  <div class="main">
    <div class="subMain">
      <el-menu :default-active="activeIndex" class="el-menu" mode="horizontal" :ellipsis="false" router="true"
        @select="handleSelect">
        <img class="logo" src="./assets/images/logo.png" alt="logo" />
        <div v-if="newVersion">
          <el-tag type="success">
            <div class="info" @click="dialogVisible = true">
              发现新版本
              <Icon icon="material-symbols:system-update-alt" width="15" height="15" />
            </div>
          </el-tag>
        </div>
        <div class="flex-grow" />
        <el-menu-item index="1" route="/">首页</el-menu-item>
        <el-menu-item index="2" route="/assistant">个人助理</el-menu-item>
        <el-menu-item index="3" route="/bbs">讨论区</el-menu-item>
        <el-sub-menu index="4">
          <template #title>数据</template>
          <el-menu-item index="4-1" route="/job">职位</el-menu-item>
          <el-menu-item index="4-2" route="/company">公司</el-menu-item>
          <el-menu-item index="4-3" route="/companyTag">公司标签</el-menu-item>
        </el-sub-menu>
        <el-menu-item index="5" route="/dataSharePlan">数据共享计划</el-menu-item>
        <el-menu-item index="6" route="/setting">设置</el-menu-item>
      </el-menu>
      <router-view />
      <el-backtop />
    </div>
  </div>
  <el-dialog v-if="newVersion" v-model="dialogVisible"
    :title="`发现新版本[${latestVersion}](${latestVersionCreatedAtString})`" width="800" :before-close="handleClose">
    <div v-html="latestChangelogContent"></div>
    <template #footer>
      <div class="dialog-footer">
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="onDownloadLatest">
          下载
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>
<script lang="ts" setup>
import { ref, onMounted } from "vue";
import { Icon } from '@iconify/vue';
import semver from "semver";
import { APP_URL_LATEST_VERSION } from "../common/config";
import { useRoute, useRouter } from 'vue-router';
import { useSystem } from "./hook/system";
import { marked } from "marked";
import dayjs from "dayjs";

const version = __APP_VERSION__;

const activeIndex = ref("1");
const handleSelect = (key: string, keyPath: string[]) => {
};

const newVersion = ref(false);
const router = useRouter();
const { queryVersion, checkNewVersion, downloadLatest } = useSystem();

const dialogVisible = ref(false);
const latestVersion = ref();
const latestVersionCreatedAt = ref();
const latestVersionCreatedAtString = ref();
const latestChangelogContent = ref();
const versionObject = ref();

onMounted(() => {
  queryVersion().then((value) => {
    versionObject.value = value;
    newVersion.value = checkNewVersion(value);
    latestVersion.value = value.tag_name;
    latestVersionCreatedAt.value = value.created_at;
    latestChangelogContent.value = marked.parse(value.body);
    latestVersionCreatedAtString.value = dayjs(value.created_at).format("YYYY-MM-DD");
  });
})

const onDownloadLatest = () => {
  downloadLatest(versionObject.value);
  dialogVisible.value = false;
}

</script>
<style lang="scss">
.main {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
}

.subMain {
  margin: 8px;
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow: hidden;
}

.el-menu {}

.flex-grow {
  flex-grow: 1;
}

.logo {
  height: 50px;
}

.info {
  display: flex;
  align-items: center;
  cursor: pointer;
}
</style>
