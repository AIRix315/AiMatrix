# M06: 术语规范化指南 - Workflow → Flow

**创建时间**: 2026-01-04
**Phase 12 任务**: M06
**参考**: `docs/Plan/Matrix Studio 差异审计报告 2026-01-04 V0.3.9.4.md` Section 1

---

## 1. 问题描述

当前代码中"Workflow"一词存在歧义,有两个不同的含义:

1. **工作流模板**(Workflow Type): 定义了节点类型、参数Schema的蓝图
2. **工作流实例**(Workflow Instance): 实际执行的流程,包含具体参数和执行状态

这种歧义导致:
- 代码阅读困难
- 变量命名混淆
- 新开发者容易理解错误

---

## 2. 术语规范化方案

### 2.1 新术语定义

| 旧术语 | 新术语 | 含义 |
|--------|--------|------|
| Workflow Type | Workflow | 工作流模板(保留) |
| Workflow Instance | Flow Instance | 工作流实例(重命名) |
| currentWorkflowInstanceId | currentFlowInstanceId | 当前执行的Flow实例ID |

### 2.2 核心原则

- **Workflow**: 仅指工作流模板,定义节点类型和Schema
- **Flow**: 指实际执行的流程实例,包含参数和状态
- **WorkflowType**: 工作流类型,如`novel-to-video`、`custom`等

---

## 3. 重命名清单

### 3.1 类型定义

**文件**: `src/common/types.ts`

```typescript
// 旧定义
interface WorkflowInstance {
  id: string;
  workflowType: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  ...
}

// 新定义
interface FlowInstance {
  id: string;
  workflowType: string;  // 关联的工作流模板类型
  status: 'pending' | 'running' | 'completed' | 'failed';
  ...
}
```

**修改**:
- `WorkflowInstance` → `FlowInstance`
- `WorkflowStatus` → `FlowStatus`
- `WorkflowExecutionContext` → `FlowExecutionContext`

### 3.2 服务层

**文件**: `src/main/services/`

- `WorkflowStateManager.ts` → `FlowStateManager.ts`
  - `class WorkflowStateManager` → `class FlowStateManager`
  - 方法: `createWorkflowInstance` → `createFlowInstance`
  - 方法: `updateWorkflowStatus` → `updateFlowStatus`
  - 方法: `getWorkflowInstance` → `getFlowInstance`

### 3.3 UI组件

**文件**: `src/renderer/`

- `components/WorkflowExecutor/` → `components/FlowExecutor/`
- `pages/workflows/WorkflowExecutor.tsx` → `pages/workflows/FlowExecutor.tsx`

**组件内部**:
```typescript
// 旧代码
const [workflowInstance, setWorkflowInstance] = useState<WorkflowInstance | null>(null);

// 新代码
const [flowInstance, setFlowInstance] = useState<FlowInstance | null>(null);
```

### 3.4 IPC通道

**文件**: `src/main/ipc/channels.ts`

```typescript
// 旧定义
export const IPC_CHANNELS = {
  WORKFLOW_EXECUTE: 'workflow:execute',
  WORKFLOW_STATUS: 'workflow:status',
  ...
};

// 新定义
export const IPC_CHANNELS = {
  FLOW_EXECUTE: 'flow:execute',
  FLOW_STATUS: 'flow:status',
  WORKFLOW_LIST: 'workflow:list',  // 保留,因为是模板列表
  ...
};
```

### 3.5 ProjectConfig字段

**文件**: `src/common/types.ts`

```typescript
export interface ProjectConfig {
  // 旧字段
  currentWorkflowInstanceId?: string;

  // 新字段
  currentFlowInstanceId?: string;

  // 保留(因为指向模板)
  workflowType?: string;
}
```

### 3.6 数据库/文件命名

**目录结构**:
```
userData/
├── workflows/          # 工作流模板定义(保留)
│   ├── novel-to-video.json
│   └── custom-123.json
├── flows/              # Flow实例数据(新建)
│   ├── flow_abc123.json
│   └── flow_def456.json
└── projects/
    └── project-id/
        └── project.json
```

---

## 4. 重构步骤

### 阶段1: 类型定义重构(1天)

