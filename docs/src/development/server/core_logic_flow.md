# 核心逻辑

> [!WIP]

## 数据结构与同步逻辑

数据同步流程以任务形式执行

流程：计算数据下载任务 -> 数据下载 -> 数据贮藏与合并

- 计算数据下载任务
  - (task_data_plan,task_data_source_plan)task_plan <-> task,task_data_download
- 数据下载
  - task,task_data_download <-> file,task,task_data_merge
- 数据贮藏与合并
  - task,task_data_merge <-> task,task_data_merge,job_storage,company_storage,job_tag_storage,company_tag_storage,job,company,job_tag,company_tag

### 核心数据关系图

```mermaid
---
title: Core Data ER
---
erDiagram
    job_storage{
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
      uri varchar(255) "来源,格式: data://hier-part"
      publish_datetime timestamptz "数据发布时间"
      create_datetime timestamptz "创建时间"
      update_datetime timestamptz "更新时间"
    }
    company_storage{
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
      uri varchar(255) "来源,格式: data://hier-part"
      publish_datetime timestamptz "数据发布时间"
      create_datetime timestamptz "创建时间"
      update_datetime timestamptz "更新时间"
    }
    job ||--o{ job_storage: has
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
      uri varchar(255) "来源,格式: data://hier-part"
      create_datetime timestamptz "创建时间"
      update_datetime timestamptz "更新时间"
    }
    company ||--o{ company_storage: has
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
      uri varchar(255) "来源,格式: data://hier-part"
      create_datetime timestamptz "创建时间"
      update_datetime timestamptz "更新时间"
    }
```

#### URI

> <https://www.rfc-editor.org/rfc/rfc3986.html>

Example

```txt
 data:://[username[@]][host]/[path]
```

- data://lastsunday@github.com/lastsunday/job-hunting-data/blob/main/2026/03-03/job.zip
- data://lastsunday@github.com/lastsunday/job-hunting-data/blob/main/2024/12-20/company.zip
- data://lastsunday@aiqicha.baidu.com/company_detail_19146183042612
- data://admin@system

### 核心额外数据关系图

```mermaid
---
title: Core Data ER
---
erDiagram
    tag{
      id varchar(255) PK "编号"
      name text "名称"
      create_datetime timestamptz "创建时间"
      update_datetime timestamptz "更新时间"
    }
    tag ||--o{ job_tag_storage: has
    job_tag_storage{
      id varchar(255) PK "编号"
      job_id varchar(255) "职位编号"
      tag_id varchar(255) "标签编号"
      seq int4 "序号"
      uri varchar(255) "来源,格式: data://hier-part"
      publish_datetime timestamptz "数据发布时间"
      create_datetime timestamptz "创建时间"
      update_datetime timestamptz "更新时间"
    }
    tag ||--o{ company_tag_storage: has
    company_tag_storage{
      id varchar(255) PK "编号"
      company_id varchar(255) "公司编号"
      company_name varchar(255) "公司名称"
      tag_id varchar(255) "标签编号"
      seq int4 "序号"
      uri varchar(255) "来源,格式: data://hier-part"
      publish_datetime timestamptz "数据发布时间"
      create_datetime timestamptz "创建时间"
      update_datetime timestamptz "更新时间"
    }
    tag ||--o{ job_tag: has
    job_tag ||--o{ job_tag_storage: has
    job_tag{
      id varchar(255) PK "编号"
      job_id varchar(255) "职位编号"
      tag_id varchar(255) "标签编号"
      seq int4 "序号"
      uri varchar(255) "来源,格式: data://hier-part"
      create_datetime timestamptz "创建时间"
      update_datetime timestamptz "更新时间"
    }
    tag ||--o{ company_tag: has
    company_tag ||--o{ company_tag_storage: has
    company_tag{
      id varchar(255) PK "编号"
      company_id varchar(255) "公司编号"
      company_name varchar(255) "公司名称"
      tag_id varchar(255) "标签编号"
      seq int4 "序号"
      uri varchar(255) "来源,格式: data://hier-part"
      create_datetime timestamptz "创建时间"
      update_datetime timestamptz "更新时间"
    }
```

#### URI

Example

```txt
 data:://[username[@]][host]/[path]
```

- data://lastsunday@github.com/lastsunday/job-hunting-data/blob/main/2024/12-26/company_tag.zip
- data://lastsunday@github.com/lastsunday/job-hunting-data/blob/main/2026/03-03/job.zip
- data://system

### 任务关系图

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
    task_plan ||--o{ task : has
    task{
      id varchar(255) PK "编号"
      task_plan_id varchar(255) "任务计划编号"
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
      task_plan_id varchar(255) "任务计划编号"
      username varchar(255) "用户名"
      repo_name varchar(255) "仓库名"
      repo_type varchar(255) "仓库类型"
      create_datetime timestamptz "创建时间"
      update_datetime timestamptz "更新时间"
    }
    task_data_source_plan ||--|| task_plan: owns
    task_data_source_plan{
      id varchar(255) PK "编号"
      task_plan_id varchar(255) "任务计划编号"
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
      data_count int4 "数据总数"
      config jsonb "配置"
      data_page_num int4 "页码"
      data_page_size int4 "页尺寸"
      create_datetime timestamptz "创建时间"
      update_datetime timestamptz "更新时间"
    }
    task_data_download||--|{ file: has
    task_data_merge ||--|{ file: has
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

#### task type

- JOB_DATA_DOWNLOAD
- JOB_DATA_MERGE
- COMPANY_DATA_DOWNLOAD
- COMPANY_DATA_MERGE
- COMPANY_TAG_DATA_DOWNLOAD
- COMPANY_TAG_DATA_MERGE
- JOB_TAG_DATA_DOWNLOAD
- JOB_TAG_DATA_MERGE
- JOB_PUBLIC_DATA_DOWNLOAD
- JOB_PUBLIC_DATA_MERGE
- METADATA_DATA_DOWNLOAD
- METADATA_DATA_MERGE
- COMPANY_COMMENT_DATA_DOWNLOAD
- COMPANY_COMMENT_DATA_MERGE

#### task status

- READY
- RUNNING
- CANCEL
- FINISHED
- FINISHED_BUT_ERROR
- ERROR

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
