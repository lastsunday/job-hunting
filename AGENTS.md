# AGENTS.md

## 1. 技术栈

### Rust (apps/server)
- **Edition 2024** - 使用 RPIT 生命周期捕获规则等新语法，workspace 层级配置 `edition = "2024"` 和 `resolver = "2"`
- **Web**: Axum 0.8 + tower-http + utoipa-axum (Scalar OpenAPI)
- **ORM**: Sea-ORM {features = ["sqlx-postgres", "runtime-tokio-rustls", "macros", "with-chrono", "debug-print", "sqlx-sqlite", "with-rust_decimal"]}
- **Auth**: jsonwebtoken (HS256, access + refresh token) + bcrypt
- **Config**: config crate (YAML)
- **ID**: xid (XID format)
- **DB**: PostgreSQL (sea-orm-migration)
- **Error**: 自定义 `#[error]` proc-macro (framework-macros)
- **Testing**: cucumber (BDD) + testcontainers
- **Other**: chrono, strum, utoipa-scalar

**框架约定:**
- `framework::prelude::*` → `err!`, `ApiResult`, `ApiError`, `AppErrorCode`, `#[error]` 宏, `IntoStaticStr`
- 错误码导入: 框架级用 `use framework::error::xxx::XxxErrorCode`，模块级用 `#[error]` 宏定义在 `api/src/*.rs` 中
- 每个业务子 crate 实现 `pub fn create_routes(state: AppState) -> OpenApiRouter`（`index` 模块除外，其不需要 state）
- 所有路由嵌套在 `/api` 下，通过 `api_setup` 函数组装（在 `api/src/lib.rs` 中调用）
- handler 使用 `#[debug_handler]` attribute 辅助编译期错误提示
- `ValidJson<T>` 验证 JSON body，`ValidQuery<T>` 验证 query 参数
- `Extension<Principal>` 提取 JWT 身份
- 条件查询: `query.apply_if(value, |q, v| q.filter(condition))`
- 分页: `Entity::find().order_by_xxx().paginate(&conn, page_size)`

### TypeScript

**管理后台 (apps/server-ui):**
- React 19 + Mantine v9 + @mantine/core + @mantine/hooks
- TanStack Router (file-based routing, auto code-splitting, `routeTree.gen.ts` 自动生成)
- TanStack Query (React Query) for server state
- Axios + `postJson<T>()` / `getJson<T>()` / `putJson<T>()` / `deleteJson<T>()`
- i18next + react-i18next (命名空间翻译, `useTranslation(['ns1','ns2'])`)
- UnoCSS + CSS Modules (局部样式 `.module.css`)
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

**扩展内部机制:**
- 内部 API 注册: `fillBridgeApi({ api })` + `mergeServiceMethod(map, ServiceClass)`
- 方法名 = `className + methodName` (小驼峰)
- 通信链: ContentScript ↔ Background ↔ Offscreen ↔ WebWorker
- 自定义 ORM: BaseService → database.js (PGlite 操作, JSON ↔ SQL, 小驼峰↔下划线)
- Schema 变更: `changeLogV{version}.js` + version 表 (事务执行)
- 支持的招聘平台详见 `docs/src/README.md`

## 2. 核心禁忌 (Do NOT)

### 绝对不能做的事:
- **不要**手动编辑 `routeTree.gen.ts` (TanStack Router 自动生成和覆盖)
- **不要**修改 Nx workspace 结构 (`nx.json`, `pnpm-workspace.yaml`, `project.json`)
- **不要**引入新依赖前未检查现有依赖是否已满足需求
- **不要**使用非 Edition 2024 的 Rust 语法（如 `'_` 生命周期 elision 规则、`impl<T>` 旧式 trait bound 等）

### 代码规范禁忌:
- Rust: 必须使用 `#[error]` 宏定义错误码（6 位数字），不要手动实现 Error trait
- Rust: 必须使用 `err!` 宏产生 ApiError，不要直接 `Err(ApiError::...)`
- Rust: 不要遗漏 `use framework::prelude::*`
- Rust: 路由必须在 `create_routes` 中通过 `OpenApiRouter` 组织
- Rust: 提交前运行 `cargo fmt && cargo clippy` 保持代码风格
- server-ui: 不要手动编辑 `routeTree.gen.ts` (TanStack Router 自动生成和覆盖)
- server-ui: 不要修改 TanStack Router 路由配置之外的自动生成文件
- extension: 扩展 API 必须用 `fillBridgeApi()` 注册，不要直接跨 context 调用函数

## 3. 目录结构

