<template>
  <el-row v-loading="loading">
    <el-col :span="8">
      <el-statistic title="标签数" :value="totalTagCount" />
    </el-col>
    <el-col :span="8">
      <el-statistic title="标签记录总数" :value="totalCompanyTagCount" />
    </el-col>
    <el-col :span="8">
      <el-statistic title="已标签公司数" :value="totalTagCompanyCount" />
    </el-col>
  </el-row>
  <div class="search">
    <div class="flex">
      <el-input placeholder="公司名" v-model="searchName" clearable @change="onClickSearch" />
      <div class="operation_menu">
        <div class="operation_menu_left">
          <el-switch v-model="showAdvanceSearch" active-text="高级搜索" inactive-text="普通搜索" inline-prompt />
        </div>
        <div>
          <el-button type="primary" @click="onAddHandle">新增</el-button>
          <el-popconfirm title="确认删除选中的数据？" @confirm="onBatchDelete" confirm-button-text="确定" cancel-button-text="取消">
            <template #reference>
              <el-button type="danger">删除</el-button>
            </template>
          </el-popconfirm>
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
        <div class="tagWrapper">
          <TagInput ref="tagRef" v-model="searchTag" :settings="tagSettings" :whitelist="whitelist" placeholder="请选择标签"
            @value-change="search"></TagInput>
        </div>
      </el-collapse-item>
    </el-collapse>
  </div>
  <div class="content">
    <el-scrollbar class="tableScrollbar">
      <el-table ref="tableRef" :data="tableData" :default-sort="{ prop: 'updateDatetime', order: 'descending' }"
        style="width: 100%" stripe @sort-change="sortChange" sortable="custom">
        <el-table-column type="selection" width="55" />
        <el-table-column label="公司全称" show-overflow-tooltip property="companyName">
          <template #default="scope">
            <el-text line-clamp="1">
              {{ scope.row.companyName }}
            </el-text>
          </template>
        </el-table-column>
        <el-table-column prop="tagNameArray" label="标签" property="tagNameArray">
          <template #default="scope">
            <div>
              <el-text class="compang_tag">
                <el-tag v-for="(value, key, index) in scope.row.tagNameArray" type="primary">{{ value
                  }}</el-tag>
              </el-text>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="tagNameArray" label="标签数" width="100">
          <template #default="scope">
            {{ scope.row.tagNameArray.length }}
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
              编辑
            </el-button>
            <el-popconfirm title="确认删除此行数据？" @confirm="onDeleteHandle(scope.row)" confirm-button-text="确定"
              cancel-button-text="取消">
              <template #reference>
                <el-button link type="primary" size="small">删除</el-button>
              </template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>
    </el-scrollbar>
  </div>
  <el-row>
    <el-pagination v-model:current-page="currentPage" v-model:page-size="pageSize"
      :page-sizes="[10, 50, 100, 200, 500, 1000]" :small="small" :disabled="disabled" :background="background"
      layout="total, sizes, prev, pager, next" :total="total" @size-change="handleSizeChange"
      @current-change="handleCurrentChange" />
  </el-row>
  <el-dialog v-model="dialogFormVisible" :title="formTitle" width="800px">
    <el-form ref="formRef" :model="form" label-width="auto" :rules="rules">
      <el-form-item label="公司名" prop="name">
        <el-input :disabled="!formAddMode" v-model="form.name" placeholder="请输入公司名" />
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
import { onMounted, ref, computed, reactive, nextTick, onUnmounted } from "vue";
import { useTransition } from "@vueuse/core";
import { CompanyApi, TagApi } from "../../common/api/index";
import { SearchCompanyTagBO } from "../../common/data/bo/searchCompanyTagBO";
import dayjs from "dayjs";
import TagInput from "../components/TagInput.vue";
import type { FormInstance, FormRules } from 'element-plus'
import { CompanyTagBO } from "../../common/data/bo/companyTagBO";
import { genIdFromText } from "../../common/utils";

import { ElTable, ElMessage } from "element-plus";
import { utils, writeFileXLSX } from "xlsx";

