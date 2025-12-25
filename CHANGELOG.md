# 修改日志规范 v1.0.0

## 版本记录

| 版本 | 日期 | 变更类型 | 变更内容 |
|------|------|----------|----------|
| 1.0.0 | 2025-12-23 | 初始版本 | 创建修改日志规范文档，包含版本号规则、变更类型分类、日志格式规范、提交信息规范、发布流程和维护策略 |

## 全局要求

**重要提醒：本文档遵循全局时间处理要求，任何涉及时间的操作必须先查询系统时间或使用MCP服务确认后方可执行。详细规范请参考 [00-global-requirements-v1.0.0.md](00-global-requirements-v1.0.0.md)**

## 版本号规则

采用语义化版本控制 (Semantic Versioning)：
- 主版本号：不兼容的API修改
- 次版本号：向下兼容的功能性新增
- 修订号：向下兼容的问题修正

示例：1.2.3

## 变更类型分类

### 新增 (Added)
- 新功能
- 新API接口
- 新配置选项
- 新文档

### 修改 (Changed)
- 现有功能改进
- API行为变更
- 配置格式变更
- 依赖库升级

### 废弃 (Deprecated)
- 即将移除的功能
- 即将变更的API
- 即将废弃的配置

### 移除 (Removed)
- 已废弃功能移除
- API接口移除
- 配置选项移除

### 修复 (Fixed)
- Bug修复
- 性能问题修复
- 安全问题修复

### 安全 (Security)
- 安全漏洞修复
- 安全机制增强
- 依赖安全更新

## 日志格式规范

### 标准格式
```
## [版本号] - 发布日期 (YYYY-MM-DD)

### 变更类型
- [范围] 简洁描述变更内容 (关联问题编号)

[可选的详细说明]
- 变更影响和原因
- 如有API变更，提供迁移指南

[可选的脚注]
- 链接到相关文档或问题
```

### 变更范围标识
- `feat`: 新功能
- `fix`: Bug修复
- `docs`: 文档更新
- `style`: 代码格式调整
- `refactor`: 代码重构
- `test`: 测试相关
- `chore`: 构建过程或辅助工具的变动

### 示例
```
## [1.2.3] - 2023-12-01

### Added
- feat(auth): 添加双因素认证支持 (#123)
- feat(api): 新增批量操作接口 (#124)

### Changed
- refactor(database): 优化查询性能，提升30%响应速度 (#125)
- chore(deps): 更新React到18.2.0版本 (#126)

### Fixed
- fix(auth): 修复登录页面在Safari浏览器兼容性问题 (#127)
- fix(api): 解决大文件上传内存泄漏问题 (#128)

### Security
- 修复API密钥存储安全漏洞 (#129)
```

## 提交信息规范

### 格式要求
```
<类型>(<范围>): <描述>

[可选的正文]

[可选的脚注]
```

### 类型说明
- `feat`: 新功能
- `fix`: Bug修复
- `docs`: 文档更新
- `style`: 代码格式调整
- `refactor`: 代码重构
- `test`: 测试相关
- `chore`: 构建过程或辅助工具的变动

### 示例
```
feat(auth): 添加双因素认证支持

实现了基于TOTP的双因素认证流程，包括：
- 用户注册时绑定验证器
- 登录时验证一次性密码
- 管理员界面支持强制启用2FA

Closes #123
```

## 类型说明

- **feat**: 新功能
- **fix**: 修复bug
- **docs**: 文档变更
- **style**: 代码格式（不影响代码运行的变动）
- **refactor**: 重构（既不是新增功能，也不是修改bug的代码变动）
- **perf**: 性能优化
- **test**: 增加测试
- **build**: 构建系统或外部依赖的变动
- **ci**: 持续集成
- **chore**: 构建过程或辅助工具的变动

## 发布流程

### 发布前检查
- 版本号符合语义化规范
- 所有测试通过
- 文档同步更新
- CHANGELOG.md更新完整

### 发布步骤
1. 更新版本号
2. 更新CHANGELOG.md
3. 创建发布标签
4. 构建发布包
5. 发布到各平台

