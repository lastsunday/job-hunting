<template>
  <el-col>
    <el-row class="setting_item">
      <el-descriptions title="全量数据">
        <el-descriptions-item>
          <el-popconfirm title="确认备份数据？" @confirm="onClickDbExport" confirm-button-text="确定" cancel-button-text="取消">
            <template #reference>
              <el-button :icon="DocumentCopy" v-loading="exportLoading">数据备份</el-button>
            </template>
          </el-popconfirm>
          <el-button :icon="CopyDocument" @click="importDialogVisible = true">数据恢复</el-button>
        </el-descriptions-item>
      </el-descriptions>
    </el-row>
    <el-row class="setting_item">
      <el-descriptions title="全量公司标签">
        <el-descriptions-item>
          <el-popconfirm title="确认导出数据？" @confirm="onCompanyTagExport" confirm-button-text="确定" cancel-button-text="取消">
            <template #reference>
              <el-button :icon="DocumentCopy">公司标签数据导出</el-button>
            </template>
          </el-popconfirm>
          <el-button :icon="CopyDocument" @click="importCompanyTagDialogVisible = true">公司标签数据导入</el-button>
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
import { ref } from "vue";
import dayjs from "dayjs";
import { dbExport, dbImport } from "../../common/api/common";
import { base64ToBytes, bytesToBase64 } from "../../common/utils/base64.js";
import { ElMessage, ElLoading } from "element-plus";
import { DocumentCopy, CopyDocument } from "@element-plus/icons-vue";
import { utils, writeFileXLSX, read } from "xlsx";
import { CompanyApi } from "../../common/api/index";
import { SearchCompanyTagBO } from "../../common/data/bo/searchCompanyTagBO";
import { CompanyTagBO } from "../../common/data/bo/companyTagBO";

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

</script>
<style lang="scss">
.setting_item {
  padding: 10px;
}

.dialog_menu {
  justify-content: end;
}
</style>