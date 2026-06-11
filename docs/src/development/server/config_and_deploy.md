# 配置与部署

## 配置加载机制

配置通过 [figment](https://crates.io/crates/figment) 加载，支持多层来源，后者覆盖前者：

1. `JH_CONFIG` 环境变量 → 指向一个 TOML 文件路径
2. `--config` / `-c` CLI 参数 → 指定 TOML 配置文件路径
3. `JH_*` 环境变量 → 字段名转大写加 `JH_` 前缀，如 `database_url` → `JH_DATABASE_URL`
4. `-O key=value` CLI 参数 → 直接覆盖（TOML 语法）

```bash
# 方式一：指定配置文件
./server --config=application-dev.toml

# 方式二：环境变量
JH_CONFIG=/etc/job-hunting/server.toml ./server

# 方式三：覆盖单个字段
./server -O database_url="postgres://localhost/mydb" -O port=8080
```

## 配置项参考

以下为 `config` 结构体中的全部字段，默认值即不做配置时的值。

### Server

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `server_name` | string | `"localhost"` | 服务器名称 |
| `address` | string / string[] | `["127.0.0.1", "::1"]` | 监听地址，支持多个 |
| `port` | u16 / u16[] | `3000` | 监听端口 |

### Database

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `database_url` | string | `"sqlite://db.sqlite?mode=rwc"` | 数据库连接 URL（PostgreSQL 或 SQLite） |

### Auth

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `auth_access_token_secret` | string | `"QLjJTeVblAlM47de"` | Access Token 签名密钥 |
| `auth_access_token_expires_in` | u32 | `28800` | Access Token 过期时间（秒） |
| `auth_refresh_token_secret` | string | `"N8lI0uitNzJl6vYK"` | Refresh Token 签名密钥 |
| `auth_refresh_token_expires_in` | u32 | `15897600` | Refresh Token 过期时间（秒） |
| `auth_audience` | string | `"audience"` | JWT audience |
| `auth_issuer` | string | `"issuer"` | JWT issuer |
| `auth_client_id` | string | `"d1aicsr57dijo7h963ig"` | 客户端 ID |
| `auth_client_secret` | string | `"ujTgh2lEQYy0PXhK"` | 客户端密钥 |

> **生产环境必须修改**: `auth_access_token_secret`、`auth_refresh_token_secret`

### Task

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `history_file_max_size` | u64 | `5368709120` | 历史文件最大总大小（字节，默认 5 GiB） |

### Logging

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `log_console_enabled` | bool | `true` | 启用控制台日志 |
| `log_console_level` | string | `"info"` | 控制台日志级别（trace/debug/info/warn/error） |
| `log_console_format` | string | `"text"` | 控制台输出格式（text/json/compact/pretty） |
| `log_file_enabled` | bool | `false` | 启用文件日志 |
| `log_file_level` | string | `"info"` | 文件日志级别 |
| `log_file_format` | string | `"json"` | 文件输出格式 |
| `log_file_directory` | string | `"./logs"` | 日志目录 |
| `log_file_name` | string | `"server"` | 日志文件名前缀 |
| `log_file_max_files` | u32 | `10` | 最多保留的日志文件数 |
| `log_file_rotation` | string | `"daily"` | 日志轮转策略（daily/hourly/never） |
| `log_tokio_console_enabled` | bool | `false` | 启用 tokio-console（性能分析） |
| `log_flame_enabled` | bool | `false` | 启用火焰图输出 |
| `log_flame_directory` | string | `"./flame"` | 火焰图输出目录 |

### 完整配置示例

```toml
server_name = "job-hunting"
address = "0.0.0.0"
port = 3000

database_url = "postgres://user:password@localhost:5432/job_hunting"

# 生产环境务必修改以下两项
auth_access_token_secret = "your-long-secret-string"
auth_access_token_expires_in = 28800
auth_refresh_token_secret = "your-another-secret-string"
auth_refresh_token_expires_in = 15897600

log_console_enabled = true
log_console_level = "info"
log_file_enabled = true
log_file_level = "debug"
log_file_directory = "/var/log/job-hunting"
log_file_rotation = "daily"
```

## 数据库迁移

迁移由 Sea-ORM 管理，在服务器启动时**自动执行**，无需手动干预：

```rust,ignore
// api/src/lib.rs - api::start() 中
migration::Migrator::up(&conn, None).await?;
```

也可手动执行迁移 CLI：

```bash
# 在 migration 目录下
cargo run -- up
```

迁移文件位于 `migration/src/`，按时间命名：
- `m20260000_000000_init.rs` — 初始建表
- `m20260605_000001_add_indexes.rs` — 索引补充

## Docker 部署

### 构建镜像

```bash
# 交叉编译二进制（由 CI 负责）
# 构建 Docker 镜像
docker build -t job-hunting-server -f apps/server/Dockerfile .
```

### Dockerfile（简化版）

```dockerfile
FROM alpine:3.20.2
WORKDIR /app
COPY target/release/job-hunting-server /app/server
EXPOSE 3000
CMD ["./server"]
```

### docker-compose（PostgreSQL 本地开发）

项目中提供了 `docker-compose.yml`，仅包含 PostgreSQL 服务：

```bash
cd apps/server
docker compose up -d    # 启动 PostgreSQL
```

修改配置指向本地 PostgreSQL：

```bash
./server -O database_url="postgres://postgres:changeme@127.0.0.1:5432/postgres"
```

## 运行时控制

### CLI 参数

```bash
./server --help

# 可选参数：
#   -c, --config <FILE>      指定配置文件（可多次指定）
#   -O <KEY=VALUE>          覆盖配置项（TOML 语法）
```

### 信号（Linux/macOS）

| 信号 | 行为 |
|------|------|
| `SIGINT` | 优雅关闭 |
| `SIGTERM` / `SIGQUIT` | 立即关闭 |
| `SIGUSR1` | 重新加载日志配置 |
| `SIGUSR2` | 循环切换控制台日志级别 |

### moon 任务

| 命令 | 说明 |
|------|------|
| `moon run server:build` | 编译二进制 |
| `moon run server:dev` | 开发模式运行（使用 `application-dev.toml`） |
| `moon run server:run` | 正式运行（使用 `application.toml`） |
| `moon run server:test` | 运行测试 |
| `moon run server:lint` | 运行 clippy |
| `moon run server:format` | 格式检查 |
| `moon run server:bump` | 版本升级 + 生成 CHANGELOG |
