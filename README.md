<p align="center">
    <img width="180" src="docs\src\assets\logo.svg" alt="logo">
</p>

# Job Hunting(职位猎人) - 一款协助找工作的浏览器插件

[![build-extension](https://github.com/lastsunday/job-hunting/actions/workflows/build-extension.yml/badge.svg)](https://github.com/lastsunday/job-hunting/actions/workflows/build-extension.yml)
[![build-server](https://github.com/lastsunday/job-hunting/actions/workflows/build-server.yml/badge.svg)](https://github.com/lastsunday/job-hunting/actions/workflows/build-server.yml)

> **免责声明：**
>
> 大家请以学习为目的使用本仓库 ⚠️⚠️⚠️ <br>
>
> 本仓库的所有内容仅供学习和参考之用，禁止用于商业用途。任何人或组织不得将本仓库的内容用于非法用途或侵犯他人合法权益。本仓库所涉及的爬虫技术仅用于学习和研究，不得用于对其他平台进行大规模爬虫或其他非法行为。对于因使用本仓库内容而引起的任何法律责任，本仓库不承担任何责任。使用本仓库的内容即表示您同意本免责声明的所有条款和条件。
>
> 点击查看更为详细的免责声明。[点击跳转](#disclaimer)

## 为什么要做这个项目

当前国内使用率较高的招聘平台（排名不分先后）分别有 BOOS 直聘，前程无忧，智联招聘，猎聘网，拉勾网，其提供了各个行业的职位招聘信息的展示。但在实际使用过程中发现其展示职位信息的策略对于求职者有诸多不便，包括不仅限于：职位发布时间久远（俗称僵尸岗），不能简单识别普通职位，职位发布时间被隐藏或乱序显示，职位的公司名不是全称，没有职位公司的风险提示。

## 项目做了什么

为了提高使用这些招聘平台找工作的用户体验，项目会对目标平台网站页面进行增强展示；对出现过的职位进行永久存储，以便进行全网职位的个性化快速搜索，~~职位数据的共享~~；对职位数据进行多维度的分析，并以可视化的手段呈现；通过内置的讨论区，对职位进行评论，为职位打上标签等方式进行中立的职位交流；

## 最近主要改动/新增特性

1. 新增内置大模型引擎[web-llm](https://github.com/mlc-ai/web-llm)

## 插件安装

> 插件的**开发**请跳转到[extension 开发目录](https://github.com/lastsunday/job-hunting/tree/dev/apps/extension)

1. 打开 Release 页 或 直接访问 [最新发布](https://github.com/lastsunday/job-hunting/releases/latest)
2. 点击下载 Assets 下的 job-hunting-extension-chrome-xxx.zip
3. 打开浏览器，安装插件，下面是针对不同浏览器的安装步骤
   1. chrome：地址栏输入 <chrome://extensions/>，打开开发者模式，将 zip 文件拖进页面里
   2. edge，地址栏输入 <edge://extensions/>，打开开发人员模式，将 zip 文件拖进页面里

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

## Browsers support

| [<img src="https://raw.githubusercontent.com/alrra/browser-logos/master/src/edge/edge_48x48.png" alt="Edge" width="24px" height="24px" />](http://godban.github.io/browsers-support-badges/)<br/> Edge | [<img src="https://raw.githubusercontent.com/alrra/browser-logos/master/src/chrome/chrome_48x48.png" alt="Chrome" width="24px" height="24px" />](http://godban.github.io/browsers-support-badges/)<br/>Chrome |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| last version                                                                                                                                                                                           | last version                                                                                                                                                                                                  |

## 运行截图

### 招聘/企业信息网站页面

#### 搜索页（前程无忧）

<div style="margin-top:30px">
    <img src="docs\src\assets\introduction\job-item-51job.jpg" alt="51job" width="1000px"/>
</div>

#### 推荐页（BOSS 直聘）

<div style="margin-top:30px">
    <img src="docs\src\assets\introduction\job-recommend-boss.jpg" alt="51job" width="1000px"/>
</div>

### 详情页

<div style="margin-top:30px">
    <img src="docs\src\assets\introduction\job-snapshot-51job.jpg" alt="job-snapshot-51job" width="1000px"/>
</div>

### 职位快照

<div style="margin-top:30px">
    <img src="docs\src\assets\introduction\job-snapshot-history-51job.jpg" alt="job-snapshot-history-51job" width="1000px"/>
</div>

#### 爱企查

<div style="margin-top:30px">
    <img src="docs\src\assets\introduction\company-aiqicha.jpg" alt="aiqicha" width="1000px"/>
</div>

### 管理页面

#### 打开管理页面

<div style="margin-top:30px">
    <img src="docs\src\assets\introduction\chrome_extension_sidepanel_open.png" alt="chrome_extension_sidepanel_open" width="1000px"/>
</div>

#### 管理页面（需点击插件图标打开）

<div style="margin-top:30px">
    <img src="docs\src\assets\introduction\sidepanel_admin_home.png" alt="sidepanel_admin_home" width="1000px"/>
</div>

## 数据源

1. [数据源仓库说明](./docs/datasource.md)

### Server & Server-UI

#### 职位模块

- [ ] 查询

#### 公司模块

- [ ] 查询

#### 支撑模块

- [ ] 数据同步

# FAQ

1. 报错 No more file handles available in the pool

如果在 Linux 下，请使用命令 _ulimit -n_ 检查 soft file descriptor 的值，一般默认为 1024 或 2048,请设定一个较高的值如 9001

# 免责声明

<div id="disclaimer">

## 1. 项目目的与性质

本项目（以下简称“本项目”）是作为一个技术研究与学习工具而创建的，旨在探索和学习网络数据采集技术。本项目专注于招聘平台的数据爬取与分析技术研究，旨在提供给学习者和研究者作为技术交流之用。

## 2. 法律合规性声明

本项目开发者（以下简称“开发者”）郑重提醒用户在下载、安装和使用本项目时，严格遵守中华人民共和国相关法律法规，包括但不限于《中华人民共和国网络安全法》、《中华人民共和国反间谍法》等所有适用的国家法律和政策。用户应自行承担一切因使用本项目而可能引起的法律责任。

## 3. 使用目的限制

本项目严禁用于任何非法目的或非学习、非研究的商业行为。本项目不得用于任何形式的非法侵入他人计算机系统，不得用于任何侵犯他人知识产权或其他合法权益的行为。用户应保证其使用本项目的目的纯属个人学习和技术研究，不得用于任何形式的非法活动。

## 4. 免责声明

开发者已尽最大努力确保本项目的正当性及安全性，但不对用户使用本项目可能引起的任何形式的直接或间接损失承担责任。包括但不限于由于使用本项目而导致的任何数据丢失、设备损坏、法律诉讼等。

## 5. 知识产权声明

本项目的知识产权归开发者所有。本项目受到著作权法和国际著作权条约以及其他知识产权法律和条约的保护。用户在遵守本声明及相关法律法规的前提下，可以下载和使用本项目。

## 6. 最终解释权

关于本项目的最终解释权归开发者所有。开发者保留随时更改或更新本免责声明的权利，恕不另行通知。

</div>
