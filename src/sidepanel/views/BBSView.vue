<template>
  <div class="search">
    <div class="flex">
      <el-cascader class="locationInput" v-model="location" :options="options" :props="props" @change="handleChange"
        placeholder="请选择地区/城市" />
      <div class="operation_menu">
        <div>
          <el-button type="primary" @click="onAddHandle">新增讨论</el-button>
          <el-button @click="reset">重置</el-button>
          <el-button @click="onClickSearch"><el-icon>
              <Search />
            </el-icon></el-button>
        </div>
      </div>
    </div>
  </div>
  <div class="content" v-loading="loading">
    <div v-for="(item, index) in tableData" class="commentWrapper" :key="item.id">
      <div class="avatarWrapper">
        <el-avatar :size="50" :src="item.author.avatarUrl" />
      </div>
      <div class="commentHeaderWrapper">
        <div class="commentHeader">
          <div class="username">{{ item.author.login }}
            <span v-if="!isMe(item.author.login)">
              <span class="partnerExists" v-if="isDataSharePlanPartner(item.author.login)">
                <el-tooltip :content="`${item.author.login}已加入你的数据共享计划伙伴名单`">
                  <Icon icon="carbon:partnership" width="20" height="20" />
                </el-tooltip>
              </span>
              <span v-else class="partnerAdd">
                <el-popconfirm width="300" :title="`确认将${item.author.login}加入你的数据共享计划伙伴名单？`"
                  @confirm="handleAddPartner(item.author.login)" confirm-button-text="确定" cancel-button-text="取消">
                  <template #reference>
                    <Icon icon="basil:add-outline" width="20" height="20" />
                  </template>
                </el-popconfirm>
              </span>
            </span>
          </div>
          <div class="createTime"><el-tooltip :content="datetimeFormatHHMMSS(item.createdAt)">{{
            convertTimeOffsetToHumanReadable(item.createdAt) }} </el-tooltip></div>
          <el-link :href="item.bodyUrl" target="_blank" class="source">来源</el-link>
        </div>
        <div class="commentBottom">
          <div class="issuesCommentContent" v-html="item.bodyHTML"></div>
          <div class="issuesCommentWrapper">
            <IssuesComment :issues="item" :key="item.id"></IssuesComment>
          </div>
        </div>
      </div>
    </div>
    <el-empty v-if="tableData.length == 0" description="没有数据" />
  </div>
  <div class="pagingWrapper">
    <el-text>共 {{ total }} 条</el-text>
    <Icon :class="previousPageButtonClass" icon="solar:alt-arrow-left-outline" @click="onPagePrevious" />
    <Icon :class="nextPageButtonClass" icon="solar:alt-arrow-right-outline" @click="onPageNext" />
  </div>
  <el-dialog v-model="dialogFormVisible" :title="formTitle" width="800px">
    <el-form ref="formRef" :model="form" label-width="auto" :rules="rules">
      <el-form-item label="内容" prop="content">
        <el-input :disabled="!formAddMode" v-model="form.content" style="width: 100%" :rows="5" type="textarea"
          placeholder="请输入讨论内容" />
      </el-form-item>
    </el-form>
    <template #footer>
      <div class="dialog-footer">
        <el-button @click="dialogFormVisible = false">取消</el-button>
        <el-button type="primary" :loading="confirmLoading" @click="confirmAdd(formRef)">
          确定
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>
<script lang="ts" setup>
import { ref, onMounted, reactive, toRaw, computed } from 'vue'
import pcaCodeData from "../assets/data/pca-code.json";
import hkMoTw from "../assets/data/HK-MO-TW.json";
import { COMMENT_PAGE_SIZE, DEFAULT_DATA_REPO, DEFAULT_REPO_TYPE } from "../../common/config";
import { genIdFromText } from "../../common/utils";
import { GithubApi, EXCEPTION } from "../../common/api/github";
import { ConfigApi, UserApi } from "../../common/api";
import { ElMessage } from "element-plus";
import { Icon } from '@iconify/vue';
import dayjs from "dayjs";
import IssuesComment from "../components/IssuesComment.vue";
import { errorLog } from "../../common/log";
import { Config } from "../../common/data/domain/config";
import { BBSViewDTO } from "../dto/bbsViewDTO";
import { convertTimeOffsetToHumanReadable } from "../../common/utils";
import { MAX_RECORD_COUNT } from "../../common";
import { DataSharePartner } from "../../common/data/domain/dataSharePartner";
import { SearchDataSharePartnerBO } from "../../common/data/bo/searchDataSharePartnerBO";
import { DataSharePartnerApi } from "../../common/api";

const location = ref(["北京市"])
const options = ref([]);
const props = {
  value: "name",
  label: "name",
  expandTrigger: 'hover' as const,
  checkStrictly: true,
}

