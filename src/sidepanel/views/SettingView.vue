<template>
  <div class="content">
    <el-row justify="end">
      <div class="menu">
        <el-switch v-model="devMode" active-text="开发者模式" inactive-text="普通模式" inline-prompt />
        <el-tooltip v-if="!devMode" content="帮助">
          <Icon icon="ph:question" class="icon" @click="tourOpen = true" />
        </el-tooltip>
        <el-tour v-if="!devMode" v-model="tourOpen">
          <el-tour-step :target="githubRef?.$el" title="GitHub登录">
            <el-row>
              <el-text>1.显示当前GitHub账号的登录状态</el-text>
            </el-row>
            <el-row>
              <el-text>2.登录按钮进行登录，登录后可查看公司（职位）评论</el-text>
            </el-row>
            <el-row>
              <el-text>3.登出按钮进行登出，清除本地保存的token信息</el-text>
            </el-row>
          </el-tour-step>
          <el-tour-step :target="githubAppRef?.$el" title="GitHub App">
            <el-row>
              <el-text>1.安装GitHub App，跳转到GitHub App安装页面，授权后获得评论、数据共享计划能力</el-text>
            </el-row>
            <el-row>
              <el-text>2.如果已安装，则会跳转到GitHub App配置页面</el-text>
            </el-row>
          </el-tour-step>
          <el-tour-step :target="databaseRef?.$el" title="数据库">
            <el-row>
              <el-text>1.数据库备份，将程序的数据库(sqlite)文件压缩成zip后，以下载文件的方式呈现</el-text>
            </el-row>
            <el-row>
              <el-text>2.数据库恢复，接受程序备份的数据库(sqlite)文件，执行恢复后程序的数据将被覆盖</el-text>
            </el-row>
          </el-tour-step>
          <el-tour-step :target="jobRef?.$el" title="职位数据">
            <el-row>
              <el-text>1.全量职位数据导出，将全部职位数据导出成excel文件，以下载文件的方式呈现</el-text>
            </el-row>
            <el-row>
              <el-text>2.职位数据导入，接受程序导出的职位数据excel文件或符合格式的excel文件，执行导入后，相同职位的数据会被覆盖</el-text>
            </el-row>
          </el-tour-step>
          <el-tour-step :target="companyRef?.$el" title="公司数据">
            <el-row>
              <el-text>1.全量公司数据导出，将全部公司数据导出成excel文件，以下载文件的方式呈现</el-text>
            </el-row>
            <el-row>
              <el-text>2.公司数据导入，接受程序导出的公司数据excel文件或符合格式的excel文件，执行导入后，相同公司的数据会被覆盖</el-text>
            </el-row>
          </el-tour-step>
          <el-tour-step :target="companyTagRef?.$el" title="公司标签数据">
            <el-row>
              <el-text>1.全量公司标签数据导出，将全部公司标签数据导出成excel文件，以下载文件的方式呈现</el-text>
            </el-row>
            <el-row>
              <el-text>2.公司标签数据导入，接受程序导出的公司标签数据excel文件或符合格式的excel文件，执行导入后，相同公司的数据会被覆盖</el-text>
            </el-row>
          </el-tour-step>
          <el-tour-step :target="infoRef?.$el" title="程序信息">
            <el-row>
              <el-text>显示程序的版本和其他操作</el-text>
            </el-row>
          </el-tour-step>
        </el-tour>
      </div>
    </el-row>
    <div v-if="devMode">
      <el-form :model="form" label-width="auto" :inline="true">
        <el-form-item label="开发者令牌">
          <el-input type="password" show-password v-model="form.developerToken" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="onSubmit">保存</el-button>
          <el-button @click="onReset">恢复</el-button>
        </el-form-item>
      </el-form>
      <el-row>
        <el-col :span="24" class="trafficWrapper">
          <TrafficChart v-model="trafficClone" title="Git clones" firstYAxisTitle="Clones" v-loading="cloneLoading"
            secondYAxisTitle="Unique cloners"></TrafficChart>
        </el-col>
        <el-col :span="24" class="trafficWrapper">
          <TrafficChart v-model="trafficViews" title="Visitors" firstYAxisTitle="Views" v-loading="viewLoading"
            secondYAxisTitle="Unique visitors"></TrafficChart>
        </el-col>
        <el-col :sm="24" :md="12" class="trafficWrapper">
          <TrafficTable v-model="trafficPopularReferrers" title="Referring sites" v-loading="popularReferrersLoading"
            :columnTitleArray="popularReferrersColumnTitleArray"></TrafficTable>
        </el-col>
        <el-col :sm="24" :md="12" class="trafficWrapper">
          <TrafficTable v-model="trafficPopularPaths" title="Popular content" v-loading="popularPathsLoading"
            :columnTitleArray="popularPathsColumnTitleArray"></TrafficTable>
        </el-col>
      </el-row>
    </div>
    <div v-if="!devMode">
      <el-row ref="githubRef" class="setting_item">
        <el-descriptions title="GitHub登录">
          <el-descriptions-item>
            <div class="loginStatus">
              <div v-if="login">
                <el-avatar :size="50" :src="avatar" />
              </div>
              <div>
                <div>
                  <el-text v-if="login">{{ username }}</el-text>
                </div>
                <div>
                  <el-text>登录状态：</el-text>
                  <el-text v-if="login" type="success">在线</el-text>
                  <el-text v-else type="warning">离线</el-text>
                </div>
              </div>
            </div>
            <el-button v-if="!login" @click="onClickLogin">
              <el-icon class="el-icon--left">
                <Icon icon="mdi:github" />
              </el-icon>
              登录</el-button>
            <el-popconfirm v-else title="确定登出？" @confirm="onClickLogout" confirm-button-text="确定"
              cancel-button-text="取消">
              <template #reference>
                <el-button>
                  <el-icon class="el-icon--left">
                    <Icon icon="mdi:github" />
                  </el-icon>
                  登出</el-button>
              </template>
            </el-popconfirm>
          </el-descriptions-item>
        </el-descriptions>
      </el-row>
      <el-row ref="githubAppRef" class="setting_item">
        <el-descriptions title="GitHub App">
          <el-descriptions-item>
            <el-tooltip v-if="login" content="安装GitHubApp获得评论、数据共享计划能力" placement="top">
              <el-button @click="onClickInstallAndLogin">
                <el-icon class="el-icon--left">
                  <Icon icon="mdi:github" />
                </el-icon>
                安装GitHubApp获得评论、数据共享计划能力<el-icon class="el-icon--left">
                  <Icon icon="ph:question" />
                </el-icon></el-button>
            </el-tooltip>
            <el-tooltip v-if="!login" content="安装GitHubApp获得评论、数据共享计划能力" placement="top">
              <el-button @click="onClickInstallAndLogin">
                <el-icon class="el-icon--left">
                  <Icon icon="mdi:github" />
                </el-icon>
                安装GitHubApp并登录<el-icon class="el-icon--left">
                  <Icon icon="ph:question" />
                </el-icon></el-button>
            </el-tooltip>
            <el-row>
              <el-text type="warning">注意：Github App要求的授权：</el-text>
              <el-link type="primary" target="_blank"
                href="https://docs.github.com/rest/overview/permissions-required-for-github-apps#repository-permissions-for-administration">Administration
                <Icon icon="mingcute:warning-line" />
              </el-link>
              <el-link type="primary" target="_blank"
                href="https://docs.github.com/rest/overview/permissions-required-for-github-apps#repository-permissions-for-issues">Issues
                <Icon icon="mingcute:warning-line" />
              </el-link>
              <el-link type="primary" target="_blank"
                href="https://docs.github.com/rest/overview/permissions-required-for-github-apps#repository-permissions-for-contents">Contents
                <Icon icon="mingcute:warning-line" />
              </el-link>
              <el-link type="primary" target="_blank"
                href="https://docs.github.com/rest/overview/permissions-required-for-github-apps#repository-permissions-for-metadata">Metadata
                <Icon icon="mingcute:warning-line" />
              </el-link>
            </el-row>

          </el-descriptions-item>
        </el-descriptions>
      </el-row>
      <el-row ref="databaseRef" class="setting_item">
        <el-descriptions title="数据库">
          <el-descriptions-item>
            <el-popconfirm title="确认备份数据？" @confirm="onClickDbExport" confirm-button-text="确定" cancel-button-text="取消">
              <template #reference>
                <el-button :icon="DocumentCopy" :loading="exportLoading">数据库备份</el-button>
              </template>
            </el-popconfirm>
            <el-button :icon="CopyDocument" @click="importDialogVisible = true">数据库恢复</el-button>
          </el-descriptions-item>
        </el-descriptions>
      </el-row>
      <DataBackupRestore ref="jobRef" title="职位" :get-excel-json-array-function="getJobDataToExcelJsonArray"
        :file-header="JOB_FILE_HEADER" :save-data-function="saveJobData" />
      <DataBackupRestore ref="companyRef" title="公司" :get-excel-json-array-function="getCompanyDataToExcelJsonArray"
        :file-header="COMPANY_FILE_HEADER" :save-data-function="saveCompanyData" />
      <DataBackupRestore ref="jobTagRef" title="职位标签" :get-excel-json-array-function="getJobTagDataToExcelJsonArray"
        :file-header="JOB_TAG_FILE_HEADER" :save-data-function="saveJobTagData" />
      <DataBackupRestore ref="companyTagRef" title="公司标签"
        :get-excel-json-array-function="getCompanyTagDataToExcelJsonArray" :file-header="COMPANY_TAG_FILE_HEADER"
        :save-data-function="saveCompanyTagData" />
      <el-row ref="infoRef" class="setting_item">
        <el-descriptions title="程序信息">
          <el-descriptions-item>
            <el-row>
              <el-col>
                <el-text type="primary" size="large">版本 {{ version }}</el-text>
                <el-text v-if="!newVersion" class="checkingVersion" @click="onCheckVersion" type="info">({{
                  checkingVersionText }})</el-text>
                <span v-if="!versionChecking">
                  <span v-if="newVersion">
                    <el-text class="newVersion" type="warning">(发现新版本[{{
                      latestVersion }}]({{ dayjs(latestVersionCreatedAt).format("YYYY-MM-DD") }}))</el-text>
                    <el-button @click="latestChangelogDialogVisible = true" type="primary" plain>
                      <el-icon class="el-icon--left">
                        <Icon icon="mdi:note" />
                      </el-icon>
                      查看新版本详情
                    </el-button>
                    <el-button @click="onDownloadLatest" type="primary" plain>
                      <el-icon class="el-icon--left">
                        <Icon icon="mdi:download" />
                      </el-icon>下载新版本
                    </el-button>
                    <el-text v-if="!newVersion" type="success">(已是最新版本)</el-text>
                  </span>
                </span>
              </el-col>
              <el-col class="appInfoOperation">
                <el-button @click="updateAppDialogVisible = true">
                  如何更新程序版本<el-icon class="el-icon--right">
                    <Icon icon="ph:question" />
                  </el-icon>
                </el-button>
                <el-button @click="changelogDialogVisible = true">
                  版本说明
                </el-button>
                <el-button @click="licenseDialogVisible = true">
                  许可证
                </el-button>
                <el-button @click="onAccessHomePage">访问主页</el-button>
                <el-button @click="onAccessIssuesPage">
                  问题反馈
                </el-button>
              </el-col>
            </el-row>
          </el-descriptions-item>
        </el-descriptions>
      </el-row>
    </div>
  </div>
  <el-dialog v-model="importDialogVisible" title="数据恢复" width="500">
    <div>
      <el-text class="mx-1" type="danger">注意：原数据会被清除!!!</el-text>
    </div>
    <div>
      <el-text class="mx-1" type="info">请选择备份文件</el-text>
    </div>
    <template #footer>
      <div class="dialog-footer">
        <el-row>
          <input type="file" accept=".zip" ref="importFileInput" @change="handleFileImport" />
        </el-row>
        <el-row class="dialog_menu">
          <el-button type="primary" @click="confirmFileImport" :loading="importLoading">
            确定
          </el-button>
        </el-row>
      </div>
    </template>
  </el-dialog>
  <el-dialog v-model="reloadDialogVisible" title="数据恢复成功" width="500" :close-on-click-modal="false"
    :close-on-press-escape="false" :show-close="false">
    <span>点击确定按钮重启程序</span>
    <template #footer>
      <el-row class="dialog_menu">
        <el-button type="primary" @click="reloadExtension"> 确定 </el-button>
      </el-row>
    </template>
  </el-dialog>
  <el-dialog v-model="updateAppDialogVisible" title="如何更新程序版本" width="800">
    <div>
      <el-text>1.下载新版本程序安装文件（zip格式文件）</el-text>
    </div>
    <div>
      <el-text>2.解压程序安装文件</el-text>
    </div>
    <div>
      <el-text>3.访问 chrome://extensions/ 地址，点击加载已解压的扩展程序，选择解压后 manifest.json 文件所在的目录</el-text>
    </div>
    <div>
      <el-text>4.ID为【{{ APP_ID }}】的程序版本为新版本，即更新成功</el-text>
    </div>
  </el-dialog>
  <el-dialog v-model="changelogDialogVisible" title="版本说明" width="800">
    <div v-html="changelogContentHtml"></div>
  </el-dialog>
  <el-dialog v-model="licenseDialogVisible" title="许可证" width="800">
    <div v-html="licenseContent"></div>
  </el-dialog>
  <el-dialog v-model="latestChangelogDialogVisible" title="版本更新详情" width="800">
    <div v-html="latestChangelogContent"></div>
  </el-dialog>
