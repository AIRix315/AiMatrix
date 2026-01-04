This is the **Technical Specification Document** for **Matrix Studio**, optimized for AI coding assistants (like Claude Code). It uses precise engineering terminology to ensure maximum code accuracy and architectural integrity.

---

# Technical Specification: Matrix Studio Architecture

## 1. Core Philosophy & Data Model
*   **Paradigm:** File-as-Data (Decentralized).
*   **Storage Strategy:** No central database. The filesystem is the "Single Source of Truth." Logic is maintained via local JSON indices.
*   **Portability:** Moving a project folder must preserve all its internal logic and asset references.

### 1.1 Matrix URI Scheme (Internal Path Protocol)
To ensure location independence, all modules must communicate using a virtual URI scheme:
*   **Global Assets:** `matrix://global/inputs/{YYYYMMDD}/{filename}`
*   **Project Assets:** `matrix://project/{project_id}/outputs/{filename}`
*   **External Assets:** `file://{absolute_path}` (To be converted to `matrix://` upon ingestion).

---

## 2. Module Definitions

### A1: Project Manager (`ProjectManager`)
**Definition:** Governs the lifecycle of individual project containers.
*   **Responsibilities:**
    *   **Scaffolding:** Initialize standard directories (`/inputs`, `/outputs`, `/workflows`).
    *   **Index Maintenance:** Manage `project.json` (The "ledger").
    *   **Path Virtualization:** Convert physical paths to relative paths within the project scope.
*   **Data Schema (`project.json`):**
    ```json
    {
      "project_id": "uuid",
      "metadata": { "name": "string", "created_at": "timestamp" },
      "assets": {
        "inputs": [], 
        "outputs": [{ "id": "id", "path": "outputs/vid.mp4", "tags": [] }]
      },
      "dependencies": { "global_assets": ["global_uuid_1"] }
    }
    ```

### A2: Global Asset Library (`AssetLibrary`)
**Definition:** A cross-project indexing service for discovery and ingestion.
*   **Responsibilities:**
    *   **Global Ingestion:** Copy external files to `Global_Inputs` and assign `matrix://global` URIs.
    *   **Recursive Scanning:** Scan all `project.json` files in the workspace to build a volatile in-memory search tree.
    *   **Sidecar Management:** Handle `.meta.json` files (Sidecars) that store generation parameters (prompts, seeds) adjacent to media files.

### A3: Plugin System (`PluginSystem`)
**Definition:** An abstraction layer for AI workflows.
*   **Responsibilities:**
    *   **Capability Contracting:** Plugins must declare **requirements**, not specific providers.
        *   *Example:* `Needs: { "text-gen": "high-reasoning", "img-gen": "xl-resolution" }`.
    *   **UI Mapping:** Expose high-level parameters to users, hiding complex node-graph logic.
    *   **State Isolation:** Plugins cannot modify global settings; they only receive a "Task Context."

### A4: Execution Workbench (`Workbench`)
**Definition:** The orchestrator that bridges Plugins (A3) and Providers (A5).
*   **The Execution Pipeline:**
    1.  **Pre-flight Check:** Validate if active Providers (A5) satisfy Plugin Requirements (A3).
    2.  **Context Injection:** Provide the plugin with resolved file paths and output destinations.
    3.  **Request Routing:** Forward standardized parameters to the specific Provider Adapter.
    4.  **Atomic Transaction:** Ensure the media file is written to disk *before* updating the project index.
*   **Error Handling:** Implement a "Cleanup on Failure" policy to prevent orphan files.

### A5: Provider Registry (`ProviderHub`)
**Definition:** The hardware/service abstraction layer.
*   **Responsibilities:**
    *   **Adapter Pattern Implementation:** Map standardized requests to specific APIs (e.g., ComfyUI API, OpenAI SDK, Ollama).
    *   **Connectivity Monitoring:** Heartbeat checks for local/remote services.
    *   **Secret Management:** Secure storage of API Keys and Base URLs.

---

## 3. System Workflows (Standard Operating Procedures)

### Workflow I: Asset Ingestion
1.  User drops file -> **A2** copies file to `Global_Inputs`.
2.  **A2** generates unique `asset_id`.
3.  **A2** broadcasts `ASSET_ADDED` event.
4.  UI updates to show the asset in the Global Library.

### Workflow II: Plugin Execution (The "Contract" Flow)
1.  User selects Plugin ($P$) in Project ($X$).
2.  **A4** verifies: Does **A5** have active providers for all requirements in $P$?
3.  If yes, **A4** creates a `TaskRunner`.
4.  **A4** resolves `matrix://` paths to local OS paths for the Provider.
5.  Provider returns data -> **A4** saves to `X/outputs/`.
6.  **A4** triggers **A1.UpdateIndex()** to log the new asset.

---

## 4. Coordination & Constraints (For AI Coding)

*   **Concurrency:** Use a **Write-Ahead-Lock (WAL)** or a Sequential Queue for `project.json` updates to prevent race conditions during batch generation.
*   **Decoupling Rule:** `PluginSystem` MUST NOT import `ProviderHub`. All communication must be brokered by `Workbench`.
*   **Path Safety:** Never store absolute paths. All logic must use the `Matrix URI Scheme` or paths relative to the `Workspace_Root`.
*   **State Persistence:** In-memory indices (A2) must be rebuildable at any time by scanning the physical folder structure.
*   **Idempotency:** Re-running the same task should not create duplicate entries in the index if the output file hasn't changed.

---

## 5. Implementation Priorities for Claude Code
1.  **Phase 1:** Implement `PathResolver` utility (Matrix URI <-> OS Path).
2.  **Phase 2:** Implement `ProjectManager` (A1) and `ProviderHub` (A5) basic CRUD.
3.  **Phase 3:** Implement the `Workbench` (A4) "Pre-flight Check" logic.
4.  **Phase 4:** Build the `AssetLibrary` (A2) scanning mechanism.