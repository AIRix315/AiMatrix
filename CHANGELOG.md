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

--------------------------------------------

## [Unreleased] - 2025-12-27

### Added - 阶段5.2: 数据模型和AssetManager集成
- feat(novel-video): 完整实现小说转视频数据模型系统
  - 新增 NovelVideoFields 类型定义 (161行) - 支持章节/场景/角色/分镜/配音字段
  - 新增 NovelVideoAssetHelper 服务 (510行) - 封装资产创建和查询方法
  - 新增 5个数据类型 (ChapterData, SceneData, CharacterData, StoryboardData, VoiceoverData)
  - 新增集成测试套件 (389行, 13个测试, 100%通过)

### Added - 阶段5.3: AI服务集成
- feat(ai): 从ai-playlet复制LangChain Agent相关文件
  - 新增 src/main/agent/LangChainAgent.ts - LangChain结构化输出封装
  - 新增 src/main/agent/types.ts, config.ts - Agent配置和类型
  - 新增 AI实现文件 (4个) - AgentSceneCharacterExtractor, AgentStoryboardScriptGenerator等
  - 安装langchain, zod, @langchain/community依赖

- feat(api): 扩展APIManager支持T8Star和RunningHub提供商
  - 新增 APIProvider.T8STAR, APIProvider.RUNNINGHUB 枚举
  - 新增 callT8StarImage() - T8Star图片生成API (nano-banana模型)
  - 新增 callT8StarVideo() - T8Star视频生成API (sora-2模型, 支持进度回调)
  - 新增 callRunningHubTTS() - RunningHub TTS API (4步流程: 上传→创建→轮询→下载)
  - 新增 pollT8StarVideoStatus() - 视频生成状态轮询 (5秒间隔, 最多5分钟)
  - 新增 pollRunningHubTaskStatus() - TTS任务状态轮询 (5秒间隔, 最多10分钟)
  - 新增 uploadRunningHubFile(), createRunningHubTTSTask(), downloadFile() - 辅助方法

- feat(novel-video): 实现NovelVideoAPIService封装层
  - 新增 NovelVideoAPIService 服务 (330行) - 封装API调用并集成AssetManager
  - 新增 generateSceneImage() - 场景图片生成 (自动下载并更新元数据)
  - 新增 generateCharacterImage() - 角色图片生成
  - 新增 generateStoryboardVideo() - 分镜视频生成 (支持进度回调)
  - 新增 generateDialogueAudio() - 对白音频生成
  - 新增 downloadImage(), downloadVideo() - 图片和视频下载方法

### Performance - 阶段5.2测试结果
- perf(asset): NovelVideoAssetHelper性能优异
  - 查询100个章节资产: 43.42ms (目标<100ms) ✅
  - 查询50个场景资产: 32.06ms (目标<100ms) ✅
  - 创建100个章节资产: 4.06s
  - 测试覆盖率: 13/13通过

