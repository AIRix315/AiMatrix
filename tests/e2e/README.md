# E2E 测试文档

## 概述

本目录包含 MATRIX Studio 的端到端（End-to-End）测试，使用 Playwright 测试框架针对 Electron 应用进行完整的用户流程测试。

## 目录结构

```
tests/e2e/
├── setup/                   # 全局设置和清理
│   ├── global-setup.ts      # 测试前初始化
│   └── global-teardown.ts   # 测试后清理
├── helpers/                 # 辅助工具类
│   └── ElectronApp.ts       # Electron 应用封装
├── fixtures/                # 测试固件
│   └── electron.fixture.ts  # Electron 测试固件
├── 01-app-launch.e2e.ts     # 应用启动和基本功能测试
├── 02-project-workflow.e2e.ts   # 项目创建和管理测试
├── 03-asset-management.e2e.ts   # 资产管理测试
├── 04-workflow-execution.e2e.ts # 工作流执行测试
└── 05-settings-and-plugins.e2e.ts # 设置和插件测试
```

## 运行测试

### 前置条件

1. **构建应用**（E2E 测试需要构建产物）：
   ```bash
   npm run build
   ```

2. **安装浏览器驱动**（首次运行需要）：
   ```bash
   npx playwright install
   ```

### 运行所有测试

```bash
npm run test:e2e
```

### 运行特定测试文件

```bash
npx playwright test tests/e2e/01-app-launch.e2e.ts
```

### 调试模式（有界面）

```bash
npm run test:e2e:headed
```

### 使用 Playwright UI

```bash
npm run test:e2e:ui
```

### 调试模式（逐步执行）

```bash
npm run test:e2e:debug
```

### 跨平台测试

```bash
# Windows 平台
npx playwright test --project=electron-windows

# macOS 平台
npx playwright test --project=electron-mac

# Linux 平台
npx playwright test --project=electron-linux
```

## 测试覆盖范围

### ✅ 已实现（基础测试）

| 测试文件 | 测试场景 | 状态 |
|---------|---------|------|
| `01-app-launch.e2e.ts` | 应用启动、窗口渲染、导航菜单 | ✅ 完成 |
| `02-project-workflow.e2e.ts` | Dashboard 导航、项目列表 | ✅ 完成 |
| `03-asset-management.e2e.ts` | Assets 导航、资产列表、分类 | ✅ 完成 |
| `04-workflow-execution.e2e.ts` | Workflows 导航、模板列表 | ✅ 完成 |
| `05-settings-and-plugins.e2e.ts` | Settings/Plugins 导航 | ✅ 完成 |

### ⏳ 待实现（完整流程测试）

| 功能模块 | 测试场景 | 优先级 |
|---------|---------|-------|
| 项目管理 | 创建、编辑、删除项目 | 高 |
| 资产管理 | 导入、搜索、查看、删除资产 | 高 |
| 工作流执行 | 创建工作流实例、配置步骤、执行、监控 | 高 |
| 插件管理 | 安装、配置、卸载插件 | 中 |
| API 配置 | 配置 Provider、测试连接 | 中 |
| 模型管理 | 查看、收藏、隐藏模型 | 低 |

## 测试策略

### 1. 应用启动测试（01-app-launch）

- **目标**: 验证应用能否正常启动和基本渲染
- **测试点**:
  - ✅ 应用进程启动成功
  - ✅ 主窗口可见
  - ✅ 窗口标题正确
  - ✅ 窗口尺寸合理
  - ✅ 全局导航菜单渲染
  - ✅ 核心页面链接存在
  - ✅ 应用路径配置正确

### 2. 项目工作流测试（02-project-workflow）

- **目标**: 验证项目的完整生命周期
- **测试点**:
  - ✅ 导航到 Dashboard
  - ✅ 显示项目列表
  - ✅ 查看项目详情
  - ⏳ 创建新项目
  - ⏳ 删除项目

### 3. 资产管理测试（03-asset-management）

- **目标**: 验证资产管理功能
- **测试点**:
  - ✅ 导航到 Assets 页面
  - ✅ 显示资产网格/列表
  - ✅ 左侧分类导航
  - ✅ 视图切换功能
  - ⏳ 导入资产
  - ⏳ 搜索资产
  - ⏳ 查看资产详情

### 4. 工作流执行测试（04-workflow-execution）

- **目标**: 验证工作流创建和执行
- **测试点**:
  - ✅ 导航到 Workflows
  - ✅ 显示工作流模板
  - ✅ 查看模板详情
  - ⏳ 创建工作流实例
  - ⏳ 配置工作流步骤
  - ⏳ 执行工作流
  - ⏳ 查看执行历史

