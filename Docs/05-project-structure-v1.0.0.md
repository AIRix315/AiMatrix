# 项目目录结构规划 v1.0.0

## 版本记录

| 版本 | 日期 | 变更类型 | 变更内容 |
|------|------|----------|----------|
| 1.0.0 | 2025-12-22 | 初始版本 | 创建项目目录结构规划文档，包含根目录结构、源代码结构、测试目录结构、配置文件结构、资源文件结构、用户项目结构、构建脚本结构、开发工具结构、文件命名规范和模块导入规范 |

## 全局要求

**重要提醒：本文档遵循全局时间处理要求，任何涉及时间的操作必须先查询系统时间或使用MCP服务确认后方可执行。详细规范请参考 [00-global-requirements-v1.0.0.md](00-global-requirements-v1.0.0.md)**

## 根目录结构

```
matrix/
├── src/                    # 源代码目录
├── docs/                   # 项目文档
├── tests/                  # 测试文件
├── build/                  # 构建输出
├── dist/                   # 打包输出
├── scripts/                # 构建脚本
├── resources/              # 应用资源
├── assets/                 # 静态资源
├── config/                 # 配置文件
├── temp/                   # 临时文件
├── logs/                   # 日志文件
├── projects/               # 用户项目存储
└── tools/                  # 开发工具
```

## 源代码结构

### 主进程代码
```
src/main/
├── index.ts                # 主进程入口
├── app.ts                  # 应用主逻辑
├── window.ts               # 窗口管理
├── menu.ts                 # 菜单配置
├── ipc/                    # IPC通信
│   ├── handlers/           # IPC处理器
│   └── channels.ts         # 通道定义
├── services/               # 核心服务
│   ├── file-manager.ts     # 文件管理服务
│   ├── workflow-manager.ts # 工作流管理服务
│   ├── mcp-service.ts      # MCP服务管理
│   └── local-service.ts    # 本地服务管理
├── adapters/               # 适配器
│   ├── comfyui-adapter.ts  # ComfyUI适配器
│   ├── n8n-adapter.ts      # N8N适配器
│   └── base-adapter.ts     # 基础适配器
├── models/                 # 数据模型
│   ├── project.ts          # 项目模型
│   ├── workflow.ts         # 工作流模型
│   └── asset.ts            # 资产模型
└── utils/                  # 工具函数
    ├── file-utils.ts       # 文件工具
    ├── path-utils.ts       # 路径工具
    └── validation.ts       # 验证工具
```

### 渲染进程代码
```
src/renderer/
├── index.tsx               # 渲染进程入口
├── App.tsx                 # 应用根组件
├── components/             # UI组件
│   ├── common/             # 通用组件
│   ├── file-browser/       # 文件浏览器
│   ├── workflow-editor/    # 工作流编辑器
│   ├── asset-manager/      # 资产管理器
│   └── preview/            # 预览组件
├── pages/                  # 页面组件
│   ├── dashboard/          # 仪表板
│   ├── projects/           # 项目管理
│   ├── workflows/          # 工作流管理
│   └── settings/           # 设置页面
├── hooks/                  # React Hooks
│   ├── use-project.ts      # 项目Hook
│   ├── use-workflow.ts     # 工作流Hook
│   └── use-asset.ts        # 资产Hook
├── store/                  # 状态管理
│   ├── index.ts            # Store配置
│   ├── project-slice.ts    # 项目状态
│   ├── workflow-slice.ts   # 工作流状态
│   └── asset-slice.ts      # 资产状态
├── services/               # 前端服务
│   ├── api.ts              # API服务
│   ├── ipc.ts              # IPC服务
│   └── storage.ts          # 存储服务
├── styles/                 # 样式文件
│   ├── global.css          # 全局样式
│   ├── variables.css       # CSS变量
│   └── components/         # 组件样式
└── utils/                  # 前端工具
    ├── format.ts           # 格式化工具
    ├── validation.ts       # 前端验证
    └── constants.ts        # 常量定义
```

## 测试目录结构

