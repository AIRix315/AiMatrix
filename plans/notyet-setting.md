
# MATRIX Studio 实施规划 - 设置模块与日志系统

## 1. 核心目标概览

1.  **逻辑注入**：激活已存在的 V14 设置页 UI 组件，使其具备真实读写配置的能力。
2.  **日志系统升级**：实现基于“日期+时间+编号”命名规范的全局日志文件记录，并支持路径自定义。
3.  **连接性打通**：实现本地/云端模型 API 的配置、鉴权与连通性测试。
4.  **资源映射**：完成本地资源库与系统逻辑的对接。

---

## 2. 数据模型定义 (前提)

在开始逻辑开发前，需在 `src/common/types.ts` 明确更新以下接口：

```typescript
// 新增日志配置接口
export interface ILogSettings {
  enabled: boolean;
  savePath: string; // 日志保存文件夹路径
  retentionDays: number; // 日志保留天数
}

// 更新全局设置接口
export interface IGeneralSettings {
  language: string;
  theme: 'dark' | 'light';
  workspacePath: string; // 资源库路径
  logging: ILogSettings; // 新增
}

// 完整的应用配置结构
export interface IAppSettings {
  general: IGeneralSettings;
  providers: IProviderConfig[]; // (保持之前的定义: Ollama, OpenAI, etc.)
  mcpServers: IMCPServerConfig[]; // (保持之前的定义)
}
```

---

## 3. 分步骤实施规划

### 阶段一：核心后端服务 (Main Process Services)
**目标**：构建配置管理与升级后的日志系统，为前端提供数据支撑。

#### 步骤 1.1：ConfigManager 服务实现
- **任务**：创建 `src/main/services/ConfigManager.ts`。
- **逻辑**：
    - **初始化**：启动时读取 `config.json`，若无则写入默认配置（包含默认日志路径 `app.getPath('userData')/logs`）。
    - **加密**：对 `providers` 数组中的 `apiKey` 字段使用 Electron `safeStorage` 进行透明加解密。
    - **热重载**：提供 `onConfigChange` 事件订阅，供 Logger 和 AssetManager 监听。
- **验收**：应用启动不报错，且生成合法的初始配置文件。

#### 步骤 1.2：Logger 服务升级 (关键修正)
- **任务**：重构 `src/main/services/Logger.ts`。
- **逻辑**：
    - **路径获取**：从 ConfigManager 获取 `general.logging.savePath`。
    - **文件命名**：实现生成器 `generateLogFileName()`。
        - 格式：`YYYY-MM-DD_HH-mm-ss_{SessionID}.log` (例如 `2025-12-25_14-30-01_xc91a.log`)。
    - **写入流**：应用启动时基于上述文件名创建 WriteStream，所有 info/error 级别日志同时写入控制台和文件。
    - **动态切换**：监听 ConfigManager，若用户修改日志路径，自动关闭当前流并在新路径创建新文件。
- **参考**：Node.js `fs.createWriteStream`, `date-fns` (或原生 Intl) 格式化。
- **验收**：启动应用，在默认 logs 目录下找到对应命名格式的日志文件，内容包含启动信息。

#### 步骤 1.3：IPC 通信逻辑实现
- **任务**：在 `src/main/ipc/handlers/settings.ts` 中实现逻辑。
- **接口实现**：
    - `settings:get-all` -> 调用 `ConfigManager.getConfig()`。
    - `settings:save` -> 调用 `ConfigManager.saveConfig()` -> 触发服务更新。
    - `dialog:open-directory` -> 调用 Electron Dialog，返回路径字符串（用于日志路径或资源库路径选择）。

---

### 阶段二：前端逻辑绑定 (Frontend Logic Binding)
**目标**：将现有的 React 组件连接到后端数据，使其“活”起来。

#### 步骤 2.1：设置页状态管理 (Settings Context)
- **任务**：在 `src/renderer/pages/settings/` 下创建逻辑容器。
- **逻辑**：
    - 使用 `useEffect` 在组件挂载时调用 `ipcRenderer.invoke('settings:get-all')`。
    - 将获取到的 `IAppSettings` 注入到现有的 UI 组件 Props 中。
    - 实现 `handleSave` 函数：收集表单数据 -> 发送 `ipcRenderer.invoke('settings:save', data)` -> 弹出成功 Toast。