const totalTagCountSource = ref(0);
const totalTagCount = useTransition(totalTagCountSource, {
  duration: 1000,
});
const totalCompanyTagCountSource = ref(0);
const totalCompanyTagCount = useTransition(totalCompanyTagCountSource, {
  duration: 1000,
});
const totalTagCompanyCountSource = ref(0);
const totalTagCompanyCount = useTransition(totalTagCompanyCountSource, {
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
const searchTag = ref([]);
const searchOrderByColumn = ref("updateDatetime");
const searchOrderBy = ref("DESC");

const showAdvanceSearch = ref(false);

const activeNames = ref(["advanceCondition"]);
const tagSettings = {
  dropdown: {
    maxItems: 30,
    classname: 'tags-look', // <- custom classname for this dropdown, so it could be targeted
    enabled: 0,             // <- show suggestions on focus
    closeOnSelect: false    // <- do not hide the suggestions dropdown once an item has been selected
  }
};
const tagRef = ref();
const whitelist = ref([]);

const handleSizeChange = (val: number) => {
  search();
};

const handleCurrentChange = (val: number) => {
  search();
};

let refreshIntervalId = null;

onMounted(async () => {
  await refreshStatistic();
  refreshIntervalId = setInterval(refreshStatistic, 10000);
  await loadWhitelist();
  search();
});

onUnmounted(() => {
  if (refreshIntervalId) {
    clearInterval(refreshIntervalId);
    refreshIntervalId = null;
  }
});

const loadWhitelist = async () => {
  let allTags = await TagApi.getAllTag();
  let tagItems = [];
  allTags.forEach(item => {
    tagItems.push({ value: item.tagName, code: item.tagId });
  });
  whitelist.value.length = 0;
  whitelist.value.push(...tagItems);
}

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
  tagRef.value.clear();
  search();
};

const search = async () => {
  let searchResult = await CompanyApi.searchCompanyTag(getSearchParam());
  tableData.value = searchResult.items;
  total.value = parseInt(searchResult.total);
};

function getSearchParam() {
  let searchParam = new SearchCompanyTagBO();
  searchParam.pageNum = currentPage.value;
  searchParam.pageSize = pageSize.value;
  searchParam.companyName = searchName.value;
  searchParam.tagIds = searchTag.value.map(item => { return item.code });
  searchParam.orderByColumn = searchOrderByColumn.value;
  searchParam.orderBy = searchOrderBy.value;
  return searchParam;
}

const refreshStatistic = async () => {
  if (firstTimeLoading.value) {
    loading.value = true;
    firstTimeLoading.value = false;
  }
  const statisticCompanyTag = await CompanyApi.statisticCompanyTag();
  totalTagCountSource.value = statisticCompanyTag.totalTag;
  totalCompanyTagCountSource.value = statisticCompanyTag.totalCompanyTagRecord;
  totalTagCompanyCountSource.value = statisticCompanyTag.totalTagCompany;
  loading.value = false;
};

const formRef = ref<FormInstance>()
const dialogFormVisible = ref(false);
const formTitle = ref("");
const formAddMode = ref(true);
const form = reactive({
  name: '',
  tagNameArray: [],
})

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
const onAddHandle = async () => {
  formAddMode.value = true;
  formTitle.value = "新增公司标签";
  dialogFormVisible.value = true;
  resetForm();
  nextTick(async () => {
    await loadWhitelist();
    resetFormValue();
  })
}

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

const onDeleteHandle = async (row: any) => {
  await CompanyApi.deleteCompanyTagByCompanyIds([row.companyId]);
  ElMessage({
    message: '数据删除成功',
    type: 'success',
  });
  search();
}

const onBatchDelete = async () => {
  let selectedRows = tableRef.value.getSelectionRows();
  if (selectedRows.length > 0) {
    let ids = selectedRows.map(item => { return item.companyId });
    await CompanyApi.deleteCompanyTagByCompanyIds(ids);
    ElMessage({
      message: `数据删除成功,共${ids.length}条`,
      type: 'success',
    });
    search();
  } else {
    ElMessage({
      message: '请选择需要删除的数据',
      type: 'warning',
    })
  }
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
      reset();
      await loadWhitelist();
    }
  })
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

const onExportHandle = () => {
  let list = tableData.value;
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

.tagWrapper {
  display: flex;
}

.content {
  display: flex;
  flex-direction: row;
  flex: 1;
  overflow: hidden;
}

.tableScrollbar {
  width: 100%;
}
</style>