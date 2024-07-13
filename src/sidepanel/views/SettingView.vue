<template>
  <el-col>
    <el-row class="setting_item">
      <el-descriptions title="GitHubApp登录">
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
          <el-popconfirm v-else title="确定登出？" @confirm="onClickLogout" confirm-button-text="确定" cancel-button-text="取消">
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
    <el-row class="setting_item">
      <el-descriptions title="数据库">
        <el-descriptions-item>
          <el-popconfirm title="确认备份数据？" @confirm="onClickDbExport" confirm-button-text="确定" cancel-button-text="取消">
            <template #reference>
              <el-button :icon="DocumentCopy" v-loading="exportLoading">数据库备份</el-button>
            </template>
          </el-popconfirm>
          <el-button :icon="CopyDocument" @click="importDialogVisible = true">数据库恢复</el-button>
        </el-descriptions-item>
      </el-descriptions>
    </el-row>
    <el-row class="setting_item">
      <el-descriptions title="公司数据">
        <el-descriptions-item>
          <el-popconfirm title="确认导出数据？" @confirm="onCompanyExport" confirm-button-text="确定" cancel-button-text="取消">
            <template #reference>
              <el-button :icon="DocumentCopy">全量公司数据导出</el-button>
            </template>
          </el-popconfirm>
          <el-button :icon="CopyDocument" @click="importCompanyDialogVisible = true">公司数据导入</el-button>
        </el-descriptions-item>
      </el-descriptions>
    </el-row>
    <el-row class="setting_item">
      <el-descriptions title="公司标签数据">
        <el-descriptions-item>
          <el-popconfirm title="确认导出数据？" @confirm="onCompanyTagExport" confirm-button-text="确定" cancel-button-text="取消">
            <template #reference>
              <el-button :icon="DocumentCopy">全量公司标签数据导出</el-button>
            </template>
          </el-popconfirm>
          <el-button :icon="CopyDocument" @click="importCompanyTagDialogVisible = true">公司标签数据导入</el-button>
        </el-descriptions-item>
      </el-descriptions>
    </el-row>
    <el-row class="setting_item">
      <el-descriptions title="程序信息">
        <el-descriptions-item>
          <el-row>
            <el-col>
              <el-text type="primary" size="large">版本 {{ version }}</el-text>
            </el-col>
            <el-col class="appInfoOperation">
              <el-button><el-link :href="homepage" target="_blank">访问主页</el-link></el-button>
              <el-button>
                <el-link :href="bugs" target="_blank">问题反馈</el-link>
              </el-button>
            </el-col>
          </el-row>
        </el-descriptions-item>
      </el-descriptions>
    </el-row>
  </el-col>
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
          <el-button type="primary" @click="confirmFileImport">
            确定
          </el-button>
        </el-row>
      </div>
    </template>
  </el-dialog>
  <el-dialog v-model="reloadDialogVisible" title="数据恢复成功" width="500" :close-on-click-modal="false"
    :close-on-press-escape="false" :show-close="false">
    <span>点击确定按钮重启插件</span>
    <template #footer>
      <el-row class="dialog_menu">
        <el-button type="primary" @click="reloadExtension"> 确定 </el-button>
      </el-row>
    </template>
  </el-dialog>
  <el-dialog v-model="importCompanyDialogVisible" title="公司数据导入" width="500">
    <div>
      <el-text class="mx-1" type="danger">注意：相同公司的数据会被替换!!!</el-text>
    </div>
    <div>
      <el-text class="mx-1" type="info">请选择公司备份文件</el-text>
    </div>
    <template #footer>
      <div class="dialog-footer">
        <el-row>
          <input type="file" accept=".xlsx" ref="importCompanyFileInput" @change="handleCompanyFileImport" />
        </el-row>
        <el-row class="dialog_menu">
          <el-button type="primary" @click="confirmCompanyFileImport">
            确定
          </el-button>
        </el-row>
      </div>
    </template>
  </el-dialog>
  <el-dialog v-model="importCompanyTagDialogVisible" title="公司标签数据导入" width="500">
    <div>
      <el-text class="mx-1" type="danger">注意：相同公司的数据会被替换!!!</el-text>
    </div>
    <div>
      <el-text class="mx-1" type="info">请选择公司标签备份文件</el-text>
    </div>
    <template #footer>
      <div class="dialog-footer">
        <el-row>
          <input type="file" accept=".xlsx" ref="importCompanyTagFileInput" @change="handleCompanyTagFileImport" />
        </el-row>
        <el-row class="dialog_menu">
          <el-button type="primary" @click="confirmCompanyTagFileImport">
            确定
          </el-button>
        </el-row>
      </div>
    </template>
  </el-dialog>
