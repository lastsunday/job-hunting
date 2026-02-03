# 核心逻辑

## 从网站获取数据和渲染额外信息

### 职位数据

```mermaid
sequenceDiagram
  participant browser as 浏览器
  participant extension as 插件
  autonumber
  extension ->> browser: 注册待侦测目标页面
  browser ->> browser: 打开职位列表页面
  browser ->> extension: 触发侦测目标页面事件
  extension ->> browser: 注入脚本(拦截XMLHttpRequest)到目标页面
  extension ->> extension: 初始化Extension Bridge
  browser ->> extension: 发送职位列表数据
  extension ->> extension: 监听查找职位列表界面元素
  extension ->> extension: 解析职位列表数据
  extension ->> extension: 保存职位信息到持久层
  extension ->> extension: 从持久层获取保存的职位信息
  extension ->> browser: 在职位项界面上进行自定义职位信息渲染
  extension ->> browser: 在职位项界面上进行自定义公司信息界面框架渲染
  extension ->> browser: 渲染职位评论框架
  opt
    browser ->> extension: 获取和渲染公司信息
    alt 持久层含有指定未过期的公司信息
      extension ->> extension: 从持久层获取保存的公司信息
    else
      extension ->> extension: 向公司信息服务查询公司信息
      extension ->> extension: 保存公司信息到持久层
      extension ->> extension: 从持久层获取保存的公司信息
    end
    extension ->> browser: 渲染自定义公司信息
    extension ->> browser: 渲染公司评论框架
    opt
      browser ->> extension: 获取和渲染公司评论信息
      extension ->> browser: 渲染公司评论信息
    end
  end
  opt
    browser ->> extension: 获取和渲染职位评论信息
    extension ->> browser: 渲染职位评论信息
  end
```

### 公司数据

```mermaid
sequenceDiagram
  participant browser as 浏览器
  participant extension as 插件
  autonumber
  extension ->> browser: 注册待侦测目标页面
  browser ->> browser: 打开公司列表页面
  browser ->> extension: 触发侦测目标页面事件
  extension ->> browser: 注入脚本(拦截XMLHttpRequest)到目标页面
  extension ->> extension: 初始化Extension Bridge
  browser ->> extension: 发送公司列表数据
  extension ->> extension: 监听查找公司列表界面元素
  extension ->> extension: 解析公司列表数据
  alt 持久层含有指定未过期的公司信息
    extension ->> extension: 从持久层获取保存的公司信息
  else
    extension ->> extension: 向公司信息服务查询公司信息
    extension ->> extension: 保存公司信息到持久层
    extension ->> extension: 从持久层获取保存的公司信息
  end
  extension ->> browser: 在公司项界面上进行自定义公司信息渲染
  extension ->> browser: 渲染自定义公司信息
  extension ->> browser: 渲染公司评论框架
  opt
    browser ->> extension: 获取和渲染公司评论信息
    extension ->> browser: 渲染公司评论信息
  end
```

## 自定义职位卡片渲染

```text
┌────────────────────────────────────────────────────────────────┐
│                                                │ Job extra info│
│────────────────────────────────────────────────────────────────│
│                     Job info                                   │
│                                                                │
│────────────────────────────────────────────────────────────────│
│                     Company info                               │
│                                                                │
│                                                                │
│                                                                │
│────────────────────────────────────────────────────────────────│
│ Company evaluation checking                                    │
│────────────────────────────────────────────────────────────────│
│ Company tag                                                    │
│────────────────────────────────────────────────────────────────│
│                   Othre|Company comment| Online company comment│
│────────────────────────────────────────────────────────────────│
│ Job tag                                                        │
│────────────────────────────────────────────────────────────────│
│ Job browse statistics ===                           Job Comment│
└────────────────────────────────────────────────────────────────┘
```

1. 监听职位列表元素
   ▲

   | 平台                     | 职位列表元素定位      | 备注 |
   | ------------------------ | --------------------- | ---- |
   | 前程无忧                 | .joblist              |      |
   | BOSS 直聘                | .rec-job-list         |      |
   | 猎聘网                   | .job-list-box         |      |
   | 智联招聘                 | .positionlist\_\_list |      |
   | 拉勾网                   | .list\_\_YibNq        |      |
   | 就业在线                 | .position-wrap        |      |
   | 广东公共求职招聘服务平台 | .ant-list-items       |      |

