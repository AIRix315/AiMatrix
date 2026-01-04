# Project Structure v1.1.0

## Version History

| Version | Date | Type | Changes |
|---------|------|------|---------|
| 1.1.0 | 2026-01-04 | Update | Clarified global library structure, removed redundant content |
| 1.0.1 | 2025-12-22 | Architecture | Added global asset library (library/) directory |
| 1.0.0 | 2025-12-22 | Initial | Created project structure document |

---

## Root Directory

```
matrix/
├── src/                    # Source code
├── docs/                   # Project documentation
├── tests/                  # Test files
├── build/                  # Build output
├── dist/                   # Package output
├── config/                 # Configuration files
├── library/                # Global asset library (cross-project reuse)
├── projects/               # User projects (private workspace)
└── plugins/                # Plugin directory
```

---

## Global Asset Library (`library/`)

**Purpose**: Cross-project asset reuse and monetization support.

```
library/
├── global/                 # Global assets by type
│   ├── image/
│   ├── video/
│   ├── audio/
│   └── text/
└── metadata/
    └── index.json          # Asset index with AI attributes
```

**URI Format**: `asset://global/{type}/{YYYYMMDD}/{filename}`

---

## Source Code Structure

### Main Process (`src/main/`)

```
src/main/
├── index.ts                # Main entry point
├── window.ts               # Window management
├── ipc/                    # IPC handlers (61 channels)
├── services/               # Core services (23 services)
│   ├── ProjectManager.ts
│   ├── AssetManager.ts
│   ├── PluginManager.ts
│   ├── WorkflowRegistry.ts
│   ├── TaskScheduler.ts
│   └── ...
├── models/                 # Data models
└── utils/                  # Utility functions
```

### Renderer Process (`src/renderer/`)

```
src/renderer/
├── pages/                  # Page components
│   ├── dashboard/
│   ├── assets/
│   ├── workflows/
│   └── settings/
├── components/             # UI components
│   ├── ui/                 # Base components (shadcn/ui)
│   ├── layout/             # Layout components
│   └── features/           # Feature components
└── contexts/               # React Context providers
```

### Shared Types (`src/shared/types/`)

```
src/shared/types/
├── asset.ts                # AssetMetadata, AssetFilter
├── workflow.ts             # WorkflowDefinition, WorkflowState
├── provider.ts             # Provider interfaces
├── api.ts                  # API types
└── electron-api.d.ts       # IPC type definitions
```

---

## User Project Structure

```
projects/
└── {project-name}/
    ├── materials/
    │   ├── inputs/         # User uploads
    │   └── outputs/        # AI generated
    ├── workflows/          # Workflow instances
    ├── config/
    │   └── project.json    # Project metadata
    └── logs/
```

**URI Format**: `asset://project/{project_id}/{category}/{filename}`

---

## Plugin Directory

```
plugins/
├── official/               # Official plugins (system-level permissions)
│   ├── novel-to-video/
│   └── ...
└── community/              # Community plugins (sandboxed)
    └── ...
```

**Plugin Manifest**: `manifest.json` in each plugin directory.

---

## File Naming Conventions

### TypeScript Files
- Components: PascalCase (`UserProfile.tsx`)
- Services: kebab-case (`asset-manager.ts`)
- Utilities: kebab-case (`path-utils.ts`)

### CSS Files
- Global: kebab-case (`global.css`)
- Components: kebab-case (`user-profile.css`)

---

## Module Import Standards

### Path Aliases (tsconfig.json)

```typescript
import { AssetManager } from '@/main/services/AssetManager'
import { Button } from '@/renderer/components/ui/button'
import { AssetMetadata } from '@/shared/types/asset'
```

**Aliases**:
- `@/*` → `src/*`
- `@/main/*` → `src/main/*`
- `@/renderer/*` → `src/renderer/*`
- `@/shared/*` → `src/shared/*`

---

**中文版本**: `docs/05-project-structure-v1.1.0.md`