</template>
<script lang="ts" setup>
import { ref, onMounted } from "vue";
import dayjs from "dayjs";
import { dbExport, dbImport } from "../../common/api/common";
import { base64ToBytes, bytesToBase64 } from "../../common/utils/base64.js";
import { ElMessage, ElLoading } from "element-plus";
import { DocumentCopy, CopyDocument } from "@element-plus/icons-vue";
import { utils, writeFileXLSX, read } from "xlsx";
import { CompanyApi, AuthApi, UserApi } from "../../common/api/index";
import { SearchCompanyTagBO } from "../../common/data/bo/searchCompanyTagBO";
import { CompanyTagBO } from "../../common/data/bo/companyTagBO";
import { SearchCompanyBO } from "../../common/data/bo/searchCompanyBO";
import { CompanyBO } from "../../common/data/bo/companyBO";
import { genIdFromText, convertDateStringToDateObject } from "../../common/utils";
import { Icon } from '@iconify/vue';

const activeName = ref("export");
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

const confirmFileImport = async () => {
  let loading;
  try {
    if (files.value && files.value.length > 0) {
      loading = ElLoading.service({
        lock: true,
        text: "数据恢复中...",
        background: "rgba(0, 0, 0, 0.7)",
      });
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
        }
      };
      reader.onerror = function (event) {
        ElMessage({
          message: "读取备份文件失败",
          type: "error",
        });
      };
    } else {
      ElMessage("请选择有效的备份文件");
    }
  } finally {
    if (loading) {
      loading.close();
    }
  }
};