1. 在`src/common/types.ts`中创建新类型
   ```typescript
   // 新增
   export interface FlowInstance { ... }
   export type FlowStatus = 'pending' | 'running' | 'completed' | 'failed';

   // 保留(别名,向后兼容)
   export type WorkflowInstance = FlowInstance;  // @deprecated
   ```

2. 更新ProjectConfig字段
   ```typescript
   currentFlowInstanceId?: string;  // 新增
   currentWorkflowInstanceId?: string;  // @deprecated,保留以兼容
   ```

### 阶段2: 服务层重构(2天)

1. 重命名`WorkflowStateManager` → `FlowStateManager`
   - 使用IDE的"Rename Symbol"功能
   - 更新所有导入引用

2. 创建兼容层(可选)
   ```typescript
   // WorkflowStateManager.ts (保留文件,作为兼容层)
   export class WorkflowStateManager extends FlowStateManager {
     // @deprecated - Use FlowStateManager instead
   }
   ```

### 阶段3: UI层重构(2天)

1. 重命名组件目录和文件
2. 更新所有组件内部变量名
3. 更新IPC调用

### 阶段4: IPC通道重构(1天)

1. 添加新通道定义
2. 注册新通道处理器
3. 保留旧通道(标记为deprecated)

### 阶段5: 数据迁移(1天)

1. 创建迁移脚本
   - 读取旧的`currentWorkflowInstanceId`
   - 写入新的`currentFlowInstanceId`
   - 移动`workflows/instances/`到`flows/`

2. 在应用启动时执行迁移(一次性)

---

## 5. 兼容性策略

### 5.1 向后兼容期(1个月)

- 保留旧API和类型定义,标记为`@deprecated`
- 新旧字段同时支持,新优先
- IPC通道同时监听新旧命名

### 5.2 过渡期结束

- 移除所有`@deprecated`标记的代码
- 清理兼容层
- 更新文档

---

## 6. 测试清单

### 6.1 单元测试

- [ ] FlowStateManager所有方法
- [ ] ProjectConfig字段读写
- [ ] 类型定义完整性

### 6.2 集成测试

- [ ] Flow创建和执行
- [ ] IPC通道新旧兼容性
- [ ] 数据迁移正确性

### 6.3 E2E测试

- [ ] 工作流执行完整流程
- [ ] UI显示正确
- [ ] 历史数据兼容

---

## 7. 文档更新

需要更新的文档:
- [ ] `docs/00-global-requirements-v1.1.0.md`
- [ ] `docs/01-architecture-design-v1.1.0.md`
- [ ] `docs/02-technical-blueprint-v1.1.0.md`
- [ ] `docs/07-plugin-development-guide-v1.1.0.md`
- [ ] `README.md`
- [ ] API文档

---

## 8. 风险评估

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 大量文件修改 | 高 | 使用IDE重构工具,分阶段进行 |
| 破坏现有功能 | 高 | 保持向后兼容,充分测试 |
| 数据迁移失败 | 中 | 备份数据,可回滚 |
| 文档不同步 | 低 | 同步更新所有文档 |

---

## 9. 执行建议

⚠️ **重要提醒**:

1. **提交当前工作**: 先提交M01-M05的所有变更
2. **创建新分支**: `git checkout -b terminology-normalization`
3. **逐步进行**: 按阶段1-5顺序执行,每阶段提交一次
4. **充分测试**: 每阶段完成后运行完整测试套件
5. **代码审查**: 合并前进行完整代码审查

**预计时间**: 7-10个工作日
**建议时机**: 版本v0.4.0发布前完成

---

## 10. 完成标准

- [x] M01-M05任务已完成并提交
- [ ] 术语规范化指南已创建(本文档)
- [ ] 所有类型定义已重命名
- [ ] 所有服务层代码已重构
- [ ] 所有UI组件已更新
- [ ] IPC通道已重构
- [ ] 数据迁移脚本已实现
- [ ] 所有测试通过
- [ ] 文档已更新
- [ ] 代码审查通过

---

**备注**: 此文档作为M06任务的指导文件,实际重构工作建议在M01-M05完成并稳定后,作为独立的重构项目进行。
