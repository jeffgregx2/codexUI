# Project registry and management design

Status: agreed architecture and phased scope; registry and management implementation pending.

This document specifies a server-owned project registry for CodexUI. It captures the agreed behavior, ownership rules, discovery requirements, implementation phases, and acceptance gates. It does not claim that the registry, project moves, or restoration controls already exist.

## 1. Problem and intended result

Current project grouping depends heavily on working-directory paths and saved workspace roots. A directory move can leave old paths in conversation metadata. Duplicate directory names, symbolic links, archived conversations, and different browsers viewing the same data complicate this further.

Give every registered project a persistent `project.id`. Associate each discovered conversation's `thread.id` with that project. Treat display names and filesystem locations as attributes rather than identifiers. Preserve memberships across moves, while retaining default Codex discovery so unindexed history can still be found.

The result must preserve conversation history and provide a recoverable path from today's sidebar to database-driven project management. Codex continues to own conversation content; CodexUI owns its organizational registry.

## 2. Terminology and invariants

| Term | Meaning |
| --- | --- |
| `thread.id` | Codex's opaque identifier for one conversation. Stable when that conversation is resumed, archived, renamed, or continued in a different directory. Forks and imports that create new conversations have new IDs. |
| `project.id` | UUID assigned by CodexUI when a project is registered or adopted during bootstrap. Never derived from its name or path. |
| Data source | A configured Codex data home on a particular server/host. Conversation keys are scoped to this source. |
| Working directory (`cwd`) | Directory in which Codex operates for a conversation or turn. Distinct from organizational membership. |
| Starting location | Saved directory used to begin browsing, such as `/srv/Projects` or `/srv/Tools`. It is not automatically a project. |
| Saved workspace root | Existing CodexUI/Codex state terminology for a saved project folder. Adopt these as initial registered projects where appropriate; do not confuse them with starting locations. |
| Projectless | A conversation deliberately having no registered project. It can still have a real working directory. |
| Unresolved | A discovered conversation for which a reliable project association is not yet known. |

Invariants:

1. Use lower-case `thread.id` and `project.id` consistently in user-facing specifications. Storage names may use snake_case.
2. A conversation's registry key is `(source_id, thread_id)`. `sessionId` is not a substitute: forks can share a session-tree identity.
3. A conversation has at most one current `project.id`, or NULL. Association classification distinguishes deliberately projectless from unresolved.
4. Names need not be unique. Moving or renaming a project does not generate a new `project.id` or new conversation IDs.
5. A conversation absent from a scan is not automatically deleted, archived, or hidden.
6. A starting location does not claim all descendant conversations as one project.
7. Historical path evidence must not capture new conversations belonging to a different project that later occupies the old directory.
8. No registry operation silently rewrites historical message text or directly patches Codex's internal databases.

## 3. Current implementation and evidence

Relevant existing integration points:

- [App.vue](../src/App.vue): sidebar composition, header controls, browser preferences, and project-folder actions.
- [useDesktopState.ts](../src/composables/useDesktopState.ts): thread state, workspace-root filtering, grouping, archiving, and event-driven refresh.
- [codexGateway.ts](../src/api/codexGateway.ts): `thread/list`, read/resume operations, account usage, and browser API normalization.
- [codexAppServerBridge.ts](../src/server/codexAppServerBridge.ts): shared app-server process, workspace-root persistence, path canonicalization, and project import/export.
- [SidebarThreadTree.vue](../src/components/sidebar/SidebarThreadTree.vue): project names, tooltips, and conversation menus.
- [httpServer.ts](../src/server/httpServer.ts): browser notification subscriptions and shared server access.

The current sidebar's "Delete thread" action routes to `thread/archive`. Renaming this action to Archive must include its confirmation text and buttons, preserving existing automation cleanup behavior. Codex itself also supports permanent deletion, but this design does not add that destructive UI action.

The bridge already resolves existing workspace and thread-list paths using `realpath`. On resolution failure it preserves the input path. The registry must retain observed spellings and previous canonical paths as well: an old path cannot be resolved after it disappears.

### Isolated investigation: Codex CLI 0.163.0

A disposable legacy JSONL conversation was created in a separate `CODEX_HOME`, with a historical user message and assistant reply. Its project directory was moved to a nested location without leaving a compatibility symlink. The actual interactive CLI was run with `codex resume --all --cd <destination>`, and the existing conversation was selected.

