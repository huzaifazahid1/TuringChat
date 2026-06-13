Drop a short notification sound here named `notification.mp3`.

Recommended:
- Length: < 1 second
- Format: MP3 (broadest browser support)
- Volume: pre-normalized to ~-12 dB so it's not jarring

The chat layer plays this file via `lib/notification.ts` whenever a non-self
message arrives outside the active room. If the file is missing, the chat
still works — playback is wrapped in try/catch and silently no-ops.

Free CC0 sources:
- https://freesound.org
- https://pixabay.com/sound-effects/
