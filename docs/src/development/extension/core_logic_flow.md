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

## 内部 API 调用

### 从 ContentScript 调用

```mermaid
sequenceDiagram
  participant Api
  participant ContentScript
  participant Background
  participant Offscreen
  participant WebWorker
  autonumber
  ContentScript ->>  Api: 调用Api方法
  Api ->> ContentScript: 调用invoke方法
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

### 从 Background 调用

```mermaid
sequenceDiagram
  participant Api
  participant Background
  participant Offscreen
  participant WebWorker
  autonumber
  Background ->>  Api: 调用Api方法
  Api ->> Background: 调用invoke方法
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

### 从 Webworker 调用

> [!IMPORTANT]
>
> - Webworker 发起的 Api 调用不会经过 ContentScript,Background,Offscreen 这些模块的处理流程
> - 调用的方法仅限于 Github Api (仅执行网络访问)

### 对大 Message 传递的处理

> [!IMPORTANT]
>
> <https://github.com/lastsunday/job-hunting/commit/ae0cee1>

## 内嵌数据库

### SQL API

### Schema Changes

### 备份

## 内部任务系统

## 数据同步

## 数据导入与导出

## Oauth

## BBS 系统

## 自动化

## LLM
