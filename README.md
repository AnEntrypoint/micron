# micron

Browser-based controller and patch manager for the Alesis Micron synthesizer.

## Features

- Patch editor with full parameter control (oscillators, filters, envelopes, LFOs, mod matrix, FX)
- Sequencer with piano roll and step grid
- Rhythm editor (drum machine)
- SysEx backup: import/export patches, patterns, setups, rhythms via MIDI SysEx
- Setups tab: 128-slot grid, live editor with param block hex editor, send/capture workflow, parts list, rename/export
- Pattern manager with synth-side pattern browser
- Library with A/B compare and morphing
- MIDI monitor, split/layer, NRPN learn, config panel
- Standalone mode for direct MIDI slot management
- Dark/light theme, keyboard shortcuts, touch support

## Setup

Connect the Alesis Micron via USB MIDI (or hardware MIDI interface). Open `index.html` in a browser that supports Web MIDI API (Chrome/Edge recommended).

## Development

```
git clone https://github.com/AnEntrypoint/micron
cd micron
```

Open `index.html` directly — no build step required.

## License

MIT
