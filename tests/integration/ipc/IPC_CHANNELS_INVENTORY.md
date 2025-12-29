# IPC 通道清单和测试计划

**生成时间**: 2025-12-29
**任务**: Phase 10 K02 - IPC通信集成测试
**IPC 处理器总数**: 90个

---

## 📊 按类别分组统计

| 类别 | 数量 | 通道名称 |
|-----|------|---------|
| **app** | 4 | app:log, app:quit, app:restart, app:version |
| **window** | 4 | window:close, window:isMaximized, window:maximize, window:minimize |
| **time** | 1 | time:getCurrentTime |
| **shortcut** | 4 | shortcut:add, shortcut:list, shortcut:remove, shortcut:reorder |
| **api** | 11 | api:add-provider, api:call, api:get-provider, api:get-provider-status, api:get-status, api:get-usage, api:list-providers, api:remove-provider, api:set-key, api:test-connection, api:test-provider-connection |
| **model** | 7 | model:add-custom, model:get, model:list, model:remove-custom, model:set-alias, model:toggle-favorite, model:toggle-visibility |
| **logs** | 1 | logs:get-recent |
| **project** | 7 | project:add-input-asset, project:add-output-asset, project:create, project:delete, project:list, project:load, project:save |
| **asset** | 11 | asset:delete, asset:get-index, asset:get-metadata, asset:get-references, asset:import, asset:rebuild-index, asset:scan, asset:show-import-dialog, asset:start-watching, asset:stop-watching, asset:update-metadata |
| **workflow** | 6 | workflow:cancel, workflow:execute, workflow:list, workflow:load, workflow:save, workflow:status |
| **plugin** | 9 | plugin:execute, plugin:install, plugin:installFromZip, plugin:list, plugin:load, plugin:market:list, plugin:market:search, plugin:toggle, plugin:uninstall |
| **task** | 5 | task:cancel, task:create, task:execute, task:results, task:status |
| **file** | 7 | file:delete, file:exists, file:list, file:read, file:unwatch, file:watch, file:write |
| **settings** | 2 | settings:get-all, settings:save |
| **dialog** | 2 | dialog:open-directory, dialog:selectFiles |
| **mcp** | 5 | mcp:call, mcp:connect, mcp:disconnect, mcp:list, mcp:status |
| **local** | 4 | local:restart, local:start, local:status, local:stop |
| **总计** | **90** | - |

---

## 🎯 测试策略

### 测试目标
- **覆盖率**: >95% (至少86个IPC通道)
- **错误处理**: 测试所有边界条件和错误场景
- **并发调用**: 验证并发安全性
- **性能**: 确保响应时间<100ms（简单操作）

### 测试分组

#### 组1: 应用和窗口控制 (9个)
- **文件**: `app-window-time.ipc.test.ts`
- **通道**: app:*, window:*, time:*
- **测试重点**: 基础功能、窗口状态

#### 组2: 快捷方式管理 (4个)
- **文件**: `shortcut.ipc.test.ts`
- **通道**: shortcut:*
- **测试重点**: CRUD操作、排序

#### 组3: API Provider 和模型 (18个)
- **文件**: `api-model.ipc.test.ts`
- **通道**: api:*, model:*
- **测试重点**: Provider管理、模型配置、连接测试、加密存储

#### 组4: 日志管理 (1个)
- **文件**: `logs.ipc.test.ts`
- **通道**: logs:*
- **测试重点**: 日志读取、级别过滤

#### 组5: 项目管理 (7个)
- **文件**: `project.ipc.test.ts`
- **通道**: project:*
- **测试重点**: 项目CRUD、资源绑定、TimeService集成

#### 组6: 资产管理 (11个)
- **文件**: `asset.ipc.test.ts`
- **通道**: asset:*
- **测试重点**: 索引管理、导入、元数据、文件监听、项目作用域

#### 组7: 工作流执行 (6个)
- **文件**: `workflow.ipc.test.ts`
- **通道**: workflow:*
- **测试重点**: 工作流执行、状态管理、保存加载

#### 组8: 插件系统 (9个)
- **文件**: `plugin.ipc.test.ts`
- **通道**: plugin:*
- **测试重点**: 插件加载、执行、市场集成、ZIP安装

#### 组9: 任务调度 (5个)
- **文件**: `task.ipc.test.ts`
- **通道**: task:*
- **测试重点**: 任务创建、执行、状态查询、取消

#### 组10: 文件系统和设置 (11个)
- **文件**: `file-settings-dialog.ipc.test.ts`
- **通道**: file:*, settings:*, dialog:*
- **测试重点**: 文件操作、路径安全、设置持久化

#### 组11: MCP和本地服务 (9个)
- **文件**: `mcp-local.ipc.test.ts`
- **通道**: mcp:*, local:*
- **测试重点**: MCP服务连接、本地服务管理