</template>
<script lang="ts" setup>
import { ref, onMounted, watch, reactive } from "vue";
import dayjs from "dayjs";
import { dbExport, dbImport } from "../../common/api/common";
import { base64ToBytes, bytesToBase64 } from "../../common/utils/base64.js";
import { ElMessage, ElLoading } from "element-plus";
import { DocumentCopy, CopyDocument } from "@element-plus/icons-vue";
import { CompanyApi, AuthApi, UserApi, JobApi, DeveloperApi } from "../../common/api/index";
import { SearchCompanyTagBO } from "../../common/data/bo/searchCompanyTagBO";
import { SearchCompanyBO } from "../../common/data/bo/searchCompanyBO";
import { Icon } from '@iconify/vue';
import { marked } from "marked";
import { APP_ID } from "../../common/config";
import { SearchJobBO } from "../../common/data/bo/searchJobBO.js";
import { GithubApi, EXCEPTION } from "../../common/api/github";
import {
  jobDataToExcelJSONArray, JOB_FILE_HEADER, jobExcelDataToObjectArray,
  COMPANY_FILE_HEADER, companyDataToExcelJSONArray, companyExcelDataToObjectArray,
  COMPANY_TAG_FILE_HEADER, companyTagDataToExcelJSONArray, companyTagExcelDataToObjectArray,
  JOB_TAG_FILE_HEADER, jobTagDataToExcelJSONArray, jobTagExcelDataToObjectArray,
} from "../../common/excel";
import { getMergeDataListForJob, getMergeDataListForCompany, getMergeDataListForCompanyTag, getMergeDataListForJobTag } from "../../common/service/dataSyncService";

