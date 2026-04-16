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

### 任务状态图

```mermaid
---
title: Task state
---
stateDiagram-v2
    [*] --> READY
    READY --> RUNNING
    READY --> CANCEL
    RUNNING --> FINISHED
    RUNNING --> FINISHED_BUT_ERROR
    RUNNING --> ERROR
    RUNNING --> CANCEL
    FINISHED --> [*]
    FINISHED_BUT_ERROR --> [*]
    ERROR --> [*]
    CANCEL --> [*]
```

### 数据关系图

```mermaid
---
title: Task ER
---
erDiagram
    task ||--|| task_data_upload: owns
    task {
      string(255) id PK "编号"
      string(255) type "任务类型"
      string(255) data_id FK "任务详情编号"
      string(255) status "任务状态"
      string error_reason "错误原因"
      int cost_time "耗时"
      int retry_count "重试次数"
      datetime create_datetime "创建时间"
      datetime update_datetime "更新时间"
    }
    task_data_upload {
      string(255) id PK "编号"
      string(255) type "任务类型"
      string(255) username "用户名"
      string(255) reponame "仓库名"
      datetime start_datetime "开始时间"
      datetime end_datetime "结束时间"
      int data_count "数据量"
      int data_page_num "页数"
      int data_page_size "页大小"
      datetime create_datetime "创建时间"
      datetime update_datetime "更新时间"
    }
    task ||--|| task_data_download: owns
    task_data_download {
      string(255) id PK "编号"
      string(255) type "任务类型"
      string(255) username "用户名"
      string(255) reponame "仓库名"
      datetime datetime "日期"
      int seq "序号"
      datetime create_datetime "创建时间"
      datetime update_datetime "更新时间"
      string(255) type_id "类型标识，用于识别特定文件"
      json config "配置"
      string(255) data_id FK "文件编号"
    }
    task ||--|| task_data_merge: owns
    task_data_merge {
      string(255) id PK "编号"
      string(255) type "任务类型"
      string(255) username "用户名"
      string(255) reponame "仓库名"
      datetime datetime "日期"
      string(255) data_id FK "文件编号"
      int data_count "数据量"
      int data_page_num "页数"
      int data_page_size "页大小"
      datetime create_datetime "创建时间"
      datetime update_datetime "更新时间"
      string(255) type_id "类型标识，用于识别特定文件"
      json config "配置"
    }
    task_data_merge |o--|| file: has
    file {
      string(255) id PK "编号"
      string(255) name "文件名"
      string(255) sha "散列值"
      string(255) encoding "编码"
      string content "文件内容"
      int size "文件尺寸"
      string type "文件类型"
      is_delete boolean "是否刪除"
      datetime create_datetime "创建时间"
      datetime update_datetime "更新时间"
    }
```

### 任务类型

```js
export const TASK_TYPE_JOB_DATA_UPLOAD = 'JOB_DATA_UPLOAD';
export const TASK_TYPE_JOB_DATA_DOWNLOAD = 'JOB_DATA_DOWNLOAD';
export const TASK_TYPE_JOB_DATA_MERGE = 'JOB_DATA_MERGE';

export const TASK_TYPE_COMPANY_DATA_UPLOAD = 'COMPANY_DATA_UPLOAD';
export const TASK_TYPE_COMPANY_DATA_DOWNLOAD = 'COMPANY_DATA_DOWNLOAD';
export const TASK_TYPE_COMPANY_DATA_MERGE = 'COMPANY_DATA_MERGE';

export const TASK_TYPE_COMPANY_TAG_DATA_UPLOAD = 'COMPANY_TAG_DATA_UPLOAD';
export const TASK_TYPE_COMPANY_TAG_DATA_DOWNLOAD = 'COMPANY_TAG_DATA_DOWNLOAD';
export const TASK_TYPE_COMPANY_TAG_DATA_MERGE = 'COMPANY_TAG_DATA_MERGE';

export const TASK_TYPE_JOB_TAG_DATA_UPLOAD = 'JOB_TAG_DATA_UPLOAD';
export const TASK_TYPE_JOB_TAG_DATA_DOWNLOAD = 'JOB_TAG_DATA_DOWNLOAD';
export const TASK_TYPE_JOB_TAG_DATA_MERGE = 'JOB_TAG_DATA_MERGE';

export const TASK_TYPE_JOB_PUBLIC_DATA_UPLOAD = 'JOB_PUBLIC_DATA_UPLOAD';
export const TASK_TYPE_JOB_PUBLIC_DATA_DOWNLOAD = 'JOB_PUBLIC_DATA_DOWNLOAD';
export const TASK_TYPE_JOB_PUBLIC_DATA_MERGE = 'JOB_PUBLIC_DATA_MERGE';

export const TASK_TYPE_METADATA_DATA_DOWNLOAD = 'METADATA_DATA_DOWNLOAD';
export const TASK_TYPE_METADATA_DATA_MERGE = 'METADATA_DATA_MERGE';

export const TASK_TYPE_COMPANY_COMMENT_DATA_DOWNLOAD =
  'COMPANY_COMMENT_DATA_DOWNLOAD';
export const TASK_TYPE_COMPANY_COMMENT_DATA_MERGE =
  'COMPANY_COMMENT_DATA_MERGE';
```

