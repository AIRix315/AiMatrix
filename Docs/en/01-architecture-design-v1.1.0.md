# Architecture Design v1.1.0

## Version History

| Version | Date | Type | Changes |
|---------|------|------|---------|
| 1.1.0 | 2026-01-04 | Major | Clarified Workbench pattern, added URI scheme, removed redundant sections |
| 1.0.0 | 2025-12-22 | Initial | Created architecture design document |

**Time Handling Requirement**: All time operations must query system time via TimeService or MCP. See [00-global-requirements-v1.1.0.md](00-global-requirements-v1.1.0.md)

---

## System Overview

MATRIX Studio is an Electron-based AI video workflow management platform. It serves as middleware for unified workflow and asset management, without direct video rendering.

**Positioning**: Workflow orchestrator + Asset library manager

---

## Core Architecture

### Main Process Services (23 Total)

#### 1. Project Management
- **ProjectManager**: CRUD operations, lifecycle management

#### 2. Asset Management
- **AssetManager**: Global/Project scope asset management with `asset://` URI
- **GenericAssetHelper**: Asset query and metadata operations
- **FileSystemService**: Unified file system operations

#### 3. Workflow Orchestration (Workbench Pattern)
**Note**: "Workbench" is a logical composition of:
- **WorkflowRegistry**: Workflow definition registry
- **WorkflowStateManager**: Execution state tracking
- **TaskScheduler**: Task queue and scheduling
- **ProviderRouter**: Provider selection and request routing

**Workbench Coordination Flow**:
1. Pre-flight Check: Validate Provider capabilities
2. Context Injection: Inject file paths and output destinations
3. Request Routing: Forward standardized parameters to Provider
4. Atomic Transaction: File write → Index update

#### 4. Plugin System
- **PluginManager**: Plugin lifecycle management
- **PluginContext**: Context injection for plugins
- **PluginSandbox**: Security isolation (vm2)
- **PluginMarketService**: Plugin marketplace integration

#### 5. Provider Management
- **APIManager**: Unified API Provider interface (BYOK mode)
- **ProviderRegistry**: Provider registration and discovery
- **ProviderRouter**: Intelligent routing based on capabilities
- **ModelRegistry**: AI model registry and management

#### 6. Supporting Services
- **TimeService**: NTP sync, timestamp validation
- **Logger**: 4-level logging with rotation
- **ServiceErrorHandler**: 37 error codes
- **ConfigManager**: App configuration
- **SchemaRegistry**: JSON Schema validation
- **ShortcutManager**: Keyboard shortcuts

---

## Data Flow Design

### Asset URI Scheme

```
asset://global/{category}/{YYYYMMDD}/{filename}      // Global library
asset://project/{project_id}/{category}/{filename}   // Project assets
```

### Project Structure

```
/project-name/
├── materials/
│   ├── inputs/         # User uploads
│   └── outputs/        # AI generated
├── workflows/          # Workflow instances
├── config/
│   └── project.json    # Project metadata
└── logs/
```

### Global Library Structure

```
/library/
├── global/             # Cross-project assets
│   ├── image/
│   ├── video/
│   ├── audio/
│   └── text/
└── metadata/
    └── index.json      # Global asset index
```

---

## Technology Stack

- **Electron**: 39+
- **Node.js**: 20+
- **TypeScript**: 5+
- **React**: 18+
- **Webpack**: 5
- **Testing**: Vitest

---

## Security Design

### Plugin Security
- Sandbox execution (vm2)
- Fine-grained permissions (file-system, network, shell)
- Official plugin signature verification

### File Security
- Path traversal protection via `getSafePath()`
- File type validation
- `asset://` protocol restrictions

### API Security
- Encrypted key storage (system keychain)
- Per-provider authentication
- Request signing

---

## Performance Optimization

### Memory Management
- Lazy loading for plugins
- Asset index caching
- Streaming for large files

### File Operations
- Async I/O (fs/promises)
- Batch operations
- Progress feedback

---

**中文版本**: `docs/01-architecture-design-v1.1.0.md`
