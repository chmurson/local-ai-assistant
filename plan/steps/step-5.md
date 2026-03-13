# Step 5

Status: done  
Type: capability  
Updated: 2026-03-13

## Goal

Make the meta process measurable and worth keeping by changing when it runs, how it is evaluated, and how its outputs are recorded over time.

## Why This Step Exists

The current meta flow runs automatically after every accepted turn. That makes it easy to collect evaluations, but it is still unclear whether the meta agent is improving the system in a meaningful way or just producing noise.

The next step should answer three product questions:

1. Is the meta process doing anything productive?
2. Should meta run only when the system is idle, not after every turn?
3. If meta suggestions matter, where is the durable history of what it changed or recommended?

## Acceptance

- [x] Define clear success criteria for meta usefulness
- [x] Add a way to measure meta output quality over time
- [x] Stop running meta automatically on every turn
- [x] Trigger meta only after a configurable inactivity window
- [x] Cancel pending meta work when new activity arrives
- [x] Persist a historical log of meta recommendations and applied changes
- [x] Make that historical list easy to inspect locally
- [x] Document the new meta workflow and its operating rules

## Planned Work

1. Add a meta usefulness model.
   Track signals such as:
   - whether proposed changes are actually applied
   - whether repeated issues go down after a change
   - how often meta produces empty or low-confidence output
   - whether the same recommendation repeats without impact

2. Decouple meta execution from the synchronous user-turn path.
   Replace "run meta after every turn" with a deferred scheduler.

3. Add inactivity-based triggering.
   Examples:
   - run meta after `N` minutes without accepted user activity
   - optionally require at least `M` new traces before running

4. Add cancellation semantics.
   If new accepted activity arrives while a deferred meta run is pending, cancel the pending run and restart the inactivity timer.

5. Add historical persistence for meta changes.
   Persist a timeline of:
   - meta evaluation id
   - trace ids considered
   - proposed changes
   - applied changes
   - rejected changes
   - confidence / score
   - timestamp

6. Add an operator-facing inspection surface.
   Likely options:
   - a new JSON log under `data/`
   - a CLI command to inspect meta history
   - later, optional inclusion in a local status UI

7. Update docs and planning artifacts once the new behavior is implemented.

## Proposed Design

### 1. Meta Trigger Model

Replace "run meta immediately after every turn" with a small scheduler.

Proposed behavior:

- every accepted user turn marks the system as active
- each accepted turn resets a single inactivity timer
- when the timer expires, meta may run
- if a new accepted turn arrives before expiry, the pending timer is cancelled
- if meta is already running and new activity arrives, do not start another run until the current one finishes

This keeps the user-facing path responsive and avoids redundant meta work during active sessions.

### 2. Scope Of A Meta Run

The current implementation evaluates exactly one trace at a time. The first slice should keep that shape and add history around it before any scheduler or batching refactor.

Proposed rollout:

- first slice: persist one history record per current single-trace meta run
- later slice: introduce inactivity scheduling
- later slice: optionally expand one meta run to cover a batch window

This keeps the first implementation change small and avoids mixing persistence changes with scheduling changes.

### 3. Meta Usefulness Signals

To answer whether meta is helping, record concrete outcomes instead of only raw scores.

Suggested signals:

- `proposed_change_count`
- `applied_change_count`
- `rejected_change_count`
- `empty_run_count`
- `repeated_issue_count`
- `repeated_patch_count`
- `time_since_last_useful_change`

A run can be considered "useful" when it produces a non-empty recommendation that is either:

- auto-applied successfully, or
- later accepted by an operator as meaningful

### 4. Historical Persistence

Add an append-only meta history log under `data/`.

Suggested first file:

- `data/meta-history.json`

Suggested record shape:

```ts
interface MetaHistoryRecord {
  metaRunId: string;
  traceIds: string[];
  triggeredBy: 'per_turn' | 'inactivity';
  startedAt: string;
  finishedAt: string;
  score: number;
  confidence: number;
  issues: string[];
  proposedChanges: ProposedConfigPatch;
  applied: string[];
  rejected: string[];
  useful: boolean;
}
```

