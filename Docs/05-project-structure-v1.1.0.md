# 项目目录结构规划 v1.1.0

## 版本记录

| 版本 | 日期 | 变更类型 | 变更内容 |
|------|------|----------|----------|
| 1.1.0 | 2026-01-04 | 更新 | 明确全局库结构，精简冗余内容 |
| 1.0.1 | 2025-12-22 | 架构修正 | 新增全局资产库 (library/) 目录 |
| 1.0.0 | 2025-12-22 | 初始版本 | 创建项目目录结构规划文档 |

---

## 根目录结构

```
matrix/
├── src/                    # 源代码目录
├── docs/                   # 项目文档
├── tests/                  # 测试文件
├── build/                  # 构建输出
├── dist/                   # 打包输出
├── config/                 # 配置文件
├── library/                # 全局资产库（跨项目复用）
├── projects/               # 用户项目存储（私有工作区）
└── plugins/                # 插件目录
```

---

## 全局资产库结构 (`library/`)

**用途**：跨项目资产复用和资产变现支撑。

```
library/
├── global/                 # 按类型存储的全局资产
│   ├── image/
│   ├── video/
│   ├── audio/
│   └── text/
└── metadata/
    └── index.json          # 资产索引（含AI属性）
```

**URI格式**：`asset://global/{type}/{YYYYMMDD}/{filename}`

---

## 源代码结构

### 主进程 (`src/main/`)

```
src/main/
├── index.ts                # 主进程入口
├── window.ts               # 窗口管理
├── ipc/                    # IPC处理器（61个通道）
├── services/               # 核心服务（23个服务）
│   ├── ProjectManager.ts
│   ├── AssetManager.ts
│   ├── PluginManager.ts
│   ├── WorkflowRegistry.ts
│   ├── TaskScheduler.ts
│   └── ...
├── models/                 # 数据模型
└── utils/                  # 工具函数
```

### 渲染进程 (`src/renderer/`)

```
src/renderer/
├── pages/                  # 页面组件
│   ├── dashboard/
│   ├── assets/
│   ├── workflows/
│   └── settings/
├── components/             # UI组件
│   ├── ui/                 # 基础组件（shadcn/ui）
│   ├── layout/             # 布局组件
│   └── features/           # 功能组件
└── contexts/               # React Context提供者
```

### 共享类型 (`src/shared/types/`)

```
src/shared/types/
├── asset.ts                # AssetMetadata, AssetFilter
├── workflow.ts             # WorkflowDefinition, WorkflowState
├── provider.ts             # Provider接口
├── api.ts                  # API类型
└── electron-api.d.ts       # IPC类型定义
```

---

## 用户项目结构

```
projects/
└── {project-name}/
    ├── materials/
    │   ├── inputs/         # 用户上传
    │   └── outputs/        # AI生成
    ├── workflows/          # 工作流实例
    ├── config/
    │   └── project.json    # 项目元数据
    └── logs/
```

**URI格式**：`asset://project/{project_id}/{category}/{filename}`

---

## 插件目录

```
plugins/
├── official/               # 官方插件（系统级权限）
│   ├── novel-to-video/
│   └── ...
└── community/              # 社区插件（沙箱受限）
    └── ...
```

**插件清单**：每个插件目录中的 `manifest.json`。

---

## 文件命名规范

### TypeScript文件
- 组件文件：PascalCase (`UserProfile.tsx`)
- 服务文件：kebab-case (`asset-manager.ts`)
- 工具文件：kebab-case (`path-utils.ts`)

### CSS文件
- 全局样式：kebab-case (`global.css`)
- 组件样式：kebab-case (`user-profile.css`)

---

## 模块导入规范

### 路径别名（tsconfig.json）

```typescript
import { AssetManager } from '@/main/services/AssetManager'
import { Button } from '@/renderer/components/ui/button'
import { AssetMetadata } from '@/shared/types/asset'
```

**别名**：
- `@/*` → `src/*`
- `@/main/*` → `src/main/*`
- `@/renderer/*` → `src/renderer/*`
- `@/shared/*` → `src/shared/*`

---

**English Version**: `docs/en/05-project-structure-v1.1.0.md`