## 数据同步

### 数据仓库文件结构

```txt
  ├── YYYY                              //年份，格式YYYY
  │   └── MM-DD                         //月日，格式MM-DD
  │       ├─── company.zip
  │       ├─── job.zip
  │       ├─── job_tag.zip
  │       ├─── company_tag.zip
```

### Git 读取数据仓库文件结构

> <https://git-scm.com/docs/gitprotocol-v2>

```mermaid
sequenceDiagram
    participant GitService
    participant GitServer

    GitService ->> GitServer: 发送ls-refs请求
    GitServer -->> GitService: 返回refs
    GitService ->> GitService: 根据refs获取commitHash
    GitService ->> GitServer: 根据commitHash获取treesIdx
    GitServer -->> GitService: 返回treesIdx
    GitService ->> GitServer: 根据treesIdx遍历仓库目录
    GitServer -->> GitService: 返回仓库目录
    GitService -->> GitService: 根据仓库目录过滤符合日期目录的指定文件的文件列表
```

### 数据合并文件

1. 文件格式: excel
1. 文件内容格式

   | 字段名       | 字段类型 | 备注                                       |
   | ------------ | -------- | ------------------------------------------ |
   | 编号         | string   | 记录唯一标识                               |
   | xxx          | xxx      |                                            |
   | `__VERSION_` | int      | 版本号,如果该字段不存在，则会被认为第 0 版 |

1. 版本识别规则
   1. 通过版本号字段读取文件的文件字段列表
   1. 根据文件字段列表识别文件是否合法

### 数据递增规则

1. 以记录创建时间为数据增量规则
1. 各数据格式增量更新规则字段

   1. 职位

      1. `createDatetime`
      1. `updateDatetime`
      1. `isFullCompanyName`

   1. 职位公开数据

      1. `createDatetime`

   1. 职位快照

      1. `updateDatetime`

   1. 职位标签

      > 未正确实现覆盖更新

      1. `updateDatetime`

   1. 公司

      1. `sourceRefreshDatetime`

   1. 公司标签

      > 未正确实现覆盖更新

      1. `updateDatetime`

   1. 公司评论

      1. `createDatetime`

### 各数据类型版本

#### 职位

| 字段           | 类型     | 生效版本 | 格式                        |
| -------------- | -------- | -------- | --------------------------- |
| 职位自编号     | string   | 0        |                             |
| 发布平台       | string   | 0        |                             |
| 职位访问地址   | string   | 0        |                             |
| 职位           | string   | 0        |                             |
| 公司           | string   | 0        |                             |
| 公司是否为全称 | bool     | 0        |                             |
| 地区           | string   | 0        |                             |
| 地址           | string   | 0        |                             |
| 经度           | number   | 0        |                             |
| 纬度           | number   | 0        |                             |
| 职位描述       | string   | 0        |                             |
| 学历           | string   | 0        |                             |
| 所需经验       | string   | 0        |                             |
| 技能           | string   | 1        |                             |
| 福利           | string   | 1        |                             |
| 最低薪资       | number   | 0        |                             |
| 最高薪资       | number   | 0        |                             |
| 首次发布时间   | datetime | 0        | rfc3339/yyyy-MM-dd HH:mm:ss |
| 招聘人         | string   | 0        |                             |
| 招聘公司       | string   | 0        |                             |
| 招聘者职位     | string   | 0        |                             |
| 首次扫描日期   | datetime | 0        | rfc3339/yyyy-MM-dd HH:mm:ss |
| 记录更新日期   | datetime | 0        | rfc3339/yyyy-MM-dd HH:mm:ss |

#### 职位标签

| 字段         | 类型     | 生效版本 | 格式                        |
| ------------ | -------- | -------- | --------------------------- |
| 职位编号     | string   | 0        |                             |
| 标签         | string   | 0        |                             |
| 记录更新日期 | datetime | 1        | rfc3339/yyyy-MM-dd HH:mm:ss |

#### 职位公开数据

| 字段         | 类型     | 生效版本 | 格式                        |
| ------------ | -------- | -------- | --------------------------- |
| 职位自编号   | string   | 0        |                             |
| 首次扫描日期 | datetime | 0        | rfc3339/yyyy-MM-dd HH:mm:ss |
| 记录更新日期 | datetime | 0        | rfc3339/yyyy-MM-dd HH:mm:ss |

#### 职位快照

| 字段     | 类型     | 生效版本 | 格式                        |
| -------- | -------- | -------- | --------------------------- |
| 编号     | string   | 0        |                             |
| 职位编号 | string   | 0        |                             |
| 职位链接 | string   | 0        |                             |
| 内容     | string   | 0        |                             |
| 招聘平台 | string   | 0        |                             |
| 创建日期 | datetime | 0        | rfc3339/yyyy-MM-dd HH:mm:ss |
| 更新日期 | datetime | 0        | rfc3339/yyyy-MM-dd HH:mm:ss |

#### 公司

