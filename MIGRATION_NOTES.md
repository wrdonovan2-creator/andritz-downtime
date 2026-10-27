# Migration Notes — Downtime Tracker → Vercel

This document describes the port of the ANDRITZ South Holland downtime tracker
from a self-hosted Express + better-sqlite3 app to a Vercel-deployable
serverless app backed by Postgres (Neon).

## File uploads via Vercel Blob

- Delay photos and birthday photos are stored in Vercel Blob (public URLs).
- Requires `BLOB_READ_WRITE_TOKEN` environment variable on the Vercel project.
- **If the token is missing**: uploads are skipped, a console warning is logged (`[blob] BLOB_READ_WRITE_TOKEN is missing — photo upload skipped ...`), and the delay/birthday is still saved with no photo. The app does not crash.
- `photoPath` fields store the full public Blob URL when an upload succeeds.
- Client `assetUrl()` helper detects absolute URLs and returns them as-is.
- Old `/uploads/*` paths still return 410 (legacy).

## Environment variables

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Postgres/Neon connection string. |
| `SESSION_SECRET` | Session cookie secret. |
| `BLOB_READ_WRITE_TOKEN` | Required for photo uploads. Create a Blob store in the Vercel dashboard and copy the token. If absent, photos are silently skipped. |

Toolbox talk image upload remains JSON-only for now and can be extended the same way.
