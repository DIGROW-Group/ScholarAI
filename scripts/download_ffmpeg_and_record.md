This document describes what the automated demo script does:

1. Downloads a static ffmpeg Windows static build into `tools/ffmpeg` if not present.
2. Runs a Puppeteer script `scripts/demo-record.js` that:
   - Launches Chromium (uses local Chrome) in non-headless mode with a visible window size of 1280x720 for consistent screenshots.
   - Navigates to the frontend at http://localhost:3001
   - Performs scripted UI interactions (open menus, navigate to Student dashboard, ask a short question via the tutor UI, upload a document if available)
   - Captures screenshots at each step into `tmp/demo_frames`.
3. Assembles screenshots into `demo.mp4` at 30fps using the downloaded ffmpeg binary.

Notes:
- The script intentionally does not record audio.
- Adjust the `steps` array in `scripts/demo-record.js` to change which UI flows are captured.
- Requires Node.js and npm installed. Puppeteer will download Chromium unless configured to use the system chrome binary (we set `executablePath` to the system Chrome path).

Files added:
- scripts/demo-record.js (main automation & assembly)
- scripts/download-ffmpeg.ps1 (PowerShell helper to download ffmpeg)

Usage:
From `PROJET IA/ScholarAI` run:

```powershell
node scripts/demo-record.js
```

The script will create `demo.mp4` in the project root.