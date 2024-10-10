# Data Share Plan 数据共享计划

> 文档版本：2024-10-10

## 背景

    招聘网站展示给应聘者的岗位存在某些问题，例如：
        1. 职位并不是最新的，有可能是挂职几个月的，一页展示的只有大概三分之一是最近的；
        2. 部分职位因为使用某种手段，使其展示的优先级往上靠；
        3. 某些招聘网站没有提供按职位发布时间进行排序的功能；
        4. 招聘网站提供的职位搜索条件较少，一般只通过职位关键字来进行搜索；
    基于上述的原因，实现数据共享计划并结合JobHutting内置的职位偏好功能是部分痛点的解决方案。

## 数据字段

### 职位数据字段

```
  职位自编号
  发布平台
  职位访问地址
  职位
  公司
  公司是否为全称
  地区
  地址
  经度
  纬度
  职位描述
  学历
  所需经验
  最低薪资
  最高薪资
  首次发布时间
  招聘人
  招聘公司
  招聘者职位
  首次扫描日期
  记录更新日期
```

### 公司数据字段

```
  公司
  公司描述
  成立时间
  经营状态
  法人
  统一社会信用代码
  官网
  社保人数
  自身风险数
  关联风险数
  地址
  经营范围
  纳税人识别号
  所属行业
  工商注册号
  经度
  纬度
  数据来源地址
  数据来源平台
  数据来源记录编号
  数据来源更新时间
```

### 公司标签数据字段

```
  公司
  标签
```

## 数据流向

### 官方数据流（数据上传）

    招聘网站 -> JobHunting Extension -> Git(个人GitHub仓库)

### 共享数据流（数据下载）

    共享数据仓库列表 -> Git(个人GitHub仓库) -> JobHunting Extension

## 数据提交流程

```
最多每天提交一次（插件启动时开启定时检查任务）
查询仓库最近一次提交时间
提交的记录的范围条件：记录更新时间 < 今天0点0分 和记录更新时间 >= 最近一次提交时间
    备注：针对公司标签，现在是全量提交
提交的目录
    提交时间（YYYY）
        提交时间（MM-DD）
            job.zip
            company.zip
            company_tag.zip
```

## 数据获取和同步流程

```

查询仓库60天内的记录
下载60天内缺失的数据文件
根据数据文件进行数据同步
针对不同类型数据进行处理
    职位数据
        如果是新数据
            新增记录
        如果是重复数据
            根据创建时间来处理，并且需要处理公司名全称问题
    公司数据
        如果是新数据
            新增记录
        如果是重复数据
            根据数据来源更新时间来处理
    公司标签数据
        如果是新数据
            新增记录
        如果是重复数据
            合并标签
```

## 关键组件及行为

### 相关表

```
task 任务表
    id 编号
    type 任务类型
    data_id 数据编号
    status 任务状态
    error_reason 异常原因
    cost_time 最近一次任务执行耗时
    retry_count 重试次数
    create_datetime 创建时间
    update_datetime 更新时间
```

```
task_data_upload 任务数据表（上传）
    id 编号
    type 任务类型
    username 用户名
    reponame 仓库名
    start_datetime 数据开始时间
    end_datetime 数据结束时间
    data_count 数据总量
    create_datetime 创建时间
    update_datetime 更新时间
```

```
task_data_download 任务数据表（下载）
    id 编号
    type 任务类型
    username 用户名
    reponame 仓库名
    datetime 文件日期
    create_datetime 创建时间
    update_datetime 更新时间
```

```
file 文件表
    id 编号
    name 文件名
    sha 散列值
    encoding 文件内容编码,
    content 文件内容,
    size 文件尺寸,
    type 类型（当前只有file）
    create_datetime 创建时间
    update_datetime 更新时间
```

```
task_data_merge 任务数据表（数据合并）
    id 编号
    type 任务类型
    username 用户名
    reponame 仓库名
    datetime 文件日期
    data_id 文件编号
    data_count 数据总量
    create_datetime 创建时间
    update_datetime 更新时间
```

```
data_share_partner 数据共享伙伴信息表
    id 编号
    username 用户名
    reponame 仓库名
    repo_type 仓库类型（当前只有GITHUB）
    create_datetime 创建时间
    update_datetime 更新时间

```

```
附表：
任务类型
    职位数据上传:TASK_TYPE_JOB_DATA_UPLOAD
    公司数据上传:TASK_TYPE_COMPANY_DATA_UPLOAD
    公司标签数据上传:TASK_TYPE_COMPANY_TAG_DATA_UPLOAD
    职位数据下载:TASK_TYPE_JOB_DATA_DOWNLOAD
    公司数据下载:TASK_TYPE_COMPANY_DATA_DOWNLOAD
    公司标签数据下载:TASK_TYPE_COMPANY_TAG_DATA_DOWNLOAD
    职位数据合并:TASK_TYPE_JOB_DATA_MERGE
    公司数据合并:TASK_TYPE_COMPANY_DATA_MERGE
    公司标签数据合并:TASK_TYPE_COMPANY_TAG_DATA_MERGE
状态
    准备:TASK_STATUS_READY
    运行中:TASK_STATUS_RUNNING
    完成:TASK_STATUS_FINISHED
    异常完成:TASK_STATUS_FINISHED_BUT_ERROR
    错误:TASK_STATUS_ERROR
    取消:TASK_STATUS_CANCEL
```

### 数据存储目录结构

```
提交时间（YYYY）
    提交时间（MM-DD）
        job.zip
        company.zip
        company_tag.zip
```

### GitHub

```
    仓库的建立
        所需权限："Administration" repository permissions (write)
        https://docs.github.com/en/rest/repos/repos?apiVersion=2022-11-28#create-a-repository-for-the-authenticated-user
            /user/repos
            
    仓库目录的提交&数据文件的提交
        所需权限："Contents" repository permissions (write)
        https://docs.github.com/en/rest/repos/contents?apiVersion=2022-11-28#create-or-update-file-contents
            /repos/{owner}/{repo}/contents/{path}
            
    仓库目录的查询&仓库文件的下载
        所需权限：无
        特别事项：This API has an upper limit of 1,000 files for a directory. If you need to retrieve more files,
        https://docs.github.com/en/rest/repos/contents?apiVersion=2022-11-28#get-repository-content
            /repos/{owner}/{repo}/contents/{path}
```