1. 为职位列表容器设置 flex 布局(使得在不改变 dom 结构的情况下，通过设置 css 的 order 属性来达到改变职位项前后位置)
1. 渲染`加载中`元素
1. 渲染职位额外信息
   1. 进行年龄限制的检测渲染
   1. 对职位时间进行处理渲染（初见时间/发布时间）
   1. Hr 活跃时间渲染
   1. 职位的公司信息（外包/培训机构）渲染
   1. 对职位时间进行染色
   1. 职位分析检测和渲染
1. 隐藏`加载中`元素
1. 修改职位卡片 css 的 order 属性，对职位卡片进行排序
1. 渲染底部功能栏
   1. 渲染 logo
   1. 公司信息渲染
      1. 查询公司信息按钮渲染
      1. 对公司名处理
      1. 公司详情渲染
      1. 公司标签渲染(其他人/我)
      1. 公司风评渲染
      1. 其他途径查询弹窗渲染
      1. 在线公司评论按钮渲染
   1. 职位标签渲染(其他人/我)
   1. 职位查看和展示次数渲染
1. 最终渲染
   1. 职位评论按钮渲染
   1. 职位卡片渲染完成标识

## 内部 API

### 内部 API 注册与使用

#### 1. Service 注册(worker.js)

```js
const ACTION_FUNCTION = new Map();

export const WorkerBridge = {
  ping: function (message, param) {
    postSuccessMessage(message, 'pong');
  },
};

const { mergeServiceMethod } = useService();

mergeServiceMethod(ACTION_FUNCTION, WorkerBridge);
mergeServiceMethod(ACTION_FUNCTION, DataSourceMetadataService);
```

#### 2. API 注册(api/index.js)

```js
export const DataSourceMetadataApi = {
  dataSourceMetadataSearch: mockFunction,
  dataSourceMetadataAddOrUpdate: mockFunction,
  dataSourceMetadataBatchAddOrUpdate: mockFunction,
  dataSourceMetadataGetById: mockFunction,
  dataSourceMetadataGetByIds: mockFunction,
  dataSourceMetadataDeleteById: mockFunction,
  dataSourceMetadataDeleteByIds: mockFunction,
};
fillBridgeApi({ api: DataSourceMetadataApi });
```

#### 3. API 使用

> [!IMPORTANT]
> 通过 API 方法来调用 Service 方法

```js
const param = new DataSourceMetadataSearchBO();
param.enable = true;
param.orderByColumn = 'seq';
param.orderBy = 'ASC';
const result = await DataSourceMetadataApi.dataSourceMetadataSearch(param);
```

#### 约束

1. 方法名约定： ClassName+MethodName，如 DataSourceMetadataApi
   - ClassName: DataSourceMetadata
   - MethodName: Search
   - 结果为: dataSourceMetadataSearch
1. 方法传入参数类型约定: JSONObject 或其他基本数据类型
1. 方法都为 async function

#### 原理

- 利用 JSONObject 的 keys,value 进行 Service 方法的绑定

```js
const fillBridgeApi = ({ api = {} } = {}) => {
  const keys = Object.keys(api);
  keys.forEach((invokeName) => {
    api[invokeName] = async (param) => {
      const result = await invoke(invokeName, param);
      return result.data;
    };
  });
  return api;
};
```

- 手动声明进行 Service 方法绑定

```js
export const JobSnapshotApi = {
  jobSnapshotDeleteByIds: async function (param) {
    const result = await invoke(this.jobSnapshotDeleteByIds.name, param);
    return result.data;
  },
};
```

- 利用方法名来定位 Service 和 Service 方法: className+MethodName

### 内部 API 调用原理

> [!IMPORTANT]
> action = className+MethodName

#### 从 ContentScript 调用

