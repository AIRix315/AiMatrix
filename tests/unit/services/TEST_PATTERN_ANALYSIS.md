# 测试模式分析：现有测试 vs 我的测试

**生成时间**: 2025-12-29
**目的**: 分析现有测试模式，指导修正我编写的5个测试文件

---

## 现有测试模式总结

### 测试策略分类

项目采用**两种测试策略**，基于服务特性决定：

| 服务类型 | 测试策略 | 示例 | 原因 |
|---------|---------|------|------|
| **纯逻辑服务** | 完全Mock | TimeService.test.ts | 不涉及文件系统，只测试算法和业务逻辑 |
| **文件系统服务** | 真实临时目录 | AssetManager.test.ts, SchemaRegistry.test.ts, asset-handlers.test.ts | 涉及持久化、文件读写、索引构建 |

---

## 现有测试详细模式

### 1. TimeService.test.ts（纯逻辑，完全Mock）

```typescript
// Mock所有外部依赖
jest.mock('../../../src/main/services/Logger', () => ({
  Logger: {
    getInstance: jest.fn(() => ({
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    }))
  }
}));

jest.mock('child_process', () => ({
  exec: jest.fn()
}));

// 直接实例化服务，无需文件系统
beforeEach(() => {
  timeServiceInstance = TimeServiceImpl.getInstance();
});

// 测试纯逻辑
it('应该返回当前时间', async () => {
  const result = await timeServiceInstance.getCurrentTime();
  expect(result).toBeInstanceOf(Date);
});
```

**特点**：
- ✅ 使用 `jest.mock()` Mock外部依赖
- ✅ 不创建临时目录
- ✅ 测试返回值和方法调用
- ✅ 适合纯逻辑功能

---

### 2. asset-handlers.test.ts（IPC Handlers，真实文件系统）

```typescript
beforeEach(async () => {
  // 创建唯一临时目录
  testDataDir = path.join(process.cwd(), 'test-data', `test-${Date.now()}`);
  await fs.mkdir(testDataDir, { recursive: true });

  // 初始化真实服务
  fsService = new FileSystemService();
  await fsService.initialize(testDataDir);

  assetManager = new AssetManagerClass(fsService);
  await assetManager.initialize();
});

afterEach(async () => {
  try {
    await assetManager.stopWatching();
    await fs.rm(testDataDir, { recursive: true, force: true });
  } catch (error) {
    // 忽略清理错误
  }
});

// 测试真实文件操作
it('应该导入资产并返回元数据', async () => {
  const sourcePath = path.join(testDataDir, 'import-test.jpg');
  await fs.writeFile(sourcePath, 'fake image');

  const result = await assetManager.importAsset({
    sourcePath,
    scope: 'global',
    category: 'image',
    tags: ['test']
  });

  expect(result.id).toBeDefined();
  expect(result.name).toBe('import-test.jpg');
});
```

**特点**：
- ✅ 使用真实文件系统
- ✅ 临时目录命名: `test-data/test-${Date.now()}`
- ✅ 在 beforeEach 中创建目录和初始化服务
- ✅ 在 afterEach 中清理（含错误处理）
- ✅ 测试文件实际操作（创建、读取、删除）
- ✅ 适合文件系统相关功能

---

### 3. SchemaRegistry.test.ts（Schema管理，真实文件系统）

```typescript
beforeEach(async () => {
  testDataDir = path.join(process.cwd(), 'test-data', `schema-test-${Date.now()}`);
  await fs.mkdir(testDataDir, { recursive: true });

  fsService = new FileSystemService();
  await fsService.initialize(testDataDir);

  registry = new SchemaRegistry(fsService);
  await registry.initialize(testDataDir);
});

afterEach(async () => {
  await registry.cleanup();
  try {
    await fs.rm(testDataDir, { recursive: true, force: true });
  } catch (error) {
    console.warn('清理测试目录失败:', error);
  }
});

// 测试持久化
it('应该持久化Schema到文件', async () => {
  await registry.registerSchema('test-plugin', { ... });

  const schemaFilePath = path.join(testDataDir, 'schema-registry.json');
  const exists = await fs.access(schemaFilePath).then(() => true).catch(() => false);
  expect(exists).toBe(true);

  const content = await fs.readFile(schemaFilePath, 'utf-8');
  const data = JSON.parse(content);
  expect(data.schemas).toHaveLength(1);
});
```

**特点**：
- ✅ 测试持久化功能（验证文件是否存在，内容是否正确）
- ✅ 在清理前调用 `service.cleanup()`
- ✅ 错误处理：清理失败只警告，不抛出

---

### 4. PluginManagerV2.test.ts（插件管理，部分文件系统）

```typescript
beforeEach(async () => {
  pluginManager = new PluginManagerV2(testPluginsDir, {
    enableSandbox: true,
    sandboxTimeout: 10000
  });

  await pluginManager.initialize();
});

afterEach(async () => {
  await pluginManager.cleanup();
});

// ⚠️ 关键发现：togglePlugin 方法存在！
it('should toggle plugin enabled state', async () => {
  await pluginManager.loadPlugin('test-plugin');

  // 禁用插件
  await pluginManager.togglePlugin('test-plugin', false);

  await expect(
    pluginManager.executePlugin('test-plugin', 'echo', { message: 'test' })
  ).rejects.toThrow('Plugin is disabled');

  // 重新启用
  await pluginManager.togglePlugin('test-plugin', true);

  const result = await pluginManager.executePlugin('test-plugin', 'echo', { message: 'test' });
  expect(result).toBeDefined();
});
```