Observed results:

| Check | Result |
| --- | --- |
| Historical user and assistant messages | Present in the resumed CLI conversation |
| Conversation ID and transcript location | Unchanged |
| SQLite metadata and subsequent resume without `cwd` override | New working directory |
| Default `thread/list` | Original working directory |
| `thread/list` with `useStateDbOnly: true` | New working directory |
| Three fresh app-server processes | Same disagreement persisted |
| New, unindexed transcript with database-only listing | Missing from results |
| Default listing of the unindexed transcript | Discovered it; a later database-only listing included it |

These are observations from a synthetic legacy fixture, not a completed migration of the deployed service. Paginated history, a subsequent model turn, old absolute attachment links, and real-project moves were not tested. The initial fixture was hand-authored and accepted by the installed CLI; broader fixture coverage remains an acceptance requirement.

CodexUI also merges database metadata into some listing results, with a current 200-row helper limit. The raw Codex result alone therefore does not prove how every conversation appears in the current sidebar. Phase 1 must compare the complete registry inventory independently of this UI helper.

## 4. Scope and phases

### Phase 1: registry, inventory, and inspection

- Create the versioned registry database and persistent identities.
- Adopt existing saved project roots, including projects without conversations.
- Discover all applicable active and archived conversations through paginated Codex APIs and assign or classify their memberships.
- Distinguish deliberately projectless conversations from unresolved associations.
- Record observed paths, lifecycle/visibility flags, discrepancies, and scan completeness.
- Add an Edit/Manage entry beside the top-level Projects heading and an initial Manage Projects dialog showing the collected information.
- Seed starting locations `/srv/Projects` and `/srv/Tools`; manage these as browsing preferences, separate from project registration. They are not access-control allowlists.
- Correct existing conversation action wording from Delete to Archive without changing its underlying behavior.
- Keep existing sidebar grouping, order, selection, conversation rendering, and sending behavior driven by today's implementation. The new registry runs alongside it for comparison.
- Do not move files, rebind working directories, reassign existing memberships through new management actions, or automatically unhide/unarchive conversations.

Per-project Manage opens the same dialog scoped to one `project.id`. The initial inspection view may show active, archived, hidden, missing, and confirmed-deleted records. Enabling restoration and visibility actions belongs to Phase 2 unless explicitly brought forward.

### Phase 2: registry-driven project and conversation UI

- Drive project/conversation grouping and management from registry identities.
- Preserve compact names; do not append parent-directory suffixes to sidebar labels.
- Show the full current path on hover/focus and always in project details for touch devices.
- Support project-level conversation inspection, archived restoration, and shared visibility flags.
- Support explicit nested-project registration, membership reassignment previews, and projectless association.
- Keep working-directory changes distinct from organizational assignment.
- Preserve browser drafts, navigation, pins, collapse state, and relevant preferences during the identity migration.
- Add a reversible rollout switch while both old and new data paths exist. Disabling it must restore the old UI without destroying the registry.

### Phase 3: managed relocation

- Add Move project and Locate moved project.
- Physically relocate supported directories, update Codex working directories through supported APIs, and record path history and recoverable progress.
- Verify continuity after restart before reporting a move complete.
- Initially support ordinary same-filesystem directory moves. Linked Git worktrees, registered nested-project moves, cross-filesystem transfers, and remote-host moves require dedicated support and acceptance cases before being enabled.

## 5. Storage and conceptual schema

Store the registry at `$CODEX_HOME/codexui/projects.sqlite`, separately from Codex's own databases. Do not put runtime state in a source checkout, its `.git` directory, or a release installation directory. Use the active server data home, not the browser's machine or an assumed personal home.

SQLite storage must support the package's declared Node runtime range. The current package supports Node >=18; do not assume `node:sqlite` is available. Select and validate a compatible storage adapter, including packaged runtime checks, before implementation. This document does not select a new dependency.

