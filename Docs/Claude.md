# CLAUDE.md

本文件为 Claude Code (claude.ai/code) 在此代码仓库中工作时提供指导。

## 🔴 首要规则（最高优先级）

**全程使用中文对话**
- 与用户交流时必须使用中文
- 所有回复、说明、注释都使用中文
- 代码注释优先使用中文
- 仅在代码标识符（变量名、函数名等）中使用英文

---

## 项目概述

MATRIX Studio 是一个基于 Electron 的 AI 视频生成工作流管理平台。作为中间件，提供统一的工作流和物料管理功能，不直接参与视频渲染。

- **当前版本**: v0.4.0
- **技术栈**: Electron 39+, React 18, TypeScript 5, Webpack 5
- **测试框架**: Vitest (替代 Jest), Playwright (E2E测试)
- **架构**: 三进程模型（主进程、预加载、渲染进程）

## 常用命令

### 开发模式
- `npm run dev`: 启动开发模式（监听所有进程，启动 Electron）
- `npm run dev:main`: 仅监听主进程
- `npm run dev:renderer`: 仅监听渲染进程
- `npm run dev:preload`: 仅监听预加载脚本

### 构建
- `npm run build`: 构建所有进程（生产环境）
- `npm run build:main`: 仅构建主进程
- `npm run build:renderer`: 仅构建渲染进程
- `npm run build:preload`: 仅构建预加载脚本

### 测试
- `npm test`: 运行所有测试 (使用 Vitest)
- `npm run test:unit`: 仅运行单元测试 (tests/unit/)
- `npm run test:integration`: 仅运行集成测试 (tests/integration/)
- `npm run test:integration:novel-baseline`: 运行 Novel-to-Video 基线测试
- `npm run test:e2e`: 运行端到端测试 (Playwright)
- `npm run test:e2e:ui`: 启动 Playwright UI 界面
- `npm run test:e2e:debug`: 调试模式运行 E2E 测试
- `npm run test:watch`: 监听模式运行测试
- `npm run test:ui`: 启动 Vitest UI 界面
- `npm run test:coverage`: 生成测试覆盖率报告
- `npx vitest tests/path/to/specific.test.ts`: 运行单个测试文件

### 代码检查与格式化
- `npm run lint`: 检查代码问题
- `npm run lint:fix`: 自动修复代码问题
- `npm run format`: 使用 Prettier 格式化代码

### 打包
- `npm run package`: 为当前平台打包
- `npm run package:win`: 为 Windows 打包
- `npm run package:mac`: 为 macOS 打包
- `npm run package:linux`: 为 Linux 打包

### 工具命令
- `npm run clean`: 删除 build 和 dist 目录
- `npm run clean:projects`: 清理无效项目
- `npm run clean:projects:dry`: 干运行模式（仅预览）

## 架构设计

### Electron 三进程模型

1. **主进程** (`src/main/`): Node.js 环境，管理应用生命周期、窗口和系统集成
   - 入口: `src/main/index.ts`
   - 核心服务: 26个服务（见下方服务架构部分）
   - IPC 处理器: 10+ 个处理器模块，涵盖所有核心功能

2. **预加载脚本** (`src/preload/`): 主进程与渲染进程之间的桥梁，使用 contextBridge
   - 入口: `src/preload/index.ts`
   - 向渲染进程暴露 `window.electronAPI`
   - 安全层，确保 IPC 通信安全

3. **渲染进程** (`src/renderer/`): 浏览器环境，运行 React
   - 入口: `src/renderer/index.tsx`
   - 路由: React Router，使用 Layout 包装器
   - 页面: Dashboard、Assets、Plugins、Workflows、Settings、About

### 服务架构

主进程服务遵循管理器模式，所有服务位于 `src/main/services/`：

**核心服务**（完整实现）:
- **ProjectManager**: 项目的 CRUD 操作和生命周期管理
- **AssetManager**: 物料管理，支持全局/项目作用域，AI 属性追踪
- **AssetDataManager**: 资产数据持久化和索引管理
- **TimeService**: 集中式时间处理（NTP同步、时间验证）
- **Logger**: 统一日志系统（4级日志、文件轮转）
- **ServiceErrorHandler**: 统一错误处理（37个错误码）
- **FileSystemService**: 文件系统操作封装（路径管理、JSON读写）
- **ConfigManager**: 应用配置管理

