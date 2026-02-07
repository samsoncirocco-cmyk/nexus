# Second Brain

Second Brain is a Next.js app that turns a local Markdown vault into a personal AI command center. It ships with a dashboard, document browser, AI Q&A, agent activity feeds, and lightweight task/pipeline tracking — all backed by flat files in `vault/`.

## Features

- Vault-backed knowledge base with full-text search
- Document browser with tags, categories, and fast filters
- AI Q&A grounded in your vault content
- Command center to dispatch tasks to OpenClaw agents
- Activity feed, tasks, deals, and agent registry views
- PWA support with service worker and offline caching

## Tech Stack

- Next.js 16 (App Router)
- React 19 + TypeScript
- Tailwind CSS 4
- Google Gemini SDK
- Gray-matter + Remark for Markdown parsing

## Getting Started

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Environment Variables

Create `.env.local` (see `.env.local.example`):

- `GEMINI_API_KEY` (required) — Google Gemini API key for `/api/ask`
- `GEMINI_MODEL` (optional) — model name, default `gemini-2.0-flash`
- `OPENCLAW_GATEWAY_URL` (optional) — gateway URL for OpenClaw
- `OPENCLAW_GATEWAY_TOKEN` (optional) — gateway token, if required
- `VAULT_DIR` (optional) — override path to the `vault/` directory
- `VAULT_CONTEXT_CHAR_LIMIT` (optional) — max chars sent to Gemini

## Scripts

- `npm run dev` — start dev server
- `npm run build` — production build
- `npm run start` — run production server
- `npm run lint` — lint
- `npm run test` — Vitest

## Project Structure

```
src/
  app/                # App Router pages and API routes
  components/         # UI components
  lib/                # Vault access + gateway helpers
vault/                # Markdown and JSON data storage
public/               # PWA assets and service worker
backend/              # Cloud functions + BigQuery resources (optional)
```

## Vault Format

- Markdown docs live under `vault/**.md`
- JSON data lives in `vault/*.json` (tasks, activity, agents, deals)
- Frontmatter (YAML) is used for title, tags, and descriptions

## Deployment

Deploy on Vercel with standard Next.js settings. If you want live OpenClaw
integration in production, ensure the gateway is reachable from your runtime
and set the `OPENCLAW_*` env vars.