| Record | Essential information |
| --- | --- |
| Sources | Stable source UUID, server/host scope, observed and canonical Codex-home paths, source revision |
| Projects | `project.id`, source, display name, current root, registration provenance, hidden/retired state, availability, revision |
| Project paths | Project reference, original spelling, canonical path when known, current/historical/alias role, validity period, provenance |
| Conversations | Source + `thread.id`, optional Codex session-tree/parent IDs, current project reference or NULL, association classification/provenance, relative working directory, observed runtime metadata |
| Lifecycle observations | Codex archive state, confirmed deletion evidence, first/last observed time, missing-since time, completeness of the supporting scan |
| Visibility preferences | Shared hidden flag and reason, independent of Codex archive/deletion state |
| Starting locations | Stable ID, source, label, observed/canonical directory, ordering, availability |
| Membership changes | Before/after project references, reason, operation reference, revision, enough information to reverse an intentional reassignment |
| Reconciliation runs | Requested source coverage, capability/version information, cursors/progress, generation, status, counts, errors, completion times |
| Operations | Kind, project, source/destination where applicable, phase, revision preconditions, lease ownership, per-thread progress, verification and recovery details |
| Schema metadata | Schema version, migrations, registry/source identity, current registry revision |

Indexes and constraints:

- Primary/unique key on `(source_id, thread_id)`; project references must stay within the same source.
- Unique active project root per source/host and canonical path. Historical paths are not globally unique forever.
- Index current project membership, lifecycle/visibility filters, last-seen generation, path lookup, and pending operations.
- Store nullable/unknown observations explicitly; an unavailable quota, directory, or scan result must not become a fabricated known value.
- A copied registry/data home needs an explicit source-identity policy before being used concurrently on another host. Do not merge separate installations by matching account names or repository remotes.

## 6. Discovery and association

A registry conversation cannot exist without a real `thread.id`. Obtain it from `thread/list`, a supported read call, or the return value of successful conversation creation. Do not synthesize placeholder conversation IDs.

Bootstrap:

1. Resolve the active source and read existing saved workspace roots and labels.
2. Adopt unambiguous roots as initial projects, recording their spellings, canonical paths, and original order. Starting locations are not adopted as projects merely because they were seeded.
3. Page through active and archived Codex listings separately. Request explicit supported source kinds, including CLI, IDE, app-server, execution, and supported subagent origins, rather than relying on the interactive-only default. Preserve parent/source metadata so child agents need not later become independent sidebar rows.
4. Upsert conversations using their source-scoped IDs. Retain existing memberships before considering reported paths.
5. For an unassociated conversation, preserve deliberately projectless classification; otherwise choose the deepest registered containing project using canonical paths and directory boundaries.
6. If no reliable root matches, retain the conversation as unresolved. Present candidate project directories for review; do not silently register every discovered subdirectory or merge by leaf name/Git remote.
7. Record unavailable roots and ambiguous aliases. Retain history even if the working directory no longer exists.

A projectless conversation is identified through existing explicit projectless behavior/provenance where available, not merely from an empty or unavailable `cwd`. Both projectless and unresolved records may have NULL `project.id` but have different classifications.

Known thread membership wins over a historical path guess. Path observations may reveal a mismatch; they do not silently reverse an explicit association or completed relocation.

### Explicit nested projects

Projects are registered deliberately; finding a nested conversation directory does not automatically create a nested project. With only `/srv/Projects/Demo` registered, `/srv/Projects/Demo/src/...` belongs to Demo. Explicitly registering `/srv/Projects/Demo/src` reassigns conversations at that directory and its descendants to the nested project, leaving `/srv/Projects/Demo/src-old` and other siblings unchanged.

This is an intentional reassignment operation, including affected archived/hidden records. Preview the complete affected set using registry metadata and record reversible membership changes. It changes organization, not files or conversation working directories. Do not reassign records already belonging to an even deeper registered project.

Moving a project later resolves each conversation's relative working directory against the new root. Do not collapse all nested working directories to the root.

### Associating a projectless conversation

Phase 2 may associate it organizationally with an existing project while preserving its working directory. Continuing work inside that project's directory is a separate explicit working-directory operation. Neither action implicitly moves files from the old projectless directory.

## 7. Ownership and conflict resolution

There is no universal "Codex always wins" rule.

