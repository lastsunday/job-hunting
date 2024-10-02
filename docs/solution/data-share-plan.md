# Data Share Plan 数据共享计划

> 文档版本：草稿

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

    招聘网站 -> JobHunting Extension -> Git(个人Git Hub仓库)

### 共享数据流（数据下载）

    共享数据仓库列表 -> Git(个人Git Hub仓库) -> JobHunting Extension

## 数据提交流程

```
最多每天提交一次（插件启动时开启定时检查任务）
查询仓库最近一次提交时间
提交的记录的范围条件：记录更新时间 < 今天0点0分 和记录更新时间 >= 最近一次提交时间
提交的目录
    提交时间（YYYY）
        提交时间（MM-DD）
            job.xlsx
            company.xlsx
            company-tag.xlsx
```

## 数据获取和同步流程

```

查询仓库近2个月的提交记录
根据最近一次同步时间，找出距离同步时间最近一次未同步的数据
如果找到
    进行数据同步
        如果是新数据
            新增记录
        如果是重复数据
            如果旧数据不是完整公司名数据，新数据是完整的公司名数据
                更新记录的公司名为完整的公司名
            判断更新日期是否大于旧数据更新日期
                大于
                    更新记录（除了公司名不更新）
                不大于
                    不更新记录
    更新最近时间为同步数据的时间
如果未找到
    更新最近时间为当前时间（YYYY-MM-DD 00:00:00）
```

## 关键组件及行为

### 辅助表

```
共享数据来源表
    编号
    用户名
    仓库名
    最近同步数据的时间
    创建时间
    更新时间

数据同步日志
    数据编号
    数据类型（职位，公司，公司标签）
    用户名
    最近同步时间
```

### 数据存储目录结构

```
提交时间（YYYY）
    提交时间（MM-DD）
        job.xlsx
        company.xlsx
        company-tag.xlsx
```

### Git

```
    仓库的建立
        所需权限："Administration" repository permissions (write)
        https://docs.github.com/en/rest/repos/repos?apiVersion=2022-11-28#create-a-repository-for-the-authenticated-user
            /user/repos
            
    仓库目录的提交&数据文件的提交
        所需权限："Contents" repository permissions (write)
        https://docs.github.com/en/rest/repos/contents?apiVersion=2022-11-28#create-or-update-file-contents
            /repos/{owner}/{repo}/contents/{path}
            
    仓库目录的查询
        所需权限：无
        特别事项：This API has an upper limit of 1,000 files for a directory. If you need to retrieve more files,
        https://docs.github.com/en/rest/repos/contents?apiVersion=2022-11-28#get-repository-content
            /repos/{owner}/{repo}/contents/{path}
            
    仓库文件的下载
        https://raw.githubusercontent.com/{owner}/{repo}/main/{path}
```