# 核心逻辑与数据结构设计

## 数据同步流程

> [!WIP]

数据同步流程以任务形式执行

流程：计算数据下载任务 -> 数据下载 -> 数据贮藏与合并

- 计算数据下载任务
  - (task_data_plan,task_data_source_plan)task_plan <-> task,task_data_download
- 数据下载
  - task,task_data_download <-> file,task,task_data_merge
- 数据贮藏与合并
  - task,task_data_merge <-> task,task_data_merge,job_source,company_source,job_tag_source,company_tag_source,job,company,job_tag,company_tag

### 数据合并

```mermaid
sequenceDiagram
  participant out_data as 外部数据
  participant logic as 数据处理器
  participant source as 来源表
  participant main as 主表

  out_data ->> logic: 发送外部数据
  logic ->> logic: 提取外部数据中的唯一标识(业务主键+uri)列表
  logic ->> source: 根据唯一标识列表查询现存来源数据
  source ->> logic: 返回现存来源数据
  logic ->> logic: 去掉外部数据中重复的现存来源数据，得到去重外部数据
  logic ->> source: 插入去重外部数据
  source ->> logic: 插入外部去重数据成功
  logic ->> logic: 提取去重外部数据的业务主键列表
  logic ->> main: 根据业务主键列表查询现存主数据
  main ->> logic: 返回现存主数据
  logic ->> logic: 根据现存主数据和去重外部数据，计算出主数据插入列表和主数据更新列表
  logic ->> main: 插入主数据插入列表
  main ->> logic: 插入主数据插入列表成功
  logic ->> main: 更新主数据更新列表
  main ->> logic: 更新主数据更新列表成功

```

## 核心数据模型

#### URI 规范

