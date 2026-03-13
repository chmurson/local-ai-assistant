# Step 6

Status: planned  
Type: capability  
Updated: 2026-03-13

## Goal

Replace ad-hoc web fetching behavior with a more scalable retrieval/tool architecture that can support source-aware behavior, compact outputs, and eventual MCP-backed capabilities.

## Why This Step Exists

The current tool stack works, but the repo is starting to accumulate retrieval-specific behavior in scattered places:

- `http_fetch` and `extract_text` now carry more and more responsibility
- site-specific behavior is emerging
- terminal/operator UX suffers when retrieval outputs are too large
- future MCP integration needs clearer boundaries than "just add another tool"

This step should turn that drift into a deliberate architecture.

## Acceptance

- [ ] Define a retrieval/profile abstraction for source-aware fetch behavior
- [ ] Decide which retrieval capabilities stay native vs move behind MCP
- [ ] Reduce prompt bloat by keeping site-specific guidance outside the base system prompt
- [ ] Standardize how tool-heavy outputs are summarized for terminal/operator channels
- [ ] Document the long-term boundary between raw tools, higher-level retrieval profiles, and possible skills/playbooks

## Planned Work

1. Define a small retrieval-profile layer.
   Candidate responsibilities:
   - canonical source selection
   - allowed modes such as top/newest/search/api
   - fetch/post-process chain
   - output budget and summarization rules

2. Decide how profiles relate to tools.
   Likely options:
   - profiles as app-side policy above tools
   - dedicated higher-level tools
   - MCP-backed adapters
   - reusable "skills" or playbooks over existing tools

3. Standardize user-facing output budgets.
   Especially for terminal and Telegram:
   - concise by default
   - richer output only when explicitly requested

4. Identify the first profile to model end-to-end.
   Recommended first candidate:
   - Hacker News

5. Document the architecture clearly enough that future MCP/tool work can land into a stable shape instead of adding more one-off fixes.

## Open Issues / Follow-Ups

- Decide whether retrieval profiles should live in config, code, or external metadata files.
- Decide whether source-aware behavior should be deterministic app logic, model-visible hints, or both.
- Decide how much of this should be generalized before the first real MCP integration lands.

## Relevant Files

- `src/core/tool-runner.ts`
- `src/core/tool-input-normalizer.ts`
- `src/core/tool-output-normalizer.ts`
- `src/tools/http-fetch.ts`
- `src/tools/extract-text.ts`
- `TODO.md`