```mermaid
sequenceDiagram
  participant Api
  participant ContentScript
  participant Background
  participant Offscreen
  participant WebWorker
  autonumber
  ContentScript ->>  Api: 调用Api方法
  Api ->> ContentScript: 调用invoke方法，传递action,param
  ContentScript ->> ContentScript: 生成callbackId和Promise
  ContentScript ->> ContentScript: 关联callbackId和当前生成的Promise
  ContentScript ->> Background: 发送Message
  alt 如果Background可以处理该Message
    Background ->> Background: 处理Message
    Background -->> ContentScript: 返回处理后的Message
  else
    Background ->> Offscreen: 转发Message
    Offscreen ->> WebWorker: 转发Message
    WebWorker ->> WebWorker: 处理Message
    WebWorker -->> Offscreen: 返回处理后的Message
    Offscreen -->> Background: 转发处理后的Message
    Background -->> ContentScript: 转发处理后的Message
  end
  ContentScript ->> ContentScript:根据返回Message的callbadkId查找Promise
  alt 如果Message含有error
    ContentScript ->> Api:调用Promise.reject返回错误
  else
    ContentScript ->> Api:调用Promise.resolve返回结果
  end
```

#### 从 Background 调用

```mermaid
sequenceDiagram
  participant Api
  participant Background
  participant Offscreen
  participant WebWorker
  autonumber
  Background ->>  Api: 调用Api方法
  Api ->> Background: 调用invoke方法，传递action,param
  Background ->> Background: 生成callbackId和Promise
  Background ->> Background: 关联callbackId和当前生成的Promise
  Background ->> Offscreen: 发送Message
  Offscreen ->> WebWorker: 转发Message
  WebWorker ->> WebWorker: 处理Message
  WebWorker -->> Offscreen: 返回处理后的Message
  Offscreen -->> Background: 转发处理后的Message
  Background ->> Background:根据返回Message的callbadkId查找Promise
  alt 如果Message含有error
    Background ->> Api:调用Promise.reject返回错误
  else
    Background ->> Api:调用Promise.resolve返回结果
  end
```

#### 从 WebWorker 调用

> [!IMPORTANT]
>
> - Webworker 发起的 Api 调用不会经过 ContentScript,Background,Offscreen 这些模块的处理流程
> - 调用的方法仅限于 Github Api (仅执行网络访问)

#### 对大 Message 传递的处理

> [!IMPORTANT]
>
> <https://github.com/lastsunday/job-hunting/commit/ae0cee1>

## 内嵌数据库

### SQL Class

```mermaid
---
title: Database
---
classDiagram
    class Database
    Database: +initDb$({ dataDir } = {})
    Database: +getOne$(sql, bind, obj, { connection = null } = {})
    Database: +getAll$(sql, bind, obj, { connection = null } = {})
    Database: +batchInsert$(obj, tableName, params, { overrideCreateDatetime = false, overrideUpdateDatetime = false, connection = null } = {})
    Database: +batchInsertOrReplace$(obj, tableName, tableIdColumn, params, { replace = true, overrideCreateDatetime = false, overrideUpdateDatetime = false, connection = null } = {})
    Database: +one$(entity, tableName, idColumn, id, { connection = null } = {})
    Database: +all$(entity, tableName, orderBy, { connection = null } = {})
    Database: +batchGet$(obj, tableName, idColumnName, ids, { connection = null } = {})
    Database: +del$(tableName, idColumn, id, { otherCondition = null, connection = null } = {})
    Database: +batchDel$(tableName, idColumn, ids, { otherCondition = null, connection = null } = {})
    Database: +search$(entity, tableName, param, whereConditionFunction, { connection = null } = {})
    Database: +searchCount$(entity, tableName, param, whereConditionFunction, { connection = null } = {})
    Database: +sort$(tableName, idColumnName, param, { connection = null } = {})
    Database: +innerInit({ dataDir } = {})
    Database: +dbExport(message, param)
    Database: +dbImport(message, param)
    Database: +dbClose(message, param)
    Database: +dbDelete(message, param)
    Database: +dbSize(message, param)
    Database: +dbSchemaVersion(message, param)
    Database: +dbExec(message, param)
    Database: +dbGetAllTableName(message, param)

    class BaseService
    BaseService: +constructor(tableName, tableIdColumn, entityClassCreateFunction, searchDTOCreateFunction, whereConditionFunction)
    BaseService: +search(message, param, { detailInjectAsyncCallback = null, entityClassCreateFunction = null } = {})
    BaseService: +count(message, param)
    BaseService: +getOne(message, param, column)
    BaseService: +getById(message, param)
    BaseService: +getByIds(message, param)
    BaseService: +addOrUpdate(message, param)
    BaseService: +deleteById(message, id, column)
    BaseService: +deleteByIds(message, ids, column)
    BaseService: #_search(param, { detailInjectAsyncCallback = null, connection = null, entityClassCreateFunction = null } = {})
    BaseService: #_count()
    BaseService: #_getOne(param, column)
    BaseService: #_getById(param, { connection = null } = {})
    BaseService: #_getByIds(param, { connection = null } = {})
    BaseService: #_deleteById(id, column, { otherCondition, connection = null } = {})
    BaseService: #_deleteByIds(ids, column, { connection = null, otherCondition = null } = {})
    BaseService: #_updateByIds(ids, column, { otherCondition })
    BaseService: #_addOrUpdate(param, { overrideUpdateDatetime = false, overrideCreateDatetime = false, connection = null } = {})
    BaseService: #_batchAddOrUpdate(params, { connection = null, overrideCreateDatetime = false, overrideUpdateDatetime = false, genIdFunction = null, entityClassCreateFunction = null } = {})

    class BaseBridgeService
    BaseBridgeService: +constructor(baseServiceInstance, serviceName)
    BaseBridgeService: +getMethodName(name)
    BaseBridgeService: +getMethodNameMap()
    BaseBridgeService: +addServiceMethod$({ bridgeService = null, methodName = null, methodFunction = async ({ param = null } = {}) => { } } = {})
    BaseBridgeService: +addTransactionServiceMethod$({ bridgeService = null, methodName = null, methodFunction = async ({ param = null, tx = null } = {}) => { } } = {})
    BaseBridgeService: +fillBaseServiceMethod$({ bridgeService = null, overrideUpdateDatetime = false, overrideCreateDatetime = false } = {})

    BaseService ..> Database
    BaseBridgeService ..> BaseService

```

