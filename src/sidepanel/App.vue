<template>
  <div class="main">
    <div class="subMain">
      <el-menu :default-active="activeIndex" class="el-menu" mode="horizontal" :ellipsis="false" router="true"
        @select="handleSelect">
        <img class="logo" src="./assets/images/logo.png" alt="logo" />
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
        <el-menu-item index="5" route="/setting">设置</el-menu-item>
      </el-menu>
      <router-view />
      <el-backtop />
    </div>
  </div>
</template>
<script lang="ts" setup>
import { ref } from "vue";

const activeIndex = ref("1");
const handleSelect = (key: string, keyPath: string[]) => {

};
</script>
<style lang="scss">
.main {
  display: flex;
  flex-direction: column;
  width:100%;
  height:100%; 
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
</style>