const onClickDbExport = async () => {
  let result = await dbExport();
  exportLoading.value = true;
  try {
    downloadBlob(
      base64ToBytes(result),
      dayjs(new Date()).format("YYYYMMDDHHmmss") + ".zip",
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

const onCompanyExport = async () => {
  let searchParam = new SearchCompanyBO();
  searchParam.pageNum = 1;
  searchParam.pageSize = MAX_RECORD_COUNT;
  searchParam.orderByColumn = "updateDatetime";
  searchParam.orderBy = "DESC";
  let data = await CompanyApi.searchCompany(searchParam);
  let list = data.items;
  let result = [];
  for (let i = 0; i < list.length; i++) {
    let item = list[i];
    result.push({
      公司: item.companyName,
      公司描述: item.companyDesc,
      成立时间: item.companyStartDate,
      经营状态: item.companyStatus,
      法人: item.companyLegalPerson,
      统一社会信用代码: item.companyUnifiedCode,
      官网: item.companyWebSite,
      社保人数: item.companyInsuranceNum,
      自身风险数: item.companySelfRisk,
      关联风险数: item.companyUnionRisk,
      地址: item.companyAddress,
      经营范围: item.companyScope,
      纳税人识别号: item.companyTaxNo,
      所属行业: item.companyIndustry,
      工商注册号: item.companyLicenseNumber,
      经度: item.companyLongitude,
      纬度: item.companyLatitude,
      数据来源地址: item.sourceUrl,
      数据来源平台: item.sourcePlatform,
      数据来源记录编号: item.sourceRecordId,
      数据来源更新时间: item.sourceRefreshDatetime,
    });
  }
  const ws = utils.json_to_sheet(result);
  const wb = utils.book_new();
  utils.book_append_sheet(wb, ws, "Data");
  writeFileXLSX(wb, dayjs(new Date()).format("公司-YYYYMMDDHHmmss") + ".xlsx");
}

const importCompanyDialogVisible = ref(false);
const importCompanyFileInput = ref<HTMLInputElement | null>(null);
const companyFiles = ref();

const handleCompanyFileImport = async () => {
  companyFiles.value = importCompanyFileInput.value?.files;
};

const confirmCompanyFileImport = async () => {
  let loading;
  try {
    if (companyFiles.value && companyFiles.value.length > 0) {
      loading = ElLoading.service({
        lock: true,
        text: "公司数据导入中...",
        background: "rgba(0, 0, 0, 0.7)",
      });
      const reader = new FileReader();
      reader.readAsArrayBuffer(companyFiles.value[0]);
      reader.onload = async function (event) {
        let arrayBuffer = event.target.result;
        try {
          let wb = read(arrayBuffer);
          let validResultObject = validImportData(utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 }), COMPANY_FILE_HEADER);
          if (!validResultObject.validResult) {
            ElMessage({
              message: `公司文件校验失败，缺少数据列(${validResultObject.lackColumn.length}):${validResultObject.lackColumn.join(",")}`,
              type: "error",
            });
            return;
          }
          const data = utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 2 });
          let companyBOList = [];
          for (let i = 0; i < data.length; i++) {
            let dataItem = data[i];
            let item = new CompanyBO();
            item.companyId = genIdFromText(dataItem['公司']);
            item.companyName = dataItem['公司'];
            item.companyDesc = dataItem['公司描述'];
            item.companyStartDate = convertDateStringToDateObject(dataItem['成立时间']);
            item.companyStatus = dataItem['经营状态'];
            item.companyLegalPerson = dataItem['法人'];
            item.companyUnifiedCode = dataItem['统一社会信用代码'];
            item.companyWebSite = dataItem['官网'];
            item.companyInsuranceNum = dataItem['社保人数'];
            item.companySelfRisk = dataItem['自身风险数'];
            item.companyUnionRisk = dataItem['关联风险数'];
            item.companyAddress = dataItem['地址'];
            item.companyScope = dataItem['经营范围'];
            item.companyTaxNo = dataItem['纳税人识别号'];
            item.companyIndustry = dataItem['所属行业'];
            item.companyLicenseNumber = dataItem['工商注册号'];
            item.companyLongitude = dataItem['经度'];
            item.companyLatitude = dataItem['纬度'];
            item.sourceUrl = dataItem['数据来源地址'];
            item.sourcePlatform = dataItem['数据来源平台'];
            item.sourceRecordId = dataItem['数据来源记录编号'];
            item.sourceRefreshDatetime = convertDateStringToDateObject(dataItem['数据来源更新时间']);
            companyBOList.push(item);
          }
          await CompanyApi.batchAddOrUpdateCompany(companyBOList);
          importCompanyDialogVisible.value = false;
          ElMessage({
            message: `导入公司数据成功，共${companyBOList.length}条`,
            type: "success",
          });
        } catch (e) {
          ElMessage({
            message: "导入公司数据失败[" + e.message + "]",
            type: "error",
          });
        }
      };
      reader.onerror = function (event) {
        ElMessage({
          message: "读取公司文件失败",
          type: "error",
        });
      };
    } else {
      ElMessage("请选择有效的公司文件");
    }
  } finally {
    if (loading) {
      loading.close();
    }
  }
};

const COMPANY_FILE_HEADER = [
  "公司",
  "公司描述",
  "成立时间",
  "经营状态",
  "法人",
  "统一社会信用代码",
  "官网",
  "社保人数",
  "自身风险数",
  "关联风险数",
  "地址",
  "经营范围",
  "纳税人识别号",
  "所属行业",
  "工商注册号",
  "经度",
  "纬度",
  "数据来源地址",
  "数据来源平台",
  "数据来源记录编号",
  "数据来源更新时间",
];

