# Family Scheduler

A responsive family calendar and shared task planner based on the supplied Stitch screens. It supports daily shift entry, recurring child schedules, anniversaries, tasks, household sharing, realtime sync, and state restoration.

## Run locally

```bash
npm install
npm run dev
```

The repository contains a public Supabase fallback configuration for the deployed app. To use another project, copy `.env.example` to `.env.local` and fill in its values.

## Build

```bash
npm run build
```

## Data and sharing

- Local changes are persisted in the browser immediately.
- Signing in and connecting a household synchronizes the same calendar across family devices.
- The household owner can grant or revoke edit permission. View-only members can browse without changing data.
- Every cloud state change creates a recoverable recent version, while JSON export/import provides a portable backup.
- The database schema and RLS policies live in `supabase/migrations`.

## Quality checks

```bash
npm run lint
npm run build
```