**特点**：
- ✅ 读取预置的测试插件（`tests/fixtures`）
- ✅ 不创建临时目录（因为只读取，不写入）
- ✅ 在 cleanup() 中清理资源
- ⚠️ **证实了 `togglePlugin(id, enabled)` 方法存在！**

---

## 我的测试问题分析

### 问题1：测试策略不一致

| 我的测试 | 我的策略 | 应该策略 | 原因 |
|---------|---------|---------|------|
| ProjectManager.test.ts | ❌ 完全Mock | ✅ 真实文件系统 | ProjectManager需要保存配置到JSON文件 |
| AssetManager.test.ts | ❌ 完全Mock | ✅ 真实文件系统 | AssetManager需要索引、查询、文件监听 |
| PluginManager.test.ts | ❌ 完全Mock | ✅ 真实文件系统 | PluginManager需要加载插件ZIP文件 |
| TaskScheduler.test.ts | ❌ 完全Mock | ❓ 需决定 | TaskScheduler涉及持久化（如果实现了） |
| APIManager.test.ts | ❌ 完全Mock | ❓ 需决定 | APIManager需要保存配置到JSON文件（含加密） |

### 问题2：方法名错误（已在DESIGN_VS_IMPLEMENTATION.md中记录）

1. **PluginManager.test.ts**
   - ❌ `enablePlugin(id)` → ✅ `togglePlugin(id, true)`
   - ❌ `disablePlugin(id)` → ✅ `togglePlugin(id, false)`
   - **证据**: PluginManagerV2.test.ts:108-125

2. **TaskScheduler.test.ts**
   - ❌ `getExecutionStatus(id)` → ✅ `getTaskStatus(executionId)`
   - ❌ `listExecutions(taskId)` → ❌ 方法不存在

### 问题3：Mock配置问题

我的测试中：
```typescript
vi.mock('../../../src/main/services/Logger', () => ({
  logger: {
    info: vi.fn().mockResolvedValue(undefined),  // ❌ 应该返回Promise
    // ...
  }
}));
```

**问题**：`mockResolvedValue(undefined)` 应该改为 `vi.fn()`（自动返回undefined）或 `vi.fn().mockResolvedValue()`。

---

## 修正策略

### 阶段1：决定每个服务的测试策略 ✅ 完成

| 服务 | 文件操作 | 测试策略 | 证据 |
|-----|---------|---------|------|
| **ProjectManager** | ✅ 是 | 真实文件系统 | `fs.mkdir/readFile/writeFile/rm` - 项目配置持久化 |
| **AssetManager** | ✅ 是 | 真实文件系统 | 索引、查询、文件监听（已知） |
| **PluginManager** | ✅ 是 | 真实文件系统 | `fs.mkdir/readFile/rm` - 插件ZIP解压、manifest读取 |
| **TaskScheduler** | ❌ 否 | 完全Mock | 无文件操作，纯内存任务管理 |
| **APIManager** | ✅ 是 | 真实文件系统 | `fs.mkdir/readFile/writeFile` - Provider配置持久化 |

**结论**：
- ✅ **4个服务需要真实文件系统**：ProjectManager, AssetManager, PluginManager, APIManager
- ✅ **1个服务可以用Mock**：TaskScheduler（但需检查是否依赖其他服务）

### 阶段2：修正测试文件

**需要修正的内容**：

1. **测试策略**
   - 改为使用真实文件系统（如果服务涉及文件操作）
   - 创建临时目录模式：`path.join(process.cwd(), 'test-data', test-${Date.now()})`
   - 在 beforeEach 中初始化，afterEach 中清理

2. **方法名**
   - PluginManager: `enablePlugin/disablePlugin` → `togglePlugin(id, enabled)`
   - TaskScheduler: `getExecutionStatus` → `getTaskStatus`
   - 删除 `listExecutions` 相关测试

3. **Mock配置**
   - 修正 Logger Mock 的返回值

4. **测试框架**
   - 统一使用 Vitest（已使用）

---

## 下一步行动

1. ✅ 完成：阅读现有测试用例
2. ⏭️  检查5个服务的实际实现，判断是否涉及文件系统
3. ⏭️  决定每个服务的测试策略（Mock vs 真实文件系统）
4. ⏭️  修正测试用例：
   - 修正测试策略
   - 修正方法名
   - 修正Mock配置
5. ⏭️  运行测试，达到95%通过率

---

## 临时目录命名规范（项目标准）

```typescript
// 标准格式
testDataDir = path.join(process.cwd(), 'test-data', `test-${Date.now()}`);

// 或带描述前缀
testDataDir = path.join(process.cwd(), 'test-data', `schema-test-${Date.now()}`);
testDataDir = path.join(process.cwd(), 'test-data', `asset-test-${Date.now()}`);
```

## 清理模式（项目标准）

```typescript
afterEach(async () => {
  // 1. 先清理服务资源
  if (service && typeof service.cleanup === 'function') {
    await service.cleanup();
  }

  // 2. 再删除临时目录
  try {
    await fs.rm(testDataDir, { recursive: true, force: true });
  } catch (error) {
    // 忽略清理错误或只警告
    console.warn('清理测试目录失败:', error);
  }
});
```