function validImportData(data, validArray) {
  let colCount = 0;
  let lackColumnMap = new Map();
  for (let i = 0; i < validArray.length; i++) {
    lackColumnMap.set(validArray[i], null);
  }
  if (data.length > 0) {
    let headerRowArray = data[0];
    for (let i = 0; i < headerRowArray.length; i++) {
      let header = headerRowArray[i];
      if (lackColumnMap.has(header)) {
        colCount++;
        lackColumnMap.delete(header);
      }
    }
  }
  return { validResult: colCount == validArray.length, lackColumn: lackColumnMap.keys().toArray() };
}

const onCompanyTagExport = async () => {
  let searchParam = new SearchCompanyTagBO();
  searchParam.pageNum = 1;
  searchParam.pageSize = MAX_RECORD_COUNT;
  searchParam.orderByColumn = "updateDatetime";
  searchParam.orderBy = "DESC";
  let data = await CompanyApi.searchCompanyTag(searchParam);
  let list = data.items;
  let result = [];
  for (let i = 0; i < list.length; i++) {
    let item = list[i];
    result.push({
      公司: item.companyName,
      标签: item.tagNameArray.join(","),
    });
  }
  const ws = utils.json_to_sheet(result);
  const wb = utils.book_new();
  utils.book_append_sheet(wb, ws, "Data");
  writeFileXLSX(wb, dayjs(new Date()).format("公司标签-YYYYMMDDHHmmss") + ".xlsx");
}

const importCompanyTagDialogVisible = ref(false);
const importCompanyTagFileInput = ref<HTMLInputElement | null>(null);
const companyTagFiles = ref();

const handleCompanyTagFileImport = async () => {
  companyTagFiles.value = importCompanyTagFileInput.value?.files;
};

const COMPANY_TAG_FILE_HEADER = [
  "公司",
  "标签",
];

const confirmCompanyTagFileImport = async () => {
  let loading;
  try {
    if (companyTagFiles.value && companyTagFiles.value.length > 0) {
      loading = ElLoading.service({
        lock: true,
        text: "公司标签数据导入中...",
        background: "rgba(0, 0, 0, 0.7)",
      });
      const reader = new FileReader();
      reader.readAsArrayBuffer(companyTagFiles.value[0]);
      reader.onload = async function (event) {
        let arrayBuffer = event.target.result;
        try {
          let wb = read(arrayBuffer);
          let validResultObject = validImportData(utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 }), COMPANY_TAG_FILE_HEADER);
          if (!validResultObject.validResult) {
            ElMessage({
              message: `公司标签文件校验失败，缺少数据列(${validResultObject.lackColumn.length}):${validResultObject.lackColumn.join(",")}`,
              type: "error",
            });
            return;
          }
          const data = utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 2 });
          let companyTagBOList = [];
          for (let i = 0; i < data.length; i++) {
            let dataItem = data[i];
            let item = new CompanyTagBO();
            item.companyName = dataItem['公司'];
            item.tags = (dataItem['标签'] as string).split(",");
            companyTagBOList.push(item);
          }
          await CompanyApi.batchAddOrUpdateCompanyTag(companyTagBOList);
          importCompanyTagDialogVisible.value = false;
          ElMessage({
            message: `导入公司标签数据成功，共${companyTagBOList.length}条`,
            type: "success",
          });
        } catch (e) {
          ElMessage({
            message: "导入公司标签数据失败[" + e.message + "]",
            type: "error",
          });
        }
      };
      reader.onerror = function (event) {
        ElMessage({
          message: "读取公司标签文件失败",
          type: "error",
        });
      };
    } else {
      ElMessage("请选择有效的公司标签文件");
    }
  } finally {
    if (loading) {
      loading.close();
    }
  }
};

const version = __APP_VERSION__;
const homepage = __HOMEPAGE__;
const bugs = __BUGS__;

const login = ref(false);
const username = ref("");
const avatar = ref("");

const onClickLogin = async () => {
  await AuthApi.authOauth2Login();
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

onMounted(async () => {
  await checkLoginStatus()
})

</script>
<style lang="scss">
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
</style>