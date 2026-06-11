# 快速开始

## 职位猎人插件

1. 打开 Release 页 或 直接访问 [最新发布](https://github.com/lastsunday/job-hunting/releases/latest)
2. 点击下载 Assets 下的 job-hunting-extension-chrome-xxx.zip
3. 打开浏览器，安装插件，下面是针对不同浏览器的安装步骤
   1. chrome：地址栏输入 <chrome://extensions/>，打开开发者模式，将 zip 文件拖进页面里
   2. edge，地址栏输入 <edge://extensions/>，打开开发人员模式，将 zip 文件拖进页面里
4. 打开页面
   - boss 直聘： <https://www.zhipin.com/web/geek/jobs>
   - 51Job： <https://we.51job.com/pc/search>
   - 智联招聘： <https://sou.zhaopin.com/>
   - 拉钩网：<https://www.lagou.com/wn/zhaopin>
   - 猎聘网： <https://www.liepin.com/zhaopin>
   - 就业在线： <https://www.jobonline.cn/position>
   - 广东公共求职招聘服务平台 <https://ggfw.hrss.gd.gov.cn/recruitment/internet/main/#/search?type=1>

## 服务器端

### 二进制（推荐）

从 [Releases](https://github.com/lastsunday/job-hunting/releases/latest) 下载对应平台二进制：

```bash
# 默认 SQLite
./job-hunting-server-linux-amd64

# 使用配置文件
./job-hunting-server-linux-amd64 --config=application.toml

# 使用环境变量覆盖（字段名小写，加 JH_ 前缀）
JH_DATABASE_URL="postgres://postgres:changeme@127.0.0.1/postgres" \
JH_ADDRESS=0.0.0.0 \
  ./job-hunting-server-linux-amd64
```

可用平台：Linux(amd64/arm64)、macOS(Intel/Apple Silicon/通用)、Windows amd64

> 环境变量命名规则：配置字段名转大写 + `JH_` 前缀，如 `database_url` → `JH_DATABASE_URL`，`address` → `JH_ADDRESS`。也可用 `-O key=value` 直接覆盖。

### 配置文件

创建 `application.toml`：

```toml
# 监听地址
address = "0.0.0.0"
port = 3000

# 数据库（SQLite 默认即可）
database_url = "sqlite://db.sqlite?mode=rwc"

# 生产环境务必修改以下三项
auth_access_token_secret = "更换为随机字符串"
auth_refresh_token_secret = "更换为另一随机字符串"
```

```bash
./job-hunting-server-linux-amd64 --config=application.toml
```

### Docker

```bash
docker run -e JH_ADDRESS=0.0.0.0 \
  -e JH_DATABASE_URL="sqlite:///data/db.sqlite?mode=rwc" \
  -v ./data:/data \
  -p 127.0.0.1:3000:3000 \
  lastsunday/job-hunting:latest
```

### docker-compose（完整部署示例）

> 仓库中的 `docker-compose.yml` 仅含 PostgreSQL，用于本地开发。以下为完整部署示例。

```yaml
services:
  postgresql:
    image: postgres:18.4
    environment:
      - POSTGRES_PASSWORD=changeme
    ports:
      - 5432:5432
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

volumes:
  pgdata:
```

### 访问

- 管理后台：<http://localhost:3000/login>（默认账号 `root` / `Change_Me`）
- API 文档（Scalar）：<http://localhost:3000/docs>

> 首次部署后请立即修改默认密码，并更换 `auth_access_token_secret` 和 `auth_refresh_token_secret` 为随机字符串（可在配置文件中设置，或通过 `JH_AUTH_ACCESS_TOKEN_SECRET` / `JH_AUTH_REFRESH_TOKEN_SECRET` 环境变量覆盖）。否则持有默认值者可伪造 JWT。