const loading = ref(false);
const pageSize = ref(COMMENT_PAGE_SIZE);
const total = ref(0);
const tableData = ref([]);

const datetimeFormatHHMMSS = computed(() => {
  return function (value: string) {
    return dayjs(value).isValid() ? dayjs(value).format("YYYY-MM-DD HH:mm:ss") : "-";
  };
});

const searchParam = reactive({
  first: COMMENT_PAGE_SIZE,
  after: null,
  last: null,
  before: null,
  id: null,
})

const pageInfo = reactive({
  endCursor: null,
  hasNextPage: null,
  hasPreviousPage: null,
  startCursor: null,
});

const handleChange = async (value) => {
  let configFromStorage = await ConfigApi.getConfigByKey(CONFIG_KEY_VIEW_BBS);
  let bbsViewDTO = new BBSViewDTO();
  let configObject = configFromStorage;
  if (!configObject) {
    configObject = new Config();
    configObject.key = CONFIG_KEY_VIEW_BBS;
  } else {
    if (configObject.value) {
      try {
        bbsViewDTO = JSON.parse(configObject.value);
      } catch (e) {
        errorLog(e);
      }
    }
  }
  bbsViewDTO.location = value;
  configObject.value = JSON.stringify(bbsViewDTO);
  await ConfigApi.addOrUpdateConfig(configObject);
  resetParam();
  search();
}

const onClickSearch = () => {
  search();
}

const previousPageButtonClass = reactive({
  "paging_icon": true,
  "paging_icon_disable": true
})

const nextPageButtonClass = reactive({
  "paging_icon": true,
  "paging_icon_disable": true
})

const dataSharePartnerMap = ref(new Map());
const isDataSharePlanPartner = computed(() => {
  return function (value: string) {
    return dataSharePartnerMap.value.has(value);
  };
})

const isMe = computed(() => {
  return function (value: string) {
    if (myInfo.value) {
      return myInfo.value.login == value;
    } else {
      return false;
    }
  }
})

const search = async () => {
  loading.value = true;
  let param = getSearchParam();
  try {
    let result = await GithubApi.queryComment(param);
    total.value = result.search.issueCount;
    tableData.value = result.search.nodes;
    const { startCursor, endCursor, hasNextPage, hasPreviousPage } = result.search.pageInfo;
    pageInfo.startCursor = startCursor;
    pageInfo.endCursor = endCursor;
    pageInfo.hasNextPage = hasNextPage;
    pageInfo.hasPreviousPage = hasPreviousPage;
    previousPageButtonClass["paging_icon_disable"] = !pageInfo.hasPreviousPage;
    nextPageButtonClass["paging_icon_disable"] = !pageInfo.hasNextPage;
    if (tableData.value.length > 0) {
      //获取数据共享计划伙伴
      let searchParam = new SearchDataSharePartnerBO();
      searchParam.pageNum = 1;
      searchParam.pageSize = MAX_RECORD_COUNT;
      searchParam.usernameList = tableData.value.flatMap(item => item.author.login);
      searchParam.orderByColumn = "updateDatetime";
      searchParam.orderBy = "DESC";
      let partnerResult = await DataSharePartnerApi.searchDataSharePartner(searchParam);
      let partnerResultItems = partnerResult.items;
      dataSharePartnerMap.value.clear();
      for (let i = 0; i < partnerResultItems.length; i++) {
        let item = partnerResultItems[i];
        dataSharePartnerMap.value.set(item.username, null);
      }
    }
  } catch (e) {
    if (e == EXCEPTION.NO_LOGIN) {
      ElMessage({
        message: '需要登录GitHub',
        type: 'warning',
      })
    } else {
      ElMessage({
        message: '查询失败',
        type: 'error',
      })
      throw e;
    }
  } finally {
    loading.value = false;
  }
}

const onPageNext = () => {
  if (pageInfo.hasNextPage) {
    searchParam.first = pageSize.value;
    searchParam.last = null;
    searchParam.after = toRaw(pageInfo).endCursor;
    searchParam.before = null;
    search();
  }
}

const onPagePrevious = () => {
  if (pageInfo.hasPreviousPage) {
    searchParam.first = null;
    searchParam.last = pageSize.value;
    searchParam.after = null;
    searchParam.before = toRaw(pageInfo).startCursor;
    search();
  }
}

const getSearchParam = () => {
  let id = getLocationId();
  if (id) {
    searchParam.id = id;
    return toRaw(searchParam);
  } else {
    throw "请选择城市/地区";
  }
}

const getLocationId = () => {
  if (location.value) {
    let id = "";
    location.value.forEach(item => {
      id += `${genIdFromText(item)}-`;
    });
    return id.slice(0, -1);
  } else {
    return null;
  }
}

const resetParam = () => {
  searchParam.first = pageSize.value;
  searchParam.after = null;
  searchParam.last = null;
  searchParam.before = null;
  searchParam.id = null;
}

