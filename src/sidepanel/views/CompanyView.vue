<template>
    <el-row v-loading="loading">
        <el-col :span="12">
            <el-statistic title="今天新增记录" :value="todayAddCount" />
        </el-col>
        <el-col :span="12">
            <el-statistic title="公司总数" :value="totalCompanyCount" />
        </el-col>
    </el-row>
    <el-col class="search">
        <div class="flex">
            <el-input placeholder="公司名" v-model="searchName" clearable @change="onClickSearch" />
            <div class="operation_menu">
                <div class="operation_menu_left">
                    <el-switch v-model="showAdvanceSearch" active-text="高级搜索" inactive-text="普通搜索" inline-prompt />
                </div>
                <div>
                    <el-button @click="onExportHandle">导出</el-button>
                    <el-button @click="reset">重置</el-button>
                    <el-button @click="onClickSearch"><el-icon>
                            <Search />
                        </el-icon></el-button>
                </div>
            </div>
        </div>
        <el-collapse :hidden="!showAdvanceSearch" v-model="activeNames">
            <el-collapse-item title="高级搜索条件" name="advanceCondition">
                <el-date-picker type="daterange" range-separator="到" start-placeholder="成立时间开始时间"
                    end-placeholder="成立时间结束时间" v-model="startDateDatetime" clearable @change="onClickSearch" />
            </el-collapse-item>
        </el-collapse>
    </el-col>
    <el-row>
        <el-table ref="tableRef" :data="tableData" :default-sort="{ prop: 'updateDatetime', order: 'descending' }"
            style="width: 100%" stripe @sort-change="sortChange" sortable="custom">
            <el-table-column type="expand" width="30">
                <template #default="props">
                    <div m="4" class="expand">
                        <el-descriptions class="margin-top" :column="4" size="small" border>
                            <el-descriptions-item>
                                <template #label>
                                    <div class="cell-item">公司全称</div>
                                </template>
                                <el-link :href="props.row.sourceUrl" target="_blank">
                                    {{ props.row.companyName }}
                                </el-link>
                            </el-descriptions-item>
                            <el-descriptions-item>
                                <template #label>
                                    <div class="cell-item">经营状态</div>
                                </template>
                                {{ props.row.companyStatus }}
                            </el-descriptions-item>
                            <el-descriptions-item>
                                <template #label>
                                    <div class="cell-item">成立时间</div>
                                </template>
                                {{ datetimeFormat(props.row.companyStartDate) }}
                            </el-descriptions-item>
                            <el-descriptions-item>
                                <template #label>
                                    <div class="cell-item">所属行业</div>
                                </template>
                                {{ props.row.companyIndustry }}
                            </el-descriptions-item>
                            <el-descriptions-item>
                                <template #label>
                                    <div class="cell-item">统一社会信用代码</div>
                                </template>
                                {{ props.row.companyUnifiedCode }}
                            </el-descriptions-item>
                            <el-descriptions-item>
                                <template #label>
                                    <div class="cell-item">纳税人识别号</div>
                                </template>
                                {{ props.row.companyTaxNo }}
                            </el-descriptions-item>
                            <el-descriptions-item>
                                <template #label>
                                    <div class="cell-item">工商注册号</div>
                                </template>
                                {{ props.row.companyLicenseNumber }}
                            </el-descriptions-item>
                            <el-descriptions-item>
                                <template #label>
                                    <div class="cell-item">法人</div>
                                </template>
                                {{ props.row.companyLegalPerson }}
                            </el-descriptions-item>
                            <el-descriptions-item>
                                <template #label>
                                    <div class="cell-item">官网</div>
                                </template>
                                <el-link v-if="props.row.companyWebSite != '-'"
                                    :href="'http://' + props.row.companyWebSite" target="_blank">{{
                                        props.row.companyWebSite }}</el-link>
                                <el-text v-else>-</el-text>
                            </el-descriptions-item>
                            <el-descriptions-item>
                                <template #label>
                                    <div class="cell-item">社保人数</div>
                                </template>
                                {{ props.row.companyInsuranceNum }}
                            </el-descriptions-item>
                            <el-descriptions-item>
                                <template #label>
                                    <div class="cell-item">自身风险数</div>
                                </template>
                                {{ props.row.companySelfRisk }}
                            </el-descriptions-item>
                            <el-descriptions-item>
                                <template #label>
                                    <div class="cell-item">关联风险数</div>
                                </template>
                                {{ props.row.companyUnionRisk }}
                            </el-descriptions-item>
                            <el-descriptions-item>
                                <template #label>
                                    <div class="cell-item">地址</div>
                                </template>
                                {{ props.row.companyAddress }}
                            </el-descriptions-item>
                            <el-descriptions-item>
                                <template #label>
                                    <div class="cell-item">经度</div>
                                </template>
                                {{ props.row.companyLongitude }}
                            </el-descriptions-item>
                            <el-descriptions-item>
                                <template #label>
                                    <div class="cell-item">纬度</div>
                                </template>
                                {{ props.row.companyLatitude }}
                            </el-descriptions-item>
                        </el-descriptions>
                        <el-descriptions class="margin-top" :column="1" size="small" border direction="vertical">
                            <el-descriptions-item>
                                <template #label>
                                    <div class="cell-item">标签</div>
                                </template>
                                <div>
                                    <el-text v-if="props.row.tagNameArray.length > 0" class="compang_tag">
                                        <el-tag v-for="(value, key, index) in props.row.tagNameArray" type="primary">{{
                                            value
                                            }}</el-tag>
                                    </el-text>
                                    <el-text v-else>-</el-text>
                                </div>
                            </el-descriptions-item>
                        </el-descriptions>
                        <el-descriptions class="margin-top" :column="1" size="small" border direction="vertical">
                            <el-descriptions-item>
                                <template #label>
                                    <div class="cell-item">经营范围</div>
                                </template>
                                {{ props.row.companyScope }}
                            </el-descriptions-item>
                        </el-descriptions>
                    </div>
                </template>
            </el-table-column>
            <el-table-column label="公司全称" show-overflow-tooltip width="260" property="companyName">
                <template #default="scope">
                    <el-text line-clamp="1">
                        <el-link :href="scope.row.sourceUrl" target="_blank">{{ scope.row.companyName }}</el-link>
                    </el-text>
                </template>
            </el-table-column>
            <el-table-column prop="companyStatus" label="经营状态" width="80">
                <template #default="scope">
                    <el-text line-clamp="1">
                        {{ scope.row.companyStatus }}
                    </el-text>
                </template>
            </el-table-column>
            <el-table-column prop="companyStartDate" sortable="custom" label="成立时间" width="110">
                <template #default="scope">
                    <el-text line-clamp="1">
                        {{ datetimeFormat(scope.row.companyStartDate) }}
                    </el-text>
                </template>
            </el-table-column>
            <el-table-column prop="companyUnifiedCode" label="统一社会信用代码" show-overflow-tooltip width="200">
                <template #default="scope">
                    <el-text line-clamp="1">
                        {{ scope.row.companyUnifiedCode }}
                    </el-text>
                </template>
            </el-table-column>
            <el-table-column prop="companyLegalPerson" label="法人" show-overflow-tooltip width="100">
                <template #default="scope">
                    <el-text line-clamp="1">
                        {{ scope.row.companyLegalPerson }}
                    </el-text>
                </template>
            </el-table-column>
            <el-table-column prop="companyInsuranceNum" label="社保人数" width="100">
                <template #default="scope">
                    <el-text line-clamp="1">
                        {{ scope.row.companyInsuranceNum ?? "-" }}
                    </el-text>
                </template>
            </el-table-column>
            <el-table-column prop="companyWebSite" label="官网" show-overflow-tooltip>
                <template #default="scope">
                    <el-link v-if="scope.row.companyWebSite != '-'" :href="'http://' + scope.row.companyWebSite"
                        target="_blank">{{ scope.row.companyWebSite }}</el-link>
                    <el-text v-else>-</el-text>
                </template>
            </el-table-column>
            <el-table-column prop="companyAddress" label="地址" show-overflow-tooltip>
                <template #default="scope">
                    <el-text line-clamp="1">
                        {{ scope.row.companyAddress }}
                    </el-text>
                </template>
            </el-table-column>
            <el-table-column prop="companyIndustry" label="所属行业" show-overflow-tooltip>
                <template #default="scope">
                    <el-text line-clamp="1">
                        {{ scope.row.companyIndustry }}
                    </el-text>
                </template>
            </el-table-column>
            <el-table-column prop="tagNameArray" label="标签数" show-overflow-tooltip width="70">
                <template #default="scope">
                    <el-text line-clamp="1">
                        {{ scope.row.tagNameArray.length }}
                    </el-text>
                </template>
            </el-table-column>
            <el-table-column prop="updateDatetime" sortable="custom" label="更新时间" width="160">
                <template #default="scope">
                    <el-text line-clamp="1">
                        {{ datetimeFormatHHMM(scope.row.updateDatetime) }}
                    </el-text>
                </template>
            </el-table-column>
            <el-table-column fixed="right" label="操作" width="120">
                <template #default="scope">
                    <el-button link type="primary" size="small" @click="onUpdateHandle(scope.row)">
                        编辑标签
                    </el-button>
                </template>
            </el-table-column>
        </el-table>
    </el-row>
    <el-row>
        <el-pagination v-model:current-page="currentPage" v-model:page-size="pageSize"
            :page-sizes="[10, 50, 100, 200, 500, 1000]" :small="small" :disabled="disabled" :background="background"
            layout="total, sizes, prev, pager, next" :total="total" @size-change="handleSizeChange"
            @current-change="handleCurrentChange" />
    </el-row>
    <el-dialog v-model="dialogFormVisible" :title="formTitle" width="800px">
        <el-form ref="formRef" :model="form" label-width="auto" :rules="rules">
            <el-form-item label="公司名" prop="name">
                <el-input :disabled="!formAddMode" v-model="form.name" placeholder="清输入公司名" />
            </el-form-item>
            <el-form-item label="标签" prop="tagNameArray">
                <TagInput ref="formTagRef" v-model="form.tagNameArray" :settings="tagSettings" :whitelist="whitelist"
                    placeholder="请选择标签" @value-change="formCheck(formRef)"></TagInput>
            </el-form-item>
        </el-form>
        <template #footer>
            <div class="dialog-footer">
                <el-button @click="dialogFormVisible = false">取消</el-button>
                <el-button type="primary" @click="confirmAdd(formRef)">
                    确定
                </el-button>
            </div>
        </template>
    </el-dialog>
