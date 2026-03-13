# TODO

## Agent behavior

- Fix date/time handling so the agent does not hallucinate "today" or "current time" answers when it lacks a reliable clock source.
- Align the main-agent output contract with the actual intended user-facing behavior so the meta agent is not constantly flagging a format mismatch.

## Tooling and retrieval

- Reduce oversized tool payloads before they are passed back into the main-agent and meta-agent flows.
- Improve `http_fetch` / web retrieval behavior so large pages are summarized or filtered earlier instead of being forwarded as raw payloads.
- Review the overall tool strategy and decide which capabilities should stay native in-repo versus move behind MCP servers.
- Evaluate whether web/data-heavy tasks should be offloaded to MCP-backed tools instead of the current direct fetch/extract flow.

## Meta process

- Prevent large tool outputs from causing meta context-length failures.
- Keep improving the meta usefulness signal so repeated low-impact prompt churn is not treated as progress.
- Add a manual trace-reflection trigger such as `/reflect` so meta can also be invoked explicitly on demand.

## Telegram operator UX

- Add Telegram commands that expose selected local operator commands remotely, for example history/config/proposed/memory views.
- Keep Telegram operator responses compact and safe instead of dumping large raw JSON payloads into chat.