#### Service 实现

```js
import { DataSourceMetadataSearchBO } from '@/common/data/bo/dataSourceMetadataSearchBO';
import { DataSourceMetadata } from '@/common/data/domain/dataSourceMetadata';
import BaseBridgeService, { fillBaseServiceMethod } from './baseBridgeService';
import { BaseService } from './baseService';
import {
  genEqValueConditionSql,
  genInTextSql,
  genLikeSql,
  genRangeDatetimeConditionSql,
} from './sqlUtil';
const TABLE_NAME = 'data_source_metadata';
const TABLE_ID_COLUMN = 'id';
const SERVICE_NAME = 'dataSourceMetadata';
export const SERVICE_INSTANCE = new BaseService(
  TABLE_NAME,
  TABLE_ID_COLUMN,
  () => {
    return new DataSourceMetadata();
  },
  () => {
    return new DataSourceMetadataSearchBO();
  },
  (param) => {
    let whereCondition = ''.concat(
      genInTextSql(param.id, 'id'),
      genLikeSql(param.name, 'name'),
      genEqValueConditionSql(param.enable, 'enable'),
      genInTextSql(param.type, 'type'),
      genEqValueConditionSql(param.autoUpdateEnable, 'auto_update_enable'),
      genRangeDatetimeConditionSql(
        param.startDatetimeForCreate,
        param.endDatetimeForCreate,
        'create_datetime'
      ),
      genRangeDatetimeConditionSql(
        param.startDatetimeForUpdate,
        param.endDatetimeForUpdate,
        'update_datetime'
      )
    );
    return whereCondition;
  }
);
const DataSourceMetadataService = new BaseBridgeService(
  SERVICE_INSTANCE,
  SERVICE_NAME
);
fillBaseServiceMethod({
  bridgeService: DataSourceMetadataService,
  overrideCreateDatetime: true,
  overrideUpdateDatetime: true,
});

export default DataSourceMetadataService;
```

#### ORM 机制

1. 例子

```js
const company = new Company();
await CompanyApi.addOrUpdateCompany(company);

//companyService
const SERVICE_INSTANCE = new BaseService(
  'company',
  'company_id',
  () => {
    return new Company();
  },
  () => {
    return new SearchCompanyDTO();
  },
  null
);

export const CompanyService = {
  addOrUpdateCompany: async function (message, param) {
    try {
      await SERVICE_INSTANCE._batchAddOrUpdate([param]);
      postSuccessMessage(message, {});
    } catch (e) {
      postErrorMessage(
        message,
        '[worker] addOrUpdateCompany error : ' + e.message
      );
    }
  },
};
```