</template>

<script lang="ts" setup>
import { onMounted, ref, computed, reactive, nextTick } from "vue";
import { useTransition } from "@vueuse/core";
import { CompanyApi, TagApi } from "../../common/api/index";
import dayjs from "dayjs";
import TagInput from "../components/TagInput.vue";
import { SearchCompanyBO } from "../../common/data/bo/searchCompanyBO";
import { CompanyTagBO } from "../../common/data/bo/companyTagBO";

import { ElTable, ElMessage } from "element-plus";
import { utils, writeFileXLSX } from "xlsx";
import { genIdFromText } from "../../common/utils";
import type { FormInstance, FormRules } from 'element-plus'

const todayAddCountSource = ref(0);
const todayAddCount = useTransition(todayAddCountSource, {
    duration: 1000,
});
const totalCompanyCountSource = ref(0);
const totalCompanyCount = useTransition(totalCompanyCountSource, {
    duration: 1000,
});
const loading = ref(true);
const firstTimeLoading = ref(true);

const tableRef = ref<InstanceType<typeof ElTable>>()
const tableData = ref([]);
const currentPage = ref(1);
const pageSize = ref(10);
const total = ref(0);
const small = ref(false);
const background = ref(false);
const disabled = ref(false);
const datetimeFormat = computed(() => {
    return function (value: string) {
        return dayjs(value).isValid() ? dayjs(value).format("YYYY-MM-DD") : "-";
    };
});
const datetimeFormatHHMM = computed(() => {
    return function (value: string) {
        return dayjs(value).isValid() ? dayjs(value).format("YYYY-MM-DD HH:mm") : "-";
    };
});
const searchName = ref(null);
const startDateDatetime = ref([]);
const searchOrderByColumn = ref("updateDatetime");
const searchOrderBy = ref("DESC");