**工作流服务**:
- **WorkflowRegistry**: 工作流注册和管理
- **WorkflowStateManager**: 工作流状态管理和执行追踪
- **FlowStateManager**: 工作流执行状态管理
- **SchemaRegistry**: Schema 验证和类型系统
- **ModelRegistry**: AI 模型注册和管理

**插件和任务系统**:
- **PluginManager**: 插件加载/卸载/执行（含安全沙箱）
- **ProjectPluginConfigManager**: 插件配置注入和管理
- **PluginMarketService**: 插件市场集成
- **TaskScheduler**: 任务调度和执行（支持持久化）
- **AsyncTaskManager**: 异步任务管理（10秒轮询、10分钟超时、重试机制）

**Provider 和 API 管理**:
- **APIManager**: API Provider 管理（支持 OpenAI、Anthropic、DeepSeek 等）
- **ProviderHub**: Provider 统一注册和管理中心
- **ProviderRegistry**: Provider 注册表
- **ProviderRouter**: Provider 路由和调度
- **AIService**: AI 服务统一接口

**辅助服务**:
- **GenericAssetHelper**: 通用资产辅助工具
- **ShortcutManager**: 快捷键管理
- **TemplateManager**: 项目和 Provider 模板管理

### IPC 通信

所有 IPC 通道遵循命名约定: `类别:操作` (例如: `project:create`, `window:maximize`)

通道分类：
- `app:*`: 应用生命周期（版本、退出、重启）
- `window:*`: 窗口控制（最小化、最大化、关闭）
- `project:*`: 项目操作（创建、加载、保存、删除、列表）
- `asset:*`: 物料操作（添加、移除、更新、搜索、预览）
- `workflow:*`: 工作流执行和管理
- `plugin:*`: 插件安装和管理
- `task:*`: 任务调度和执行
- `api:*`: 外部 API 集成（Provider 管理）
- `model:*`: AI 模型管理
- `file:*`: 文件系统操作
- `settings:*`: 应用设置管理
- `dialog:*`: 系统对话框
- `shortcut:*`: 快捷方式管理
- `logs:*`: 日志查询
- `mcp:*`: MCP 服务集成
- `local:*`: 本地服务管理

## 关键要求

### 时间处理 ⚠️ 最高优先级
**重要**: 写入任何时间戳或时间相关数据前：
1. 使用 TimeService 或 MCP 服务查询系统时间
2. 使用查询到的时间进行所有操作
3. **禁止直接使用 `Date.now()` 或 `new Date()` 而不经过验证**

参考: `docs/00-global-requirements-v1.0.0.md` 和 `docs/02-technical-blueprint-v1.0.0.md`

### IPC 通信规范
添加新的 IPC 通道需要在三个地方同步修改：
1. **主进程处理器**: `src/main/ipc/` - 注册 `ipcMain.handle()`
2. **预加载脚本**: `src/preload/index.ts` - 使用 `ipcRenderer.invoke()` 暴露 API
3. **类型定义**: `src/shared/types/` - 定义请求/响应类型

示例：
```typescript
// 1. 主进程: src/main/ipc/example-handlers.ts
ipcMain.handle('example:doSomething', async (_, arg: string) => {
  return await exampleService.doSomething(arg);
});

// 2. 预加载: src/preload/index.ts
contextBridge.exposeInMainWorld('electronAPI', {
  example: {
    doSomething: (arg: string) => ipcRenderer.invoke('example:doSomething', arg)
  }
});

// 3. 类型: src/shared/types/electron-api.d.ts
interface ElectronAPI {
  example: {
    doSomething: (arg: string) => Promise<Result>;
  };
}
```

### 服务间依赖
服务初始化顺序很重要（参考 `src/main/index.ts`）：
1. Logger（最先初始化）
2. ServiceErrorHandler
3. TimeService
4. FileSystemService
5. 其他服务（可并行初始化）

### 代码风格

**模块导入**:
```typescript
// ✅ 正确 - 使用 ES 模块和解构导入
import { app, BrowserWindow, ipcMain } from 'electron';
import { useState, useEffect } from 'react';

// ❌ 错误 - 不要使用默认导入或 CommonJS
import electron from 'electron';
const electron = require('electron');
```

**TypeScript**:
- 启用严格模式 - 所有代码必须通过类型检查
- 避免使用 `any` 类型（ESLint 强制警告）
- 为所有函数和变量使用适当的类型定义