import TrafficChart from "./components/TrafficChart.vue";
import TrafficTable from "./components/TrafficTable.vue";
import DataBackupRestore from "./components/DataBackupRestore.vue";
import { JobTagSearchBO } from "../../common/data/bo/jobTagSearchBO";

const exportLoading = ref(false);
const importDialogVisible = ref(false);
const importFileInput = ref<HTMLInputElement | null>(null);
const files = ref();
const reloadDialogVisible = ref(false);

const handleFileImport = async () => {
  files.value = importFileInput.value?.files;
};

const reloadExtension = async () => {
  chrome.runtime.reload();
};

const importLoading = ref(false);

const confirmFileImport = async () => {
  let loading;
  if (files.value && files.value.length > 0) {
    importLoading.value = true;
    setTimeout(() => {
      const reader = new FileReader();
      reader.readAsArrayBuffer(files.value[0]);
      reader.onload = async function (event) {
        let arrayBuffer = event.target.result;
        try {
          let base64String = bytesToBase64(
            new Uint8Array(arrayBuffer as ArrayBuffer)
          );
          await dbImport(base64String);
          importDialogVisible.value = false;
          reloadDialogVisible.value = true;
        } catch (e) {
          ElMessage({
            message: "恢复备份文件失败[" + e.message + "]",
            type: "error",
          });
        } finally {
          if (loading) {
            loading.close();
          }
          importLoading.value = false;
        }
      };
      reader.onerror = function (event) {
        ElMessage({
          message: "读取备份文件失败",
          type: "error",
        });
      };
    }, 0);
    loading = ElLoading.service({
      lock: true,
      text: "数据恢复中...",
      background: "rgba(0, 0, 0, 0.7)",
    });

  } else {
    ElMessage("请选择有效的备份文件");
  }
};