| 字段             | 类型     | 生效版本 | 格式                        |
| ---------------- | -------- | -------- | --------------------------- |
| 公司             | string   | 0        |                             |
| 公司描述         | string   | 0        |                             |
| 成立时间         | string   | 0        |                             |
| 经营状态         | string   | 0        |                             |
| 法人             | string   | 0        |                             |
| 统一社会信用代码 | string   | 0        |                             |
| 官网             | string   | 0        |                             |
| 社保人数         | number   | 0        |                             |
| 自身风险数       | number   | 0        |                             |
| 关联风险数       | number   | 0        |                             |
| 地址             | string   | 0        |                             |
| 经营范围         | string   | 0        |                             |
| 纳税人识别号     | string   | 0        |                             |
| 所属行业         | string   | 0        |                             |
| 工商注册号       | string   | 0        |                             |
| 经度             | number   | 0        |                             |
| 纬度             | number   | 0        |                             |
| 注册资本         | string   | 2        |                             |
| 注册资本货币     | string   | 2        |                             |
| 数据来源地址     | string   | 0        |                             |
| 数据来源平台     | string   | 0        |                             |
| 数据来源记录编号 | string   | 0        |                             |
| 数据来源更新时间 | datetime | 0        | rfc3339/yyyy-MM-dd HH:mm:ss |
| 记录创建日期     | datetime | 1        | rfc3339/yyyy-MM-dd HH:mm:ss |
| 记录更新日期     | datetime | 1        | rfc3339/yyyy-MM-dd HH:mm:ss |

#### 公司标签

| 字段         | 类型     | 生效版本 | 格式                        |
| ------------ | -------- | -------- | --------------------------- |
| 公司         | string   | 0        |                             |
| 标签         | string   | 0        |                             |
| 记录更新日期 | datetime | 1        | rfc3339/yyyy-MM-dd HH:mm:ss |

#### 公司评论

| 字段     | 类型     | 生效版本 | 格式                        |
| -------- | -------- | -------- | --------------------------- |
| 公司     | string   | 0        |                             |
| 评论     | string   | 0        |                             |
| 情感     | string   | 1        |                             |
| 数据集   | string   | 1        |                             |
| 创建日期 | datetime | 1        | rfc3339/yyyy-MM-dd HH:mm:ss |
| 更新日期 | datetime | 1        | rfc3339/yyyy-MM-dd HH:mm:ss |

## 数据导入与导出

> [!IMPORTANT]
> 数据导入逻辑与数据同步逻辑一样

1. 数据拆分导出

## Oauth

### Github Oauth2 流程

```mermaid
sequenceDiagram
  participant ContentScript
  participant Background
  participant GithubWebsite
  participant GithubServer

  ContentScript ->> Background: authOauth2Login
  activate GithubWebsite
  Background ->> GithubWebsite: chrome.tabs.create
  Note over GithubWebsite: https://github.com/login/oauth/authorize?client_id=
  GithubWebsite ->> GithubWebsite: github login
  GithubWebsite ->> GithubWebsite: redirect to callback url
  Note over GithubWebsite: https://github.com/lastsunday/job-hunting-github-app/blob/main/INSTALL?code=
  GithubWebsite -->> Background: notify url with code
  Background ->> Background: chrome.tabs.onUpdated
  Background ->> GithubServer: http request access_token
  Note over GithubWebsite: https://github.com/login/oauth/access_token?client_id=&client_secret=&code=
  GithubServer -->> Background: return oauth info
  Background ->> GithubWebsite: chrome.tabs.remove
  deactivate GithubWebsite
```

## BBS 系统

1. 采用 Github Issues 作为服务端
1. 地区选择实现原理

   1. 利用标题作为搜索字段
   1. targetId = sha256 地区名: sha256(省)-sha256(市)-sha256(区)

      ```hql
         search(query:"${targetId} in:title sort:created-desc is:issue is:open repo:${GITHUB_APP_REPO}", type: ISSUE, first: ${first ?? null}, after: ${after ? "\"" + after + "\"" : null},last:${last ?? null},before:${before ? "\"" + before + "\"" : null})
      ```

1. 使用的 Github API
   1. HQL 查询(可查询 Issues): <https://api.github.com/graphql>
   1. 新增 Issues: POST <https://api.github.com/repos/lastsunday/job-hunting-github-app/issues>
   1. 查询 Issues Comment: GET <https://api.github.com/repos/lastsunday/job-hunting-github-app/issues/${issueNumber}/comments?per_page=${pageSize}&page=${pageNum}>
   1. 新增 Issues Comment: POST <https://api.github.com/repos/lastsunday/job-hunting-github-app/issues/${issueNumber}/comments>

## 自动化

1. 采用 puppeteer 类库在 debug 模式下运行
1. 当前用于自动浏览职位页面

## LLM

1. 外部 LLM

   1. ollama

      <https://docs.ollama.com/api/introduction>

   1. openai

      <https://platform.openai.com/docs/api-reference/chat>

   1. siliconflow

      <https://docs.siliconflow.com/en/api-reference/chat-completions/chat-completions>

1. 内嵌 LLM

   1. web-llm

      <https://github.com/mlc-ai/web-llm>