| Information | Authority and conflict rule |
| --- | --- |
| `thread.id`, parent/fork relationships | Codex; never regenerate an ID to repair a grouping conflict |
| Conversation title, model/provider observations, actual `cwd` | Record supported Codex observations, preserving the prior value and origin when changed |
| Archive state | Confirm through appropriate Codex operations/listing; do not infer from an active-only scan |
| Permanent deletion | Confirm from a supported deletion result/event or explicit verification; absence alone is insufficient |
| `project.id`, project label, membership, shared hidden flags | CodexUI registry; scans cannot silently overwrite explicit user decisions |
| Current project root and completed relocation | Verified CodexUI registration/move record; conflicting old list paths become discrepancies |
| Filesystem availability and symlink target | Current filesystem observation; it does not prove project identity or authorize reassignment |
| Conflicting Codex list/read/database paths | Preserve each observation and provenance, resolve using known membership/current project root, and expose unresolved conflicts |

Use structured changes in SQLite for recovery and provenance. This is application state, not a separate repository/wiki chronological log. A failed or partial reconciliation never applies destructive absence-based updates.

## 8. Reconciliation lifecycle

Run reconciliation once per source on CodexUI server startup and app-server reconnection, not once per connected browser and not solely on launches of the standalone CLI.

- Serve the last complete inventory while a background pass runs; show initial/refreshing/complete/partial/failed state in Manage Projects.
- Coalesce concurrent triggers. Use supported lifecycle events and successful current-app operations to enqueue incremental updates, with an explicit Refresh action for external changes.
- A bounded periodic metadata refresh may be added for long-running servers if event coverage is insufficient; its cadence is an implementation measurement, not an unbounded rescan on every request.
- Stage results by reconciliation generation. Record per-page observations in short transactions; mark the run complete only after all requested pages and lifecycle/source partitions succeed.
- If listing changes during pagination, preserve the newer per-thread observations and schedule another pass rather than treating a single scan as a perfectly atomic Codex snapshot.
- Mark records as not observed only after a complete relevant inventory. Do not turn that status into deletion, hiding, or membership loss.
- Preserve authoritative lifecycle events arriving during a scan so stale page results do not resurrect archived/deleted records. Retry generation conflicts.

Keep default Codex scan-and-repair discovery available. Database-only results can corroborate current metadata or accelerate a measured path, but cannot be the sole discovery mechanism: the isolated test demonstrated missing unindexed transcripts. Capability-check the installed protocol and record explicit coverage gaps instead of silently claiming a complete inventory.

## 9. Manage Projects interaction

The top-level Projects heading gains an Edit/Manage button. Individual project menus may open the same dialog scoped to `project.id`. Existing sidebar names remain compact and can repeat.

The Phase 1 dialog should provide:

- Search by project name and full path, plus lists of registered projects and starting locations.
- Full current path, recorded aliases/history, availability, stable identity in details, and registration origin.
- Active, archived, hidden, missing, and confirmed-deleted conversation counts, with independently defined filters because these states can overlap.
- Conversation rows with title, state, observed working directory, source, association status, and expandable details.
- Explicit projectless and unresolved views; no fake project used to conceal a NULL association.
- Last successful reconciliation, progress, errors, coverage gaps, and a Refresh action.
- Starting-location management without automatic project registration or filesystem mutation.

Archive/unarchive changes, hidden/show actions, nested-project registration, and reassignment controls are enabled in Phase 2. An archived-and-hidden conversation can be unarchived yet remain hidden; controls must describe which state they change. Missing/deleted records are not presented as one-click recoverable history if their transcript is absent.

Phase 3 adds Move project and Locate moved project, with full source/destination paths in previews rather than relying on potentially duplicate labels.

## 10. Shared browsers, database access, and refresh

The current application is shared-data and multi-client, not isolated multi-user tenancy. Different browsers can navigate different conversations. Browsers viewing the same conversation receive its updates. Browser drafts, selected routes, scrolling, and some preferences remain local. Provider/account configuration and the server's Codex data are shared.

Model selection remains unchanged: a browser can select a model for its next turn, so different clients can intentionally or accidentally mix models in one conversation. This design records observations but does not introduce model locking or change provider/auth behavior.

Registry access rules:

- Only the server accesses the SQLite file. Browser APIs return paginated registry data.
- Use foreign keys, short transactions, WAL where supported by the storage location, bounded busy handling, and revision preconditions for writes.
- Create or adopt a project transactionally so two browsers cannot create duplicate active project records for the same canonical root.
- Use a source-level reconciliation lease and a project-level operation lock. If multiple CodexUI server processes share a data home, SQLite-backed coordination must elect one reconciliation/operation owner; an in-process boolean is insufficient.
- Publish a registry-revision notification after commits. Clients invalidate affected views and refetch the relevant page, preserving drafts/navigation.
- On reconnect or missed revisions, refetch from the durable revision. Do not launch a full transcript scan from each browser.
- Keep database transactions closed during filesystem moves and Codex RPC calls. Persist intent/progress around those operations.

Project operations must not create new user isolation promises. Separate users needing separate private histories require a separate authentication/data-isolation design.

## 11. Project relocation and recovery

Phase 3 must not simulate an interactive CLI picker or mutate raw Codex SQLite tables. Use the existing app-server protocol and supported `thread/resume`/working-directory overrides; retain each `thread.id` and its stored history.

Operation states should distinguish at least: prepared, files_moved, paths_recorded, rebinding, verifying, completed, failed, and recovery_required. A state is durable before the next irreversible step. Per-thread rebinding progress allows retry without generating duplicate conversations.

Move procedure:

1. Resolve and preview the project, source/destination, affected conversations, nested registrations, and filesystem/Git constraints. Reject existing destinations, moves into the source subtree, unsupported worktrees/mount boundaries, and ambiguous identity conflicts.
2. Acquire a project operation lease and verify revision preconditions. Check active turns, queues, terminals, automations, and other known writers. Pause relevant automatic work and require external clients to be idle; a registry lock alone cannot stop another CLI from modifying files.
3. Record the source, destination, membership snapshot, expected path mapping, and recovery plan. Ensure consistent registry/Codex/project backups exist under the agreed operational procedure.
4. Perform the supported filesystem move and persist progress. Do not hold a SQLite write transaction while moving files.
5. Update current/previous project paths and saved-root compatibility data, preserving aliases and relative working directories.
6. Rebind conversations through supported Codex APIs in bounded batches, avoiding model requests and unbounded loaded sessions. Detect existing writers and record incomplete rebindings rather than taking them over.
7. Verify expected IDs/history availability, destination files, current working directories, grouping, and restart persistence. Mark completed only after required checks pass.
8. Release paused work/locks only when it is safe. An interrupted or partially rebound operation must be visibly recoverable; do not claim automatic rollback can undo all external effects.

Locate moved project records an explicit user-confirmed identity association when files were moved outside CodexUI. Existence of a folder with the same name or Git remote is not sufficient proof. It follows appropriate validation/rebinding steps without moving files again.

Compatibility symlinks may be an explicit temporary measure, but are not the identity mechanism. Path reuse, symlink retargeting, old absolute file links, repository scripts, and external tools can still require separate attention. Do not rewrite historical message text to make old commands look as if they ran elsewhere.

## 12. Performance, packaging, and backup requirements

- Page metadata and use indexed ID/path lookups. Do not load every conversation transcript to count or group projects.
- Cache path resolution within a reconciliation pass; invalidate after registration, relocation, symlink changes, explicit refresh, or changed availability.
- Bound scan/RPC concurrency and coalesce browser/server triggers. Measure startup delay, requests, duplicate counts, payload sizes, filesystem work, and large-library behavior before each implementation phase completes.
- Preserve current package/runtime support. Any new SQLite dependency requires build, packaged runtime validation, migration tests, and the repository's applicable module-loading/CJS smoke checks.
- Schema migrations are versioned, transactional where possible, and preceded by a consistent backup. Refuse unsupported newer schemas rather than silently recreating the database.
- Use SQLite backup/checkpoint-aware procedures or stop writers for a consistent backup; copying only the main file while WAL writes are active is insufficient.
- Back up the registry with the active Codex data and any separately configured Codex SQLite state. The registry alone does not contain transcript content.
- Losing the registry can lose membership/alias history even when transcripts survive. Restore stable IDs from backup; do not silently rebuild new identities over unresolved relocation history.
- Test restoration using an isolated data home. Keep source checkout and release installation management separate from runtime data migration.

## 13. Proposed implementation boundaries

Introduce focused server modules for registry storage/migrations, reconciliation, association/path rules, and management routes. Keep Codex RPC access behind the existing bridge abstraction. Add browser DTOs/gateway operations and reusable management components without putting SQLite access in Vue or further expanding the bridge monolith unnecessarily.