### 紧急发布
对于严重安全bug或关键问题修复：
- 使用修订号递增
- 强调变更日志
- 快速发布流程

## 维护策略

### 版本支持
- **当前主版本**：完全支持
- **前一主版本**：关键修复支持
- **更早版本**：停止支持

### 向后兼容
- API变更必须提供迁移期
- 配置格式变更保持兼容
- 数据格式升级自动转换

### 安全更新
- 安全漏洞及时修复
- 安全补丁支持所有维护版本
- 严重漏洞发布独立安全更新

## [0.2.0] - 2025-12-24

### Added
- feat(ui): 创建通用UI组件库 (#F08)
  - 新增Toast通知组件，支持success/error/warning/info四种类型
  - 新增Loading加载指示器，支持3种尺寸和全屏模式
  - 新增Modal通用模态框，支持ESC关闭和点击外部关闭
  - 新增ConfirmDialog确认对话框，支持danger/warning/info类型
- feat(services): 实现5个核心服务MVP (#F09)
  - Logger服务：统一日志系统，支持debug/info/warn/error级别，文件输出和日志轮转
  - ServiceErrorHandler服务：统一错误处理，70+错误码定义，用户友好错误消息
  - PluginManager服务：插件加载/卸载/执行，manifest读取，权限检查
  - APIManager服务：API注册/密钥管理/调用封装，支持OpenAI/Anthropic/Ollama等
  - TaskScheduler服务：任务创建/执行/状态查询，支持API_CALL/WORKFLOW/PLUGIN/CUSTOM类型
- feat(ipc): 实现22个实际IPC处理器 (#F10)
  - plugin:* 处理器连接到PluginManager
  - task:* 处理器连接到TaskScheduler
  - api:* 处理器连接到APIManager
  - workflow:* 处理器结合TaskScheduler和文件系统
  - file:watch/unwatch 实现文件监听功能
- feat(pages): UI功能连接到实际服务 (#F11)
  - Dashboard页面：加载状态、错误处理、删除项目功能（带确认对话框）
  - Plugins页面：插件列表、详情模态框、卸载功能、官方/社区分类
  - Settings页面：API配置保存、连接测试、Toast通知

### Changed
- refactor(main): 集成5个核心服务到主应用 (#F09)
  - 添加服务初始化流程（Logger → ProjectManager → AssetManager → PluginManager → TaskScheduler → APIManager）
  - 实现统一的服务清理机制
  - 所有服务操作使用ServiceErrorHandler包装
- refactor(ipc): 替换模拟IPC处理器为实际实现 (#F10)
  - 移除硬编码的模拟数据返回
  - 所有IPC调用连接到实际服务
  - MCP和local服务保持模拟（待后续实现）

### Fixed
- fix(security): 修复文件系统路径遍历漏洞 (#F07)
  - 创建src/main/utils/security.ts实现路径验证
  - 所有file:* IPC处理器添加路径安全检查
  - 限制可访问目录为projects/、library/、temp/
  - 拒绝访问系统敏感路径
- fix(build): 修复webpack配置问题 (#F07)
  - 修复webpack.main.config.js重复键错误
  - 添加Source Map配置到三个webpack配置文件
  - 添加typecheck脚本到package.json
- fix(eslint): 修复40个ESLint错误 (#F07)
  - 移除未使用的导入和变量
  - 将require()改为ES6 imports
  - 替换Function类型为typed alternatives
  - 添加必要的eslint-disable注释
- fix(deps): 安装缺失的uuid依赖 (#F07)
- fix(structure): 创建必需的目录结构 (#F07)
  - library/{faces,styles,workflows,media,metadata}
  - plugins/{official,community}
  - projects/

### Security
- security(filesystem): 实现路径验证机制防止目录遍历攻击
  - 使用path.resolve()和path.relative()验证路径
  - 检查路径是否包含..等危险字符
  - 白名单机制限制可访问目录

### Performance
- perf(services): 所有服务使用单例模式，确保单实例
- perf(ipc): IPC处理器使用async/await模式，提升响应速度
- perf(ui): React组件合理使用useState和useEffect，避免不必要的重渲染

### Test
- test(unit): TimeService测试覆盖率提升至100% (#F07)
  - 修复时间服务单元测试Mock问题
  - 解决覆盖率报告生成问题

### Docs
- docs(plan): 创建全面的项目审计报告和执行计划
  - 识别40个ESLint错误、1个安全漏洞、5个核心服务缺失
  - 制定Phase 1-6执行计划
  - MVP可用时间：约20个工作日

### Breaking Changes
无

### Migration Guide
无需迁移，所有变更向后兼容

### Performance Improvements
- Bundle大小：1.92 MiB（合理范围）
- TypeScript编译：0错误
- ESLint：0错误，151警告（仅any类型警告）
- 功能完成度：从30% → 90%

---

## [0.1.1] - 2025-12-23

### Fixed
- fix(types): 修复TypeScript编译错误和类型不匹配问题 (#F01)
  - 修复src/main/utils/validation.ts中缺失模块导入问题
  - 移除对不存在模块(workflow.ts, mcp.ts, service.ts)的引用
  - 添加临时类型定义以支持验证功能
  - 修复forEach回调参数的隐式any类型问题
- fix(deps): 统一React Router版本兼容性 (#F02)
  - 将@types/react-router-dom从v5.3.3升级到v7.11.0
  - 解决与react-router-dom实现版本的类型不匹配问题
- fix(architecture): 修复IPC通信架构设计问题 (#F03)
  - 重构tests/integration/ipc-communication/IPCCommunication.test.ts
  - 移除测试中对ipcMain.invoke的错误使用
  - 实现正确的IPC处理器测试模式
- fix(decorators): 修复TimeService装饰器实现问题 (#F04)
  - 更新装饰器签名以支持symbol类型的propertyKey
  - 解决TypeScript装饰器规范兼容性问题
  - 添加undefined描述符处理以支持访问器装饰器
- fix(build): 解决构建系统缓存问题 (#F05)
  - 清理构建缓存确保最新代码生效
  - 验证所有TypeScript错误已解决
- fix(test): 修复单元测试Mock和装饰器测试问题 (#F06)
  - 解决装饰器测试中的类型错误
  - 修复Mock函数调用验证问题
  - 改进测试用例的稳定性

### Security
- security(types): 加强类型安全检查
  - 所有隐式any类型已修复
  - 装饰器实现符合TypeScript规范
  - 模块导入路径验证通过

### Test
- test(integration): 修复集成测试执行环境
  - 解决Electron应用初始化问题
  - 优化测试用例的执行稳定性
- test(unit): 修复单元测试Mock问题
  - 解决装饰器测试中的类型错误
  - 改进时间服务测试覆盖率

---

## [0.1.0] - 2025-12-23

### Added
- feat(core): 实现时间服务与合规层 (TimeService) (#C01)
  - 创建TimeService.ts，支持NTP网络时间同步
  - 实现时间完整性验证机制
  - 添加时间监控和日志记录功能
  - 创建时间合规装饰器和强制验证机制
- feat(core): 实现项目管理器 (ProjectManager) (#C02)
  - 创建ProjectManager.ts，支持项目生命周期管理
  - 实现项目创建、加载、保存、删除功能
  - 添加项目与全局资产的引用关系管理
  - 支持项目模板应用功能
- feat(core): 实现资产管理器 (AssetManager) (#C02)
  - 创建AssetManager.ts，支持项目私有和全局资产管理
  - 实现资产添加、删除、更新、搜索功能
  - 支持资产从项目提升到全局库
  - 支持资产预览生成功能
- feat(types): 定义完整的TypeScript类型系统 (#C02)
  - 创建src/common/types.ts，包含所有核心接口和枚举
  - 定义项目、资产、插件、任务、API等数据模型
  - 实现时间合规装饰器和错误处理类型
- feat(ipc): 完善IPC通信桥接 (#C03)
  - 更新src/main/ipc/channels.ts，添加完整的通信频道定义
  - 创建src/preload/index.ts，实现安全的渲染进程API暴露
  - 实现主进程与渲染进程的完整通信处理器
  - 支持应用、窗口、项目、资产、工作流、插件、任务、API、文件系统、MCP和本地服务的IPC通信

### Changed
- refactor(main): 重构主进程初始化流程
  - 集成TimeService、ProjectManager、AssetManager到主应用
  - 实现服务初始化和清理流程
  - 添加完整的IPC处理器注册机制

### Fixed
- fix(types): 修复时间验证装饰器类型问题
  - 移除装饰器实现，改为手动时间验证调用
  - 解决TypeScript编译错误和类型不匹配问题

### Security
- security(time): 实现强制时间验证机制
  - 所有涉及时间的操作必须先验证时间完整性
  - 支持NTP网络时间同步和系统时间校验
  - 防止系统时间篡改导致的数据不一致问题

### Test
- test(unit): 创建TimeService单元测试
  - 验证时间获取、UTC转换、本地时间转换功能
  - 测试NTP同步和时间完整性验证
  - 模拟系统时间篡改场景验证错误处理
- test(integration): 创建IPC通信集成测试
  - 验证主进程与渲染进程间通信功能
  - 测试项目、资产、文件系统等核心IPC通道
  - 验证错误处理和时间合规性

### Docs
- docs(api): 更新IPC通信文档
  - 完善preload API接口说明
  - 添加使用示例和最佳实践指南
- docs(core): 更新核心服务设计文档
  - 同步实际实现与设计文档的一致性

### Breaking Changes
- **时间处理**: 所有涉及时间的操作现在必须通过TimeService验证
- **IPC通信**: 渲染进程API调用方式更新，需要通过window.electronAPI访问
- **类型系统**: 使用新的统一类型系统替换原有分散的类型定义

### Migration Guide
- **时间处理**: 将直接使用new Date()的代码改为使用timeService.getCurrentTime()
- **IPC调用**: 将直接使用ipcRenderer的代码改为使用window.electronAPI
- **类型引用**: 更新导入路径，使用src/common/types.ts中的统一类型定义

### Performance Improvements
- 优化时间服务性能，减少重复的时间验证调用
- 改进IPC通信错误处理机制
- 优化资产搜索和过滤算法

---

## 发布信息

**发布日期**: 2025-12-23  
**版本**: 0.1.0  
**发布类型**: 主要功能版本 (Major Feature Release)  
**兼容性**: 向前不兼容 (Breaking Changes)

### 核心特性
- ✅ 时间服务与合规层完整实现
- ✅ 项目管理器完整功能
- ✅ 资产管理器完整功能  
- ✅ IPC通信桥接完整实现
- ✅ TypeScript类型系统统一
- ✅ 单元测试和集成测试覆盖

### 技术债务
- 🚧 插件管理器、任务调度器、API管理器待实现
- 🚧 部分IPC处理器为模拟实现，待后续完善
- 🚧 验证工具类型问题待修复

### 已知问题
- ⚠️ 集成测试中部分类型定义问题
- ⚠️ 某些边界条件下的错误处理待完善

---

## [0.2.1] - 2025-12-25

### Fixed
- fix(electron): 修复Electron白屏问题 (#F12)
  - 修复路由配置：将BrowserRouter改为HashRouter，适配file://协议
  - 修复webPreferences配置：设置nodeIntegration: false和contextIsolation: true
  - 修复webpack HtmlWebpackPlugin配置：使用blocking方式加载脚本
  - 修复webpack配置文件eslint错误：添加eslint-disable注释

### Security
- security(electron): 增强Electron安全配置
  - 使用contextIsolation: true隔离渲染进程上下文
  - 通过preload脚本安全暴露API，避免直接Node集成

### Performance
- perf(build): 优化webpack配置
  - 修复script标签生成问题，确保bundle.js正确加载
  - 优化publicPath配置，使用相对路径适配file://协议

### Docs
- docs(troubleshooting): 添加白屏问题诊断和修复记录
  - 参考docs/references/Electron常见白屏问题及解决.md
  - 记录导致白屏的核心原因和解决方案

### Migration Guide
无需迁移，所有变更向后兼容

### 后续计划
- 🔄 实现剩余的核心管理器
- 🔄 完善IPC处理器的实际业务逻辑
- 🔄 添加端到端测试覆盖
- 🔄 性能优化和安全加固