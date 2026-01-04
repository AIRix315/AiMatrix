# 项目目录结构规划 v1.0.1

## 版本记录
| 版本 | 日期 | 变更类型 | 变更内容 |
|------|------|----------|----------|
| 1.0.0 | 2025-12-22 | 初始版本 | 创建项目目录结构规划文档，包含根目录结构、源代码结构等 |
| 1.0.1 | 2025-12-22 | 架构修正 | **新增全局资产库 (library/) 目录**，以支持资产复用商业逻辑；优化源代码结构以适配 Official/UGC 分层 |

## 全局要求
**重要提醒：本文档遵循全局时间处理要求，任何涉及时间的操作必须先查询系统时间或使用MCP服务确认后方可执行。详细规范请参考 [00-global-requirements-v1.0.0.md](00-global-requirements-v1.0.0.md)**

## 根目录结构
matrix/
├── src/                    # 源代码目录
├── docs/                   # 项目文档
├── tests/                  # 测试文件
├── build/                  # 构建输出
├── dist/                   # 打包输出
├── scripts/                # 构建脚本
├── resources/              # 应用资源
├── assets/                 # 静态资源 (应用本身UI素材)
├── config/                 # 配置文件
├── temp/                   # 临时文件
├── logs/                   # 日志文件
├── library/                # [核心新增] 全局资产库 (用于跨项目复用与资产变现)
├── projects/               # 用户项目存储 (私有工作区)
└── tools/                  # 开发工具

<TEXT>
## 全局资产库结构 (Library)
**商业逻辑支撑**：此目录是实现“资产复用”和“沉没成本”的核心物理存储。
library/
├── faces/                  # 人物一致性资产 (LoRA/Reference/Embeddings)
├── styles/                 # 风格预设 (Prompt Templates/Presets)
├── workflows/              # 通用工作流配方 (.json)
│   ├── official/           # 官方认证工作流 (保下限)
│   └── community/          # 社区下载工作流 (UGC)
├── media/                  # 通用媒体素材
│   ├── audio/              # 音效/BGM
│   └── video/              # 转场/特效
└── metadata/               # 资产索引数据库
└── library.db          # SQLite/JSON数据库，记录资产AI属性

<TEXT>
## 源代码结构
### 主进程代码 (src/main/)
src/main/
├── index.ts                # 主进程入口
├── window.ts               # 窗口管理
├── ipc/                    # IPC通信
│   ├── handlers/           # IPC处理器
│   └── channels.ts         # 通道定义
├── services/               # 核心服务
│   ├── project-manager.ts  # 项目管理服务
│   ├── asset-manager.ts    # 物料管理服务 (负责 Project 和 Library 的调度)
│   ├── plugin-manager.ts   # 插件管理服务 (区分 Official/UGC)
│   ├── task-scheduler.ts   # 任务调度器
│   └── api-manager.ts      # API调用管理 (BYOK实现)
├── models/                 # 数据模型
│   ├── project.ts          # 项目模型
│   ├── asset.ts            # 物料模型 (含AI元数据定义)
│   └── plugin.ts           # 插件模型
└── utils/                  # 工具函数

<TEXT>
### 渲染进程代码 (src/renderer/)
src/renderer/
├── components/             # UI组件
│   ├── library/            # [新增] 全局资产库视图组件
│   │   ├── AssetGrid.tsx
│   │   └── ImportDialog.tsx
│   ├── marketplace/        # [新增] 插件/工作流市场组件
│   └── ...
├── store/                  # Redux状态管理
│   ├── slices/             # Redux切片
│   │   ├── library-slice.ts # [新增] 全局库状态
│   │   └── ...
└── ...

<TEXT>
## 用户项目结构 (Projects)
projects/
└── [project-name]/
├── materials/          # 项目私有物料
│   ├── raw/            # 原始素材
│   └── generated/      # AI生成产物
├── workflows/          # 项目特定工作流
├── config/             # 项目配置
│   ├── project.json    # 项目描述文件
│   └── refs.json       # [新增] 引用文件 (记录引用的全局Library资产ID)
└── logs/               # 项目日志

<TEXT>
## 插件目录结构 (Plugins)
**商业逻辑支撑**：区分官方与社区，保障系统稳定性。
plugins/
├── official/               # [新增] 官方内置插件 (系统级权限)
│   ├── core-flow/          # 核心流程引擎
│   └── asset-sync/         # 资产同步引擎
├── community/              # [新增] 社区安装插件 (沙箱受限)
│   ├── installed/          # 已安装
│   └── cache/              # 市场缓存
└── dev/                    # 开发者模式插件

<TEXT>
## 配置文件结构
config/
├── env/                    # 环境配置
├── permissions/            # [新增] 权限策略配置
│   ├── official-policy.json
│   └── ugc-policy.json     # 限制社区插件的网络/文件访问权限
└── ...

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