#### 组12: 并发和性能 (通用)
- **文件**: `concurrent-performance.ipc.test.ts`
- **测试重点**: 并发调用、性能基准、压力测试

---

## 📝 测试文件清单

### 计划创建的测试文件（12个）

1. `tests/integration/ipc/app-window-time.ipc.test.ts` - 9个通道
2. `tests/integration/ipc/shortcut.ipc.test.ts` - 4个通道
3. `tests/integration/ipc/api-model.ipc.test.ts` - 18个通道
4. `tests/integration/ipc/logs.ipc.test.ts` - 1个通道
5. `tests/integration/ipc/project.ipc.test.ts` - 7个通道
6. `tests/integration/ipc/asset.ipc.test.ts` - 11个通道
7. `tests/integration/ipc/workflow.ipc.test.ts` - 6个通道
8. `tests/integration/ipc/plugin.ipc.test.ts` - 9个通道
9. `tests/integration/ipc/task.ipc.test.ts` - 5个通道
10. `tests/integration/ipc/file-settings-dialog.ipc.test.ts` - 11个通道
11. `tests/integration/ipc/mcp-local.ipc.test.ts` - 9个通道
12. `tests/integration/ipc/concurrent-performance.ipc.test.ts` - 通用测试

### 辅助文件

1. `tests/integration/ipc/helpers/ipc-test-utils.ts` - 测试工具函数
2. `tests/integration/ipc/helpers/mock-electron.ts` - Electron Mock

---

## 🧪 测试模式

### IPC 测试架构

由于IPC通信需要 Electron 主进程和渲染进程交互，我们采用以下测试策略：

#### 方案1: 单元测试模式（推荐）
- **Mock ipcMain**: 模拟 Electron IPC 机制
- **直接调用处理器函数**: 绕过 IPC 层，直接测试业务逻辑
- **优点**: 快速、隔离、不依赖 Electron 环境
- **缺点**: 无法测试 IPC 序列化/反序列化

#### 方案2: Spectron E2E模式（可选）
- **真实 Electron 环境**: 启动完整应用
- **优点**: 测试真实通信
- **缺点**: 慢、复杂、需要额外配置

**本次采用**: 方案1 - 单元测试模式

### 测试用例模板

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ipcMain } from 'electron';

describe('IPC Channel: category:action', () => {
  let testDataDir: string;

  beforeEach(async () => {
    // 设置测试环境
    testDataDir = path.join(__dirname, `test-data-${Date.now()}`);
    await fs.mkdir(testDataDir, { recursive: true });
  });

  afterEach(async () => {
    // 清理测试数据
    await fs.rm(testDataDir, { recursive: true, force: true });
  });

  describe('正常流程', () => {
    it('应该成功执行操作', async () => {
      // 测试正常情况
    });
  });

  describe('错误处理', () => {
    it('应该处理无效参数', async () => {
      // 测试错误场景
    });

    it('应该处理边界条件', async () => {
      // 测试边界条件
    });
  });

  describe('并发安全', () => {
    it('应该支持并发调用', async () => {
      // 测试并发
    });
  });
});
```

---

## ✅ 验收标准

### 覆盖率指标
- [ ] IPC通道覆盖率 ≥ 95% (≥86个通道)
- [ ] 测试用例通过率 ≥ 95%
- [ ] 每个通道至少3个测试用例（正常、错误、边界）

### 功能验证
- [ ] 所有CRUD操作正确
- [ ] 错误处理完整
- [ ] 边界条件覆盖
- [ ] 参数验证有效
- [ ] 返回值格式正确

### 性能指标
- [ ] 简单操作 <100ms
- [ ] 复杂操作 <1000ms
- [ ] 并发调用无死锁
- [ ] 内存无泄漏

---

## 📅 实施计划

### 阶段1: 基础设施（30分钟）
- [x] 统计IPC通道清单
- [ ] 创建测试工具函数
- [ ] 创建Electron Mock

### 阶段2: 核心测试（3-4小时）
- [ ] 组1-4: 基础功能测试（app, window, shortcut, logs）
- [ ] 组5-6: 项目和资产测试（project, asset）
- [ ] 组7-9: 工作流和插件测试（workflow, plugin, task）
- [ ] 组10-11: 文件和服务测试（file, settings, mcp, local）

### 阶段3: 高级测试（1小时）
- [ ] 并发测试
- [ ] 性能测试
- [ ] 压力测试

### 阶段4: 验证和报告（30分钟）
- [ ] 运行完整测试套件
- [ ] 计算覆盖率
- [ ] 生成测试报告
- [ ] 更新TODO.md

---

## 📚 参考资料

- **服务层测试**: `tests/unit/services/*.test.ts`
- **K01报告**: `tests/unit/services/PROGRESS_REPORT.md`
- **设计文档**: `docs/02-technical-blueprint-v1.0.0.md`
- **IPC定义**: `src/main/ipc/channels.ts`
- **主进程**: `src/main/index.ts`
