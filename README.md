
<p align="center">

```
  ╔═══════════════════════════════════════════════════════════╗
  ║                                                           ║
  ║    🧠  S E C O N D   B R A I N                           ║
  ║                                                           ║
  ║    Your Personal AI Command Center                        ║
  ║                                                           ║
  ╚═══════════════════════════════════════════════════════════╝
```

</p>

<p align="center">
  <strong>See your agents work. Talk to them. Chain them together. Know what it costs.</strong>
</p>

<p align="center">
  <a href="https://brain.6eyes.dev">Live Demo</a> •
  <a href="#features">Features</a> •
  <a href="#getting-started">Getting Started</a> •
  <a href="#architecture">Architecture</a> •
  <a href="#roadmap">Roadmap</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-black?logo=next.js" alt="Next.js 16" />
  <img src="https://img.shields.io/badge/React-19-blue?logo=react" alt="React 19" />
  <img src="https://img.shields.io/badge/Tailwind-4-38bdf8?logo=tailwindcss" alt="Tailwind 4" />
  <img src="https://img.shields.io/badge/TypeScript-5.9-3178c6?logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/License-MIT-fade29" alt="MIT License" />
</p>

---

## What Is This?

Second Brain is an **AI command center** — a beautiful web UI that sits on top of your AI agent infrastructure and gives you real-time visibility into everything your agents are doing.

Think of it as **Linear meets ChatGPT meets Notion**, purpose-built for people who run AI agents:

- **Dashboard** — Live stats, recent activity, running agents at a glance
- **Agent Fleet** — See every agent's status, model, cost, and current task
- **Chat Interface** — Talk to agents in a proper chat UI with streaming responses
- **Knowledge Vault** — Markdown-powered knowledge base with full-text search
- **Pipeline Builder** — Chain agents together: Research → Draft → Approve → Send
- **Knowledge Graph** — Interactive visualization of how your documents connect
- **Analytics** — Cost tracking, task completion rates, model efficiency

> **The pitch:** You went from "I have an AI assistant" to "I run an AI operation." Now you need a control plane.

---

## Screenshots

