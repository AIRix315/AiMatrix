# System Workflows v1.1.0

## Version History

| Version | Date | Type | Changes |
|---------|------|------|---------|
| 1.1.0 | 2026-01-04 | Initial | System-level operation workflows based on 99-spec |

**Time Handling**: See [00-global-requirements-v1.1.0.md](00-global-requirements-v1.1.0.md)

---

## Overview

System Workflows define standard operating procedures (SOPs) for core operations. These are **data flows** and **module coordination patterns**, NOT step-based execution templates.

---

## Workflow I: Asset Ingestion

**Purpose**: Import external files into Global Library with `asset://` URI assignment.

### Flow

```
1. User drops file → FileSystemService.copyToGlobalLibrary()
2. Generate unique asset_id (UUID)
3. AssetManager.addAsset(scope: 'global', ...)
4. Write metadata to index.json
5. Broadcast IPC event: 'event:asset:added'
6. UI updates Global Library view
```

### Implementation

**Services**: AssetManager + FileSystemService

**IPC Channels**:
- `asset:upload` (renderer → main)
- `event:asset:added` (main → renderer)

**Data Flow**:
```
External File (file://)
  ↓ [Copy]
Global Library (asset://global/{type}/{YYYYMMDD}/{filename})
  ↓ [Index]
index.json (AssetMetadata)
  ↓ [Event]
UI Update
```

---

## Workflow II: Plugin Execution ("Contract" Flow)

**Purpose**: Execute plugin with Provider capability validation and atomic transaction.

### Flow (Workbench Pattern)

```
1. User selects Plugin (P) in Project (X)
2. [Pre-flight Check] ProviderRouter validates:
   - Does ProviderRegistry have active providers for P.requirements?
3. If yes, TaskScheduler creates TaskRunner
4. [Context Injection] PluginContext provides:
   - Resolved asset:// → OS paths
   - Output destination: {project}/outputs/
5. [Request Routing] ProviderRouter forwards to specific Provider
6. Provider returns data → FileSystemService writes to disk
7. [Atomic Transaction] ONLY after file write success:
   - AssetManager.addAsset(scope: 'project', ...)
   - ProjectManager.updateIndex()
8. Broadcast IPC event: 'event:workflow:completed'
```

### Coordination Services (Workbench)

- **ProviderRouter**: Pre-flight check + request routing
- **TaskScheduler**: Task queue management
- **PluginContext**: Context injection
- **AssetManager**: Atomic transaction coordination

### Error Handling

**Cleanup on Failure**:
```typescript
try {
  const filePath = await provider.execute(params);
  await assetManager.addAsset({ filePath, ... }); // Only if file exists
} catch (error) {
  await fileSystemService.deleteFile(filePath); // Cleanup orphan file
  throw error;
}
```

---

## Workflow III: Project Lifecycle

**Purpose**: Create, load, save, and delete projects with asset reference integrity.

### Flow: Create Project

```
1. ProjectManager.createProject(name)
2. FileSystemService creates directories:
   - {workspace}/projects/{project-id}/
   - {workspace}/projects/{project-id}/materials/inputs/
   - {workspace}/projects/{project-id}/materials/outputs/
   - {workspace}/projects/{project-id}/workflows/
3. Write project.json with metadata
4. Return ProjectConfig
```

### Flow: Load Project

```
1. ProjectManager.loadProject(projectId)
2. Read project.json
3. Validate asset references (asset:// URIs)
4. Load workflow states from {project}/workflows/
5. Return ProjectConfig + WorkflowState[]
```

### Flow: Delete Project

```
1. ProjectManager.deleteProject(projectId)
2. Check for global asset dependencies
3. Delete project directory recursively
4. Update recent projects list
```

---

## Workflow IV: Asset Promotion

**Purpose**: Promote project-scoped asset to global library for cross-project reuse.

### Flow

```
1. User selects project asset → "Promote to Global"
2. AssetManager.promoteAssetToGlobal(projectId, assetId)
3. FileSystemService copies file:
   {project}/outputs/file.png → {library}/global/image/{date}/file.png
4. AssetManager creates global AssetMetadata (new UUID)
5. Update project.json: Add global asset reference
6. Broadcast event: 'event:asset:promoted'
```

**URI Transformation**:
```
asset://project/{project-id}/outputs/file.png
  ↓ [Promote]
asset://global/image/20260104/file.png
```

---

## Coordination Rules

### Concurrency Control

**Write-Ahead-Lock (WAL)** for `project.json` updates:
```typescript
// Sequential queue to prevent race conditions
const updateQueue = new AsyncQueue();
await updateQueue.enqueue(() => projectManager.saveProject(config));
```

### Decoupling Rule

**PluginSystem MUST NOT import ProviderHub**. All communication brokered by Workbench (ProviderRouter + TaskScheduler).

### Path Safety

**Never store absolute paths**. Use:
- `asset://` URIs (preferred)
- Relative paths from workspace root

### Idempotency

Re-running same task should NOT create duplicate index entries if output file unchanged:
```typescript
// Check file hash before adding to index
const existingAsset = await assetManager.findByHash(fileHash);
if (existingAsset) return existingAsset;
```

---

## Reference Implementation

- **Asset Ingestion**: `src/main/services/AssetManager.ts:addAsset()`
- **Plugin Execution**: `src/main/services/ProviderRouter.ts:route()`
- **Project Lifecycle**: `src/main/services/ProjectManager.ts`

---

**中文版本**: `docs/03-system-workflows-v1.1.0.md`
