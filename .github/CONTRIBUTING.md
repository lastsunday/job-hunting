# Contributing

欢迎对项目的贡献！以下是参与开发的指南。

## Development Environment

### Prerequisites

| Requirement | Version |
|-------------|---------|
| Node.js     | 22 (see `.node-version`) |
| pnpm        | 10.13.1 |
| Rust        | nightly (edition 2024) |

### Quick Start

```bash
# Install dependencies
pnpm install

# Start extension dev server (hot-reload)
pnpm exec nx run @job-hunting/extension:dev

# Start server UI dev server
pnpm exec nx run @job-hunting/server-ui:dev

# Start Rust backend
cd apps/server && cargo run

# Build docs
cd docs && mdbook serve
```

### Commit Convention

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>
```

Common types: `feat`, `fix`, `refactor`, `test`, `docs`, `ci`, `chore`, `style`, `perf`, `build`.

Examples:
- `feat(job): add resume parsing`
- `fix(extension): correct auth redirect`
- `docs: update API reference`

### Before Submitting

- Run `cargo fmt && cargo clippy` for Rust changes
- Run `cargo test` to verify Rust tests
- Run `pnpm exec nx typecheck` for TypeScript projects
- Ensure all existing tests pass

## Pull Request Process

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/my-feature`
3. Commit your changes: `git commit -m 'feat: add some feature'`
4. Push to the branch: `git push origin feat/my-feature`
5. Open a Pull Request

## Project Structure

```
├── apps/
│   ├── server/         Rust backend (Axum + Sea-ORM)
│   ├── server-ui/      Admin UI (React + Mantine + TanStack Router)
│   └── extension/      Browser extension (WXT + React + Ant Design)
├── libs/
│   └── analysis/       Lit Web Components analysis library
├── docs/               mdBook project documentation
└── packages/           Workspace placeholders
```

## Code Style

- Rust: Edition 2024, snake_case for functions/variables, PascalCase for types
- TypeScript: camelCase for functions/variables, PascalCase for components/classes
- File naming: kebab-case for `.tsx`/`.ts` files
- DB schema: snake_case for tables and columns
- URI: snake_case for API endpoints

See [AGENTS.md](./AGENTS.md) in the repository root for full details on code conventions, error handling, and development workflow.
