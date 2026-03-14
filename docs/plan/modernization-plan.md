# TypeScript 2026 现代化改进计划 (Modernization Plan)

本文档概述了将 `mcp-sqlite-server-advanced` 项目升级至 2026 年 TypeScript 及 Node.js 生态最佳实践的路线图。

## 1. 工具链与开发体验 (Tooling & DX)

### 1.1 引入 Biome
- **目标**: 替换 ESLint、Prettier 和 Import Sort。
- **价值**: 显著提升 Linting 和 Formatting 速度（约 10-100 倍），简化配置文件。
- **行动项**:
  - 运行 `npm install --save-dev --save-exact @biomejs/biome`。
  - 创建 `biome.json` 配置文件。
  - 更新 `package.json` 脚本，移除旧有的格式化/校验逻辑。

### 1.2 任务编排与缓存 (Wireit)
- **目标**: 优化 Monorepo 中的构建依赖关系。
- **价值**: 避免冗余构建，支持增量编译。
- **行动项**:
  - 集成 `google/wireit` 到 `package.json` 的 `build` 和 `typecheck` 脚本中。
  - 配置 `shared` 包作为 `server` 和 `client` 的依赖项，确保自动按序构建。

### 1.3 结构化日志 (Pino)
- **目标**: 实现可观测的生产级日志。
- **价值**: 支持 JSON 格式输出，便于集成 ELK 或 Datadog 等监控系统。
- **行动项**:
  - 在 `server` 包中集成 `pino` 及其传输层。

## 2. 类型安全与模式驱动 (Schema-Driven)

### 2.1 Zod 模式归一化
- **目标**: 实现“一次定义，全处校验”。
- **价值**: 消除服务器和客户端之间的数据不一致性风险。
- **行动项**:
  - 在 `shared/src/schema.ts` 中定义所有业务逻辑模式（TableInfo, QueryResult 等）。
  - 导出推断类型：`export type TableInfo = z.infer<typeof TableInfoSchema>;`。
  - 更新 `server` 和 `client` 以使用这些共享模式。

### 2.2 环境变量验证
- **目标**: 故障前置，确保启动时配置完整。
- **价值**: 防止 `DB_PATH` 或 `ADMIN_PASSWORD` 缺失导致的隐匿错误。
- **行动项**:
  - 使用 Zod 定义 `env.ts` 模块，在应用入口处执行 `envSchema.parse(process.env)`。

## 3. 性能与底层架构

### 3.1 优化 SQLite 驱动
- **目标**: 评估并迁移至高性能驱动。
- **价值**: `better-sqlite3` 提供更快的同步执行能力；`libsql` 支持远程同步（边缘侧架构）。
- **行动项**:
  - 基准测试当前 `sqlite3` 驱动在 MCP 高频调用下的表现。

### 3.2 客户端构建优化 (Tsup)
- **目标**: 最小化客户端分发体积。
- **价值**: 提供更快的下载和启动速度，支持 Tree-shaking。
- **行动项**:
  - 在 `packages/client` 中引入 `tsup` 进行打包。

## 4. 持续集成与质量保证 (CI/CD & QA)

### 4.1 测试覆盖率校验 (Test Coverage)
- **目标**: 确保核心逻辑得到充分测试。
- **价值**: 防止回归错误，提高代码可靠性。
- **行动项**:
  - 安装 `@vitest/coverage-v8`。
  - 在 `vitest.config.ts` 中配置覆盖率阈值（Thresholds）。
  - 添加 `npm run test:coverage` 脚本。

### 4.2 GitHub Actions
- **目标**: 自动化验证流程。
- **价值**: 保证合并到主分支的代码质量。
- **行动项**:
  - 配置 `.github/workflows/ci.yml`。
  - 在每次 Push/PR 时自动运行 `npm run typecheck` 和 `npm run test:coverage`。
  - 使用 `actions/cache` 缓存 `node_modules` 和 `wireit` 缓存目录。

---
**版本**: 1.0.0
**状态**: 提议中 (Proposed)
**日期**: 2026-03-14