const onClickDbExport = async () => {
  exportLoading.value = true;
  try {
    let result = await dbExport();
    downloadBlob(
      base64ToBytes(result),
      "数据库-" + dayjs(new Date()).format("YYYYMMDDHHmmss") + ".zip",
      "application/octet-stream"
    );
  } finally {
    exportLoading.value = false;
  }
};

const downloadBlob = function (data, fileName, mimeType) {
  let blob, url;
  blob = new Blob([data], {
    type: mimeType,
  });
  url = window.URL.createObjectURL(blob);
  downloadURL(url, fileName);
  setTimeout(function () {
    return window.URL.revokeObjectURL(url);
  }, 1000);
};

const downloadURL = function (data, fileName) {
  let a;
  a = document.createElement("a");
  a.href = data;
  a.download = fileName;
  document.body.appendChild(a);
  a.style = "display: none";
  a.click();
  a.remove();
};

//10 million
const MAX_RECORD_COUNT = 10000000;

const getJobDataToExcelJsonArray = async () => {
  let searchParam = new SearchJobBO();
  searchParam.pageNum = 1;
  searchParam.pageSize = MAX_RECORD_COUNT;
  searchParam.orderByColumn = "updateDatetime";
  searchParam.orderBy = "DESC";
  let data = await JobApi.searchJob(searchParam);
  let list = data.items;
  let result = jobDataToExcelJSONArray(list);
  return result;
}