### 测试规范

- 使用 Vitest 作为测试框架（配置文件: `vitest.config.ts`）
- 在测试中模拟 Electron 模块（参考 `tests/utils/setup.ts`）
- 测试文件: `*.test.ts` 或 `*.spec.ts`
- 测试目录结构:
  - `tests/unit/`: 单元测试（服务、工具函数）
  - `tests/integration/`: 集成测试（服务间交互、IPC通道）
- 为提升性能，运行单个测试文件: `npx vitest tests/path/to/test.test.ts`
- 代码更改后，运行类型检查和测试
- 测试超时: 10秒（可在 vitest.config.ts 中配置）

## 路径别名

TypeScript 路径别名配置在 `tsconfig.json`:
- `@/*`: 映射到 `src/*`
- `@/main/*`: 映射到 `src/main/*`
- `@/renderer/*`: 映射到 `src/renderer/*`
- `@/shared/*`: 映射到 `src/shared/*`

Webpack 配置必须镜像这些别名。

## 构建系统

三个独立的 webpack 配置：
- `config/webpack.main.config.js`: 主进程（target: electron-main）
- `config/webpack.renderer.config.js`: 渲染进程（target: electron-renderer，开发服务器）
- `config/webpack.preload.config.js`: 预加载脚本（target: electron-preload）

所有配置都使用 ts-loader 进行 TypeScript 编译。

## 文档

`/docs` 中的核心架构文档：
- `00-global-requirements-v1.0.0.md`: 全局要求和约束（**必读**）
- `01-architecture-design-v1.0.0.md`: 系统架构
- `02-technical-blueprint-v1.0.0.md`: 技术实现细节
- `04-initialization-guidelines-v1.0.0.md`: 设置和初始化
- `05-project-structure-v1.0.1.md`: 目录结构
- `06-core-services-design-v1.0.1.md`: 服务层设计（包含 AI 属性和作用域管理）
- `07-plugin-development-guide.md`: 插件开发指南
- `08-ui-design-specification-v1.0.0.md`: UI 设计规范

参考 UI 设计: `docs/references/UI/matrix`
项目归档文档: `docs/ref/` (已完成的实现报告和计划)

## 开发工作流

1. **理解架构**: 修改前务必先阅读相关文件和 `docs/00-global-requirements-v1.0.0.md`
2. **代码质量**:
   - 运行类型检查: `npm run typecheck` 或 `npm run lint`
   - 自动修复: `npm run lint:fix`
   - 格式化: `npm run format`
3. **测试**:
   - 优先运行单个测试文件: `npx vitest tests/path/to/test.test.ts`
   - 使用监听模式开发: `npm run test:watch`
   - 生成覆盖率报告: `npm run test:coverage`
4. **添加新功能**:
   - 遵循现有的代码模式和服务结构
   - 添加相应的单元测试或集成测试
   - 更新类型定义（`src/shared/types/`）
   - 如需 IPC 通信，在三个地方更新：主进程处理器、预加载脚本、类型定义
5. **服务开发**:
   - 新服务放在 `src/main/services/`
   - 使用 Logger 记录关键操作
   - 使用 ServiceErrorHandler 处理错误
   - 使用 TimeService 获取时间戳（不要直接使用 `Date.now()`）

## 项目当前状态 (v0.4.0)

### 核心功能实现

- **服务层**: 26个核心服务全部实现，包含完整的单元测试和集成测试
- **IPC处理器**: 10+ 个处理器模块，覆盖所有核心功能
- **UI实现**:
  - 基础组件: 完整实现 (Button, Card, Modal, Toast, Loading、ProgressOrb 等)
  - 高级组件: Sheet, Dialog, Tabs, Switch, Checkbox、Select 等 Radix UI 组件
  - 页面实现: Dashboard、Assets、Workflows、Plugins、Settings、About 全功能实现
  - 工作流编辑器: 基于 @xyflow/react 的节点编辑器，支持拖拽和连接
  - 工作流控制面板: ChapterSplitPanel、SceneCharacterPanel、StoryboardPanel、VoiceoverPanel、ExportPanel、RemoteControlPanel
