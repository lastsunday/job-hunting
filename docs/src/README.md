# Job Hunting(职位猎人) - 一款协助找工作的浏览器插件

<p align="center">
    <img width="180" src="assets/logo.svg" alt="logo">
</p>

## 为什么要做这个项目

当前国内使用率较高的招聘平台（排名不分先后）分别有 BOSS 直聘，前程无忧，智联招聘，猎聘网，拉勾网，其提供了各个行业的职位招聘信息的展示。但在实际使用过程中发现其展示职位信息的策略对于求职者有诸多不便，包括不仅限于：职位发布时间久远（俗称僵尸岗），不能简单识别普通职位，职位发布时间被隐藏或乱序显示，职位的公司名不是全称，没有职位公司的风险提示。

## 项目做了什么

为了提高使用这些招聘平台找工作的用户体验，项目会对目标平台网站页面进行增强展示；对出现过的职位进行本地历史快照，跨平台本地检索;对职位数据进行多维度的分析，并以可视化的手段呈现；通过内置的讨论区，对职位进行评论，为职位打上标签等方式进行中立的职位交流；

## 运行截图

### 招聘/企业信息网站页面

#### 搜索页（前程无忧）

<div style="margin-top:30px">
    <img src="assets/introduction/job-item-51job.jpg" alt="51job" width="1000px"/>
</div>

#### 推荐页（BOSS 直聘）

<div style="margin-top:30px">
    <img src="assets/introduction/job-recommend-boss.jpg" alt="boss" width="1000px"/>
</div>

### 详情页

<div style="margin-top:30px">
    <img src="assets/introduction/job-snapshot-51job.jpg" alt="job-snapshot-51job" width="1000px"/>
</div>

### 职位快照

<div style="margin-top:30px">
    <img src="assets/introduction/job-snapshot-history-51job.jpg" alt="job-snapshot-history-51job" width="1000px"/>
</div>

#### 爱企查

<div style="margin-top:30px">
    <img src="assets/introduction/company-aiqicha.jpg" alt="aiqicha" width="1000px"/>
</div>

### 管理页面

#### 打开管理页面

<div style="margin-top:30px">
    <img src="assets/introduction/chrome_extension_sidepanel_open.png" alt="chrome_extension_sidepanel_open" width="1000px"/>
</div>

#### 管理页面（需点击插件图标打开）

<div style="margin-top:30px">
    <img src="assets/introduction/sidepanel_admin_home.png" alt="sidepanel_admin_home" width="1000px"/>
</div>

## 最近主要改动/新增特性

1. 新增服务端

## 招聘平台支持列表

| 招聘平台                 | 访问地址                                                                | 备注                          |
| ------------------------ | ----------------------------------------------------------------------- | ----------------------------- |
| BOSS 直聘                | <https://www.zhipin.com/web/geek/jobs>                                  | 推荐页/搜索页[账号未登录]     |
|                          | <https://www.zhipin.com/web/geek/jobs>                                  | 推荐页/搜索页[账号已登录]     |
| 前程无忧                 | <https://we.51job.com/pc/search>                                        | 搜索页                        |
| 智联招聘                 | <https://sou.zhaopin.com/>                                              | 搜索页                        |
| 拉勾网                   | <https://www.lagou.com/wn/zhaopin>                                      | 搜索页                        |
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
> - 对于因使用本服务端而引起的任何法律责任，本项目开发者不承担责任。使用即表示您已阅读并同意[免责声明](./disclaimer.md)的全部条款。

### 服务端运行截图

#### 仪表板

<div style="margin-top:30px">
    <img src="assets/introduction/server_dashboard.png" alt="server_dashboard" width="1000px"/>
</div>

#### 数据同步

<div style="margin-top:30px">
    <img src="assets/introduction/server_data_sync.png" alt="server_data_sync" width="1000px"/>
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

> 更多部署与配置细节请参阅[配置与部署](./development/server/config_and_deploy.md)。
