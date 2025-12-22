# 全局强制性要求 v1.0.0

## 版本记录

| 版本 | 日期 | 变更类型 | 变更内容 |
|------|------|----------|----------|
| 1.0.0 | 2025-12-22 | 初始版本 | 创建全局强制性要求文档，确立时间处理规范 |

## 全局强制性要求

### 时间处理规范

**强制要求：任何涉及时间的文字写入、记录，必须先查询系统时间，使用函数查询或者MCP服务查询确认后，方可写入！！！**

#### 实施细则

1. **时间查询机制**
   - 必须使用系统时间查询函数
   - 或通过MCP服务获取准确时间
   - 禁止使用硬编码时间值
   - 禁止使用客户端本地时间未经验证

2. **时间格式标准**
   - 统一使用ISO 8601格式：YYYY-MM-DDTHH:mm:ss.sssZ
   - 日志记录使用UTC时间
   - 用户界面显示可转换为本地时区

3. **时间同步要求**
   - 应用启动时必须同步系统时间
   - 定期校准时间偏差（建议每5分钟）
   - 网络连接时优先使用NTP服务

4. **时间记录场景**
   - 文件创建和修改时间
   - 日志记录时间戳
   - 数据库记录时间字段
   - API请求和响应时间
   - 用户操作时间记录
   - 工作流执行时间节点

#### 技术实现

```typescript
// 时间查询服务接口
interface TimeService {
  getCurrentTime(): Promise<Date>
  getUTCTime(): Promise<string>
  getLocalTime(): Promise<string>
  syncWithNTP(): Promise<boolean>
}

// 强制时间查询装饰器
function requireValidTime(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
  const originalMethod = descriptor.value;
  descriptor.value = async function (...args: any[]) {
    const currentTime = await this.timeService.getCurrentTime();
    // 验证时间有效性
    if (!isValidTime(currentTime)) {
      throw new Error('Invalid time source');
    }
    return originalMethod.apply(this, args);
  };
}
```

#### 违规处理

- 代码审查必须检查时间处理合规性
- 自动化测试验证时间查询机制
- 运行时监控时间记录准确性
- 违规记录将影响代码质量评估

#### 监控机制

```typescript
// 时间监控服务
class TimeMonitor {
  private static instance: TimeMonitor;
  
  static getInstance(): TimeMonitor {
    if (!TimeMonitor.instance) {
      TimeMonitor.instance = new TimeMonitor();
    }
    return TimeMonitor.instance;
  }
  
  async validateTimeOperation(operation: string): Promise<boolean> {
    const startTime = await this.getTimeService().getCurrentTime();
    // 执行操作
    const endTime = await this.getTimeService().getCurrentTime();
    
    // 记录时间操作
    this.logTimeOperation(operation, startTime, endTime);
    return true;
  }
  
  private logTimeOperation(operation: string, start: Date, end: Date): void {
    // 记录到监控系统
  }
}
```

## 其他全局要求

### 代码质量
- 所有代码必须通过静态分析
- 单元测试覆盖率不低于80%
- 必须包含错误处理机制

### 安全要求
- 所有用户输入必须验证和清理
- API密钥和敏感信息必须加密存储
- 文件访问权限严格控制

### 性能要求
- 应用启动时间不超过5秒
- 内存使用不超过1GB
- 文件操作响应时间不超过2秒

## 合规检查清单

- [ ] 时间处理符合强制要求
- [ ] 代码质量达标
- [ ] 安全措施到位
- [ ] 性能指标满足要求
- [ ] 文档更新完整