const saveJobData = async (data) => {
  let jobList = jobExcelDataToObjectArray(data);
  let targetList = await getMergeDataListForJob(jobList, "jobId", async (ids) => {
    return JobApi.jobGetByIds(ids);
  });
  await JobApi.batchAddOrUpdateJobWithTransaction(targetList);
  return targetList;
}

const getCompanyDataToExcelJsonArray = async () => {
  let searchParam = new SearchCompanyBO();
  searchParam.pageNum = 1;
  searchParam.pageSize = MAX_RECORD_COUNT;
  searchParam.orderByColumn = "updateDatetime";
  searchParam.orderBy = "DESC";
  let data = await CompanyApi.searchCompany(searchParam);
  let list = data.items;
  let result = companyDataToExcelJSONArray(list);
  return result;
}

const saveCompanyData = async (data) => {
  let companyBOList = companyExcelDataToObjectArray(data);
  let targetList = await getMergeDataListForCompany(companyBOList, "companyId", async (ids) => {
    return CompanyApi.companyGetByIds(ids);
  });
  await CompanyApi.batchAddOrUpdateCompanyWithTransaction(targetList);
  return targetList;
}

const getCompanyTagDataToExcelJsonArray = async () => {
  let searchParam = new SearchCompanyTagBO();
  searchParam.pageNum = 1;
  searchParam.pageSize = MAX_RECORD_COUNT;
  searchParam.orderByColumn = "updateDatetime";
  searchParam.orderBy = "DESC";
  let data = await CompanyApi.searchCompanyTag(searchParam);
  let list = data.items;
  let result = companyTagDataToExcelJSONArray(list);
  return result;
}

