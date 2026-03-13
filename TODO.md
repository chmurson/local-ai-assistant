# TODO

## Agent behavior

- Fix date/time handling so the agent does not hallucinate "today" or "current time" answers when it lacks a reliable clock source.
- Align the main-agent output contract with the actual intended user-facing behavior so the meta agent is not constantly flagging a format mismatch.
- Detect and recover from bad final answers where the model returns internal JSON/tool-planning content instead of a user-facing answer.
- Keep tool-heavy terminal responses concise by default unless the user explicitly asks for raw or verbose output.

## Tooling and retrieval

- Reduce oversized tool payloads before they are passed back into the main-agent and meta-agent flows.
- Improve `http_fetch` / web retrieval behavior so large pages are summarized or filtered earlier instead of being forwarded as raw payloads.
- Review the overall tool strategy and decide which capabilities should stay native in-repo versus move behind MCP servers.
- Evaluate whether web/data-heavy tasks should be offloaded to MCP-backed tools instead of the current direct fetch/extract flow.
- Revisit whether bespoke fetch/extract improvements are worth continuing, versus pivoting sooner to third-party tools or MCP servers for web/data-heavy tasks.
- Research a scalable pattern for site/domain-specific fetch guidance so the model can use source-aware rules or retrieval profiles without bloating the base prompt.
- Explore whether site-specific retrieval should be modeled as dedicated tools, shared fetch profiles, or higher-level "skills" that orchestrate lower-level tools.

## Meta process

- Prevent large tool outputs from causing meta context-length failures.
- Keep improving the meta usefulness signal so repeated low-impact prompt churn is not treated as progress.

## Telegram operator UX

- Add Telegram commands that expose selected local operator commands remotely, for example history/config/proposed/memory views.
- Keep Telegram operator responses compact and safe instead of dumping large raw JSON payloads into chat.
