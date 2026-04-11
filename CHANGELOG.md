# Changelog

## 2026-04-11
- Add live setup editor: Send/Capture buttons, param block hex editor, part names display
- Rewrite parseSetupDump: name-anchor end-marker detection, returns blocks+rawUnpacked for live editing
- Add Setups tab with 128-slot grid, detail panel, parts list, send/export/rename/request
- Enhance parseSetupDump to extract parts (type, ref, name) from ref blocks
- Wire Setups tab into TABS and TAB_VIEWS in micron-ui-core.js / micron-main.js
- Remove setup grid from SysEx tab (now dedicated Setups tab)
- Preserve Rhythms display in SysEx tab as renderRhythms()
