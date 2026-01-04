# 项目级插件配置系统 - 实施总结

## Phase 9 E03: 已完成工作

### ✅ P0 任务（核心架构）

#### 1. 插件模板配置

**文件**：
- `plugins/official/novel-to-video/default-config.json` ✅ 创建
- `plugins/official/novel-to-video/manifest.json` ✅ 更新（添加 requiredProviders）

**内容**：
```json
{
  "providers": {
    "llm": { "providerId": "openai", "model": "gpt-4", "purpose": "章节拆分和场景提取" },
    "imageGeneration": { "providerId": "stability-ai", "model": "sd3-large", "purpose": "场景图片生成" },
    "videoGeneration": { "providerId": "t8star-video", "model": "sora-2", "purpose": "分镜视频生成" },
    "tts": { "providerId": null, "model": null, "purpose": "对白音频生成", "optional": true }
  }
}
```

---

#### 2. 项目级配置管理服务

**文件**：
- `src/main/services/ProjectPluginConfigManager.ts` ✅ 创建
- `src/shared/types/plugin-config.ts` ✅ 创建

**核心方法**：
- `getPluginConfig(projectId, pluginId, pluginPath)` - 获取配置（不存在则从默认配置初始化）
- `savePluginConfig(projectId, pluginId, config)` - 保存配置
- `validateConfig(projectId, pluginId, pluginPath)` - 验证配置完整性
- `resetToDefaults(projectId, pluginId, pluginPath)` - 重置为默认配置

---

#### 3. 新建项目流程改造

**修改文件**：`src/main/index.ts`

**改动**：
```typescript
ipcMain.handle('project:create', async (_, name, template) => {
  const project = await this.projectManager.createProject(name, template);

  // 如果指定了插件模板，初始化插件配置
  if (template) {
    const plugin = pluginManager.getPlugin(template);
    if (plugin) {
      await projectPluginConfigManager.initializeFromDefaults(
        project.id,
        template,
        plugin.path
      );
    }
  }

  return project;
});
```

**效果**：创建项目时自动复制插件的 `default-config.json` 到项目目录

---

#### 4. IPC 通道注册

**新增 IPC 通道**：
- `project:getPluginConfig` - 获取项目插件配置
- `project:savePluginConfig` - 保存项目插件配置
- `project:validatePluginConfig` - 验证项目插件配置
- `project:resetPluginConfig` - 重置项目插件配置

**预加载脚本暴露**：`src/preload/index.ts`
```typescript
getProjectPluginConfig: (projectId, pluginId) => ipcRenderer.invoke('project:getPluginConfig', projectId, pluginId),
saveProjectPluginConfig: (projectId, pluginId, config) => ipcRenderer.invoke('project:savePluginConfig', projectId, pluginId, config),
validateProjectPluginConfig: (projectId, pluginId) => ipcRenderer.invoke('project:validatePluginConfig', projectId, pluginId),
resetProjectPluginConfig: (projectId, pluginId) => ipcRenderer.invoke('project:resetPluginConfig', projectId, pluginId)
```

---

### 🚧 待完成任务

#### P1 任务

1. **NovelVideoAPIService 重构**（工作量：中）
   - 需扩展 PluginContext，添加 `getPluginConfig()` 方法
   - 修改服务构造函数，加载项目配置
   - 替换硬编码的 API 调用为动态 Provider 调用

2. **右侧面板 UI**（工作量：大）
   - 创建 `ProjectPluginConfigPanel.tsx` 组件
   - 支持 Provider 下拉选择（按 category 过滤）
   - 支持模型下拉选择（动态加载 Provider 的模型列表）
   - 显示配置状态（已配置/未配置/连接失败）
   - 测试连接按钮

#### P2 任务

3. **配置验证和错误提示**（工作量：小）
   - 工作流执行前调用 `validateConfig`
   - 如果配置缺失，显示友好的错误提示
   - 提供"去配置"按钮跳转到配置面板

---

## 架构优势

### 配置层级分离