const reset = () => {
  resetParam();
  search();
}

const CONFIG_KEY_VIEW_BBS = "CONFIG_KEY_VIEW_BBS";
const config = ref(<BBSViewDTO>{});
const myInfo = ref();

onMounted(async () => {
  try {
    let configValue = await ConfigApi.getConfigByKey(CONFIG_KEY_VIEW_BBS);
    if (configValue && configValue.value) {
      config.value = JSON.parse(configValue.value);
      location.value = config.value.location;
    }
  } catch (e) {
    errorLog(e);
  }
  options.value.push(...pcaCodeData, ...genHK_MO_TW_CodeName(hkMoTw));
  myInfo.value = await UserApi.userGet();
  search();
});

const genHK_MO_TW_CodeName = (provinces) => {
  let provincesList = [];
  let provincesKeys = Object.keys(provinces);
  provincesKeys.forEach(element => {
    let provincesResult = { code: element, name: element, children: [] };
    let city = provinces[element];
    let cityKeys = Object.keys(city);
    cityKeys.forEach(element => {
      let cityResult = { code: element, name: element, children: [] };
      let area = city[element];
      area.forEach(element => {
        let areaResult = { code: element, name: element };
        cityResult.children.push(areaResult)
      })
      provincesResult.children.push(cityResult);
    });
    provincesList.push(provincesResult);
  });
  return provincesList;
}

const formRef = ref<FormInstance>()
const dialogFormVisible = ref(false);
const formTitle = ref("");
const formAddMode = ref(true);
const form = reactive({
  content: '',
})

const validateContent = (rule: any, value: any, callback: any) => {
  let message = "讨论内容过短，至少10个字符";
  if (value === '') {
    callback(new Error(message));
  } else if (value.length < 10) {
    callback(new Error(message));
  } else {
    callback();
  }
}

const rules = reactive<FormRules<typeof form>>({
  content: [
    { required: true, validator: validateContent, trigger: 'blur' }
  ],
})

const onAddHandle = async () => {
  resetForm();
  formAddMode.value = true;
  formTitle.value = "新增讨论";
  dialogFormVisible.value = true;
}

const resetForm = () => {
  if (formRef.value) {
    formRef.value.resetFields();
  }
}

const confirmLoading = ref(false);

const confirmAdd = async (formEl: FormInstance | undefined) => {
  if (!formEl) return
  formEl.validate(async (valid) => {
    if (valid) {
      let id = getLocationId();
      if (id) {
        try {
          confirmLoading.value = true;
          await GithubApi.addComment(id, form.content);
          dialogFormVisible.value = false;
          ElMessage({
            message: '新增讨论成功',
            type: 'success',
          })
          loading.value = true;
          //延迟2秒重新查询
          setTimeout(() => {
            reset();
          }, 2000);
        } catch (e) {
          ElMessage({
            message: e,
            type: 'error',
          })
        }
        finally {
          confirmLoading.value = false;
        }
      } else {
        ElMessage({
          message: '请选择城市/地区',
          type: 'warning',
        })
        throw "请选择城市/地区";
      }

    }
  })
}

const handleAddPartner = async (username) => {
  try {
    let entity = new DataSharePartner();
    entity.username = username;
    entity.reponame = DEFAULT_DATA_REPO;
    entity.repoType = DEFAULT_REPO_TYPE;
    await DataSharePartnerApi.dataSharePartnerAddOrUpdate(entity);
    ElMessage({
      message: `添加数据合作计划伙伴${username}成功`,
      type: 'success',
    })
    search();
  } catch (e) {
    errorLog(e);
    ElMessage({
      message: `添加数据合作计划伙伴${username}失败`,
      type: 'error',
    })
  }
}

</script>
<style lang="scss" scoped>
.locationInput {
  display: flex;
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

.pagingWrapper {
  padding: 5px;
  display: flex;
}

.paging_icon {
  width: 20px;
  height: 20px;
  cursor: pointer;
}

.paging_icon_disable {
  color: gray;
  cursor: no-drop;
}

.commentWrapper {
  display: flex;
  padding: 10px;
  padding-top: 10px;
}

.avatarWrapper {
  padding: 5px;
}

.commentHeaderWrapper {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.commentHeader {
  display: flex;
  flex-direction: row;
  padding: 5px;
  border-bottom: 0.5px solid black;
}

.username {
  display: flex;
  padding-left: 5px;
  padding-right: 5px;
}

.createTime {
  flex: 1;
}

.source {
  padding-right: 5px;
}

.commentBottom {
  border-top-width: 0;
  padding: 5px;
}

.issuesCommentWrapper {
  display: flex;
  justify-content: end;
}

.issuesCommentContent {
  font-size: 14px;
}

.content {
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow: auto;
}

.partnerExists {
  color: var(--el-color-success);
}

.partnerAdd {
  color: var(--el-color-primary);
}
</style>