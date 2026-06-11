<p align="center">
    <img width="180" src="docs/src/assets/logo.svg" alt="logo">
</p>

# Job Hunting (职位猎人) - 一款协助找工作的浏览器插件

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

当前国内使用率较高的招聘平台（排名不分先后）分别有 BOSS 直聘，前程无忧，智联招聘，猎聘网，拉勾网，其提供了各个行业的职位招聘信息的展示。但在实际使用过程中发现其展示职位信息的策略对于求职者有诸多不便，包括不仅限于：职位发布时间久远（俗称僵尸岗），不能简单识别普通职位，职位发布时间被隐藏或乱序显示，职位的公司名不是全称，没有职位公司的风险提示。

## 项目做了什么

为了提高使用这些招聘平台找工作的用户体验，项目会对目标平台网站页面进行增强展示；对出现过的职位进行本地历史快照，跨平台本地检索;对职位数据进行多维度的分析，并以可视化的手段呈现；通过内置的讨论区，对职位进行评论，为职位打上标签等方式进行中立的职位交流；

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

> 以下平台为技术研究的分析对象，非鼓励对其进行数据采集。

| 招聘平台                 | 访问地址                                                                | 备注                          |
| ------------------------ | ----------------------------------------------------------------------- | ----------------------------- |
| BOSS 直聘                | https://www.zhipin.com/web/geek/jobs                                  | 推荐页/搜索页[账号未登录]     |
|                          | https://www.zhipin.com/web/geek/jobs                                  | 推荐页/搜索页[账号已登录]     |
| 前程无忧                 | https://we.51job.com/pc/search                                        | 搜索页                        |
| 智联招聘                 | https://sou.zhaopin.com/                                              | 搜索页                        |
| 拉勾网                   | https://www.lagou.com/wn/zhaopin                                      | 搜索页                        |
| 猎聘网                   | https://www.liepin.com/zhaopin                                        | 搜索页,需点击搜索按钮才有效果 |
| 就业在线                 | https://www.jobonline.cn/position                                     | 搜索页                        |
| 广东公共求职招聘服务平台 | https://ggfw.hrss.gd.gov.cn/recruitment/internet/main/#/search?type=1 | 搜索页                        |

## 企业搜索平台支持列表

| 企业搜索平台 | 访问地址                      | 备注 |
| ------------ | ----------------------------- | ---- |
| 爱企查       | https://aiqicha.baidu.com/s |      |

## 浏览器支持

