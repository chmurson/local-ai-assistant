# Step 4

Status: done  
Type: process  
Updated: 2026-03-12

## Goal

Make repo planning and task management explicit, current, and easy to audit.

## Why This Step Exists

The previous planning layout made it hard to answer basic execution questions:

- Is a step planned, in progress, or done?
- What was actually shipped vs only proposed?
- What follow-up work is still open?
- Which planning file should a contributor trust first?

## Acceptance

- [x] One planning index exists and is maintained
- [x] Every step has an explicit status
- [x] Every step has a consistent structure
- [x] Planned work is separated from completed implementation summaries
- [x] Open follow-ups are tracked per step
- [x] Legacy planning artifacts are clearly marked as references, not the primary status source
- [x] Future steps follow the new structure by default

## Planned Work

1. Keep `plan/README.md` as the top-level status index.
2. Standardize all current and future steps under `plan/steps/`.
3. Use one step file per step with a stable section layout:
   - metadata
   - goal
   - acceptance
   - implementation summary or planned work
   - open issues
   - relevant files
   - legacy references
4. Treat older `step-*-requirements` and `step-*-detailed-plan` files as historical context only.
5. Update future steps in-place as work lands, instead of creating disconnected summaries.

## Implementation Summary

Step 4 introduced the new planning system:

- `plan/README.md` is now the planning index and status board
- `plan/steps/` contains one structured file per step
- `plan/steps/_template.md` defines the default shape for future steps
- older planning files are explicitly marked as legacy references
- the main `README.md` now points contributors to the planning index

## Open Issues / Follow-Ups

- Decide whether older planning files should eventually be migrated or left as-is.
- Decide whether plan status should also be mirrored in the main README.
- Consider adding a changelog or ADR directory once architectural decisions grow larger.
- Decide whether each step should eventually get its own folder instead of one markdown file.

## Relevant Files

- `plan/README.md`
- `plan/steps/_template.md`
- `plan/steps/step-1.md`
- `plan/steps/step-2.md`
- `plan/steps/step-3.md`
- `plan/steps/step-4.md`