### 5. 设置和插件测试（05-settings-and-plugins）

- **目标**: 验证应用配置和插件管理
- **测试点**:
  - ✅ 导航到 Settings
  - ✅ 导航到 Plugins
  - ⏳ 配置 API Provider
  - ⏳ 安装插件
  - ⏳ 管理模型

## 测试工具

### ElectronApp 辅助类

封装了 Electron 应用的常用操作：

```typescript
import { ElectronApp } from './helpers/ElectronApp';

// 启动应用
const app = new ElectronApp();
await app.launch();

// 获取主窗口
const window = app.getMainWindow();

// 点击导航
await app.clickNavItem('Dashboard');

// 等待路由
await app.waitForRoute('/dashboard');

// 截图（调试）
await app.screenshot('debug.png');

// 关闭应用
await app.close();
```

### Electron 测试固件

自动管理应用生命周期：

```typescript
import { test, expect } from './fixtures/electron.fixture';

test('示例测试', async ({ electronApp, mainWindow }) => {
  // electronApp 和 mainWindow 自动初始化和清理
  // 测试代码...
});
```

## 调试技巧

### 1. 查看应用界面

使用 headed 模式运行测试，可以看到实际的应用窗口：

```bash
npm run test:e2e:headed
```

### 2. 逐步调试

使用 debug 模式逐步执行测试：

```bash
npm run test:e2e:debug
```

### 3. 截图和视频

测试失败时会自动保存：
- 截图: `test-results/e2e-artifacts/*.png`
- 视频: `test-results/e2e-artifacts/*.webm`
- 追踪: `test-results/e2e-artifacts/*.zip`

### 4. 查看测试报告

运行测试后查看 HTML 报告：

```bash
npx playwright show-report
```

## CI/CD 集成

E2E 测试已集成到 GitHub Actions，支持跨平台自动化测试：

- **Windows**: `windows-latest`
- **macOS**: `macos-latest`
- **Linux**: `ubuntu-latest` (使用 Xvfb)

测试报告和截图会自动上传为 Artifacts。

## 注意事项

### 1. 测试隔离

- 每个测试都使用独立的应用实例
- 测试数据不影响真实用户数据
- 测试完成后自动清理

### 2. 超时设置

- 单个测试: 60 秒
- 操作超时: 15 秒
- 导航超时: 30 秒

### 3. 失败重试

- 本地开发: 不重试（便于调试）
- CI 环境: 重试 2 次（提高稳定性）

### 4. 平台差异

- 部分测试可能因平台而异（如窗口控制）
- 使用 `test.skip()` 跳过特定平台的测试

## 常见问题

### Q: 测试失败提示"构建产物不存在"

**A**: 运行 E2E 测试前必须先构建应用：
```bash
npm run build
npm run test:e2e
```

### Q: 测试超时

**A**: 可能原因：
1. 应用启动慢（增加超时时间）
2. 选择器错误（检查选择器）
3. 网络问题（检查网络连接）

### Q: 找不到元素

**A**: 可能原因：
1. 页面未加载完成（使用 `waitForLoadComplete()`）
2. 选择器错误（检查 HTML 结构）
3. 元素动态生成（使用 `waitForSelector()`）

### Q: Linux 平台测试失败

**A**: Linux 需要 Xvfb 虚拟显示：
```bash
xvfb-run npm run test:e2e
```

## 贡献指南

### 添加新测试

1. 在 `tests/e2e/` 创建测试文件（命名格式：`XX-feature-name.e2e.ts`）
2. 使用 `electron.fixture` 固件
3. 编写测试用例
4. 运行并验证测试
5. 更新本文档的测试覆盖表格

### 测试编写规范

```typescript
import { test, expect } from './fixtures/electron.fixture';

test.describe('功能模块名称', () => {
  test('具体测试场景', async ({ electronApp, mainWindow }) => {
    // 1. 准备（Setup）
    await electronApp.clickNavItem('PageName');
    await electronApp.waitForLoadComplete();

    // 2. 执行（Execute）
    await mainWindow.click('[data-testid="action-button"]');

    // 3. 验证（Assert）
    const result = await mainWindow.textContent('.result');
    expect(result).toBe('期望值');

    // 4. 日志（可选）
    console.log('✅ 测试完成:', result);
  });
});
```

## 参考资料

- [Playwright 官方文档](https://playwright.dev/)
- [Playwright for Electron](https://playwright.dev/docs/api/class-electron)
- [Testing Best Practices](https://playwright.dev/docs/best-practices)
- [项目架构文档](../../docs/01-architecture-design-v1.0.0.md)
