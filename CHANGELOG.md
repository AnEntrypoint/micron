# Changelog

## 2026-04-11
- Add live setup editor: Send/Capture buttons, param block hex editor, part names display
- Rewrite parseSetupDump: name-anchor end-marker detection, returns blocks+rawUnpacked for live editing
- Add Setups tab with 128-slot grid, detail panel, parts list, send/export/rename/request
- Enhance parseSetupDump to extract parts (type, ref, name) from ref blocks
- Wire Setups tab into TABS and TAB_VIEWS in micron-ui-core.js / micron-main.js
- Remove setup grid from SysEx tab (now dedicated Setups tab)
- Preserve Rhythms display in SysEx tab as renderRhythms()

## 2026-04-11
- Add Send/Capture workflow to rhythm tab with slot selector and sysexRhythms source fix
- Add requestPattern to micron-sysex.js; add Send/Capture buttons with slot selector to pattern tab
- Add Send All + Request buttons with bank/slot selectors to patch tab live-edit bar
- Expose window.__debug with live S state, rhythms, patterns, setups, patch, schedRender
