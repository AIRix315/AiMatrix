# Workflow vs WorkflowExecutor 概念区分

## 核心区别

### Workflow（工作流模板）
**定义**：可在工作台中创建、编辑、自由组合的工作流模板

**特点**：
- 注册到 `WorkflowRegistry`
- 可在工作流编辑器中打开和修改
- 用户可以基于模板创建自己的工作流实例
- 节点可以自由添加、删除、连接
- 存储为项目的一部分

**示例**：
- `test-workflow`: 测试用的简单工作流
- 用户自定义的图像处理工作流
- 从市场下载的工作流模板

**文件位置**：
- 定义：`src/main/workflows/*.ts`（如 `test-workflow.ts`）
- 注册：`src/main/index.ts` 的 `registerTestWorkflows()`

### WorkflowExecutor（插件形态的工作流）
**定义**：工作流的打包形态，作为完整功能的系统插件

**特点**：
- 通过 `PluginManager` 加载和管理
- **不注册到** `WorkflowRegistry`
- 提供固定的执行流程（不可随意修改结构）
- 包含完整的业务逻辑和UI面板
- 在插件页面中管理和启动

**示例**：
- **小说转视频**：系统官方插件
  - 文件位置：`plugins/official/novel-to-video/`
  - 快捷方式类型：`ShortcutType.PLUGIN`
  - 跳转路径：`/plugins/novel-to-video`
  - 包含5个固定步骤（章节拆分、场景提取、分镜生成、配音生成、导出）

**文件位置**：
- 实现：`plugins/official/*/`（完整插件包）
- 加载：`PluginManager.initialize()`

## "小说转视频"的正确定位

### ✅ 正确做法
1. 作为**系统插件**存在于 `plugins/official/novel-to-video/`
2. 通过 `PluginManager` 加载
3. 快捷方式类型为 `PLUGIN`
4. 点击快捷方式跳转到 `/plugins/novel-to-video`
5. 在插件页面中启动和管理

### ❌ 错误做法（已修正）
1. ~~定义为 `WorkflowDefinition` 并注册到 `WorkflowRegistry`~~ (已移除)
2. ~~在工作流页面显示和编辑~~ (不应该)
3. ~~与普通工作流模板混淆~~ (已区分)

## 代码修改记录

### 已修改文件

1. **src/main/index.ts**
   - 移除 `novelToVideoWorkflow` 的导入
   - 移除对其的 `workflowRegistry.register()` 调用
   - 添加注释说明概念区分

2. **src/main/workflows/novel-to-video-definition.ts**
   - 添加 `@deprecated` 标记
   - 添加警告注释说明此文件仅作参考
   - 明确指出实际实现在插件目录

3. **src/main/services/ShortcutManager.ts**
   - 默认快捷方式类型已正确设置为 `ShortcutType.PLUGIN` ✓

4. **src/renderer/components/common/GlobalNav.tsx**
   - 快捷方式点击处理已正确跳转到插件页面 ✓

### 验证清单

- [x] "小说转视频"不在 `WorkflowRegistry` 中注册
- [x] 快捷方式类型为 `PLUGIN`
- [x] 点击快捷方式跳转到 `/plugins/novel-to-video`
- [x] 插件实现位于 `plugins/official/novel-to-video/`
- [x] 普通工作流模板仍可在工作流编辑器中使用

## 开发指南

### 何时创建 Workflow
如果你的工作流需要：
- 用户可以自由修改节点和连接
- 作为模板供用户创建多个实例
- 在工作流编辑器中可视化编辑

**创建步骤**：
1. 在 `src/main/workflows/` 创建定义文件
2. 在 `src/main/index.ts` 中注册到 `WorkflowRegistry`

### 何时创建 WorkflowExecutor（插件）
如果你的工作流需要：
- 提供完整的端到端功能
- 固定的执行步骤（不允许用户随意修改）
- 复杂的业务逻辑和自定义UI
- 作为独立产品分发

**创建步骤**：
1. 在 `plugins/official/` 或 `plugins/community/` 创建插件目录
2. 实现 `Plugin` 接口和完整业务逻辑
3. 通过 `PluginManager` 加载（自动扫描）

---

**最后更新**：2025-12-29
**版本**：v0.3.6