const showAdvanceSearch = ref(false);

const activeNames = ref(["advanceCondition"]);
const whitelist = ref([]);

const handleSizeChange = (val: number) => {
    search();
};

const handleCurrentChange = (val: number) => {
    search();
};

onMounted(async () => {
    await refreshStatistic();
    setInterval(refreshStatistic, 10000);
    search();
});

const sortChange = function (column) {
    if (column.order !== null && column.prop) {
        searchOrderByColumn.value = column.prop;
        if (column.order === "descending") {
            searchOrderBy.value = "DESC";
        } else if (column.order === "ascending") {
            searchOrderBy.value = "ASC";
        } else {
            searchOrderByColumn.value = "updateDatetime";
            searchOrderBy.value = "DESC";
        }
    }
    search();
};

const onClickSearch = async () => {
    currentPage.value = 1;
    search();
};

const reset = async () => {
    currentPage.value = 1;
    searchName.value = null;
    startDateDatetime.value = [];
    search();
};

const search = async () => {
    let searchResult = await CompanyApi.searchCompany(getSearchParam());
    tableData.value = searchResult.items;
    total.value = parseInt(searchResult.total);
};

function getSearchParam() {
    let searchParam = new SearchCompanyBO();
    searchParam.pageNum = currentPage.value;
    searchParam.pageSize = pageSize.value;
    searchParam.companyName = searchName.value;
    if (
        startDateDatetime.value &&
        startDateDatetime.value.length > 0
    ) {
        searchParam.startDateStartDatetime = dayjs(
            startDateDatetime.value[0]
        );
        searchParam.startDateEndDatetime = dayjs(
            startDateDatetime.value[1]
        );
    } else {
        searchParam.startDateStartDatetime = null;
        searchParam.startDateEndDatetime = null;
    }
    searchParam.orderByColumn = searchOrderByColumn.value;
    searchParam.orderBy = searchOrderBy.value;
    return searchParam;
}