For the first slice, `traceIds` should usually contain one trace because the current meta flow is still per-turn. This should remain append-only so the system keeps an auditable timeline.

### 5. Operator Visibility

Add one lightweight inspection path first.

Recommended first surface:

- a CLI command such as `/meta-history`

Possible later surfaces:

- local status page
- GitHub-facing summary
- compact report in stdout when a meta run completes

### 6. Config Surface

The scheduler should be controlled by explicit config instead of hardcoded timing.

Suggested new config area:

```ts
metaRuntime: {
  enabled: boolean;
  runOnEveryTurn: boolean;
  inactivityDelayMs: number;
  minNewTracesBeforeRun: number;
}
```

Suggested initial behavior:

- keep `runOnEveryTurn = false`
- run only after inactivity
- make the delay short enough for local usage but not so short that it fires during active conversations

### 7. Safe Rollout

This should land in phases:

1. persist meta history while keeping current per-turn behavior
2. add operator inspection command
3. introduce inactivity scheduler behind config
4. disable per-turn meta by default
5. refine usefulness heuristics once history exists

## Implementation Notes

- Prefer a single in-process scheduler first; no background worker is needed yet.
- Keep the scheduler transport-agnostic so CLI and Telegram share the same meta timing rules.
- Store enough metadata to answer "what changed and why" without rereading every trace.
- Do not let asynchronous meta runs hide failures; log them clearly and persist failure context when possible.

## First Slice Implemented

The first implementation slice now exists in the codebase:

- each meta run appends a record to `data/meta-history.json`
- completed and failed meta runs are both recorded
- history records include proposed changes plus applied/rejected outcomes
- CLI now exposes `/meta-history` for local inspection

This keeps the current per-turn meta behavior intact while giving the system a durable audit trail before scheduler changes are introduced.

## Deferred Scheduler Implemented

The next slice now also exists:

- meta no longer runs immediately after each accepted turn
- accepted traces are queued globally for deferred reflection
- a 10-minute inactivity timer controls when meta runs
- at least 2 new traces are required before a deferred run starts
- new activity cancels the pending inactivity window
- if activity appears during a deferred batch, the current batch stops after the in-flight trace and requeues the remainder
- operators can inspect scheduler state with `/meta-status`
- operators can trigger an immediate queued batch with `/reflect`
- the same two commands are available through Telegram slash commands for the allowed chat
 - new meta runs are automatically classified into useful / healthy / failure-style buckets
 - `/meta-status` now reports aggregate and recent classification metrics over time

Current config surface:

```ts
metaRuntime: {
  enabled: boolean;
  inactivityDelayMs: number;
  minNewTracesBeforeRun: number;
  notifyOnCompletion: boolean;
}
```

The current implementation keeps batch processing simple by draining the queued traces one-by-one once the inactivity window expires.
When running in Telegram mode, the scheduler can also send one operator-facing completion summary after a deferred batch finishes.
On startup, the scheduler also adopts a small recent window of unprocessed main traces from disk so a restart does not silently orphan the latest backlog.

## Open Issues / Follow-Ups

- Decide whether to add operator review/override commands for meta classifications.
- Refine how `useful_operator_signal` is detected once more history exists.
- Decide whether one meta run should eventually analyze a richer batch window instead of one trace at a time.

## Relevant Files

- `src/core/process-user-turn.ts`
- `src/core/run-meta-agent.ts`
- `src/core/meta-scheduler.ts`
- `src/core/auto-apply.ts`
- `src/core/trace-store.ts`
- `src/core/config-store.ts`
- `src/schemas/config-schema.ts`
- `src/types/config.ts`
- `src/app/run-cli.ts`
- `src/app/run-telegram.ts`
- `data/proposed-config.json`
- `data/traces/meta/`
- `data/meta-history.json`
