# MATRIX Studio

AI视频生成工作流管理平台

## 项目简介

MATRIX Studio 是一个基于 Electron 的 AI 视频生成管理平台，定位为中间件，不直接参与视频渲染，而是提供统一外部集成的汇聚管理和物料管理平台。

## 当前状态

- **版本**: v0.3.9 
- **阶段**: fix UI
- **架构依据**: `/docs/00-06` 文档集
- **最新情况**：`/docs/audit` 文档集，报告及架构，名词解释，流程说明 

## 快速开始

### 环境要求

- Node.js 18.0+
- npm 9.0+
- Git 2.30+

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

### 构建项目

```bash
npm run build
```

### 打包应用

```bash
npm run package
```

## 项目结构

```
matrix/
├── src/                    # 源代码目录
│   ├── main/               # 主进程代码
│   └── renderer/           # 渲染进程代码
├── docs/                   # 项目文档
├── tests/                  # 测试文件
├── build/                  # 构建输出
├── config/                 # 配置文件
├── resources/              # 应用资源
└── assets/                 # 静态资源
```
- [最新架构]`docs\audit\02-system-structure.md`

## 开发计划

已完成部分参考(docs\ref\TODO-Done.md)
当前的开发计划请参考 [TODO.md](TODO.md)

## 文档

- [全局要求](docs/00-global-requirements-v1.0.0.md)
- [架构设计](docs/01-architecture-design-v1.0.0.md)
- [技术蓝图](docs/02-technical-blueprint-v1.0.0.md)

- [项目结构](docs/05-project-structure-v1.0.1.md)
- [核心服务设计](docs/06-core-services-design-v1.0.1.md)


## UI设计规范

UI设计规范文件位于 [docs\08-ui-design-specification-v1.0.0.md]

## 许可证

MIT License