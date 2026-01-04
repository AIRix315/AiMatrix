# 架构设计文档 v1.1.0

## 版本记录

| 版本 | 日期 | 变更类型 | 变更内容 |
|------|------|----------|----------|
| 1.1.0 | 2026-01-04 | 重大更新 | 明确Workbench模式，补充URI方案，精简冗余章节 |
| 1.0.0 | 2025-12-22 | 初始版本 | 创建架构设计文档 |

**全局要求**: 所有时间操作必须通过TimeService或MCP查询系统时间。详见 [00-global-requirements-v1.1.0.md](00-global-requirements-v1.1.0.md)

---

## 系统概述

MATRIX Studio 是基于Electron的AI视频工作流管理平台。作为中间件，提供统一的工作流和物料管理功能，不直接参与视频渲染。

**定位**：工作流编排器 + 资产库管理器

---

## 核心架构

### 主进程服务（共23个）

#### 1. 项目管理
- **ProjectManager**: 项目CRUD操作、生命周期管理

#### 2. 资产管理
- **AssetManager**: 全局/项目作用域资产管理，使用 `asset://` URI
- **GenericAssetHelper**: 资产查询和元数据操作
- **FileSystemService**: 统一文件系统操作

#### 3. 工作流编排（Workbench模式）
**说明**："Workbench"是以下服务的逻辑组合：
- **WorkflowRegistry**: 工作流定义注册表
- **WorkflowStateManager**: 执行状态追踪
- **TaskScheduler**: 任务队列和调度
- **ProviderRouter**: Provider选择和请求路由

**Workbench协调流程**：
1. Pre-flight Check（预检查）：验证Provider能力
2. Context Injection（上下文注入）：注入文件路径和输出目标
3. Request Routing（请求路由）：转发标准化参数给Provider
4. Atomic Transaction（原子事务）：文件写入 → 索引更新

#### 4. 插件系统
- **PluginManager**: 插件生命周期管理
- **PluginContext**: 为插件注入上下文
- **PluginSandbox**: 安全隔离（vm2）
- **PluginMarketService**: 插件市场集成

#### 5. Provider管理
- **APIManager**: 统一API Provider接口（BYOK模式）
- **ProviderRegistry**: Provider注册和发现
- **ProviderRouter**: 基于能力的智能路由
- **ModelRegistry**: AI模型注册表和管理

#### 6. 辅助服务
- **TimeService**: NTP同步、时间戳验证
- **Logger**: 4级日志 + 文件轮转
- **ServiceErrorHandler**: 37个错误码
- **ConfigManager**: 应用配置
- **SchemaRegistry**: JSON Schema验证
- **ShortcutManager**: 快捷键管理

---

## 数据流设计

### 资产URI方案

```
asset://global/{category}/{YYYYMMDD}/{filename}      // 全局库
asset://project/{project_id}/{category}/{filename}   // 项目资产
```

### 项目文件结构

```
/project-name/
├── materials/
│   ├── inputs/         # 用户上传
│   └── outputs/        # AI生成
├── workflows/          # 工作流实例
├── config/
│   └── project.json    # 项目元数据
└── logs/
```

### 全局库结构

```
/library/
├── global/             # 跨项目复用资产
│   ├── image/
│   ├── video/
│   ├── audio/
│   └── text/
└── metadata/
    └── index.json      # 全局资产索引
```

---

## 技术栈

- **Electron**: 39+
- **Node.js**: 20+
- **TypeScript**: 5+
- **React**: 18+
- **Webpack**: 5
- **测试**: Vitest

---

## 安全设计

### 插件安全
- 沙箱执行（vm2）
- 细粒度权限（file-system, network, shell）
- 官方插件签名验证

### 文件安全
- 路径遍历防护（`getSafePath()`）
- 文件类型验证
- `asset://` 协议限制

### API安全
- 加密密钥存储（系统密钥链）
- 每个Provider独立认证
- 请求签名

---

## 性能优化

### 内存管理
- 插件懒加载
- 资产索引缓存
- 大文件流式处理

### 文件操作
- 异步I/O（fs/promises）
- 批量操作
- 进度反馈

---

**English Version**: `docs/en/01-architecture-design-v1.1.0.md`