```
├── docs/                      mdBook 项目文档
├── packages/                  workspace 占位
├── libs/
│   └── analysis/              Lit Web Components 分析组件库 (被扩展引用)
├── apps/
│   ├── server/                # Rust 后端
│   │   ├── api/src/           API 路由层 (每个模块一个 .rs 文件)
│   │   ├── service/src/       业务逻辑层
│   │   ├── entity/src/        Sea-ORM Entity (自动生成 + 手动补充)
│   │   ├── migration/src/     数据库迁移
│   │   ├── web/src/           Web 层 (静态文件服务)
│   │   ├── framework/
│   │   │   ├── src/           框架层
│   │   │   │   ├── error/     错误码定义 (auth_code, base_code 等)
│   │   │   │   ├── auth.rs    JWT 认证
│   │   │   │   ├── config/    配置
│   │   │   │   ├── data/      JSON/Query/Path 提取器
│   │   │   │   ├── middleware.rs  认证中间件
│   │   │   │   ├── database.rs    数据库连接
│   │   │   │   ├── id.rs      ID 生成
│   │   │   │   ├── logger.rs  日志
│   │   │   │   ├── password.rs    密码哈希
│   │   │   │   ├── prelude.rs     全局预导入
│   │   │   │   └── trace.rs       链路追踪
│   │   │   └── macros/        proc-macro 宏 (framework-macros)
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
│       ├── entrypoints/
│       │   ├── background/    Service Worker
│       │   ├── content/       内容脚本 (每个平台 1 个脚本)
│       │   ├── offscreen/     Offscreen Document (DB Worker)
│       │   ├── admin/         后台管理页面
│       │   ├── components/    UI 组件
│       │   ├── assets/        静态资源
│       │   ├── jobDetail.content/  职位详情注入脚本
│       │   └── proxyAjax.content/  Ajax 代理注入脚本
│       ├── common/            共享代码
│       │   ├── api/           API 层
│       │   ├── data/          数据模型 (domain/bo/dto)
│       │   └── extension/     Extension 工具
│       └── lib/               第三方库 (single-file 等)
```

新建文件请严格遵循对应的目录位置。

## 4. 命名风格

| 语言/层 | 命名风格 | 示例 |
|---------|---------|------|
| Rust 变量/函数 | snake_case | `create_routes`, `get_job_by_id` |
| Rust 类型/Trait | PascalCase | `ApiResult<T>`, `Principal` |
| Rust 错误码枚举 | `*ErrorCode` (PascalCase) | `UserErrorCode`, `JobErrorCode` |
| Rust 模块名 | snake_case | `job.rs`, `user.rs` |
| TS 变量/函数 | camelCase | `loadJobs`, `handleSubmit` |
| TS 组件/类 | PascalCase | `RouteComponent`, `JobFormData` |
| TS 文件 | kebab-case + .tsx/.ts | `jobs.tsx`, `http.ts` |
| DB 表/字段 | snake_case | `company_tag`, `first_scan_datetime` |
| URI | snake_case | `/api/job/search`、`/api/auth/access_token` |
| 扩展 API 方法 | className + methodName | `dataSourceMetadataSearch` |

## 5. 开发工作流 (Workflow)

### 新增业务逻辑时
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
4. 翻译文本添加到 `public/locales/{lang}/{namespace}.json`（如 `public/locales/en/common.json`）
5. 运行 `nx typecheck server-ui` 验证类型
6. 开发调试: `cd apps/server-ui && pnpm run dev`

### 新增扩展功能时 (extension)
1. `common/data/domain/` 或 `common/data/dto/`: 数据模型
2. `common/api/`: API 层，`fillBridgeApi()` 注册
3. `entrypoints/offscreen/` 或 `entrypoints/background/`: Service 实现
4. 涉及表结构变更时，在 `entrypoints/offscreen/worker/changeLog/` 添加 `changeLogV{version}.js`
5. 运行 `npm run compile` 验证类型

## 6. 提问指南 (Prompt Instruction)
- 涉及项目模块细节问题时，优先查阅 `docs/src/` 下对应模块的文档
- 涉及扩展 DB 事务或密集计算时，优先在 Offscreen Document 中处理
- 生成 React 组件时，默认配套同名的 `.module.css`（仅限 server-ui 管理后台，使用 Mantine v9；扩展使用 Ant Design v5）
- 启动扩展开发用 `cd apps/extension && pnpm run dev`，加载 `.output/chrome-mv3-dev`
- Rust 路由改动后运行 `cargo check` 验证类型，不用 `cargo run` 全量编译；新增业务逻辑记得同时运行 `cargo test`