const saveCompanyTagData = async (data) => {
  let companyTagBOList = companyTagExcelDataToObjectArray(data);
  let targetList = await getMergeDataListForCompanyTag(companyTagBOList, async (ids) => {
    return await CompanyApi.getAllCompanyTagDTOByCompanyIds(ids);
  })
  await CompanyApi.batchAddOrUpdateCompanyTagWithTransaction(targetList);
  return targetList;
}

const getJobTagDataToExcelJsonArray = async () => {
  let searchParam = new JobTagSearchBO();
  searchParam.pageNum = 1;
  searchParam.pageSize = MAX_RECORD_COUNT;
  searchParam.orderByColumn = "updateDatetime";
  searchParam.orderBy = "DESC";
  let data = await JobApi.jobTagSearch(searchParam);
  let list = data.items;
  let result = jobTagDataToExcelJSONArray(list);
  return result;
}

const saveJobTagData = async (data) => {
  let result = jobTagExcelDataToObjectArray(data);
  let targetList = await getMergeDataListForJobTag(result, async (ids) => {
    return await JobApi.jobTagGetAllDTOByJobIds(ids);
  })
  console.log(targetList)
  await JobApi.jobTagBatchAddOrUpdateWithTransaction(targetList);
  return targetList;
}

const login = ref(false);
const username = ref("");
const avatar = ref("");

const onClickLogin = async () => {
  await AuthApi.authOauth2Login();
  await checkLoginStatus();
}

const onClickInstallAndLogin = async () => {
  await AuthApi.authInstallAndLogin();
  await checkLoginStatus();
}

const onClickLogout = async () => {
  await AuthApi.authSetToken(null);
  await UserApi.userSet(null);
  await checkLoginStatus()
}

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
    avatar.value = userDTO.avatarUrl;
  }
}

const githubRef = ref();
const githubAppRef = ref();
const databaseRef = ref();
const jobRef = ref();
const companyRef = ref();
const companyTagRef = ref();
const infoRef = ref();

const tourOpen = ref(false);

const changelogDialogVisible = ref(false);
const changelogContentHtml = ref("");

const version = __APP_VERSION__;
const homepage = ref();
const bugs = ref();

const licenseDialogVisible = ref(false);
const licenseContent = ref();
const newVersion = ref(false);

const versionChecking = ref(true);
const latestVersion = ref();
const versionObject = ref();
const latestVersionCreatedAt = ref();
const checkingVersionText = ref("正检查新版本");
const latestChangelogDialogVisible = ref(false);
const latestChangelogContent = ref();
const updateAppDialogVisible = ref(false);

onMounted(async () => {
  await checkLoginStatus()
  let changelogUrl = chrome.runtime.getURL("CHANGELOG.md");
  let changelogContent = await (await fetch(changelogUrl)).text();
  changelogContentHtml.value = marked.parse(changelogContent) as string;
  let packageUrl = chrome.runtime.getURL("package.json");
  let packageObject = await (await fetch(packageUrl)).json();
  homepage.value = packageObject.homepage;
  bugs.value = packageObject.bugs;
  let licenseUrl = chrome.runtime.getURL("LICENSE");
  let licenseContentFromFile = await (await fetch(licenseUrl)).text();
  licenseContent.value = marked.parse(licenseContentFromFile);
  onCheckVersion();
  let developerToken = await DeveloperApi.developerGetToken();
  setFormData(developerToken);
})

import { useSystem } from "../hook/system";
const { queryVersion, checkNewVersion, getLatestAssets, downloadLatest } = useSystem();