1. 当前实现的特性

   1. 根据 JSONObject 进行 SQL 查询，新增，更新，删除

1. 底层原理

   1. 利用 JSONObject 的 keys,value 来识别列名，字段类型和内容。通过此来进行 SQL 的生成和返回结果 JSONObject 的生成
   1. JSONObject 属性名采用小驼峰命名法（lowerCamelCase）
   1. 表字段名采用下划线命名法（Snake Case）
   1. SQL 插入字段的值位置采用下标定位的方式，如$1
   1. 分页采用 LIMIT,OFFSET

### Schema Changes

```js
const changelogList = getChangeLogList();
let oldVersion = 0;
const newVersion = changelogList.length;
try {
  await db.transaction(async (tx) => {
    const SQL_CREATE_TABLE_VERSION = `
          CREATE TABLE IF NOT EXISTS version(
          num INTEGER
        )
      `;
    await tx.exec(SQL_CREATE_TABLE_VERSION);
    const SQL_QUERY_VERSION = 'SELECT num FROM version';
    const result = await tx.query(SQL_QUERY_VERSION);
    const rows = result.rows;
    if (rows.length > 0) {
      oldVersion = rows[0].num;
    } else {
      const SQL_INSERT_VERSION = `INSERT INTO version(num) values($1)`;
      await tx.query(SQL_INSERT_VERSION, [0]);
    }
    infoLog(
      '[DB] schema oldVersion = ' + oldVersion + ', newVersion = ' + newVersion
    );
    if (newVersion > oldVersion) {
      infoLog('[DB] schema upgrade start');
      for (let i = oldVersion; i < newVersion; i++) {
        const currentVersion = i + 1;
        const changelog = changelogList[i];
        const sqlList = changelog.getSqlList();
        infoLog(
          '[DB] schema upgrade changelog version = ' +
            currentVersion +
            ', sql total = ' +
            sqlList.length
        );
        for (let seq = 0; seq < sqlList.length; seq++) {
          infoLog(
            '[DB] schema upgrade changelog version = ' +
              currentVersion +
              ', execute sql = ' +
              (seq + 1) +
              '/' +
              sqlList.length
          );
          const sql = sqlList[seq];
          await tx.exec(sql);
        }
      }
      const SQL_UPDATE_VERSION = `UPDATE version SET num = $1`;
      await tx.query(SQL_UPDATE_VERSION, [newVersion]);
      infoLog('[DB] schema upgrade finish to version = ' + newVersion);
      infoLog('[DB] current schema version = ' + newVersion);
    } else {
      infoLog('[DB] skip schema upgrade');
      infoLog('[DB] current schema version = ' + oldVersion);
    }
  });
} catch (e) {
  errorLog('[DB] schema upgrade fail,' + e.message);
}
```

1. ChangeLog 文件

   1. 文件格式: ChangeLog+V+版本号 = ChangeLogVxxx.js
   1. 例子

      ```js
      export class ChangeLogV1 extends ChangeLog {
        getSqlList() {
          let sqlList = [
            SQL_CREATE_TABLE_JOB,
            SQL_CREATE_TABLE_JOB_BROWSE_HISTORY,
          ];
          return sqlList;
        }
      }
      ```

1. ChangeLog 执行规则
   1. 将需要执行的 ChangeLog 存放到列表中
   1. 开启事务，以确保 ChangeLog 的执行的原子性
   1. 通过计算 ChangeLog 列表的总数与当前数据库版本号（版本号为上一次执行 ChangLog 的数量）进行对比计算，来获取当前需要执行的 ChangeLog
   1. 执行完成后，更新数据库版本号（版本号即为已执行 ChangeLog 的数量）

### 备份

> [!IMPORTANT]
> 当前使用 pglite dump 备份大量数据的数据库会出错

TODO

## 内部任务系统