| Dashboard | Agent Fleet | Knowledge Graph |
|-----------|-------------|-----------------|
| ![Dashboard](https://via.placeholder.com/400x300/0a0f0c/fade29?text=Dashboard) | ![Agents](https://via.placeholder.com/400x300/0a0f0c/fade29?text=Agent+Fleet) | ![Graph](https://via.placeholder.com/400x300/0a0f0c/fade29?text=Knowledge+Graph) |

| Chat Interface | Document Viewer | Command Bar |
|----------------|-----------------|-------------|
| ![Chat](https://via.placeholder.com/400x300/0a0f0c/fade29?text=Chat+UI) | ![Docs](https://via.placeholder.com/400x300/0a0f0c/fade29?text=Document+Viewer) | ![Commands](https://via.placeholder.com/400x300/0a0f0c/fade29?text=Command+Bar) |

---

## Features

🏠 **Smart Dashboard** — Personalized greeting, live stat cards, running agent indicators, and a command bar — everything you need on one screen

🤖 **Agent Fleet Management** — Spawn, pause, resume, and kill agents from the browser. See real-time status, model info, and cost per agent

💬 **Conversational AI** — Full chat interface with streaming responses, quick action buttons, and multi-agent thread switching

⚡ **Command Bar** — Press `⌘K` from anywhere to issue commands, search your vault, or delegate tasks to agents

📚 **Markdown Knowledge Vault** — Store concepts, projects, accounts, and journal entries as Markdown with YAML frontmatter. Full-text search across everything

🔍 **AI-Powered Q&A** — Ask natural language questions about your knowledge base. Powered by Gemini with full vault context

🕸️ **Knowledge Graph** — Interactive force-directed visualization of document relationships, tags, and entity connections

📊 **Sales Pipeline** — Track deals through stages with value, probability, and next actions

✅ **Task Board** — Kanban-style task management synced with agent activity

📈 **Analytics Dashboard** — Cost breakdown by model, tasks per day, agent efficiency, and spending trends

🔔 **Activity Feed** — Real-time log of everything agents do — research, drafts, deploys, commands

📱 **PWA Ready** — Install on your phone with offline caching, push notifications, and a native-feeling bottom nav

🎨 **Oregon Ducks × Space Theme** — Dark UI with gold (#fade29) accents, Space Grotesk typography, and ambient glow effects

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | [Next.js 16](https://nextjs.org/) (App Router, Server Components) |
| **UI** | [React 19](https://react.dev/) + [Tailwind CSS 4](https://tailwindcss.com/) |
| **Language** | [TypeScript 5.9](https://www.typescriptlang.org/) |
| **AI** | [Google Gemini](https://ai.google.dev/) via `@google/generative-ai` |
| **Content** | Markdown + YAML frontmatter via `gray-matter` + `remark` |
| **Dates** | [date-fns](https://date-fns.org/) |
| **Testing** | [Vitest](https://vitest.dev/) + [Testing Library](https://testing-library.com/) |
| **Hosting** | [Vercel](https://vercel.com/) |
| **Agent Backend** | [OpenClaw](https://openclaw.dev/) Gateway |
| **Font** | [Space Grotesk](https://fonts.google.com/specimen/Space+Grotesk) |

---

## Getting Started

### Prerequisites

- **Node.js** 18+ (tested on v22)
- **npm** 9+ (or pnpm/yarn)
- A [Google AI API key](https://ai.google.dev/) for Gemini features

### Installation

```bash
# Clone the repository
git clone https://github.com/samsoncirocco-cmyk/second-brain.git
cd second-brain

# Install dependencies
npm install

# Configure environment
cp .env.local.example .env.local
# Edit .env.local with your API keys
```

### Environment Variables

Create a `.env.local` file:

```env
# Google Gemini (required for AI features)
GEMINI_API_KEY=your_gemini_api_key

# OpenClaw Gateway (optional — for agent management)
OPENCLAW_GATEWAY_URL=http://localhost:18789
OPENCLAW_API_KEY=your_api_key

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Development

```bash
# Start dev server with hot reload
npm run dev

# Open in browser
open http://localhost:3000
```

### Testing

```bash
# Run tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

### Production Build

```bash
# Build for production
npm run build

# Start production server
npm start
```

### Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

Or connect your GitHub repo to [Vercel](https://vercel.com/new) for automatic deployments on push.

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│              Second Brain (brain.6eyes.dev)          │
│                                                      │
│  ┌────────────────────────────────────────────────┐ │
│  │              Next.js 16 App Router             │ │
│  │                                                │ │
│  │  Pages:  / /agents /chat /ask /tasks /deals    │ │
│  │          /doc/[...slug] /graph /analytics      │ │
│  │          /commands /activity /settings          │ │
│  │                                                │ │
│  │  API:    /api/search  /api/ask  /api/chat      │ │
│  │          /api/agents  /api/tasks /api/activity  │ │
│  │          /api/gateway /api/command /api/config   │ │
│  └──────────────────┬─────────────────────────────┘ │
│                     │                                │
│  ┌──────────────────▼─────────────────────────────┐ │
│  │            Gateway Bridge Layer                 │ │
│  │     Auth • Request Transform • SSE Relay       │ │
│  └──────────────────┬─────────────────────────────┘ │
└─────────────────────┼───────────────────────────────┘
                      │ HTTPS
┌─────────────────────▼───────────────────────────────┐
│              OpenClaw Gateway (:18789)               │
│                                                      │
│  Agent Manager → Agent Runtime → Skills/Tools        │
│  Message Router   (Claude, Gemini, GPT)              │
│  Session Manager  File I/O · Shell · Web · Browser   │
└─────────────────────────────────────────────────────┘
```

### Data Layer

All content lives as **flat files** in the `vault/` directory:

```
vault/
├── accounts/        # CRM-style account profiles
├── concepts/        # Knowledge articles & frameworks
├── journal/         # Daily journal entries
├── projects/        # Project documentation
├── reports/         # Generated reports
├── erate/           # E-Rate leads & research
├── intel/           # Market intelligence
├── activity.json    # Agent activity feed
├── tasks.json       # Task board data
├── deals.json       # Sales pipeline
├── agents.json      # Agent registry
├── commands.json    # Command history
└── config.json      # App configuration
```

Each Markdown file uses YAML frontmatter for metadata:

```yaml
---
title: "Account Research: OHSU"
date: 2026-02-07
tags: [account, healthcare, oregon]
description: "Research notes on Oregon Health Sciences University"
---
```

---

## Project Structure

```
second-brain/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── page.tsx            # Dashboard
│   │   ├── agents/             # Agent fleet management
│   │   ├── ask/                # AI Q&A interface
│   │   ├── chat/               # Chat with agents
│   │   ├── commands/           # Command history
│   │   ├── deals/              # Sales pipeline
│   │   ├── doc/                # Document viewer
│   │   ├── graph/              # Knowledge graph
│   │   ├── tasks/              # Task board
│   │   ├── analytics/          # Analytics dashboard
│   │   ├── activity/           # Activity feed
│   │   ├── settings/           # App settings
│   │   ├── actions/            # Server actions
│   │   └── api/                # API routes
│   ├── components/             # Shared UI components
│   │   ├── CommandBar.tsx      # ⌘K command palette
│   │   ├── NavShell.tsx        # Navigation layout
│   │   ├── Sidebar.tsx         # Desktop sidebar
│   │   ├── DocSidebar.tsx      # Document navigation
│   │   └── NotificationBanner.tsx
│   └── lib/                    # Utilities & data layer
│       ├── documents.ts        # Vault document parser
│       ├── gateway.ts          # OpenClaw gateway client
│       └── vault-index.ts      # Full-text search index
├── vault/                      # Knowledge base (Markdown + JSON)
├── public/                     # Static assets & PWA manifest
├── scripts/                    # Build & utility scripts
└── PLATFORM-SPEC.md            # Detailed product specification
```

---

## Roadmap

### ✅ Phase 0 — Foundation (Complete)
- [x] Next.js 16 + React 19 + Tailwind 4 setup
- [x] Dashboard with live stats and activity feed
- [x] Markdown vault with full-text search
- [x] Command bar for task delegation
- [x] Task board and sales pipeline
- [x] Document viewer with sidebar navigation
- [x] AI-powered Q&A (Gemini)
- [x] Agent registry and status display
- [x] PWA with offline support
- [x] Knowledge graph visualization
- [x] Analytics dashboard

### 🚧 Phase 1 — Real-Time Intelligence (In Progress)
- [ ] SSE/WebSocket for live agent updates
- [ ] Streaming chat responses
- [ ] Agent spawn/pause/kill from UI
- [ ] Enhanced command palette with autocomplete
- [ ] Cost tracking per agent per session

### 📋 Phase 2 — Orchestration
- [ ] Visual pipeline builder (chain agents)
- [ ] Approval gates in pipelines
- [ ] Pipeline templates (Account Research, Meeting Prep, etc.)
- [ ] Model router with budget caps
- [ ] Auto-downgrade to cheaper models at budget threshold

### 🔮 Phase 3 — Integration Hub
- [ ] Gmail / Google Calendar integration
- [ ] Salesforce sync
- [ ] GitHub integration
- [ ] Google Drive integration
- [ ] Multi-channel notifications (push, email digest)

### 🌍 Phase 4 — Platform
- [ ] Multi-user support with auth (passkeys)
- [ ] Public API for third-party integrations
- [ ] Agent template marketplace
- [ ] Plugin system for custom data sources
- [ ] Self-hosted deployment option

---

## Contributing

Contributions are welcome! This is an early-stage project and there's a lot to build.

### How to Contribute

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-thing`)
3. **Commit** your changes (`git commit -m 'Add amazing thing'`)
4. **Push** to the branch (`git push origin feature/amazing-thing`)
5. **Open** a Pull Request

### Development Guidelines

- Use **TypeScript** for all new code
- Follow the existing **Tailwind** design system (gold primary, dark theme)
- Write **tests** for utility functions (Vitest)
- Use **Server Components** by default, client components only when needed
- Keep the **vault/** data format stable (Markdown + YAML frontmatter)

### Good First Issues

- Add more vault document templates
- Improve mobile responsiveness
- Add keyboard shortcuts
- Write tests for existing components
- Improve accessibility (ARIA labels, focus management)

---

## License

MIT License — see [LICENSE](LICENSE) for details.

Built with 🧠 and ☕ by [Samson Scirocco](https://github.com/samsoncirocco-cmyk)

---

<p align="center">
  <sub>Second Brain — Your Personal AI Command Center</sub><br/>
  <sub>Because the best time to build a second brain was yesterday. The second best time is now.</sub>
</p>