> 参考：[RFC 3986](https://www.rfc-editor.org/rfc/rfc3986.html)

格式：`data://[username[@]]host/path`

字段说明：

- `username`：数据贡献者/上传者标识

示例：

```txt
data://lastsunday@github.com/lastsunday/job-hunting-data/blob/main/2026/03-03/job.zip
data://lastsunday@github.com/lastsunday/job-hunting-data/blob/main/2024/12-20/company.zip
data://lastsunday@aiqicha.baidu.com/company_detail_19146183042612
data://admin@system
```

### 职位相关表

> 设计说明：
>
> - `job_source`：多渠道原始数据来源表，存储来自不同用户/渠道的原始数据
> - `job`：标准化表，去重后的一手数据

```mermaid
---
title: Job ER
---
erDiagram
    job_source{
      id varchar(255) PK "编号"
      job_id varchar(255) "职位编号"
      platform varchar(255) "发布平台"
      url varchar(255) "链接"
      name varchar(255) "名称"
      company_name varchar(255) "公司名"
      location_name varchar(255) "地区"
      address varchar(255) "地址"
      longitude numeric(16_13) "经度"
      latitude numeric(16_13) "纬度"
      description text "描述"
      degree_name varchar(255) "学历"
      year int2 "所需经验"
      salary_min numeric(12_2) "最低薪资"
      salary_max numeric(12_2) "最高薪资"
      salary_total_month int2 "几薪"
      first_publish_datetime timestamptz "首次发布时间"
      boss_name varchar(255) "招聘人名称"
      boss_company_name varchar(255) "招聘公司"
      boss_position varchar(255) "招聘者职位"
      is_full_company_name bool "公司名是否为全称"
      skill_tag text "技能标签: 逗号作为分隔符"
      welfare_tag text "福利标签: 逗号作为分隔符"
      first_scan_datetime timestamptz "首次扫描时间"
      uri varchar(255) "来源"
      publish_datetime timestamptz "数据发布时间"
      create_datetime timestamptz "创建时间"
      update_datetime timestamptz "更新时间"
    }
    job_source }|..|| job : "源自(最新)"
    job {
      id varchar(255) PK "职位编号"
      platform varchar(255) "发布平台"
      url varchar(255) "链接"
      name varchar(255) "名称"
      company_name varchar(255) "公司名"
      location_name varchar(255) "地区"
      address varchar(255) "地址"
      longitude numeric(16_13) "经度"
      latitude numeric(16_13) "纬度"
      description text "描述"
      degree_name varchar(255) "学历"
      year int2 "所需经验"
      salary_min numeric(12_2) "最低薪资"
      salary_max numeric(12_2) "最高薪资"
      salary_total_month int2 "几薪"
      first_publish_datetime timestamptz "首次发布时间"
      boss_name varchar(255) "招聘人名称"
      boss_company_name varchar(255) "招聘公司"
      boss_position varchar(255) "招聘者职位"
      is_full_company_name bool "公司名是否为全称"
      skill_tag text "技能标签: 逗号作为分隔符"
      welfare_tag text "福利标签: 逗号作为分隔符"
      first_scan_datetime timestamptz "首次扫描时间"
      uri varchar(255) "来源"
      publish_datetime timestamptz "数据发布时间"
      create_datetime timestamptz "创建时间"
      update_datetime timestamptz "更新时间"
    }
```

### 公司相关表

> 设计说明：
>
> - `company_source`：多渠道原始数据来源表，存储来自不同用户/渠道的原始数据
> - `company`：标准化表，去重后的一手数据

```mermaid
---
title: Company ER
---
erDiagram
    company_source{
      id varchar(255) PK "编号"
      company_id varchar(255) "公司编号"
      name varchar(255) "名称"
      desc text "描述"
      start_date timestamptz "成立时间"
      status varchar(255) "经营状态"
      legal_person varchar(255) "法人"
      unified_code varchar(255) "统一社会信用代码"
      web_site text "官网"
      insurance_num int4 "社保人数"
      self_risk int4 "自身风险数"
      union_risk int4 "关联风险数"
      address text "地址"
      scope text "经营范围"
      tax_no varchar(255) "纳税人识别号"
      industry varchar(255) "所属行业"
      license_number varchar(255) "工商注册号"
      longitude numeric(16_13) "经度"
      latitude numeric(16_13) "纬度"
      source_url text "数据来源地址"
      source_platform varchar(255) "数据来源平台"
      source_record_id varchar(255) "数据来源记录编号"
      source_refresh_datetime timestamptz "数据来源更新时间"
      reg_capital_value numeric(17_2) "注册资本数值"
      reg_capital_currency varchar(255) "注册资本货币"
      paidin_capital_value numeric(17_2) "实缴资本数值"
      paidin_capital_currency varchar(255) "实缴资本货币"
      uri varchar(255) "来源"
      publish_datetime timestamptz "数据发布时间"
      create_datetime timestamptz "创建时间"
      update_datetime timestamptz "更新时间"
    }
    company_source }|..|| company : "源自(最新)"
    company{
      id varchar(255) PK "公司编号"
      name varchar(255) UK "名称"
      desc text "描述"
      start_date timestamptz "成立时间"
      status varchar(255) "经营状态"
      legal_person varchar(255) "法人"
      unified_code varchar(255) "统一社会信用代码"
      web_site text "官网"
      insurance_num int4 "社保人数"
      self_risk int4 "自身风险数"
      union_risk int4 "关联风险数"
      address text "地址"
      scope text "经营范围"
      tax_no varchar(255) "纳税人识别号"
      industry varchar(255) "所属行业"
      license_number varchar(255) "工商注册号"
      longitude numeric(16_13) "经度"
      latitude numeric(16_13) "纬度"
      source_url text "数据来源地址"
      source_platform varchar(255) "数据来源平台"
      source_record_id varchar(255) "数据来源记录编号"
      source_refresh_datetime timestamptz "数据来源更新时间"
      reg_capital_value numeric(17_2) "注册资本数值"
      reg_capital_currency varchar(255) "注册资本货币"
      paidin_capital_value numeric(17_2) "实缴资本数值"
      paidin_capital_currency varchar(255) "实缴资本货币"
      uri varchar(255) "来源"
      create_datetime timestamptz "创建时间"
      update_datetime timestamptz "更新时间"
    }
```

## 标签数据模型

```mermaid
---
title: Tag ER
---
erDiagram
    tag{
      id varchar(255) PK "编号"
      name text "名称"
      create_datetime timestamptz "创建时间"
      update_datetime timestamptz "更新时间"
    }
    tag ||--o{ job_tag_source: "关联"
    job_tag_source{
      id varchar(255) PK "编号"
      job_id varchar(255) "职位编号"
      tag_id varchar(255) "标签编号"
      seq int4 "序号"
      uri varchar(255) "来源"
      publish_datetime timestamptz "数据发布时间"
      create_datetime timestamptz "创建时间"
      update_datetime timestamptz "更新时间"
    }
    tag ||--o{ company_tag_source: "关联"
    company_tag_source{
      id varchar(255) PK "编号"
      company_id varchar(255) "公司编号"
      company_name varchar(255) "公司名称"
      tag_id varchar(255) "标签编号"
      seq int4 "序号"
      uri varchar(255) "来源"
      publish_datetime timestamptz "数据发布时间"
      create_datetime timestamptz "创建时间"
      update_datetime timestamptz "更新时间"
    }
    tag ||--o{ job_tag: "关联"
    job ||--o{ job_tag: "关联"
    job_tag_source }|..|| job_tag : "源自(最新)"
    job_tag{
      id varchar(255) PK "编号"
      job_id varchar(255) "职位编号"
      tag_id varchar(255) "标签编号"
      seq int4 "序号"
      uri varchar(255) "来源"
      create_datetime timestamptz "创建时间"
      update_datetime timestamptz "更新时间"
    }
    tag ||--o{ company_tag: "关联"
    company ||--o{ company_tag: "关联"
    company_tag_source }|..|| company_tag : "源自(最新)"
    company_tag{
      id varchar(255) PK "编号"
      company_id varchar(255) "公司编号"
      company_name varchar(255) "公司名称"
      tag_id varchar(255) "标签编号"
      seq int4 "序号"
      uri varchar(255) "来源"
      create_datetime timestamptz "创建时间"
      update_datetime timestamptz "更新时间"
    }
```

## 任务系统设计

### 任务关系图

> 设计说明：
>
> - `task_data_plan` / `task_data_source_plan`：用于生成 `task_plan` 的配置表，便于从界面上描述任务计划，实际参与任务生成的是 `task_plan`

```mermaid
---
title: Task ER
---
erDiagram
    task_plan{
      id varchar(255) PK "编号"
      type int4 "任务计划类型: 0: DATA_DOWNLOAD,1: METADATA_DOWNLOAD"
      enable bool "开关"
      config jsonb "配置"
      cron varchar(255) "cron定时任务表达式"
      create_datetime timestamptz "创建时间"
      update_datetime timestamptz "更新时间"
    }
    task_plan ||..o| task : "触发"
    task{
      id varchar(255) PK "编号"
      plan_id varchar(255) "任务计划编号"
      type varchar(255) "任务类型"
      data_id varchar(255) "任务编号"
      status varchar(255) "状态"
      error_reason text "错误原因"
      cost_time int4 "耗时"
      retry_count int4 "重试次数"
      create_datetime timestamptz "创建时间"
      update_datetime timestamptz "更新时间"
    }
    task_data_plan ||--|| task_plan: owns
    task_data_plan{
      id varchar(255) PK "编号"
      plan_id varchar(255) "任务计划编号"
      username varchar(255) "用户名"
      repo_name varchar(255) "仓库名"
      repo_type varchar(255) "仓库类型"
      create_datetime timestamptz "创建时间"
      update_datetime timestamptz "更新时间"
    }
    task_data_source_plan ||--|| task_plan: owns
    task_data_source_plan{
      id varchar(255) PK "编号"
      plan_id varchar(255) "任务计划编号"
      username varchar(255) "用户名"
      repo_name varchar(255) "仓库名"
      repo_type varchar(255) "仓库类型"
      create_datetime timestamptz "创建时间"
      update_datetime timestamptz "更新时间"
    }
    task ||--|| task_data_download: owns
    task_data_download{
      id varchar(255) PK "编号"
      type varchar(255) "下载数据任务类型"
      username varchar(255) "用户名"
      repo_name varchar(255) "仓库名"
      datetime timestamptz "时间"
      config jsonb "配置"
      data_id varchar(255) "文件编号"
      seq int4 "序号"
      create_datetime timestamptz "创建时间"
      update_datetime timestamptz "更新时间"
    }
    task ||--|| task_data_merge: owns
    task_data_merge{
      id varchar(255) PK "编号"
      type varchar(255) "合并数据任务类型"
      username varchar(255) "用户名"
      repo_name varchar(255) "仓库名"
      datetime timestamptz "时间"
      data_id varchar(255) "文件编号"
      data_count int4 "合并后的数据总数"
      config jsonb "配置"
      data_page_num int4 "分页页码，控制批量合并的页索引"
      data_page_size int4 "分页大小，控制每批合并的数据量"
      create_datetime timestamptz "创建时间"
      update_datetime timestamptz "更新时间"
    }
    task_data_download ||..|| file : "生成"
    task_data_merge ||..|| file : "读取"
    file{
      id varchar(255) PK "编号"
      name varchar(255) "名称"
      sha varchar(255) "sha"
      content BLOB "内容"
      size int8 "尺寸"
      is_delete bool "是否删除"
      create_datetime timestamptz "创建时间"
      update_datetime timestamptz "更新时间"
    }
```

### 任务类型

- JOB_DATA_DOWNLOAD
- JOB_DATA_STORAGE_AND_MERGE
- COMPANY_DATA_DOWNLOAD
- COMPANY_DATA_STORAGE_AND_MERGE
- COMPANY_TAG_DATA_DOWNLOAD
- COMPANY_TAG_DATA_STORAGE_AND_MERGE
- JOB_TAG_DATA_DOWNLOAD
- JOB_TAG_DATA_STORAGE_AND_MERGE

### 任务状态

状态值：

- READY：等待执行
- RUNNING：执行中
- CANCEL：已取消
- FINISHED：执行成功
- FINISHED_BUT_ERROR：执行完成但有错误
- ERROR：执行失败

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
    ERROR --> RUNNING
    CANCEL --> [*]
```

状态转换说明：

- READY → RUNNING：任务被调度器领取
- READY → CANCEL：任务被取消
- RUNNING → FINISHED：任务执行成功
- RUNNING → FINISHED_BUT_ERROR：任务执行完成但有错误（如部分数据处理失败、超出重试次数）
- RUNNING → ERROR：任务执行失败（如网络异常、数据解析错误）
- RUNNING → CANCEL：任务执行中被取消
- ERROR → RUNNING：任务重试执行

### 任务编排

#### 流程串联

**流程一：计算数据下载任务**

- 由 `task_data_plan` / `task_data_source_plan` 生成 `task_plan`
- `task_plan` 触发创建 `task` 和 `task_data_download`

**流程二：数据下载**

- `task` + `task_data_download` 执行下载
- 下载完成后生成 `file` 文件
- 下载任务完成后，根据预设的最大数据量生成多个合并任务，避免一次超大合并带来的性能问题

**流程三：数据贮藏与合并**

- `task` + `task_data_merge` 执行合并
- 根据 `data_page_num` 和 `data_page_size` 读取对应批次数据
- 合并流程：
  1. 写入 source 表（job_source, company_source, job_tag_source, company_tag_source），遇到重复数据则忽略
  2. 将最新数据写入标准化表（job, company, job_tag, company_tag）
- `data_count` 记录合并后的数据总数

#### 失败重试策略

- `ERROR` 状态可触发重试，回到 `RUNNING`
- `retry_count` 字段记录当前重试次数
- 最大重试次数由**系统配置**设定
- 超出最大重试次数后状态置为 `FINISHED_BUT_ERROR`

## 数据索引设计

#### job

> [!WIP]

#### company

> [!WIP]

#### job_source

> [!WIP]

#### company_source

> [!WIP]

#### tag

> [!WIP]

#### job_tag

> [!WIP]

#### job_tag_source

> [!WIP]

#### company_tag

> [!WIP]

#### company_tag_source

> [!WIP]

#### task_plan

> [!WIP]

#### task

> [!WIP]

#### task_data_plan

> [!WIP]

#### task_data_source_plan

> [!WIP]

#### task_data_download

> [!WIP]

#### task_data_merge

> [!WIP]

#### file

> [!WIP]