```mermaid
---
title: Task System
---
sequenceDiagram
  participant Service
  participant Database
  participant GitHubApi
  participant GitService

  Note right of Service: 计算和保存下载和上传任务
  Service ->> Database: 获取数据同步配置
  Database -->> Service: 返回数据同步配置
  opt if 开启私有数据同步
    Service ->> Database: 获取用户信息
    Database -->> Service: 返回用户信息
    Service ->> Service: 获取私有数据上传任务类型
    opt if 需要同步私有的数据
      Service ->> Service: 获取私有数据仓库名
      Service ->> GitHubApi: 尝试根据用户名和仓库名创建私有数据仓库
      loop 私有数据上传任务类型
        rect rgb(191, 223, 255)
          Note right of Service: 计算并保存上传任务
          Service ->> Database: 根据用户名，仓库名获取指定任务类型最近上传任务截至时间
          Database -->> Service: 返回最近上传任务截至时间
          opt if 最近上传任务截至时间不为今天
            Service ->> GitService: 根据用户名，仓库名和获取指定任务类型最近上传文件时间
            GitService -->> Service: 返回最近上传文件时间
            Service ->> Service: 在最近上传任务截至时间和最近上传文件时间取最小值，作为任务开始时间
            Service ->> Database: 根据用户名，仓库名，任务类型，任务开始时间，任务结束时间（今天）保存任务记录
          end
        end
      end
      Service ->> Service: 获取私有数据下载任务类型
      Service ->> Service: 将私有数据下载任务保存到下载列表
    end
  end
  alt if 是否开启公开数据同步
    Service ->> Database: 获取用户信息
    Database -->> Service: 返回用户信息
    Service ->> Service: 获取公开数据上传任务类型
    opt if 有需要同步公开的数据
      Service ->> Service: 获取公开数据仓库名
      Service ->> GitHubApi: 尝试根据用户名和仓库名创建公开数据仓库
      loop 公开数据上传任务类型
        rect rgb(191, 223, 255)
          Note right of Service: 计算并保存上传任务
        end
      end
      Service ->> Service: 获取公开数据下载任务类型
      Service ->> Service: 将公开数据下载任务保存到下载列表
    end
  end
  Service ->> Database: 获取数据共享伙伴列表
  Database -->> Service: 返回数据共享伙伴列表
  Service ->> Service: 将数据共享伙伴数据的下载任务保存到下载列表
  loop 下载列表
    Service ->> Service: 根据下载列表获取伙伴信息
    Service ->> Service: 根据下载列表获取下载任务类型
    loop 下载任务类型
      rect rgb(191, 255, 223)
        Note right of Service: 计算并保存下载任务
        Service ->> GitService: 根据任务类型或文件名查询日期目录列表
        GitService -->> Service: 返回日期目录列表
        Service ->> Service: 根据下载历史文件保留天数和当前日期过滤和升序日期列表，获得仓库文件日期列表
        Service ->> Service: 根据仓库文件日期列表，获取开始时间(列表中最小时间)和结束时间(列表中最大时间)
        Service ->> Database: 根据开始时间和结束时间查询指定类型的下载任务列表
        Database -->> Service: 返回下载任务列表
        Service ->> Service: 根据仓库文件日期列表和下载任务列表的日期计算得出本地缺失日期列表
        Service ->> Database: 根据本地缺失日期列表，新增指定类型的下载任务
      end
    end
  end
  Service ->> Database: 获取数据源元数据自动更新列表
  Database -->> Service: 返回数据源元数据自动更新列表
  loop 数据源元数据自动更新列表
      rect rgb(255, 223,191)
        Note right of Service: 计算并保存元数据下载任务
        Service ->> Database: 根据任务类型编号获取最近下载任务列表
        Database -->> Service: 返回下载任务列表
        opt if 任务列表中含有非今天未完成的任务
          Service ->> Database: 将未完成的任务状态设置为取消
        end
        opt if 任务列表中没有今天未完成的任务
          Service ->> Database: 新增数据源元数据下载任务
        end
      end
  end
  Note right of Service: 执行下载和上传任务
  Service ->> Database: 查询需要执行的任务
  Database -->> Service: 返回需要执行的任务
  Service ->> Service: 执行查询到的需要执行的任务
  Note right of Service: 执行定时任务
  Service ->> Database: 查询已合并但未删除的文件
  Database -->> Service: 返回已合并但未删除的文件
  Service ->> Service: 根据历史文件保留数量和最大历史文件保留容量计算需要删除的文件列表
  Service ->> Database: 根据需要删除的文件列表删除文件
```

1. 数据结构

TODO

## 数据同步

## 数据导入与导出

## Oauth

## BBS 系统

## 自动化

## LLM