- **测试覆盖**:
  - 单元测试: 服务层、工具函数
  - 集成测试: IPC 通道、服务间交互、工作流执行
  - E2E 测试: Playwright 端到端测试
  - 专项测试: Novel-to-Video 基线测试（phase7-baseline）

### 技术特性

- **UI 设计系统**:
  - 遵循 V14 设计系统，使用 Tailwind CSS 和 shadcn/ui 原子化组件
  - 全局明暗主题切换系统
  - React 组件使用函数式组件和 Hooks (未使用 Redux)

- **工作流系统**:
  - Schema 验证（Zod）和状态管理
  - 双重存储架构（内存 + 持久化）
  - 5阶段 Novel-to-Video 工作流（AI场景拆解、并行素材生成、场景摘要、分镜脚本、批量资产生成）
  - 进度追踪和缺失项检测
  - Gate 机制（阀门条件验证）

- **插件系统**:
  - 沙箱隔离（vm2）和市场集成
  - 插件配置注入和健康检查
  - 官方插件: Novel-to-Video (v1.0.0)

- **资产管理**:
  - 全局/项目作用域双级管理
  - AI 属性追踪（Prompt、Seed、LoRA 等）
  - 9个资产分类（角色、场景、摘要、分镜、视频等）
  - UnifiedAssetPanel 统一资产面板

- **Provider 架构**:
  - 支持多 AI Provider（OpenAI、Anthropic、DeepSeek、Jiekou AI 等）
  - Provider Template 系统（8个核心类型）
  - 异步任务管理（10秒轮询、10分钟超时、重试机制）

- **任务系统**:
  - TaskScheduler 持久化任务调度
  - AsyncTaskManager 异步任务管理
  - 实时进度追踪（ProgressOrb 潮汐动画）
  - 任务队列展示（QueueTab）

## 重要注意事项

- **全局/项目作用域**: AssetManager 支持两级作用域，全局资产可在多个项目间复用
- **AI 属性追踪**: 资产元数据包含 AI 生成参数（Prompt、Seed、LoRA 等），便于复用
- **插件安全**: 插件使用 vm2 沙箱隔离，防止恶意代码执行
- **Schema 验证**: 工作流节点输入输出使用 Zod 进行 Schema 验证
- **API Provider 架构**:
  - 支持多个 AI API Provider（OpenAI、Anthropic、DeepSeek、Jiekou AI 等）统一管理
  - Provider 永远是全局的，通过 ProviderHub 统一注册和调度
  - 支持 Provider Template 系统（8个核心类型）
- **工作流进度管理**:
  - 进度文件持久化（workflow-progress-{workflowId}.json）
  - 支持缺失项检测和自动补全
  - Gate 机制确保阶段间数据完整性
- **异步任务处理**:
  - 所有异步任务统一由 AsyncTaskManager 管理
  - 10秒轮询间隔、10分钟超时、3次重试
  - 配置通过 ConfigManager 集中管理

## 常见问题

### 测试相关
**Q: 如何运行单个测试文件？**
```bash
npx vitest tests/unit/services/ProjectManager.test.ts
```

**Q: 测试超时怎么办？**
- 检查 `vitest.config.ts` 中的 `testTimeout` 设置（默认 10秒）
- 对于耗时操作，可以在具体测试中使用 `{ timeout: 20000 }`

### 开发相关
**Q: 修改主进程代码后没有生效？**
- 确保 `npm run dev:main` 正在运行并成功编译
- 重启 Electron: 关闭应用窗口，webpack 会自动重新启动

**Q: 渲染进程热更新不工作？**
- 确保 `npm run dev:renderer` 正在运行
- 检查 webpack-dev-server 是否正常启动（默认端口 3000）

**Q: 路径别名无法解析？**
- 检查 `tsconfig.json`、`vitest.config.ts` 和对应的 webpack 配置是否都配置了相同的别名

### 架构相关
**Q: 如何添加新的服务？**
1. 在 `src/main/services/` 创建服务类
2. 在 `src/main/index.ts` 中初始化服务
3. 创建对应的 IPC 处理器（如需要）
4. 添加单元测试 `tests/unit/services/`

**Q: 全局资产和项目资产的区别？**
- 全局资产（scope: 'global'）：存储在全局库中，可被多个项目引用
- 项目资产（scope: 'project'）：仅属于特定项目，不能跨项目使用
- 使用 `AssetManager.promoteAssetToGlobal()` 可以将项目资产提升为全局资产