| [<img src="https://raw.githubusercontent.com/alrra/browser-logos/master/src/edge/edge_48x48.png" alt="Edge" width="24px" height="24px" />](http://godban.github.io/browsers-support-badges/)<br/> Edge | [<img src="https://raw.githubusercontent.com/alrra/browser-logos/master/src/chrome/chrome_48x48.png" alt="Chrome" width="24px" height="24px" />](http://godban.github.io/browsers-support-badges/)<br/>Chrome |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| last version                                                                                                                                                                                           | last version                                                                                                                                                                                                  |

## 运行截图

### 招聘/企业信息网站页面

#### 搜索页（前程无忧）

<div style="margin-top:30px">
    <img src="docs/src/assets/introduction/job-item-51job.jpg" alt="51job" width="1000px"/>
</div>

#### 推荐页（BOSS 直聘）

<div style="margin-top:30px">
    <img src="docs/src/assets/introduction/job-recommend-boss.jpg" alt="boss" width="1000px"/>
</div>

### 详情页

<div style="margin-top:30px">
    <img src="docs/src/assets/introduction/job-snapshot-51job.jpg" alt="job-snapshot-51job" width="1000px"/>
</div>

### 职位快照

<div style="margin-top:30px">
    <img src="docs/src/assets/introduction/job-snapshot-history-51job.jpg" alt="job-snapshot-history-51job" width="1000px"/>
</div>

#### 爱企查

<div style="margin-top:30px">
    <img src="docs/src/assets/introduction/company-aiqicha.jpg" alt="aiqicha" width="1000px"/>
</div>

### 管理页面

#### 打开管理页面

<div style="margin-top:30px">
    <img src="docs/src/assets/introduction/chrome_extension_sidepanel_open.png" alt="chrome_extension_sidepanel_open" width="1000px"/>
</div>

#### 管理页面（需点击插件图标打开）

<div style="margin-top:30px">
    <img src="docs/src/assets/introduction/sidepanel_admin_home.png" alt="sidepanel_admin_home" width="1000px"/>
</div>

## 服务端

插件端受限于浏览器本地数据库性能，服务端作为服务端数据处理方案的技术示例，演示了大规模职位数据的存储、检索与分析实现。

首页访问地址:<http://localhost:3000/>

后台访问地址:<http://localhost:3000/login>

- 账户/密码: root/Change_Me

### 注意事项

> **服务端仅供个人学习与技术研究使用。**
>
> - 本服务端为技术学习与研究工具，禁止用于任何商业用途。不推荐公网部署，仅限本地或内网环境使用。
> - 使用者在导入或采集数据时须遵守中华人民共和国相关法律法规，包括但不限于《网络安全法》《数据安全法》《个人信息保护法》，不得从事任何侵犯他人合法权益的行为。
> - 首次部署后请立即修改默认账户密码(`root` / `Change_Me`)，并更换 `auth_access_token_secret` 和 `auth_refresh_token_secret` 为随机字符串，避免未授权访问与 JWT 伪造。
> - 对于因使用本服务端而引起的任何法律责任，本项目开发者不承担责任。使用即表示您已阅读并同意[免责声明](#disclaimer)的全部条款。

### 服务端运行截图

#### 仪表板

<div style="margin-top:30px">
    <img src="docs/src/assets/introduction/server_dashboard.png" alt="server_dashboard" width="1000px"/>
</div>

#### 数据同步

<div style="margin-top:30px">
    <img src="docs/src/assets/introduction/server_data_sync.png" alt="server_data_sync" width="1000px"/>
</div>

## 服务端安装

### bin

> 从 [Releases](https://github.com/lastsunday/job-hunting/releases/latest) 下载对应平台的二进制文件，以下示例以 Linux amd64 为主：

```bash
# 默认使用 SQLite
./job-hunting-server-linux-amd64

# 使用 PostgreSQL
JH_DATABASE_URL="postgres://postgres:changeme@127.0.0.1/postgres" ./job-hunting-server-linux-amd64

# 指定配置文件（从 application-example.toml 复制按需修改）
./job-hunting-server-linux-amd64 --config /path/to/custom-config.toml
```

可用平台：

| 平台                  | 二进制文件名                          |
| --------------------- | ------------------------------------- |
| Linux amd64           | `job-hunting-server-linux-amd64`      |
| Linux arm64           | `job-hunting-server-linux-arm64`      |
| macOS (Intel)         | `job-hunting-server-macos-amd64`      |
| macOS (Apple Silicon) | `job-hunting-server-macos-arm64`      |
| macOS (通用)          | `job-hunting-server-macos`            |
| Windows amd64         | `job-hunting-server-window-amd64.exe` |

### docker

> 仅供本地学习使用，请勿在公网环境部署。

```bash
docker run -e JH_ADDRESS=0.0.0.0 -e JH_DATABASE_URL="sqlite:///data/db.sqlite?mode=rwc" -v ./data:/data -p 127.0.0.1:3000:3000 lastsunday/job-hunting:latest
```

### docker-compose

> 仅供本地学习使用，请勿在公网环境部署。

```yaml
networks:
  app-tier:
    driver: bridge

services:
  postgresql:
    image: 'postgres:18.4'
    environment:
      - POSTGRES_PASSWORD=changeme
    ports:
      - 5432:5432
    networks:
      - app-tier
    volumes:
      - pgdata:/var/lib/postgresql/data

  server:
    image: lastsunday/job-hunting:latest
    ports:
      - 127.0.0.1:3000:3000
    environment:
      - JH_ADDRESS=0.0.0.0
      - JH_DATABASE_URL=postgres://postgres:changeme@postgresql:5432/postgres
    depends_on:
      - postgresql
    networks:
      - app-tier

volumes:
  pgdata:
```

或者使用配置文件挂载方式，`config.toml` 内容如下（从 `application-example.toml` 复制按需修改）：

```toml
address = "0.0.0.0"
database_url = "postgres://postgres:changeme@postgresql:5432/postgres"
```

```yaml
networks:
  app-tier:
    driver: bridge

services:
  postgresql:
    image: 'postgres:18.4'
    environment:
      - POSTGRES_PASSWORD=changeme
    ports:
      - 5432:5432
    networks:
      - app-tier
    volumes:
      - pgdata:/var/lib/postgresql/data

  server:
    image: lastsunday/job-hunting:latest
    ports:
      - 127.0.0.1:3000:3000
    environment:
      - JH_CONFIG=/app/config.toml
    volumes:
      - ./config.toml:/app/config.toml:ro
    depends_on:
      - postgresql
    networks:
      - app-tier

volumes:
  pgdata:
```

## 数据源

1. [数据源仓库说明](./docs/src/development/datasource.md)

## FAQ

1. 报错 No more file handles available in the pool

如果在 Linux 下，请使用命令 _ulimit -n_ 检查 soft file descriptor 的值，一般默认为 1024 或 2048,请设定一个较高的值如 9001

## AI 辅助开发声明

部分代码或文档使用了 AI 工具，项目维护者对生成内容进行了审核和修改。

- OpenCode(big-pickle)
- GitHub Copilot
- Gemini 3 / Gemini 3.5
- DeepSeek V4 Pro

## 当前涉及的模块

1. apps/server
1. apps/server-ui
1. dev env
1. cicd
1. docs

## 免责声明

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