const refreshStatistic = async () => {
    if (firstTimeLoading.value) {
        loading.value = true;
        firstTimeLoading.value = false;
    }
    const statisticCompany = await CompanyApi.statisticCompany();
    todayAddCountSource.value = statisticCompany.todayAddCount;
    totalCompanyCountSource.value = statisticCompany.totalCompany;
    loading.value = false;
};

const onExportHandle = () => {
    let list = tableData.value;
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

const formRef = ref<FormInstance>()
const dialogFormVisible = ref(false);
const formTitle = ref("");
const formAddMode = ref(true);
const form = reactive({
    name: '',
    tagNameArray: [],
})
const tagSettings = {
  dropdown: {
    maxItems: 30,
    classname: 'tags-look', // <- custom classname for this dropdown, so it could be targeted
    enabled: 0,             // <- show suggestions on focus
    closeOnSelect: false    // <- do not hide the suggestions dropdown once an item has been selected
  }
};

const validateCompanyTagExistsByCompanyName = (rule: any, value: any, callback: any) => {
    if (!formAddMode.value) {
        callback();
    } else {
        if (value === '') {
            callback(new Error('请输入公司名'));
        } else {
            CompanyApi.getAllCompanyTagDTOByCompanyId(genIdFromText(form.name)).then((value) => {
                if (value.length > 0) {
                    callback(new Error('公司已存在'));
                } else {
                    callback();
                }
            }).catch((e) => {
                callback(new Error('公司名校验失败'));
            });
        }
    }
}

const validateCompanyTag = (rule: any, value: any, callback: any) => {
    if (value && value.length > 0) {
        callback();
    } else {
        callback(new Error('请选择标签'));
    }
}

const rules = reactive<FormRules<typeof form>>({
    name: [
        { required: true, validator: validateCompanyTagExistsByCompanyName, trigger: 'blur' }
    ],
    tagNameArray: [
        { required: true, validator: validateCompanyTag, trigger: 'blur' }
    ],
})

const formTagRef = ref();

const onUpdateHandle = async (row: any) => {
    formAddMode.value = false;
    formTitle.value = "编辑公司标签";
    dialogFormVisible.value = true;
    resetForm();
    resetFormValue();
    form.name = row.companyName;
    form.tagNameArray = row.tagNameArray;
    nextTick(async () => {
        await loadWhitelist();
    })
}

const loadWhitelist = async () => {
    let allTags = await TagApi.getAllTag();
    let tagItems = [];
    allTags.forEach(item => {
        tagItems.push({ value: item.tagName, code: item.tagId });
    });
    whitelist.value.length = 0;
    whitelist.value.push(...tagItems);
}


const resetForm = () => {
    if (formRef.value) {
        formRef.value.resetFields();
    }
    if (formTagRef.value) {
        formTagRef.value.clear();
    }
}

const resetFormValue = () => {
    form.name = "";
    form.tagNameArray = [];
}

const formCheck = async (formEl: FormInstance | undefined) => {
    if (!formEl) return
    formEl.validate(async (valid) => {
    })
}

const confirmAdd = async (formEl: FormInstance | undefined) => {
    if (!formEl) return
    formEl.validate(async (valid) => {
        if (valid) {
            //save
            let companyTagBO = new CompanyTagBO();
            companyTagBO.companyName = form.name;
            companyTagBO.tags = form.tagNameArray.map(item => item.value);
            await CompanyApi.addOrUpdateCompanyTag(companyTagBO);
            dialogFormVisible.value = false;
            ElMessage({
                message: `${companyTagBO.companyName}-公司标签编辑成功`,
                type: 'success',
            });
            search();
            await loadWhitelist();
        }
    })
}
</script>

<style scoped>
.el-col {
    text-align: center;
}

.el-row {
    padding-top: 10px;
}

.expand {
    padding: 10px;
}

.search {
    padding: 10px;
    text-align: left;
}

.operation_menu {
    display: flex;
    justify-content: end;
    padding: 5px;
}

.operation_menu_left {
    flex: 1;
}

.compang_tag {
    .el-tag {
        margin: 5px;
    }
}
</style>