```
插件模板层（只读）          项目层（可修改）
┌────────────────────┐      ┌────────────────────┐
│ default-config.json│ ──── │ novel-to-video.json│
│ (默认配置)         │ 复制 │ (项目专属配置)     │
└────────────────────┘      └────────────────────┘
         │                           │
         ▼                           ▼
  新建项目时使用           运行时读取/修改
```

### 文件存储结构

```
plugins/
  └─ official/
      └─ novel-to-video/
          ├─ manifest.json          # 声明依赖的Provider类型
          └─ default-config.json    # 默认模板配置

projects/
  └─ {projectId}/
      ├─ project.json               # 项目基础配置
      └─ plugin-configs/
          └─ novel-to-video.json    # 项目专属配置（可修改）
```

### 使用流程

1. **新建项目**
   - 用户选择"小说转视频"插件模板
   - 系统创建项目文件夹 + `project.json`
   - 系统复制 `default-config.json` → `plugin-configs/novel-to-video.json`

2. **运行时**
   - 插件读取 `projects/{id}/plugin-configs/novel-to-video.json`
   - 根据配置中的 `providerId` 和 `model` 调用对应的 API

3. **配置修改**
   - 用户在右侧面板修改 Provider（如：OpenAI → Ollama）
   - 保存到 `projects/{id}/plugin-configs/novel-to-video.json`
   - 不影响插件模板配置

---

## 下一步建议

### 立即可做

1. **测试基础功能**
   ```bash
   npm run build
   npm run dev
   # 测试：创建项目 → 检查 plugin-configs 目录是否生成配置文件
   ```

2. **扩展 PluginContext API**
   ```typescript
   // src/main/services/PluginManager.ts
   class PluginContext {
     async getPluginConfig(projectId: string, pluginId: string): Promise<PluginConfig> {
       const plugin = this.pluginManager.getPlugin(pluginId);
       return await projectPluginConfigManager.getPluginConfig(projectId, pluginId, plugin.path);
     }
   }
   ```

3. **创建配置面板原型**
   - 简单的表单显示当前配置
   - 添加"保存"和"重置"按钮
   - 后续迭代再添加 Provider 选择器

### 后续迭代

- **版本 1.0**：基础配置读取和保存
- **版本 1.1**：UI 配置面板（Provider 选择器）
- **版本 1.2**：配置验证和错误提示
- **版本 2.0**：配置预设（快速切换"本地模式"/"云端模式"）

---

## 技术债务

1. **PluginContext 扩展**：需要在 SDK 中添加配置相关的 API
2. **类型定义**：preload/index.ts 中的 `unknown` 类型需要替换为具体类型
3. **错误处理**：插件加载失败时的回滚机制
4. **性能优化**：配置缓存机制（避免频繁读取文件）

---

## 文件清单

### 已创建/修改

- ✅ `plugins/official/novel-to-video/default-config.json`
- ✅ `plugins/official/novel-to-video/manifest.json`
- ✅ `src/main/services/ProjectPluginConfigManager.ts`
- ✅ `src/shared/types/plugin-config.ts`
- ✅ `src/shared/types/index.ts`
- ✅ `src/main/index.ts` (添加 IPC 处理器)
- ✅ `src/preload/index.ts` (暴露 API)
- ✅ `docs/ref/plugin-config-refactor-guide.md`
- ✅ `docs/ref/plugin-config-implementation-summary.md`

### 待创建

- ⏳ `src/renderer/components/panels/ProjectPluginConfigPanel.tsx`
- ⏳ `plugins/official/novel-to-video/src/services/NovelVideoAPIService.ts` (重构)
- ⏳ `tests/unit/services/ProjectPluginConfigManager.test.ts`

---

## 总结

**核心架构已完成**，实现了：
- ✅ 插件模板默认配置
- ✅ 项目级配置管理服务
- ✅ 新建项目时自动初始化配置
- ✅ IPC 通道和 Preload API

**待实施功能**：
- ⏳ 插件服务层重构（读取项目配置）
- ⏳ 配置UI面板（右侧栏）
- ⏳ 配置验证和错误提示

**实现进度**：核心基础设施 100%，应用层集成 30%