Proposed logical APIs include paginated project and per-project conversation reads, starting-location reads/updates, reconciliation request/status, and later revision-checked lifecycle/membership/move operations. Exact route names are implementation details. They must use the existing application base-path helper so `/codex/` deployments remain supported when integrated with that branch.

Phase 1 reads the registry through its own APIs. Existing sidebar APIs remain unchanged until the Phase 2 cutover. Archive wording is the sole planned correction to current conversation controls during Phase 1.

## 14. Acceptance gates

### Phase 1

- Empty home, existing home, saved project without conversations, deliberately projectless chat, and unresolved path all produce correct records.
- All pages/source partitions and active/archive inventories are accounted for; subagent metadata is retained without forcing new sidebar rows.
- IDs and memberships remain stable across repeat scans, server restarts, and alternate browser connections.
- Duplicate names, symlink spellings, missing directories, and conflicting old/new Codex paths do not silently merge or lose projects.
- New unindexed transcripts are discoverable; late lifecycle events and failed/interrupted pagination do not fabricate deletions.
- Current sidebar order/grouping/navigation and sending remain unchanged, except Archive labels accurately describe existing behavior.
- Starting locations do not become project owners. Manage Projects shows complete/partial/failed reconciliation honestly.
- Database migration, backup/restore, source identity, concurrent project adoption, multiple browser refresh, and multi-process lease handling are exercised.
- UI checks cover actual changed controls in light/dark themes and responsive sizes; appropriate domain manual tests and performance evidence are updated.

### Phase 2

- Registry-based grouping matches accepted membership rules, with reversible fallback to the previous data path.
- Explicit nested-project registration reassigns exactly the intended subtree, including archived/hidden records, and preserves deeper projects.
- Archive/unarchive and hide/show remain independent; no permanent deletion action appears accidentally.
- Projectless organizational association and working-directory changes remain distinct.
- Revisions and notifications keep different browsers current without discarding drafts or navigating them unexpectedly.

### Phase 3

- A same-filesystem move preserves files, conversation IDs, history, and relative working directories after restart.
- Active writers, destination collisions, unsupported worktrees/nested layouts, and unsupported filesystem transfers fail before destructive steps.
- Inject failure after every durable operation phase and demonstrate resumable recovery or explicit safe rollback boundaries.
- Verify archived conversations, path reuse, external move location, aliases, automations/queues, and missing history handling.
- A real backup restore drill succeeds before broad project reorganization is treated as supported.

## 15. Adjacent request: header usage display

A separate UI change adds a compact information control beside the existing script/terminal and Git dropdowns in the right-hand header. It displays the available 5h/7d percentages and opens a custom dropdown/popover showing quota usage and reset timestamps, comparable to the usage portion of `/status`.

Requirements:

- Reuse existing account-rate-limit state/events; do not add duplicate startup requests or independent polling per component.
- Label percentages as remaining/available, handle exhaustion and absent data honestly, and identify actual window durations rather than assuming every primary/secondary window is 5h/7d.
- Show available plan, quota, credits, and reset details from the API. Do not claim to reproduce unrelated `/status` fields the API does not provide.
- Support outside-click/Escape dismissal, keyboard access, light/dark themes, and mobile layout beside existing controls.
- Keep this request independent of registry rollout and database authority rules.

## 16. References and remaining implementation decisions

Official protocol references (verified during design):

- [Codex app-server: listing, history, lifecycle, and resume operations](https://learn.chatgpt.com/docs/app-server).
- [Codex CLI resume and working-directory overrides](https://learn.chatgpt.com/docs/developer-commands?surface=cli#codex-resume).
- [Codex data-home and SQLite location configuration](https://learn.chatgpt.com/docs/config-file/environment-variables).

The isolated observations in section 3 are local verification, not promises made by those documentation pages. Current source behavior is evidence from this checkout, not proof of deployed-service behavior.

Implementation must resolve and document: a Node-compatible SQLite adapter; supported protocol/version capability checks; measured reconciliation cadence/page bounds; exact API shapes; safe handling of older saved-root data and unusual projectless provenance; and the supported filesystem/worktree matrix. These do not block recording the accepted architecture, but they must be settled before the relevant phase is delivered.
