# AGENTS.md

## 索引

- [1. 技术栈](#1-技术栈)
- [2. 项目结构与命名](#2-项目结构与命名)
- [3. 核心禁忌](#3-核心禁忌)
- [4. 开发工作流](#4-开发工作流)
  - [4.1 开发环境设置（Lix）](#41-开发环境设置lix)
- [5. 构建与 CI 调试](#5-构建与-ci-调试)
- [附录 框架约定与扩展机制](#附录-框架约定与扩展机制)

## 1. 技术栈

### Rust (apps/server)

- **Edition 2024** - 使用 RPIT 生命周期捕获规则等新语法
- **Web**: Axum 0.8 + tower-http + utoipa-axum (Scalar OpenAPI)
- **ORM**: Sea-ORM (sqlx-postgres, sqlx-sqlite, with-chrono, with-rust_decimal)
- **Auth**: jsonwebtoken (HS256, access + refresh token) + bcrypt
- **Config**: config crate (YAML)
- **ID**: xid (XID format)
- **DB**: PostgreSQL (sea-orm-migration)
- **Error**: 自定义 `#[error]` proc-macro (framework-macros)
- **Testing**: cucumber (BDD) + testcontainers
- **Other**: chrono, strum, utoipa-scalar

### TypeScript

**管理后台 (apps/server-ui):**

- React 19 + Mantine v9 + @mantine/core + @mantine/hooks
- TanStack Router (file-based routing, auto code-splitting)
- TanStack Query (React Query)
- Axios + `postJson<T>()` / `getJson<T>()` / `putJson<T>()` / `deleteJson<T>()`
- i18next + react-i18next (命名空间翻译)
- UnoCSS + CSS Modules (.module.css)
- zod (runtime validation)
- 环境变量: `import.meta.env.VITE_*`
- Prettier: `{ singleQuote: true }`

**浏览器扩展 (apps/extension):**

- WXT framework (Chrome MV3)
- React 19 + Ant Design v5 + @ant-design/icons
- react-router 7 (页面路由)
- zustand (状态管理)
- fetch (API 调用)
- @electric-sql/pglite (嵌入式 WASM PostgreSQL)
- @mlc-ai/web-llm (浏览器内 LLM 推理)
- UnoCSS
- 测试: Vitest + Playwright BDD (playwright-bdd)

## 2. 项目结构与命名

### 目录结构

```
├── docs/                      mdBook 项目文档
├── packages/                  workspace 占位
├── libs/
│   └── analysis/              Lit Web Components 分析组件库
├── apps/
│   ├── server/                Rust 后端
│   │   ├── api/src/           API 路由层 (每个模块一个 .rs 文件)
│   │   ├── service/src/       业务逻辑层
│   │   ├── entity/src/        Sea-ORM Entity (自动生成 + 手动补充)
│   │   ├── migration/src/     数据库迁移
│   │   ├── web/src/           Web 层 (静态文件服务)
│   │   └── framework/         框架层 (error, auth, config, data, middleware 等)
│   ├── server-ui/src/         React 管理后台
│   │   ├── components/        UI 组件
│   │   ├── hooks/             自定义 Hooks
│   │   ├── routes/            TanStack Router 路由文件
│   │   ├── api/               API 调用层
│   │   ├── config/            配置
│   │   ├── data/              数据类型定义
│   │   ├── i18n/              国际化
│   │   ├── store/             状态管理
│   │   ├── widget/            微件组件
│   │   ├── assets/            静态资源
│   │   └── utils/             工具函数
│   └── extension/             浏览器扩展
│       ├── entrypoints/       入口 (background, content, offscreen, admin 等)
│       ├── common/            共享代码 (api, data/domain/bo/dto, extension)
│       └── lib/               第三方库
```

新建文件请严格遵循对应的目录位置。

### 命名风格

| 语言/层         | 命名风格                  | 示例                                        |
| --------------- | ------------------------- | ------------------------------------------- |
| Rust 变量/函数  | snake_case                | `create_routes`, `get_job_by_id`            |
| Rust 类型/Trait | PascalCase                | `ApiResult<T>`, `Principal`                 |
| Rust 错误码枚举 | `*ErrorCode` (PascalCase) | `UserErrorCode`, `JobErrorCode`             |
| Rust 模块名     | snake_case                | `job.rs`, `user.rs`                         |
| TS 变量/函数    | camelCase                 | `loadJobs`, `handleSubmit`                  |
| TS 组件/类      | PascalCase                | `RouteComponent`, `JobFormData`             |
| TS 文件         | kebab-case + .tsx/.ts     | `jobs.tsx`, `http.ts`                       |
| DB 表/字段      | snake_case                | `company_tag`, `first_scan_datetime`        |
| URI             | snake_case                | `/api/job/search`、`/api/auth/access_token` |
| 扩展 API 方法   | className + methodName    | `dataSourceMetadataSearch`                  |

## 3. 核心禁忌

### 绝对不能做的

- **不要**手动编辑 `routeTree.gen.ts` (TanStack Router 自动生成和覆盖)
- **不要**修改 Nx workspace 结构 (`nx.json`, `pnpm-workspace.yaml`, `project.json`)
- **不要**引入新依赖前未检查现有依赖是否已满足需求
- **不要**使用非 Edition 2024 的 Rust 语法（如 `'_` 生命周期 elision 规则、`impl<T>` 旧式 trait bound 等）

### 必须遵守的

- Rust: 必须使用 `#[error]` 宏定义错误码（6 位数字），不要手动实现 Error trait
- Rust: 必须使用 `err!` 宏产生 ApiError，不要直接 `Err(ApiError::...)`
- Rust: 不要遗漏 `use framework::prelude::*`
- Rust: 路由必须在 `create_routes` 中通过 `OpenApiRouter` 组织
- Rust: 提交前运行 `cargo fmt && cargo clippy` 保持代码风格
- server-ui: 不要修改 TanStack Router 路由配置之外的自动生成文件
- extension: 扩展 API 必须用 `fillBridgeApi()` 注册，不要直接跨 context 调用函数

## 4. 开发工作流

### 开发环境设置（Lix）

项目使用 **Lix**（Nix 的社区 fork）管理可复现的开发环境。

**首次设置：**

```bash
# 1. 安装 Lix
# Linux
curl -sSf -L https://install.lix.systems/lix | sh -s -- install
# macOS (Intel) — 同上命令即可
# macOS (Apple Silicon) — 同上
# 注意：不要使用 Determinate Systems 安装器（已停止支持 Intel Mac）

# 2. 安装 direnv（推荐，自动激活环境）
nix profile install nixpkgs#direnv nixpkgs#nix-direnv
# 在 ~/.zshrc 或 ~/.bashrc 添加: eval "$(direnv hook zsh)"

# 3. 进入项目（direnv 自动激活，或手动 nix develop）
cd job-hunting
direnv allow
```

**devShell 选择：**

```bash
nix develop .#server    # 仅 Rust 后端
nix develop .#frontend  # 仅前端
nix develop             # 默认完整环境
```

**版本来源（自动同步，无需手动维护）：**

- Rust 版本 → `rust-toolchain.toml`
- Node.js 版本 → `.node-version`

**注意事项：**

- macOS Intel (x86_64-darwin)：Lix 官方仍支持（tier 2），如有问题联系维护者
- 系统依赖（openssl, sqlite, postgresql 等）由 Lix 统一管理，无需 brew/apt
- CI 中 Lix 提供环境：`nix develop --command pnpm exec moon ci --affected`

### 新增业务逻辑时 (Rust)

1. `migration/src/`: 创建 SQL 迁移
2. `entity/src/`: 更新 Sea-ORM 实体，手动补充部分注意不要被自动生成覆盖
3. `api/src/`: 定义模块专用的 `*ErrorCode`（或在 `framework/error/` 中定义通用错误码）
4. `service/src/`: 实现具体业务逻辑
5. `api/src/`: 使用 `create_routes` 导出路由并接入 `api_setup`
6. 运行 `cargo check && cargo test` 验证类型与测试

### 新增前端页面时 (server-ui)

1. `routes/`: 按 TanStack Router 文件路由约定新建 `.tsx` 文件
2. `api/`: 添加对应的 API 调用函数
3. `components/` + `.module.css`: 组件与样式文件
4. 翻译文本添加到 `public/locales/{lang}/{namespace}.json`
5. 运行 `nx typecheck server-ui` 验证类型
6. 开发调试: `cd apps/server-ui && pnpm run dev`

### 新增扩展功能时 (extension)

1. `common/data/domain/` 或 `common/data/dto/`: 数据模型
2. `common/api/`: API 层，`fillBridgeApi()` 注册
3. `entrypoints/offscreen/` 或 `entrypoints/background/`: Service 实现
4. 涉及表结构变更时，在 `entrypoints/offscreen/worker/changeLog/` 添加 `changeLogV{version}.js`
5. 运行 `npm run compile` 验证类型

### 最佳实践

- 涉及项目模块细节问题时，优先查阅 `docs/src/` 下对应模块的文档
- 涉及扩展 DB 事务或密集计算时，优先在 Offscreen Document 中处理
- 涉及第三方库的特定版本兼容性问题、已知 bug 或不熟悉的 API 时，先搜索官方文档和已知解决方案，再动手处理
- 生成 React 组件时，默认配套同名的 `.module.css`（仅限 server-ui 管理后台，使用 Mantine v9；扩展使用 Ant Design v5）
- 启动扩展开发用 `cd apps/extension && pnpm run dev`，加载 `.output/chrome-mv3-dev`
- Rust 路由改动后运行 `cargo check` 验证类型，不用 `cargo run` 全量编译；新增业务逻辑记得同时运行 `cargo test`

## 5. 构建与 CI 调试

### 构建工具

- **Monorepo**: Moon (@moonrepo/cli 2.3.2)
- **配置**: `.moon/workspace.yml`, `.moon/toolchains.yml`
- **JS/TS 任务**: Moon 自动从 `package.json` scripts 推断（script 名中的 `:` 自动转为 `-`）
- **Rust 任务**: 在 `moon.yml` 中显式定义
- **常用命令**:
  - `pnpm exec moon run <project>:<task>` — 运行某项目的特定任务
  - `pnpm exec moon run :<task>` — 所有项目运行某任务
  - `pnpm exec moon run <tag>:<task>` — 某 tag 的所有项目运行某任务
  - `pnpm exec moon ci --affected` — CI 中运行受影响项目的 pipeline
  - `pnpm exec moon query projects` — 列出所有项目
  - `pnpm exec moon query tasks` — 列出所有任务
  - `pnpm exec moon check` — 验证配置
- **工具链**: Moon 通过 proto 管理 Node.js/pnpm 版本
- **注意**: `.moon/toolchains.yml` 必须是复数（Moon v2.3 bug 导致 `moon init` 生成单数 `toolchain.yml` 但实际不加载）

### CI 调试指南

**快速定位 moon ci 失败:**

```
moon ci 报 Failed
  ├─ 有任务输出（含 Error / error[E...]）→ 看具体编译/运行错误
  ├─ 无任务输出，但有 moon 引擎 Error 行（如 task_runner::missing_outputs）
  │  → 检查 moon.yml 的 outputs 路径是否匹配实际产物
  └─ 无任务输出，无 moon Error 行，任务静默失败
     → 可能是 OOM（exit 137），单独跑 pnpm exec moon run <task> 验证
```

**关键认知:**

- moon 中 task 输出（cargo/stdout）和 moon 引擎日志是**两条独立通道**
- `buffer-only-failure` 仅显示**任务非 0 退出**时的输出。任务 exit 0 但后置校验失败（如 missing_outputs），buffer 会被丢弃
- moon 引擎 Error 行不会被 `MOON_LOG` 级别过滤，始终可见
- `missing_outputs` 表示 `moon.yml` 中 `outputs` 声明的路径不存在，修正路径即可

**调试命令:**

```bash
pnpm exec moon run <project>:<task>             # 隔离跑单个任务，看完整输出
pnpm exec moon run <project>:<task> --log trace  # 带 moon 内部日志（会输出大量信息）
MOON_DEBUG_PROCESS_INPUT=true moon run <project>:<task>  # 显示传给子进程的 stdin
pnpm exec moon debug config  # 查看 moon 内部配置加载状态
```

## 附录 框架约定与扩展机制

### 框架约定

- `framework::prelude::*` → `err!`, `ApiResult`, `ApiError`, `AppErrorCode`, `#[error]` 宏, `IntoStaticStr`
- 错误码导入: 框架级用 `use framework::error::xxx::XxxErrorCode`，模块级用 `#[error]` 宏定义在 `api/src/*.rs` 中
- 每个业务子 crate 实现 `pub fn create_routes(state: AppState) -> OpenApiRouter`（`index` 模块除外，其不需要 state）
- 所有路由嵌套在 `/api` 下，通过 `api_setup` 函数组装（在 `api/src/lib.rs` 中调用）
- handler 使用 `#[debug_handler]` attribute 辅助编译期错误提示
- `ValidJson<T>` 验证 JSON body，`ValidQuery<T>` 验证 query 参数
- `Extension<Principal>` 提取 JWT 身份
- 条件查询: `query.apply_if(value, |q, v| q.filter(condition))`
- 分页: `Entity::find().order_by_xxx().paginate(&conn, page_size)`

### 扩展内部机制

- 内部 API 注册: `fillBridgeApi({ api })` + `mergeServiceMethod(map, ServiceClass)`
- 方法名 = `className + methodName` (小驼峰)
- 通信链: ContentScript ↔ Background ↔ Offscreen ↔ WebWorker
- 自定义 ORM: BaseService → database.js (PGlite 操作, JSON ↔ SQL, 小驼峰↔下划线)
- Schema 变更: `changeLogV{version}.js` + version 表 (事务执行)
- 支持的招聘平台详见 `docs/src/README.md`