const onCheckVersion = async () => {
  versionChecking.value = true;
  checkingVersionText.value = "正检查新版本"
  try {
    await checkVersion();
    checkingVersionText.value = "已是最新版本，点击再检查"
    versionChecking.value = false;
  } catch (e) {
    checkingVersionText.value = "版本检查失败，请点击再次检查"
  }
}

const checkVersion = async () => {
  try {
    versionObject.value = await queryVersion();
    newVersion.value = checkNewVersion(versionObject.value);
    latestVersion.value = versionObject.value.tag_name;
    latestVersionCreatedAt.value = versionObject.value.created_at;
    latestChangelogContent.value = marked.parse(versionObject.value.body);
  } catch (e) {
    throw e;
  }
}

const onDownloadLatest = async () => {
  downloadLatest(versionObject.value)
}

const onAccessHomePage = () => {
  window.open(homepage.value);
}

const onAccessIssuesPage = () => {
  window.open(bugs.value);
}


const devMode = ref(false);
const trafficClone = ref();
const trafficViews = ref();
const trafficPopularPaths = ref();
const trafficPopularReferrers = ref();

watch(devMode, async (value, oldValue) => {
  if (value) {
    try {
      cloneLoading.value = true;
      trafficClone.value = await GithubApi.getTrafficClone();
      cloneLoading.value = false;
      viewLoading.value = true;
      trafficViews.value = await GithubApi.getTrafficViews();
      viewLoading.value = false;
      popularPathsLoading.value = true;
      trafficPopularPaths.value = await GithubApi.getTrafficPopularPaths();
      popularPathsLoading.value = false;
      popularReferrersLoading.value = true;
      trafficPopularReferrers.value = await GithubApi.getTrafficPopularReferrers();
      popularReferrersLoading.value = false;
    } catch (e) {
      if (e == EXCEPTION.NO_LOGIN) {
        ElMessage({
          message: "需要设置开发者令牌",
          type: "warning",
        });
      } else {
        ElMessage({
          message: e,
          type: "error",
        });
      }
    }
  }
})

const form = reactive({
  developerToken: null,
})

const setFormData = (developerToken) => {
  form.developerToken = developerToken;
}

const onSubmit = async () => {
  try {
    await DeveloperApi.developerSetToken(form.developerToken);
    let developerToken = await DeveloperApi.developerGetToken();
    setFormData(developerToken);
    ElMessage({
      message: "开发者令牌保存成功",
      type: "success"
    });
  } catch (e) {
    ElMessage({
      message: "开发者令牌保存失败",
      type: "error",
    });
  }
}

const onReset = async () => {
  try {
    let developerToken = await DeveloperApi.developerGetToken();
    setFormData(developerToken);
    ElMessage({
      message: "开发者令牌恢复成功",
      type: "success"
    });
  } catch (e) {
    ElMessage({
      message: "开发者令牌恢复失败",
      type: "error",
    });
  }
}

const popularReferrersColumnTitleArray = ref(["Site", "Views", "Unique visitors"]);
const popularPathsColumnTitleArray = ref(["Content", "Views", "Unique visitors"]);

const cloneLoading = ref(true);
const viewLoading = ref(true);
const popularReferrersLoading = ref(true);
const popularPathsLoading = ref(true);
</script>
<style lang="scss" scoped>
.setting_item {
  padding: 5px;
}

.dialog_menu {
  justify-content: end;
}

.appInfoOperation {
  margin-top: 10px;
}

.loginStatus {
  display: inline-flex;
  margin-right: 5px;
}

.menu {
  display: flex;
  align-items: center;
  padding: 5px;
}

.icon {
  cursor: pointer;
  width: 24px;
  height: 24px;
}

.checkingVersion {
  cursor: pointer;
}

.newVersion {}

.latestVersionChangelogDetailButton {
  cursor: pointer;
}

.content {
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow: auto;
}

.trafficWrapper {
  padding-top: 20px;
}

.el-link {
  margin-right: 8px;
}
</style>