```
tests/
├── unit/                   # 单元测试
│   ├── main/               # 主进程测试
│   └── renderer/           # 渲染进程测试
├── integration/            # 集成测试
│   ├── file-operations/    # 文件操作测试
│   ├── workflow-execution/ # 工作流执行测试
│   └── ipc-communication/  # IPC通信测试
├── e2e/                    # 端到端测试
│   ├── user-workflows/     # 用户工作流测试
│   └── cross-platform/     # 跨平台测试
├── fixtures/               # 测试数据
│   ├── projects/           # 测试项目
│   ├── workflows/          # 测试工作流
│   └── assets/             # 测试资产
└── utils/                  # 测试工具
    ├── mocks/              # 模拟对象
    ├── helpers/            # 辅助函数
    └── setup.ts            # 测试设置
```

## 配置文件结构

```
config/
├── webpack.config.js       # Webpack配置
├── tsconfig.json           # TypeScript配置
├── eslint.config.js        # ESLint配置
├── prettier.config.js      # Prettier配置
├── jest.config.js          # Jest测试配置
├── electron-builder.json   # 打包配置
└── env/                    # 环境配置
    ├── development.json    # 开发环境
    ├── production.json     # 生产环境
    └── test.json           # 测试环境
```

## 资源文件结构

```
resources/
├── icons/                  # 应用图标
│   ├── icon.ico            # Windows图标
│   ├── icon.icns           # macOS图标
│   └── icon.png            # Linux图标
├── images/                 # 图片资源
├── fonts/                  # 字体文件
├── templates/              # 模板文件
│   ├── project-template/   # 项目模板
│   └── workflow-template/  # 工作流模板
└── locales/                # 国际化文件
    ├── en.json             # 英文
    ├── zh-CN.json          # 简体中文
    └── zh-TW.json          # 繁体中文
```

## 用户项目结构

```
projects/
└── [project-name]/
    ├── materials/           # 物料文件
    │   ├── texts/          # 文本文件
    │   ├── images/         # 图片文件
    │   └── videos/         # 视频文件
    ├── workflows/          # 工作流配置
    │   ├── comfyui/        # ComfyUI工作流
    │   └── n8n/            # N8N工作流
    ├── config/             # 项目配置
    │   ├── project.json    # 项目配置文件
    │   └── assets.json     # 资产配置文件
    ├── cache/              # 缓存文件
    ├── exports/            # 导出文件
    └── logs/               # 项目日志
        └── workflow.log    # 工作流日志
```

## 构建脚本结构

```
scripts/
├── build.js                # 构建脚本
├── dev.js                  # 开发脚本
├── test.js                 # 测试脚本
├── package.js              # 打包脚本
├── release.js              # 发布脚本
├── clean.js                # 清理脚本
└── utils/                  # 脚本工具
    ├── file-operations.js  # 文件操作工具
    ├── version-control.js  # 版本控制工具
    └── platform-specific/  # 平台特定工具
        ├── windows.js      # Windows工具
        ├── macos.js        # macOS工具
        └── linux.js        # Linux工具
```

## 开发工具结构

```
tools/
├── generators/             # 代码生成器
│   ├── component.js       # 组件生成器
│   ├── service.js          # 服务生成器
│   └── test.js            # 测试生成器
├── linters/                # 代码检查工具
├── formatters/             # 代码格式化工具
├── analyzers/              # 代码分析工具
└── deployment/             # 部署工具
    ├── docker/             # Docker配置
    ├── ci/                 # CI配置
    └── cd/                 # CD配置
```

## 文件命名规范

### TypeScript文件
- 组件文件：PascalCase (UserProfile.tsx)
- 服务文件：kebab-case (file-manager.ts)
- 工具文件：kebab-case (path-utils.ts)
- 类型文件：kebab-case (project-types.ts)

### 样式文件
- 全局样式：kebab-case (global.css)
- 组件样式：kebab-case (user-profile.css)
- 变量文件：kebab-case (variables.css)

### 配置文件
- 配置文件：kebab-case (webpack.config.js)
- 环境文件：kebab-case (development.json)
- 包文件：kebab-case (package.json)

## 模块导入规范

### 绝对路径导入
```typescript
// 使用@别名导入
import { FileManager } from '@/services/file-manager'
import { ProjectModel } from '@/models/project'
import { Button } from '@/components/common'
```

### 相对路径导入
```typescript
// 同级目录导入
import { utils } from './utils'
// 上级目录导入
import { service } from '../services'
```

### 第三方库导入
```typescript
// 分组导入
import React from 'react'
import { useState, useEffect } from 'react'
import axios from 'axios'