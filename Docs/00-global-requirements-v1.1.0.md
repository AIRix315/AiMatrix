# 全局强制性要求 v1.1.0

## 版本记录

| 版本 | 日期 | 变更类型 | 变更内容 |
|------|------|----------|----------|
| 1.1.0 | 2026-01-04 | 重大更新 | 更新技术栈版本，补充URI方案说明，精简冗余内容 |
| 1.0.0 | 2025-12-22 | 初始版本 | 创建全局强制性要求文档，确立时间处理规范 |

---

## 1. 时间处理规范 ⚠️ 最高优先级

**强制要求**：任何涉及时间的文字写入、记录，必须先通过TimeService或MCP服务查询系统时间后方可写入。

### 实施细则

1. **时间查询机制**
   - 使用 TimeService.getCurrentTime()
   - 或通过MCP服务获取准确时间
   - 禁止使用硬编码时间值
   - 禁止使用未验证的客户端本地时间

2. **时间格式标准**
   - 统一使用ISO 8601格式：`YYYY-MM-DDTHH:mm:ss.sssZ`
   - 日志记录使用UTC时间
   - 用户界面显示可转换为本地时区

3. **时间同步要求**
   - 应用启动时必须同步系统时间
   - 定期校准时间偏差（每5分钟）
   - 网络连接时优先使用NTP服务

4. **适用场景**
   - 文件创建和修改时间
   - 日志记录时间戳
   - 数据库记录时间字段
   - API请求和响应时间
   - 用户操作时间记录
   - 工作流执行时间节点

### 代码示例

```typescript
// ✅ 正确 - 使用TimeService
const currentTime = await timeService.getCurrentTime();
const timestamp = currentTime.getTime();

// ❌ 错误 - 禁止直接使用Date.now()
const timestamp = Date.now(); // 禁止
```

---

## 2. 资产URI方案

**说明**：当前实现使用 `asset://` 协议（等同于设计文档中的 `matrix://`）

### URI格式

```
asset://global/{category}/{YYYYMMDD}/{filename}      // 全局资产
asset://project/{project_id}/{category}/{filename}   // 项目资产
file://{absolute_path}                               // 外部文件（导入时转换）
```

### 路径虚拟化

- 所有资产引用使用 `asset://` URI
- FileSystemService 负责 URI ↔ 物理路径转换
- 确保项目可移植性

---

## 3. 代码质量要求

- 所有代码必须通过静态分析
- 单元测试覆盖率不低于80%
- 必须包含错误处理机制
- 不添加功能说明外的任何无关注释

---

## 4. 安全要求

- 所有用户输入必须验证和清理
- API密钥和敏感信息必须加密存储
- 文件访问权限严格控制

---

## 5. 性能要求

- 应用启动时间不超过5秒
- 内存使用不超过1GB
- 文件操作响应时间不超过2秒

---

## 6. 技术栈（当前实际）

- **Electron**: 39+
- **Node.js**: 20+
- **TypeScript**: 5+
- **React**: 18+
- **测试框架**: Vitest（非Jest）
- **状态管理**: React Context/Hooks（无Redux）

---

## 合规检查清单

- [ ] 时间处理符合强制要求
- [ ] 代码质量达标
- [ ] 安全措施到位
- [ ] 性能指标满足要求
- [ ] 文档更新完整

---

**English Version**: `docs/en/00-global-requirements-v1.1.0.md`