#### 步骤 2.2：全局设置逻辑绑定 (Global Tab)
- **任务**：激活“本地资源库”与“日志路径”的配置交互。
- **操作对象**：`src/renderer/pages/settings/tabs/GlobalSettings.tsx` (假设的文件名)。
- **逻辑**：
    - 绑定“资源库路径 - 浏览”按钮 -> 调用 `dialog:open-directory` -> 更新本地 State。
    - 绑定“日志存储路径 - 浏览”按钮 -> 调用 `dialog:open-directory` -> 更新本地 State。
    - 绑定“保存”按钮 -> 提交配置。
- **验收**：修改路径并保存，重启应用后，界面显示修改后的路径。

#### 步骤 2.3：多服务商逻辑绑定 (Provider Tabs)
- **任务**：激活 Ollama/OpenAI/SiliconFlow 的配置交互。
- **操作对象**：`src/renderer/pages/settings/tabs/ProviderSettings.tsx`。
- **逻辑**：
    - **数据回显**：根据 Config 中的 `providers` 数组渲染列表和表单初始值。
    - **开关逻辑**：绑定 Enabled Toggle 开关，控制服务商启用状态。
    - **模型列表**：将 Config 中的 `models` 数据传递给 `ModelListGrid` 组件渲染。

---

### 阶段三：API 与 资源连接性 (Connectivity & Assets)
**目标**：实现“测试连接”功能和资源库的后台响应。

#### 步骤 3.1：API 连通性测试引擎
- **任务**：升级 `APIManager` 支持连接测试。
- **逻辑**：
    - **前端**：在 Provider 设置页绑定“测试连接”按钮事件 -> 调用 `api:test-connection`。
    - **后端**：
        - 接收 `{ type, baseUrl, apiKey }`。
        - 针对 OpenAI/SiliconFlow：请求 `GET ${baseUrl}/models`。
        - 针对 Ollama：请求 `GET ${baseUrl}/api/tags`。
    - **反馈**：
        - 成功：返回模型列表，前端自动更新 State 中的 `models` 并保存。
        - 失败：返回具体错误信息（如 401 Unauthorized, Network Error）。

#### 步骤 3.2：AssetManager 路径监听
- **任务**：让资源管理器响应路径变更。
- **逻辑**：
    - 在 `AssetManager` 初始化时订阅 `ConfigManager` 的 change 事件。
    - 当检测到 `general.workspacePath` 变更：
        1. 记录日志：“资源库路径变更，开始重新扫描...”。
        2. 清空当前内存中的 Global Assets。
        3. 扫描新路径下的子目录（`faces`, `styles`, `workflows` 等）。
- **验收**：在设置页更改路径为测试文件夹，进入“素材”页面，应能看到测试文件夹内的文件。

#### 步骤 3.3：MCP 配置逻辑 (基础)
- **任务**：激活 MCP 设置页面的表单。
- **逻辑**：
    - 绑定现有的 MCP 表单组件。
    - 实现数据保存到 `config.mcpServers`。
    - (可选) 简单的 Ping 测试：检查 Command 是否可执行。

---

## 4. 验证与测试方案

### 4.1 自动化验证 (单元测试)
1.  **Logger 测试**：
    *   模拟应用启动，检查临时目录是否生成了符合 `YYYY-MM-DD_...` 格式的文件。
    *   写入一条 Log，验证文件内容是否存在。
2.  **Config 测试**：
    *   验证 `apiKey` 在存入磁盘前已被加密。

### 4.2 手动验收测试 (UAT)
1.  **日志路径验证**：
    *   进入设置 -> 全局。
    *   修改日志路径为 `D:/MatrixLogs/` (或类似)。
    *   保存并重启。
    *   检查 `D:/MatrixLogs/` 下是否生成了新的带有时间戳的 `.log` 文件。
2.  **API 连接验证**：
    *   进入设置 -> SiliconFlow。
    *   输入错误的 Key -> 点击测试 -> 提示错误。
    *   输入正确的 Key -> 点击测试 -> 提示成功 -> 模型列表出现 `DeepSeek-V3` 等模型。
3.  **资源库验证**：
    *   修改资源库路径。
    *   打开日志文件，搜索“重新扫描”，确认触发了 AssetManager 的重载逻辑。

---

## 所有UI已经完成设计，请结合情况使用复现
