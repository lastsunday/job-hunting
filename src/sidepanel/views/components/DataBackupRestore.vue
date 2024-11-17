<template>
    <div>
        <el-row ref="jobRef" class="setting_item">
            <el-descriptions :title="`${props.title}数据`">
                <el-descriptions-item>
                    <el-popconfirm title="确认导出数据？" @confirm="onExport" confirm-button-text="确定" cancel-button-text="取消">
                        <template #reference>
                            <el-button :icon="DocumentCopy" :loading="exportLoading">全量{{ props.title
                                }}数据导出</el-button>
                        </template>
                    </el-popconfirm>
                    <el-button :icon="CopyDocument" @click="importDialogVisible = true">{{ props.title
                        }}导入</el-button>
                </el-descriptions-item>
            </el-descriptions>
        </el-row>
        <el-dialog v-model="importDialogVisible" :title="`${props.title}数据导入`" width="500">
            <div>
                <el-text class="mx-1" type="danger">注意：相同{{ props.title }}的数据会被替换!!!</el-text>
            </div>
            <div>
                <el-text class="mx-1" type="info">请选择{{ props.title }}备份文件</el-text>
            </div>
            <template #footer>
                <div class="dialog-footer">
                    <el-row>
                        <input type="file" accept=".xlsx" ref="importFileInput" @change="handleFileImport" />
                    </el-row>
                    <el-row class="dialog_menu">
                        <el-button type="primary" @click="confirmFileImport" :loading="importLoading">
                            确定
                        </el-button>
                    </el-row>
                </div>
            </template>
        </el-dialog>
    </div>
</template>
<script lang="ts" setup>
import { ref } from "vue";
import dayjs from "dayjs";
import { ElMessage, ElLoading } from "element-plus";
import { DocumentCopy, CopyDocument } from "@element-plus/icons-vue";
import { utils, writeFileXLSX, read } from "xlsx";
import {
    validImportData
} from "../../../common/excel";

const props = defineProps({
    "title": {
        type: String,
    },
    "fileHeader": {
        type: Array
    },
    "getExcelJsonArrayFunction": {
        type: Function
    },
    "saveDataFunction": {
        type: Function
    }
});

const exportLoading = ref(false);

const onExport = async () => {
    exportLoading.value = true;
    try {
        let result = await props.getExcelJsonArrayFunction();
        const ws = utils.json_to_sheet(result);
        const wb = utils.book_new();
        utils.book_append_sheet(wb, ws, "Data");
        writeFileXLSX(wb, dayjs(new Date()).format(`${props.title}-YYYYMMDDHHmmss`) + ".xlsx");
    } finally {
        exportLoading.value = false;
    }
}

const importDialogVisible = ref(false);
const importFileInput = ref<HTMLInputElement | null>(null);
const files = ref();

const handleFileImport = async () => {
    files.value = importFileInput.value?.files;
};

const importLoading = ref(false);

const confirmFileImport = async () => {
    let loading;
    if (files.value && files.value.length > 0) {
        importLoading.value = true;
        loading = ElLoading.service({
            lock: true,
            text: `${props.title}数据导入中...`,
            background: "rgba(0, 0, 0, 0.7)",
        });
        setTimeout(() => {
            const reader = new FileReader();
            reader.readAsArrayBuffer(files.value[0]);
            reader.onload = async function (event) {
                let arrayBuffer = event.target.result;
                try {
                    let wb = read(arrayBuffer);
                    let validResultObject = validImportData(utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 }), props.fileHeader);
                    if (!validResultObject.validResult) {
                        ElMessage({
                            message: `${props.title}文件校验失败，缺少数据列(${validResultObject.lackColumn.length}):${validResultObject.lackColumn.join(",")}`,
                            type: "error",
                        });
                        return;
                    }
                    const data = utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 2 });
                    let targetList = await props.saveDataFunction(data);
                    importDialogVisible.value = false;
                    ElMessage({
                        message: `导入${props.title}数据成功，共${targetList.length}条`,
                        type: "success",
                    });
                } catch (e) {
                    ElMessage({
                        message: "导入${props.title}数据失败[" + e.message + "]",
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
                    message: `读取${props.title}文件失败`,
                    type: "error",
                });
            };
        }, 0);
    } else {
        ElMessage(`请选择有效的${props.title}文件`);
    }
};
</script>
<style lang="scss" scoped>
.setting_item {
    padding: 5px;
}

.dialog_menu {
    justify-content: end;
}
</style>