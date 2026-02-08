# Second Brain — Project Overview for Claude

**URL**: https://brain.6eyes.dev  
**Local Dev**: http://localhost:3000  
**OpenClaw Gateway**: http://192.168.0.39:18789

---

## What Is This?

Second Brain is an **AI command center** — a Next.js web UI that gives you real-time visibility into your AI agent infrastructure. It's the control plane for people who run AI agents.

Think: **Linear meets ChatGPT meets Notion** — purpose-built for AI operations.

- **Dashboard** — Live stats, activity feed, running agents
- **Agent Fleet** — Spawn, monitor, and kill agents from the browser
- **Chat Interface** — Talk to agents with streaming responses
- **Knowledge Vault** — 50+ markdown docs across 8 categories with full-text search
- **Pipeline Builder** — Chain agents: Research → Draft → Approve → Send
- **Knowledge Graph** — Interactive force-directed visualization
- **Analytics** — Cost tracking, task completion, model efficiency

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 16 (App Router, React Server Components) |
| **UI** | React 19 + Tailwind CSS 4 |
| **Language** | TypeScript 5.9 |
| **AI** | Google Gemini 2.0 Flash via `@google/generative-ai` |
| **Content** | Markdown + YAML frontmatter (`gray-matter` + `remark`) |
| **Testing** | Vitest + Testing Library |
| **Hosting** | Vercel (brain.6eyes.dev) |
| **Agent Backend** | OpenClaw Gateway (WebSocket-based) |
| **Auth** | PIN auth (3437) + HMAC session cookies |
| **Design** | Oregon Ducks × Space theme (dark + gold #fade29) |

---

## 3-Layer Architecture

This project follows a **Directives → Orchestration → Execution** framework:

### 1️⃣ **Directives** (`directives/`)
Standard Operating Procedures (SOPs) for common tasks. Each directive follows this template:
- **Goal** — What this achieves
- **When to Use** — Triggering conditions
- **Prerequisites** — What you need first
- **Steps** — Numbered instructions
- **Expected Output** — What success looks like
- **Edge Cases** — Common gotchas
- **Cost** — Time/tokens/money estimate

### 2️⃣ **Orchestration** (This file — CLAUDE.md)
High-level context, architecture overview, and pointers to directives.

### 3️⃣ **Execution** (`execution/README.md`)
Manifest mapping directives to actual file paths in the codebase.

**How to use it:**
1. Start with **CLAUDE.md** (this file) to understand the big picture
2. Pick a **directive** from `directives/` for the task at hand
3. Follow the directive's steps to **execute** on real files

---

## Key Directories

```
second-brain/
├── CLAUDE.md                   # ← You are here
├── directives/                 # SOPs for common tasks
├── execution/README.md         # Manifest mapping SOPs → files
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── page.tsx            # Dashboard
│   │   ├── agents/             # Agent fleet management
│   │   ├── ask/                # AI Q&A
│   │   ├── chat/               # Chat interface
│   │   ├── tasks/              # Task board
│   │   ├── deals/              # Sales pipeline
│   │   ├── graph/              # Knowledge graph
│   │   ├── analytics/          # Cost tracking
│   │   └── api/                # 12 API route groups
│   ├── components/             # Reusable UI components
│   └── lib/                    # Utilities & data layer
├── vault/                      # Knowledge base (50+ docs)
│   ├── accounts/               # CRM profiles
│   ├── concepts/               # Knowledge articles
│   ├── journal/                # Daily notes
│   ├── projects/               # Project docs
│   ├── erate/                  # E-Rate leads
│   ├── intel/                  # Market intelligence
│   ├── marketing/              # Marketing content
│   ├── reports/                # Generated reports
│   ├── activity.json           # Agent activity feed
│   ├── tasks.json              # Task board data
│   ├── deals.json              # Sales pipeline
│   ├── agents.json             # Agent registry
│   └── config.json             # App config (PIN, profile)
├── backend/                    # Backend tools & scripts
│   └── execution/              # BigQuery setup docs
├── public/                     # Static assets & PWA manifest
└── scripts/                    # Build & utility scripts
```

---

## API Routes (12 Groups)

All routes are in `src/app/api/*/route.ts`:

| Route | Purpose |
|-------|---------|
| `/api/activity` | Post events to the activity feed |
| `/api/agents` | List active agents (from vault/agents.json) |
| `/api/ask` | AI Q&A powered by Gemini + vault context |
| `/api/auth` | PIN login, session check, logout |
| `/api/chat` | Chat with agents (not fully implemented) |
| `/api/command` | Execute commands via gateway bridge |
| `/api/config` | Get/update vault config |
| `/api/datalake/*` | BigQuery event logging & insights |
| `/api/gateway` | Bridge to OpenClaw Gateway (spawn/send/status) |
| `/api/graph` | Knowledge graph data (nodes + links) |
| `/api/search` | Full-text search across vault docs |
| `/api/tasks` | CRUD for tasks in vault/tasks.json |

---

## Data Layer

All content lives as **flat files** in `vault/`:

- **Markdown docs** — YAML frontmatter + markdown body
- **JSON files** — activity, tasks, deals, agents, config

### Markdown Format

```yaml
---
title: "Account Research: OHSU"
date: 2026-02-07
tags: [account, healthcare, oregon]
description: "Research notes on Oregon Health Sciences University"
---

# OHSU Overview

[Markdown content here]
```

### Key JSON Files

- `vault/config.json` — PIN, session secret, profile name
- `vault/tasks.json` — Task board data
- `vault/deals.json` — Sales pipeline
- `vault/agents.json` — Agent registry (synced from OpenClaw)
- `vault/activity.json` — Agent activity feed

---

## OpenClaw Gateway Integration

Second Brain connects to the **OpenClaw Gateway** (WebSocket-based agent runtime) via:

1. **Gateway Bridge** (`src/lib/gateway.ts`) — Server-side client
2. **Gateway API** (`src/app/api/gateway/route.ts`) — HTTP proxy layer

### Gateway Actions

```typescript
POST /api/gateway { action: 'status' }     // Check gateway health
POST /api/gateway { action: 'sessions' }   // List active agents
POST /api/gateway { action: 'spawn', message, ... } // Spawn new agent
POST /api/gateway { action: 'send', sessionId, message } // Send to agent
POST /api/gateway { action: 'enriched' }   // Merge gateway + local data
```

**Note**: On Vercel, gateway is unreachable (local network). Falls back to `vault/agents.json`.

---

## Authentication

**PIN-based auth** with HMAC-signed session cookies.

### Flow
1. User enters PIN on login page
2. Server validates against `vault/config.json`
3. If valid, signs a session token (HMAC-SHA256)
4. Returns cookie `sb-session` (httpOnly, 7-day expiry)
5. Middleware checks cookie on protected routes

### Session Token Format
```
base64url(payload).base64url(hmac-sha256-signature)

Payload:
{
  "user": "Samson",
  "iat": 1738972800000,
  "exp": 1739577600000
}
```

Secret: `vault/config.json` → `auth.sessionSecret`

---

## Key Commands

```bash
# Development
npm run dev           # Start dev server (port 3000)
npm run build         # Production build
npm run lint          # Run ESLint
npm test              # Run Vitest tests
npm run test:watch    # Test watch mode

# Deploy
vercel                # Deploy to Vercel
vercel --prod         # Deploy to production

# Vault Operations
cd vault
cat config.json       # View config (PIN is here)
cat agents.json       # View agent registry
cat tasks.json        # View task board
cat activity.json     # View activity feed

# Git
git add -A && git commit -m "..." && git push origin main
```

---

## Common Tasks → Directives

| Task | Directive |
|------|-----------|
| Deploy to Vercel | `directives/deploy-vercel.md` |
| Create/update vault docs | `directives/vault-management.md` |
| Add new AI feature | `directives/ai-ask.md` |
| Post to activity feed | `directives/activity-feed.md` |
| Manage tasks | `directives/task-management.md` |
| Monitor agents | `directives/agent-monitoring.md` |
| Send commands to OpenClaw | `directives/gateway-bridge.md` |
| Log events to BigQuery | `directives/bigquery-memory.md` |
| Understand auth | `directives/auth-flow.md` |
| Work with knowledge graph | `directives/knowledge-graph.md` |
| Set up local dev | `directives/local-dev-setup.md` |

---

## Environment Variables

Create `.env.local`:

```bash
# Google Gemini (required for AI features)
GEMINI_API_KEY=your_gemini_api_key

# OpenClaw Gateway (optional — for agent management)
OPENCLAW_GATEWAY_URL=http://192.168.0.39:18789
OPENCLAW_API_KEY=$OPENCLAW_GATEWAY_TOKEN

# App URL
NEXT_PUBLIC_APP_URL=https://brain.6eyes.dev
```

---

## Design System

**Theme**: Dark + Oregon Ducks Gold  
**Primary Color**: `#fade29` (gold)  
**Background**: `#0a0f0c` (very dark green)  
**Font**: Space Grotesk  
**UI Style**: Minimal, high contrast, ambient glow on cards

---

## When You're Asked to Work on This Project

1. **Read CLAUDE.md** (this file) first
2. Check if there's a **directive** for your task in `directives/`
3. If yes, follow the directive
4. If no, write code following existing patterns (see `execution/README.md` for file map)
5. Test locally with `npm run dev`
6. Commit and push when done

---

## Status

✅ **Phase 0 Complete** — Dashboard, vault, search, graph, analytics, PWA  
🚧 **Phase 1 In Progress** — Real-time agent updates, streaming chat  
📋 **Phase 2 Planned** — Visual pipeline builder, orchestration  
🔮 **Phase 3 Planned** — Gmail/Salesforce/GitHub integrations  
🌍 **Phase 4 Planned** — Multi-user, public API, self-hosted option

---

**Built by**: Samson Cirocco  
**Deployed at**: https://brain.6eyes.dev  
**License**: MIT