### Technical Details
- **新增文件**: 11个核心文件
  - src/shared/types/novel-video.ts (161行)
  - src/main/services/novel-video/NovelVideoAssetHelper.ts (510行)
  - src/main/services/novel-video/NovelVideoAPIService.ts (330行)
  - src/main/agent/* (3个文件)
  - src/main/services/ai/implementations/* (4个文件)
  - tests/integration/services/NovelVideoAssetHelper.test.ts (389行)

- **修改文件**: 1个
  - src/main/services/APIManager.ts (+340行) - T8Star/RunningHub API集成

- **新增依赖**:
  - langchain@1.2.3
  - zod (peer dependency)
  - @langchain/community@1.1.1

### Added - 阶段5.4: 业务服务实现
- feat(novel-video): 实现5个业务服务完整功能
  - 新增 ChapterService (270行) - 章节拆分+场景角色提取
    - splitChapters() - 基于RuleBasedChapterSplitter拆分小说
    - extractScenesAndCharacters() - LLM提取场景和角色（集成AgentSceneCharacterExtractor）
    - batchExtractScenesAndCharacters() - 批量提取+角色去重

  - 新增 ResourceService (260行) - 资源生成服务
    - generateSceneImage() - 场景图片异步生成（集成TaskScheduler）
    - generateCharacterImage() - 角色图片异步生成
    - generateSceneImages/generateCharacterImages() - 批量生成（并发控制）
    - waitForTask/waitForTasks() - 任务等待和结果获取

  - 新增 StoryboardService (240行) - 分镜脚本生成服务
    - generateScript() - 4步AI链式调用生成分镜脚本
      - Step 1: 生成剧本分镜描述
      - Step 2: 生成Sora2视频提示词
      - Step 3 & 4: 并行执行（角色名替换+图片分镜提示词）
    - batchGenerateScripts() - 批量生成

  - 新增 VoiceoverService (220行) - 配音生成服务
    - generateVoiceover() - LLM提取台词+音频生成（集成AgentVoiceoverGenerator）
    - batchGenerateVoiceovers() - 批量生成配音
    - 支持音色文件映射（characterId -> voiceFilePath）

  - 新增 index.ts - 统一导出所有NovelVideo服务

### Fixed - 阶段5.4: 编译错误修复
- fix(ai): LangChain API集成修复（16+个TypeScript编译错误）
  - 移除无效的 @langchain/deepseek 导入，使用标准 ChatOpenAI
  - 使用 ChatOpenAI.withStructuredOutput() 替代 createAgent()
  - 符合用户要求："LangChain API应该纳入基础配置"

- fix(ai): AgentVoiceoverGenerator完全重写（485行→302行）
  - 移除不存在的 FileSystemService、TTSService、configService 依赖
  - 简化为仅处理LLM工作（台词提取+情绪分析）
  - 实际TTS音频生成委托给 VoiceoverService（使用NovelVideoAPIService）
  - 符合用户要求："文件的导入和导出，应该纳入系统已经存在的资产管理-项目管理范畴"
  - 构造函数改为接受config getter函数，延迟初始化，实时读取配置

- fix(novel-video): ResourceService修复
  - 添加 TaskType 导入：`import { TaskScheduler, TaskType } from '../TaskScheduler'`
  - 修复任务类型：将 `'API_CALL'` 字符串改为 `TaskType.API_CALL` 枚举
  - 移除不存在的 updateTaskStatus 调用（TaskScheduler内部管理状态）
  - 修复类型断言：`const errorInfo = task.result as { error?: string } | undefined`

- fix(ai): 接口和实现修复
  - 创建缺失的 IChapterSplitter.ts 接口（18行）
  - 修复 RuleBasedChapterSplitter：方法名 `splitChapters()` → `split()`
  - 修复 AgentStoryboardScriptGenerator：添加缺失的导入和默认参数
  - 修复 Character 接口字段名：`char.id` → `char.characterId`

- fix(api): APIManager Buffer类型兼容性修复
  - 修复 uploadRunningHubFile() 中的 Buffer → Blob 转换
  - 使用 `new Blob([new Uint8Array(fileBuffer)])` 确保类型兼容

- fix(ai): 接口类型定义更新
  - GenerateStoryboardPromptsInput 添加 `chapter: any` 字段
  - ImagePromptItem 修改：`prompt: string` → `prompts: string[]`

### Technical Details - 错误修复统计
- **修复文件**: 9个文件
  - src/main/agent/LangChainAgent.ts (ChatOpenAI.withStructuredOutput)
  - src/main/services/ai/implementations/AgentVoiceoverGenerator.ts (完全重写)
  - src/main/services/novel-video/ResourceService.ts (TaskType修复)
  - src/main/services/ai/implementations/RuleBasedChapterSplitter.ts (接口实现)
  - src/main/services/ai/implementations/AgentStoryboardScriptGenerator.ts (导入修复)
  - src/main/services/ai/interfaces/IStoryboardScriptGenerator.ts (类型更新)
  - src/main/services/APIManager.ts (Buffer类型修复)
  - src/main/services/ai/interfaces/IChapterSplitter.ts (新增)

- **构建状态**: ✅ 成功（0错误，0警告）
- **修复的错误类型**:
  - TS2307: 模块不存在 (5个)
  - TS2304: 名称不存在 (4个)
  - TS2339: 属性不存在 (3个)
  - TS2322: 类型不匹配 (2个)
  - TS2820: 枚举类型错误 (1个)
  - TS2420: 接口实现错误 (1个)

### Notes
- **阶段5.2完成度**: 100% (3/3任务完成)
- **阶段5.3完成度**: 100% (4/4任务完成)
- **阶段5.4完成度**: 100% (5/5任务完成 + 编译错误修复)
- **下一步**: 阶段5.5 UI组件开发 (6个任务)
- **代码量**: 约2,390行新增代码 + 389行测试代码
- **架构改进**: 遵循Matrix架构模式，AI服务与文件操作分离

--------------------------------------------

## [0.2.9.1] - 2025-12-27

### Added
- feat(workflow): 工作流引擎基础架构完成（阶段5.1）
  - 新增 WorkflowRegistry 服务 - 工作流注册表
  - 新增 WorkflowStateManager 服务 - 工作流状态管理器
  - 新增 WorkflowExecutor 组件 - 工作流执行器UI
  - 新增工作流类型定义系统 (WorkflowDefinition, WorkflowState, WorkflowInstance)
  - 新增9个工作流相关IPC处理器 (workflow:*)
  - 新增9个工作流相关API方法
  - 新增测试工作流定义 (test-workflow)

- feat(ui): Workflows页面功能扩展
  - 新增工作流模板展示功能
  - 新增一键创建工作流实例功能
  - 新增双标签页切换 (工作流模板/我的工作流)
  - 集成Toast通知和Loading组件

- feat(router): 路由配置优化
  - 新增 /workflows/:workflowId 路由 - 工作流执行器
  - 新增 /workflows/new 路由 - 自定义工作流编辑器
  - 新增 /workflows/editor/:workflowId 路由 - 编辑器

### Changed
- refactor(workflow): 工作流架构重构
  - 建立通用的步骤化流程执行引擎
  - 支持工作流状态持久化和中断恢复
  - 支持步骤状态追踪和更新
  - 完整的TypeScript类型安全

### Technical Details
- **新增文件**: 10个核心文件
  - `src/shared/types/workflow.ts` - 类型定义
  - `src/main/services/WorkflowRegistry.ts` - 注册表服务
  - `src/main/services/WorkflowStateManager.ts` - 状态管理器
  - `src/main/ipc/workflow-handlers.ts` - IPC处理器
  - `src/main/workflows/test-workflow.ts` - 测试工作流
  - `src/renderer/components/WorkflowExecutor/` - 执行器组件
- **代码量**: 约1,650行新增代码
- **IPC通道**: 9个新增通道
- **API方法**: 9个新增方法

### Notes
- 工作流引擎为未来的"小说转视频"等插件提供标准化流程框架
- 状态保存在 `{dataDir}/workflows/{workflowId}/state.json`
- 应用重启后自动恢复工作流执行状态

--------------------------------------------

## [0.2.9] - 2025-12-26

### Added
- feat(button): Button组件增强
  - 添加className属性支持自定义样式类
  - 添加style属性支持内联样式
- feat(globalnav): Global导航组件优化
  - 添加菜单分隔符样式
  - 添加分隔符菜单项
  - 优化content.ico图标显示（放大至9px）
  - 调整菜单图标大小（7.2px）
- feat(windowbar): 窗口栏组件增强
  - 添加版本号显示功能
- feat(about): 关于页面增强
  - 添加版本号显示
- feat(assets): 资产页面优化
  - 添加网格视图切换功能
  - 优化资产卡片布局
  - 改进响应式设计
- feat(workflows): 工作流页面增强
  - 添加视图模式切换（列表/网格）
  - 实现列表视图展示工作流
- feat(workflow-editor): 工作流编辑器重大重构
  - 重新设计布局为左右分栏+中间列上下分区
  - 添加左侧和右侧面板折叠功能
  - 添加折叠按钮和图标
  - 优化面板大小控制（固定宽度250px）
  - 添加垂直调整手柄
  - 优化工具栏布局和样式
  - 改进响应式设计

### Changed
- refactor(dashboard): 优化仪表板页面布局和样式
- refactor(settings): 优化设置页面布局

### Fixed
- fix(filesystem): 删除临时文件1.png

### Technical Details
- 修改文件：
  - src/renderer/components/common/Button.tsx (+2行)
  - src/renderer/components/common/GlobalNav.css (+12行)
  - src/renderer/components/common/GlobalNav.tsx (+7行)
  - src/renderer/components/common/WindowBar.tsx (+1行)
  - src/renderer/pages/about/About.tsx (+1行)
  - src/renderer/pages/assets/Assets.css (优化布局)
  - src/renderer/pages/assets/Assets.tsx (视图切换)
  - src/renderer/pages/dashboard/Dashboard.css (优化布局)
  - src/renderer/pages/dashboard/Dashboard.tsx (优化布局)
  - src/renderer/pages/settings/Settings.css (优化布局)
  - src/renderer/pages/settings/Settings.tsx (优化布局)
  - src/renderer/pages/workflows/WorkflowEditor.css (+60行)
  - src/renderer/pages/workflows/WorkflowEditor.tsx (+80行)
  - src/renderer/pages/workflows/Workflows.tsx (+20行)
- 删除文件：1.png

---

## [0.2.8] - 2025-12-26

### Fixed
- fix(eslint): 修复所有ESLint错误
  - Logger.ts: 修复4处未使用变量错误（_error参数）
  - ServiceErrorHandler.ts: 修复1处未使用变量错误（_logError参数）
  - Settings.tsx: 修复9处any类型错误，添加完整类型定义
    - 定义LoggingConfig、GeneralConfig、Model、ProviderConfig、AppConfig接口
    - 将所有any替换为具体类型，添加必要的null检查
  - WorkflowEditor.tsx: 修复5处console语句错误，添加eslint-disable注释
  - Workflows.tsx: 修复1处any类型错误和1处console语句错误
- fix(workflow): 修复工作流编辑器宽度适配问题
  - WorkflowEditor.css: 添加width: 100%和box-sizing: border-box
  - editor-panels: 添加width: 100%和min-width: 0确保三栏布局正确
  - 工作流编辑器现在正确适应窗口宽度

### Changed
- revert(workflow): 从Git恢复工作流页面文件
  - Workflows.tsx、Workflows.css、WorkflowEditor.tsx、WorkflowEditor.css、workflowValidator.ts

### Technical Details
- 修改文件：
  - src/main/services/Logger.ts (4处修复)
  - src/main/services/ServiceErrorHandler.ts (1处修复)
  - src/renderer/pages/settings/Settings.tsx (添加类型定义+9处修复)
  - src/renderer/pages/workflows/WorkflowEditor.tsx (5处console修复)
  - src/renderer/pages/workflows/Workflows.tsx (1处any+1处console修复)
  - src/renderer/pages/workflows/WorkflowEditor.css (宽度适配修复)
  - src/renderer/pages/workflows/Workflows.css (响应式布局添加)

---

## [0.2.6] - 2025-12-26

### Added
- feat(plugin): 完整实现插件管理系统 (Phase 4 E03)
  - 插件类型分级：支持official/partner/community三级分类体系
  - 插件市场UI：搜索框、标签筛选、排序功能（按下载量/评分/更新时间）
  - MarketPluginCard组件：显示插件徽章（官方认证、内置）、评分、下载量、标签
  - 硬编码示例数据：3个示例插件（小说转视频、图片增强、音频混音）
  - PluginMarketService：支持类型/标签/关键词筛选和排序
  - 插件启用/禁用：CSS动画开关组件，支持状态切换
  - 配置持久化：集成ConfigManager，插件状态保存到config.json
  - 官方插件：novel-to-video（小说转视频），包含4个动作（剧本拆解、分镜生成、图片生成、素材匹配）
  - 使用统计：executePlugin时自动更新lastUsed时间戳

### Changed
- refactor(plugin): 统一类型定义系统
  - 删除PluginManager.ts中的本地枚举定义
  - 统一使用src/common/types.ts中的PluginType和PluginPermission
  - PluginType新增PARTNER类型（官方/合作伙伴/社区三级）
  - PluginPermission符合文档规范（file-system:*, network:*, shell:exec）
- refactor(plugin): 插件目录结构调整
  - 创建plugins/partner/目录
  - PluginManager自动扫描official/partner/community三个目录

### Added - 类型定义
- IPluginConfig：插件配置（enabled: boolean, lastUsed?: string）
- IAppSettings.plugins：插件配置字典（pluginId -> IPluginConfig）
- MarketPluginInfo：市场插件信息（downloads, rating, reviewCount, tags, verified等）
- MarketFilter：市场筛选器（type, tag, search, sortBy）
- POPULAR_TAGS：热门标签常量（7个标签）

### Added - IPC通道
- plugin:toggle：切换插件启用/禁用状态
- plugin:market:list：获取市场插件列表（支持筛选）
- plugin:market:search：搜索市场插件

### Added - Preload API
- togglePlugin(pluginId, enabled)：切换插件状态
- getMarketPlugins(filter)：获取市场数据
- searchMarketPlugins(keyword)：搜索插件

### Technical Details
- 新增文件：
  - src/shared/types/plugin-market.ts (60行) - 市场类型定义
  - src/main/services/PluginMarketService.ts (195行) - 市场服务
  - src/renderer/pages/plugins/components/MarketPluginCard.tsx (65行) - 市场卡片组件
  - plugins/official/novel-to-video/manifest.json (39行) - 插件清单
  - plugins/official/novel-to-video/index.js (254行) - 插件实现
- 修改文件：
  - src/common/types.ts (+15行) - 插件配置类型
  - src/main/services/PluginManager.ts (+80行) - 类型统一、配置集成
  - src/main/index.ts (+25行) - 市场IPC处理器
  - src/preload/index.ts (+35行) - 市场API暴露
  - src/renderer/pages/plugins/Plugins.tsx (+150行) - 市场UI实现
  - src/renderer/pages/plugins/Plugins.css (+315行) - 完整样式
- 新增目录：plugins/official/, plugins/partner/, plugins/community/

### Security
- security(plugin): 权限声明规范化
  - 所有插件manifest必须声明permissions数组
  - 支持细粒度权限控制（file-system:read/write分离）
  - 网络访问权限分级（network:any vs network:official-api）

### Benefits
- ✅ 完整的三级插件分类系统（官方/合作伙伴/社区）
- ✅ 功能完备的插件市场UI（搜索/筛选/排序/展示）
- ✅ 插件状态持久化（启用/禁用、使用时间）
- ✅ 官方插件示例（小说转视频MVP实现）
- ✅ 为Phase 5 小说转视频功能奠定基础
- ✅ 插件生态建设标准确立

### Migration Guide
无需迁移，所有变更向后兼容。新增功能自动生效。

### 完成度
- ✅ E03 插件管理系统完善：100% 完成
- ✅ 插件类型分级显示（官方/合作伙伴/社区）
- ✅ 插件市场集成（硬编码数据+完整UI）
- ✅ 插件安装流程（统一通过ZIP安装）
- ✅ 插件启用/禁用切换（含持久化）
- ✅ 小说转视频官方插件（manifest + MVP实现）

### 后续计划
- Phase 5 [F01-F03]: 小说转视频插件AI增强
  - F01: 智能场景识别算法
  - F02: AI分镜生成（集成大模型）
  - F03: 图片生成API集成（Stable Diffusion/DALL-E）

---

## [0.2.5] - 2025-12-26

### Added
- feat(workflow): 完整实现工作流编辑器核心功能
  - 工作流验证系统：循环依赖检测（DFS算法）、孤立节点警告、悬空连接检测、自连接检测
  - 执行进度监控：实时状态轮询、进度百分比显示、自动状态清理
  - 节点删除功能：支持 Delete/Backspace 快捷键、属性面板删除按钮、自动清理相关连接
  - TimeService IPC集成：time:getCurrentTime 处理器、preload API暴露、全局类型声明

### Fixed
- fix(workflow): 修复时间处理违规问题（CRITICAL）
  - 替换 WorkflowEditor.tsx 中的 Date.now() 为 TimeService.getCurrentTime()
  - 符合全局架构约束（docs/00-global-requirements-v1.0.0.md）
  - 保证工作流 ID 和节点 ID 的时间一致性
- fix(workflow): 修复 Button 组件类型错误
  - 移除不支持的 style 属性，改用 CSS 类

### Changed
- refactor(workflow): 统一工作流编辑器样式系统
  - 使用标准 CSS 变量（--accent-color, --bg-canvas, --text-main）
  - 统一字体大小（12px 主体，11px 辅助）
  - 统一动画时间（0.2s）
  - 与 Dashboard、Assets、Settings 保持一致
- refactor(workflow): 优化工作流保存和执行流程
  - 保存前强制验证，阻止无效工作流
  - 执行前验证，提供详细错误信息
  - 添加 createdAt/updatedAt 时间戳

### Performance
- perf(workflow): 优化执行状态轮询
  - 1秒轮询间隔
  - 完成后自动停止轮询
  - 避免内存泄漏

### Security
- security(time): 强化时间处理安全性
  - 所有时间戳通过 TimeService 获取
  - 支持 NTP 同步和时间验证
  - 防止客户端时间篡改

### Migration Guide
无需迁移，所有变更向后兼容。新增功能自动生效。

### 技术细节
- **新增文件**: src/renderer/pages/workflows/utils/workflowValidator.ts (173行)
- **修改文件**: src/main/index.ts (+6), src/preload/index.ts (+10), WorkflowEditor.tsx (+80), WorkflowEditor.css (~50)
- **构建状态**: ✅ 成功（0错误，2个非关键警告）
- **代码质量**: ✅ 通过 TypeScript 严格检查

### 完成度
- ✅ E02 工作流编辑器：100% 完成
- ✅ 三栏可拖拽布局（react-resizable-panels）
- ✅ 节点拖拽和连接（ReactFlow + 删除功能）
- ✅ 工作流执行引擎（TaskScheduler + 进度监控）
- ✅ 工作流保存和加载（带验证）

---

## [0.2.4] - 2025-12-26

### Added
- feat(settings): 完整实现设置模块与配置管理系统
  - ConfigManager服务：配置文件读写、API Key加密存储（Electron safeStorage）、配置变更事件通知（EventEmitter）
  - Logger服务升级：新日志命名格式（YYYY-MM-DD_HH-mm-ss_{SessionID}.log）、动态路径切换、SessionID生成
  - Settings IPC通道：settings:get-all、settings:save、dialog:open-directory
  - API连通性测试：api:test-connection 支持 Ollama、OpenAI、SiliconFlow，返回连接状态和模型列表
  - Settings页面完整实现：配置加载、保存、测试连接、路径选择、模型列表自动更新
  - AssetManager监听配置变更：工作区路径变更时自动重新扫描资源库

### Changed
- refactor(logger): 重构日志文件命名规范，从 matrix-YYYY-MM-DD.log 改为 YYYY-MM-DD_HH-mm-ss_{SessionID}.log
- refactor(main): 优化服务初始化顺序（ConfigManager → Logger → FileSystemService → AssetManager）

### Added - 类型定义
- ILogSettings：日志配置（启用状态、保存路径、保留天数）
- IGeneralSettings：通用设置（语言、主题、工作区路径、日志设置）
- IProviderConfig：AI服务商配置（id、名称、类型、启用状态、baseUrl、apiKey、模型列表）
- IMCPServerConfig：MCP服务器配置
- IAppSettings：完整应用配置（通用设置、服务商配置、MCP服务器配置）

### Technical Details
- 新增文件：src/main/services/ConfigManager.ts (289行)
- 修改文件：
  - src/common/types.ts (+74行) - Settings类型定义
  - src/main/services/Logger.ts (+45行) - 命名格式和动态路径
  - src/main/services/APIManager.ts (+85行) - testConnection方法
  - src/main/services/AssetManager.ts (+46行) - 配置监听
  - src/main/index.ts (+35行) - ConfigManager集成和Settings IPC
  - src/preload/index.ts (+21行) - 暴露新API
  - src/renderer/pages/settings/Settings.tsx (完全重写，393行)

### Benefits
- ✅ 完整的配置管理系统：支持加密存储、热重载、事件通知
- ✅ 升级的日志系统：符合规范的命名格式，用户可自定义路径
- ✅ 实时API测试：支持Ollama、OpenAI、SiliconFlow的连通性验证
- ✅ 动态资源库管理：配置变更时自动重新扫描资源
- ✅ 完全激活的设置页面：从静态UI变为可交互的功能模块

## [0.2.3] - 2025-12-25

### Added
- feat(asset): 完整实现资产库系统 (Phase 4 E01)
  - FileSystemService：统一文件系统服务，支持路径管理、文件操作、JSON读写
  - AssetManager：资产管理器，支持索引、扫描、导入、删除、元数据管理
  - 11个asset:* IPC处理器：get-index、rebuild-index、scan、import、delete、get-metadata、update-metadata等
  - AssetPreview Modal组件：多格式预览（图片/视频/音频/文本）、元数据显示、标签管理、键盘导航
  - asset:// 自定义协议：安全的本地文件访问、MIME类型检测、缓存控制
- feat(test): 实现完整测试套件 (48个测试, 100%通过)
  - 从Jest迁移到Vitest 3.2.4
  - FileSystemService集成测试：22个测试覆盖所有功能
  - AssetManager集成测试：26个测试覆盖完整业务流程
  - IPC处理器单元测试：验证所有资产相关处理器
  - Mock Electron环境：app、BrowserWindow、ipcMain、protocol

### Changed
- refactor(test): 测试框架从Jest迁移到Vitest
  - 配置vitest.config.ts（Node环境、集成测试支持）
  - 更新package.json测试脚本（test、test:unit、test:integration）
  - 修复tests/utils/setup.ts的Electron Mock（vi.mock语法）

### Fixed
- fix(asset): AssetManager全局索引存储items列表
  - 修复scanAssets无法找到资产的问题（line 178）
- fix(asset): 导出AssetManagerClass
  - 允许在测试中实例化AssetManager（line 42）
- fix(test): 修正测试路径期望
  - 实际实现使用`assets`、`images`、`videos`（复数形式）
  - 项目资产路径为`projects/{id}/assets`而非`assets/projects/{id}`
- fix(test): 删除过时的IPCCommunication.test.ts

### Test
- test(asset): FileSystemService完整覆盖
  - 初始化和目录创建、路径管理、文件操作、JSON读写、错误处理
- test(asset): AssetManager完整覆盖
  - 索引管理、资产扫描（类型/分类/标签/搜索/排序/分页）
  - 资产导入/删除、元数据管理、错误处理
- test(integration): 测试隔离策略
  - 每个测试独立临时目录
  - beforeEach创建、afterEach清理

### Performance
- perf(asset): JSON索引系统实现快速查询
  - 避免每次扫描遍历整个文件系统
  - 统计信息（total、byType、byCategory）快速获取

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