# Global Mandatory Requirements v1.1.0

## Version History

| Version | Date | Type | Changes |
|---------|------|------|---------|
| 1.1.0 | 2026-01-04 | Major Update | Updated tech stack, added URI scheme clarification, removed redundant content |
| 1.0.0 | 2025-12-22 | Initial | Created global requirements document with time handling standards |

---

## 1. Time Handling Standards ⚠️ CRITICAL

**MANDATORY**: All time-related writes/records MUST query system time via TimeService or MCP before writing.

### Implementation Requirements

1. **Time Query Mechanism**
   - Use TimeService.getCurrentTime()
   - Or query via MCP time service
   - NO hardcoded timestamps
   - NO unverified client-side time

2. **Time Format Standard**
   - ISO 8601: `YYYY-MM-DDTHH:mm:ss.sssZ`
   - Logs: UTC time
   - UI: Convert to local timezone

3. **Time Sync Requirements**
   - Sync on app startup
   - Calibrate every 5 minutes
   - Use NTP when network available

4. **Applicable Scenarios**
   - File creation/modification timestamps
   - Log entries
   - Database records
   - API request/response times
   - User action timestamps
   - Workflow execution nodes

### Code Example

```typescript
// ✅ Correct - Use TimeService
const currentTime = await timeService.getCurrentTime();
const timestamp = currentTime.getTime();

// ❌ Wrong - Direct Date.now()
const timestamp = Date.now(); // FORBIDDEN
```

---

## 2. Asset URI Scheme

**Note**: Current implementation uses `asset://` protocol (equivalent to `matrix://` in design docs).

### URI Format

```
asset://global/{category}/{YYYYMMDD}/{filename}      // Global assets
asset://project/{project_id}/{category}/{filename}   // Project assets
file://{absolute_path}                               // External (to be converted)
```

### Path Virtualization

- All asset references use `asset://` URIs
- FileSystemService handles URI ↔ physical path conversion
- Ensures project portability

---

## 3. Code Quality Standards

- All code must pass static analysis
- Unit test coverage ≥80%
- Comprehensive error handling required
- NO unnecessary comments beyond functionality

---

## 4. Security Requirements

- Validate and sanitize all user inputs
- Encrypt API keys and sensitive data
- Strict file access permissions

---

## 5. Performance Requirements

- App startup time ≤5s
- Memory usage ≤1GB
- File operations response time ≤2s

---

## 6. Technology Stack (Current)

- **Electron**: 39+
- **Node.js**: 20+
- **TypeScript**: 5+
- **React**: 18+
- **Testing**: Vitest (NOT Jest)
- **State Management**: React Context/Hooks (NO Redux)

---

## Compliance Checklist

- [ ] Time handling complies with mandatory requirements
- [ ] Code quality meets standards
- [ ] Security measures implemented
- [ ] Performance metrics satisfied
- [ ] Documentation updated

---

**中文版本**: `docs/00-global-requirements-v1.1.0.md`
