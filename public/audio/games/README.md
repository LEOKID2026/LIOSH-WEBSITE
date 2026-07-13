# Game audio assets (owner-provided MP3)

Canonical paths:

- `sfx/{canonical_asset_id}.mp3` — e.g. `sfx/sfx-coin.mp3`
- `music/{canonical_asset_id}.mp3` — e.g. `music/bgm-learning-focus.mp3`

50 required MP3 files per `lib/game-audio/game-audio-manifest.js`.
Optional: `sfx/sfx-time-low.mp3`

Games degrade gracefully when files are missing.
