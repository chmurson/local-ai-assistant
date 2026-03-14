# Step 6

Status: in_progress  
Type: capability  
Updated: 2026-03-14

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

- [x] Introduce the first external MCP-backed retrieval capability without checking vendor code into the repo
- [ ] Define a retrieval/profile abstraction for source-aware fetch behavior
- [x] Decide the first slice should move generic web research behind MCP rather than expand bespoke fetch logic
- [ ] Reduce prompt bloat by keeping site-specific guidance outside the base system prompt
- [x] Standardize the first MCP-backed web result so the model receives compact evidence rather than raw crawler dumps
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

4. Prepare the first external retrieval provider end-to-end.
   Implemented first slice:
   - local `web-search-mcp` bootstrap and runtime wrapper
   - installation kept outside git in `.external-tools/`
   - setup instructions and bootstrap scripts kept versioned
   - app-level `web_research` tool uses MCP `stdio` and returns compact results
   Implemented second slice:
   - app-side tool-request normalization can now rewrite `http_fetch` into `web_research`
   - this is used for generic search/latest/current-info intents without exact user-provided URLs
   - the trace records both the original tool request and the normalized one

5. Document the architecture clearly enough that future MCP/tool work can land into a stable shape instead of adding more one-off fixes.

## Open Issues / Follow-Ups

- Decide whether retrieval profiles should live in config, code, or external metadata files.
- Decide whether source-aware behavior should be deterministic app logic, model-visible hints, or both.
- Decide how much of this should be generalized before the first real MCP integration lands.
- Decide how the future in-repo MCP client should expose external capabilities to the main agent without leaking large raw payloads.

## Relevant Files

- `scripts/setup-web-search-mcp.sh`
- `scripts/run-web-search-mcp.sh`
- `docs/web-search-mcp-setup.md`
- `src/core/mcp-web-search-client.ts`
- `src/tools/web-research.ts`
- `src/core/tool-runner.ts`
- `src/core/tool-input-normalizer.ts`
- `src/core/tool-output-normalizer.ts`
- `src/tools/http-fetch.ts`
- `src/tools/extract-text.ts`
- `TODO.md`
