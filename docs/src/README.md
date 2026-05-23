# Job Hunting(职位猎人) - 一款协助找工作的浏览器插件

<p align="center">
    <img width="180" src="assets\logo.svg" alt="logo">
</p>

## 为什么要做这个项目

当前国内使用率较高的招聘平台（排名不分先后）分别有 BOOS 直聘，前程无忧，智联招聘，猎聘网，拉勾网，其提供了各个行业的职位招聘信息的展示。但在实际使用过程中发现其展示职位信息的策略对于求职者有诸多不便，包括不仅限于：职位发布时间久远（俗称僵尸岗），不能简单识别普通职位，职位发布时间被隐藏或乱序显示，职位的公司名不是全称，没有职位公司的风险提示。

## 项目做了什么

为了提高使用这些招聘平台找工作的用户体验，项目会对目标平台网站页面进行增强展示；对出现过的职位进行本地历史快照，跨平台本地检索;对职位数据进行多维度的分析，并以可视化的手段呈现；通过内置的讨论区，对职位进行评论，为职位打上标签等方式进行中立的职位交流；

## 运行截图

### 招聘/企业信息网站页面

#### 搜索页（前程无忧）

<div style="margin-top:30px">
    <img src="assets\introduction\job-item-51job.jpg" alt="51job" width="1000px"/>
</div>

#### 推荐页（BOSS 直聘）

<div style="margin-top:30px">
    <img src="assets\introduction\job-recommend-boss.jpg" alt="51job" width="1000px"/>
</div>

### 详情页

<div style="margin-top:30px">
    <img src="assets\introduction\job-snapshot-51job.jpg" alt="job-snapshot-51job" width="1000px"/>
</div>

### 职位快照

<div style="margin-top:30px">
    <img src="assets\introduction\job-snapshot-history-51job.jpg" alt="job-snapshot-history-51job" width="1000px"/>
</div>

#### 爱企查

<div style="margin-top:30px">
    <img src="assets\introduction\company-aiqicha.jpg" alt="aiqicha" width="1000px"/>
</div>

### 管理页面

#### 打开管理页面

<div style="margin-top:30px">
    <img src="assets\introduction\chrome_extension_sidepanel_open.png" alt="chrome_extension_sidepanel_open" width="1000px"/>
</div>

#### 管理页面（需点击插件图标打开）

<div style="margin-top:30px">
    <img src="assets\introduction\sidepanel_admin_home.png" alt="sidepanel_admin_home" width="1000px"/>
</div>

## 最近主要改动/新增特性

1. 新增内置大模型引擎[web-llm](https://github.com/mlc-ai/web-llm)

## 招聘平台支持列表

| 招聘平台                 | 访问地址                                                                | 备注                          |
| ------------------------ | ----------------------------------------------------------------------- | ----------------------------- |
| BOSS 直聘                | <https://www.zhipin.com/web/geek/jobs>                                  | 推荐页/搜索页[账号未登录]     |
|                          | <https://www.zhipin.com/web/geek/jobs>                                  | 推荐页/搜索页[账号已登录]     |
| 前程无忧                 | <https://we.51job.com/pc/search>                                        | 搜索页                        |
| 智联招聘                 | <https://sou.zhaopin.com/>                                              | 搜索页                        |
| 拉钩网                   | <https://www.lagou.com/wn/zhaopin>                                      | 搜索页                        |
| 猎聘网                   | <https://www.liepin.com/zhaopin>                                        | 搜索页,需点击搜索按钮才有效果 |
| 就业在线                 | <https://www.jobonline.cn/position>                                     | 搜索页                        |
| 广东公共求职招聘服务平台 | <https://ggfw.hrss.gd.gov.cn/recruitment/internet/main/#/search?type=1> | 搜索页                        |

## 企业搜索平台支持列表

| 企业搜索平台 | 访问地址                      | 备注 |
| ------------ | ----------------------------- | ---- |
| 爱企查       | <https://aiqicha.baidu.com/s> |      |

## 浏览器支持

| [<img src="https://raw.githubusercontent.com/alrra/browser-logos/master/src/edge/edge_48x48.png" alt="Edge" width="24px" height="24px" />](http://godban.github.io/browsers-support-badges/)<br/> Edge | [<img src="https://raw.githubusercontent.com/alrra/browser-logos/master/src/chrome/chrome_48x48.png" alt="Chrome" width="24px" height="24px" />](http://godban.github.io/browsers-support-badges/)<br/>Chrome |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| last version                                                                                                                                                                                           | last version                                                                                                                                                                                                  |
