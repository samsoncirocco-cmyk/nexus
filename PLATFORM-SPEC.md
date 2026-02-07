# Second Brain Platform — Product Specification

**Version:** 1.0  
**Date:** February 7, 2026  
**Author:** Paul (AI Agent) for Samson Scirocco  
**Status:** Draft  

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [User Personas](#user-personas)
3. [What Exists Today](#what-exists-today)
4. [Feature Breakdown](#feature-breakdown)
5. [Technical Architecture](#technical-architecture)
6. [Data Model](#data-model)
7. [Phased Roadmap](#phased-roadmap)
8. [Competitive Landscape](#competitive-landscape)
9. [Design Principles](#design-principles)
10. [Open Questions](#open-questions)

---

## Executive Summary

### The Pitch

**Second Brain is an AI command center for people who don't write YAML.**

OpenClaw is powerful. It's also invisible — a daemon, a CLI, config files, Telegram messages. You have to *know* it exists and *know* how to talk to it. That's fine for builders. It's terrible for everyone else.

Second Brain takes everything OpenClaw can do and wraps it in a UI that feels like Linear met ChatGPT and raised a child with Notion. It's the beautiful, opinionated frontend that OpenClaw deserves:

- **See** your agents working in real-time — status, logs, costs, all live
- **Talk** to agents in a proper chat interface, not a Telegram bot
- **Chain** agents together visually — "Research → Draft → Review → Send"
- **Know** what everything costs, how long it takes, which models work best
- **Access** Gmail, Calendar, GitHub, Salesforce, Drive — one unified view
- **Install** it on your phone and get push notifications when agents finish

### Why This Beats Raw OpenClaw

| Dimension | OpenClaw (CLI) | Second Brain (Platform) |
|-----------|---------------|------------------------|
| **Interface** | Terminal + Telegram | Beautiful web UI + PWA |
| **Agent visibility** | `openclaw gateway status` | Live dashboard with logs |
| **Orchestration** | Edit YAML configs | Visual pipeline builder |
| **Model selection** | Config files | Visual router with cost/speed |
| **Integrations** | Manual API calls | Unified hub with OAuth |
| **Cost tracking** | None built-in | Real-time budget dashboard |
| **Mobile** | Telegram (limited) | Full PWA with offline |
| **Learning curve** | Hours | Minutes |

### The Vision

Second Brain started as a personal knowledge base — vault docs, journal entries, concept notes. It's becoming the **control plane for your AI workforce**. Every agent, every task, every integration, every dollar spent — visible, manageable, and beautiful.

Think of it as the evolution from "I have an AI assistant" to "I run an AI operation."

---

## User Personas

### 🎯 Samson (Primary — Power User / Operator)

**Role:** Sales professional, AI enthusiast, platform builder  
**Technical comfort:** High — built the system, understands the architecture  
**Needs:**
- Manage multiple agents across different tasks simultaneously
- Monitor costs across models (Claude, Gemini, GPT)
- Quick access to knowledge base during sales calls
- Mobile access for on-the-go task delegation
- Integration with Salesforce, Gmail, Calendar for work context

**Jobs to be done:**
- "I need to research an account, draft an email, and prep for a meeting — all before lunch"
- "What has my agent been doing while I was in meetings?"
- "How much did I spend on AI this week?"
- "Show me everything I know about Oregon Health Sciences University"

### 🌱 Future User (Secondary — Non-Technical Professional)

**Role:** Knowledge worker who wants AI leverage without engineering  
**Technical comfort:** Low to moderate — uses Notion, Linear, ChatGPT  
**Needs:**
- Simple interface to delegate tasks to AI
- No config files, no CLI, no Telegram setup
- Visual feedback that work is happening
- Trust signals — ability to review before anything goes out

**Jobs to be done:**
- "Research these 5 companies and put the results in a table"
- "Draft a follow-up email based on my last meeting notes"
- "Remind me about this deal next Tuesday"

### 🛠️ Developer (Tertiary — Extending the Platform)

**Role:** Builder who wants to add integrations or customize agents  
**Technical comfort:** High  
**Needs:**
- API access to all platform features
- Webhook support for custom integrations
- Agent template system for reusable workflows
- Plugin architecture for new data sources

---

## What Exists Today

### Current Stack
- **Framework:** Next.js 16 (App Router, React 19, Server Components)
- **Styling:** Tailwind CSS 4 with custom design system
- **Font:** Space Grotesk (display)
- **Hosting:** Vercel
- **Domain:** brain.6eyes.dev
- **AI:** Google Gemini via `@google/generative-ai`
- **Data:** JSON files in vault/ (activity.json, tasks.json), Markdown docs with YAML frontmatter
- **Testing:** Vitest + Testing Library

### Current Features
| Feature | Status | Route |
|---------|--------|-------|
| Dashboard with greeting + stats | ✅ Live | `/` |
| Command bar (issue tasks) | ✅ Live | `/` (component) |
| Activity feed (agent work log) | ✅ Live | `/activity` |
| Task board | ✅ Live | `/tasks` |
| Deals pipeline | ✅ Live | `/deals` |
| Document viewer | ✅ Live | `/doc/[...slug]` |
| AI /ask endpoint (vault Q&A) | ✅ Live | `/ask` |
| Command history | ✅ Live | `/commands` |
| API: activity, search, command | ✅ Live | `/api/*` |

### Design System
```
Colors:
  Primary (Gold):       #fade29
  Background Dark:      #0a0f0c (Deep Space Green)
  Secondary Dark:       #154733 (Muted Forest)
  Background Light:     #f8f8f5

Typography:
  Display:              Space Grotesk
  
Theme:                  Dark only (Oregon Ducks)
Layout:                 Mobile-first, max-w-2xl centered
Icons:                  Material Symbols Outlined
Components:             Cards with border-primary/10, rounded-xl
```

### Backend (OpenClaw)
- **Gateway:** Runs on mcpro-server (port 18789)
- **Agents:** Spawned via CLI, managed via config
- **Channels:** Telegram (primary), Discord (available)
- **Skills:** File I/O, shell exec, web search, browser, messaging
- **Memory:** Markdown files (MEMORY.md, daily notes, vault/)

---

## Feature Breakdown

### P0 — Must Have (MVP)

#### 1. Agent Management Dashboard
**Priority:** P0  
**Complexity:** High  
**Dependencies:** OpenClaw Gateway API

**Description:** Real-time view of all running agents — their status, current task, uptime, model, and resource usage. Spawn new agents, pause/resume, kill from the UI.

**User Stories:**
- As Samson, I want to see all my running agents on one screen so I know what's working
- As Samson, I want to spawn a new agent for a specific task without touching the CLI
- As Samson, I want to kill a stuck agent from my phone
- As Samson, I want to see what model each agent is using and switch it

**UI Design:**
```
┌─────────────────────────────────────────────────┐
│  🤖 Agents (3 active, 1 idle)          [+ New]  │
├─────────────────────────────────────────────────┤
│  ● paul-main          Claude Opus    12m active  │
│    "Writing platform spec..."                    │
│    ████████░░ 80%        $0.42    [⏸] [✕]       │
│                                                  │
│  ● research-agent      Gemini 2.0    3m active   │
│    "Scraping competitor data..."                 │
│    ████░░░░░░ 40%        $0.08    [⏸] [✕]       │
│                                                  │
│  ○ email-drafter       Claude Sonnet  idle       │
│    Last: "Draft sent for review"     $0.00       │
│    2 hours ago                       [▶] [✕]     │
└─────────────────────────────────────────────────┘
```

**Technical Requirements:**
- Poll OpenClaw Gateway API for agent status (initially; WebSocket in P0.2)
- Display: agent name, model, status (active/idle/error/paused), current task description, runtime, cost
- Actions: spawn (with model selector), pause, resume, kill
- Cost tracking per agent per session
- Expandable row to show recent logs (last 20 lines)

**API Integration:**
```
GET  /api/agents                → list all agents + status
POST /api/agents                → spawn new agent
POST /api/agents/:id/pause      → pause agent
POST /api/agents/:id/resume     → resume agent
DELETE /api/agents/:id          → kill agent
GET  /api/agents/:id/logs       → stream logs (SSE)
```

---

#### 2. Real-time Updates (WebSocket/SSE Layer)
**Priority:** P0  
**Complexity:** High  
**Dependencies:** None (infrastructure)

**Description:** The UI should never require a manual refresh. When an agent completes a task, posts activity, or changes status — the UI updates instantly.

**User Stories:**
- As Samson, I want to see activity entries appear in real-time as agents work
- As Samson, I want agent status changes to reflect immediately (no F5)
- As Samson, I want to see log lines streaming live when I expand an agent

**Technical Design:**

Option A: **Server-Sent Events (SSE)** — Recommended for MVP
- Simpler to implement with Next.js API routes
- Works through Vercel's Edge Functions
- One-directional (server → client) is sufficient for status updates
- Native browser support, auto-reconnect

Option B: **WebSocket** — Recommended for V1+
- Required for chat interface (bidirectional)
- Needs separate WebSocket server or Vercel's `@vercel/realtime`
- Better for high-frequency updates

**MVP Implementation (SSE):**
```typescript
// /api/events/route.ts — SSE endpoint
export async function GET() {
  const stream = new ReadableStream({
    start(controller) {
      // Poll OpenClaw gateway every 2s
      // Emit: agent_status, activity_new, task_update, cost_update
      const interval = setInterval(async () => {
        const events = await pollGateway();
        events.forEach(e => {
          controller.enqueue(`data: ${JSON.stringify(e)}\n\n`);
        });
      }, 2000);
    }
  });
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    }
  });
}
```

**Client Hook:**
```typescript
// useRealtimeEvents.ts
function useRealtimeEvents() {
  useEffect(() => {
    const source = new EventSource('/api/events');
    source.onmessage = (e) => {
      const event = JSON.parse(e.data);
      dispatch(event); // Update local state
    };
    return () => source.close();
  }, []);
}
```

**Event Types:**
| Event | Payload | Trigger |
|-------|---------|---------|
| `agent.status` | `{id, status, task, model, cost}` | Agent state change |
| `activity.new` | `{id, type, title, summary, ts}` | New activity posted |
| `task.update` | `{id, column, assignee}` | Task moved/updated |
| `chat.message` | `{agentId, role, content, ts}` | New chat message |
| `cost.update` | `{agentId, session, total}` | Cost threshold hit |

---

#### 3. Conversation Interface
**Priority:** P0  
**Complexity:** Medium  
**Dependencies:** Real-time Updates, OpenClaw message relay

**Description:** Full chat interface to talk with agents. Not just firing commands — actual back-and-forth dialogue with streaming responses, message history, and multi-agent threads.

**User Stories:**
- As Samson, I want to chat with my main agent like I do in Telegram, but in the browser
- As Samson, I want to see the agent's reasoning as it streams in
- As Samson, I want to switch between conversations with different agents
- As Samson, I want to reference vault docs in conversation ("what does my doc on X say?")

**UI Design:**
```
┌─────────────────────────────────────────────────┐
│  ← Agents    💬 paul-main    Claude Opus  ●     │
├─────────────────────────────────────────────────┤
│                                                  │
│  ┌──────────────────────────────────────┐       │
│  │ 🧑 Research Palo Alto's latest SLED  │       │
│  │    wins in Oregon and summarize      │       │
│  └──────────────────────────────────────┘       │
│                                                  │
│  ┌──────────────────────────────────────┐       │
│  │ 🤖 I found 3 recent wins:            │       │
│  │                                      │       │
│  │ 1. **Portland Public Schools**       │       │
│  │    $2.1M NGFW refresh, Q4 2025      │       │
│  │                                      │       │
│  │ 2. **Oregon State University**       │       │
│  │    Prisma Cloud deployment...        │       │
│  │    ░░░░ streaming...                 │       │
│  └──────────────────────────────────────┘       │
│                                                  │
├─────────────────────────────────────────────────┤
│  [📎] Type a message...              [Send ➤]   │
│                                                  │
│  💡 Quick: [Summarize inbox] [Draft email]       │
│            [Check calendar] [Research account]   │
└─────────────────────────────────────────────────┘
```

**Technical Requirements:**
- WebSocket connection for real-time message streaming
- Markdown rendering in chat bubbles (with syntax highlighting)
- File/image attachments
- Message history persisted to database
- Quick action buttons (configurable shortcuts)
- Agent selector sidebar — switch between active conversations
- Typing indicators and read receipts
- Citation links when agent references vault docs

**Architecture:**
```
Browser ←WebSocket→ Next.js API ←HTTP→ OpenClaw Gateway ←→ Agent
                                   ↕
                              Message Store (DB)
```

---

#### 4. Enhanced Command Bar
**Priority:** P0  
**Complexity:** Medium  
**Dependencies:** Agent Management

**Description:** Upgrade the existing command bar from a simple text input to an intelligent command palette — think Spotlight/Raycast but for AI agents.

**User Stories:**
- As Samson, I want to press `⌘K` from anywhere to issue a command
- As Samson, I want autocomplete for common actions (research, draft, schedule)
- As Samson, I want to target a specific agent or model from the command bar
- As Samson, I want to see command history and re-run past commands

**Capabilities:**
```
⌘K opens command palette:

> research OHSU cybersecurity budget
  → [paul-main] [Claude Opus] [Run ➤]

> /agents               → List active agents
> /spawn research       → Create new agent
> /ask what is E-Rate    → Query knowledge base
> /draft email to John   → Draft in email composer
> /cost                  → Show today's spending
> /model switch sonnet   → Change model for active agent
```

---

### P1 — Should Have (V1)

#### 5. Multi-Agent Orchestration / Pipeline Builder
**Priority:** P1  
**Complexity:** Very High  
**Dependencies:** Agent Management, Conversation Interface

**Description:** Visual pipeline builder where you chain agents together. Define workflows that execute sequentially or in parallel with approval gates.

**User Stories:**
- As Samson, I want to create a pipeline: "Research account → Draft email → I approve → Send"
- As Samson, I want to save reusable pipelines as templates
- As Samson, I want to see pipeline execution in real-time with step status
- As Samson, I want approval gates — the pipeline pauses until I say "go"

**UI Design:**
```
Pipeline: Account Research & Outreach
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
  │ Research  │────▶│  Draft   │────▶│ Approve  │────▶│  Send    │
  │ Account   │     │  Email   │     │ (Human)  │     │  Email   │
  │           │     │          │     │          │     │          │
  │ ✅ Done   │     │ 🔄 Active│     │ ⏸ Waiting│     │ ○ Queued │
  │ 2m 14s    │     │ 0m 45s   │     │          │     │          │
  │ $0.12     │     │ $0.03    │     │          │     │          │
  └──────────┘     └──────────┘     └──────────┘     └──────────┘
  
  Total: $0.15 | Elapsed: 2m 59s | ETA: ~1m remaining
```

**Pipeline Definition Model:**
```typescript
interface Pipeline {
  id: string;
  name: string;
  description: string;
  steps: PipelineStep[];
  triggers: PipelineTrigger[];  // manual, scheduled, webhook
  status: 'draft' | 'active' | 'paused' | 'completed' | 'failed';
}

interface PipelineStep {
  id: string;
  type: 'agent' | 'approval' | 'condition' | 'integration';
  name: string;
  config: {
    agentId?: string;
    model?: string;
    prompt?: string;
    timeout?: number;
    retries?: number;
    approvers?: string[];
    condition?: string;  // JS expression evaluated against prior step output
  };
  inputs: string[];   // step IDs this depends on
  outputs: string[];  // step IDs that depend on this
  status: 'queued' | 'active' | 'waiting' | 'completed' | 'failed' | 'skipped';
}
```

**Built-in Templates:**
1. **Account Research & Outreach** — Research → Draft → Approve → Send
2. **Meeting Prep** — Pull calendar → Research attendees → Generate briefing
3. **Content Pipeline** — Research topic → Outline → Draft → Edit → Publish
4. **Deal Qualification** — Scrape website → Check budget signals → Score → Route
5. **Daily Digest** — Check email → Scan calendar → Review tasks → Generate summary

---

#### 6. Knowledge Graph Visualization
**Priority:** P1  
**Complexity:** High  
**Dependencies:** Vault data, document relationships

**Description:** Interactive force-directed graph showing connections between vault documents, projects, people, accounts, and decisions. Click a node to preview; double-click to open the full document.

**User Stories:**
- As Samson, I want to see how my knowledge base is connected
- As Samson, I want to discover relationships I didn't know existed
- As Samson, I want to click a person node and see all related docs/deals/tasks
- As Samson, I want to search the graph and zoom to relevant clusters

**Technical Design:**
- Use D3.js force-directed graph or react-force-graph
- Parse YAML frontmatter tags for automatic relationship detection
- NLP-based link extraction (entity recognition across docs)
- Filter by: category, date range, tags, entity type
- Cluster: by project, by person, by topic

**Node Types:**
| Type | Icon | Color | Source |
|------|------|-------|--------|
| Document | 📄 | Gold | vault/ markdown files |
| Person | 👤 | Green | Extracted from docs |
| Account | 🏢 | Blue | vault/accounts/ |
| Project | 🚀 | Purple | vault/projects/ |
| Decision | ⚡ | Orange | Tagged in frontmatter |
| Task | ✅ | Teal | tasks.json |
| Deal | 💰 | Gold | deals pipeline |

**Relationship Detection:**
1. **Explicit:** YAML frontmatter `related:` field
2. **Tag-based:** Documents sharing tags
3. **Mention-based:** Document A mentions entity from Document B
4. **Temporal:** Documents from same day/week
5. **AI-inferred:** Gemini analyzes doc pairs for semantic similarity

---

#### 7. Notification System
**Priority:** P1  
**Complexity:** Medium  
**Dependencies:** Real-time Updates, PWA

**Description:** Multi-channel notification system — browser push, in-app toast, email digest. Priority routing so important things get through, routine things batch.

**Notification Channels:**
| Channel | Use Case | Latency |
|---------|----------|---------|
| In-app toast | Agent completed task | Instant |
| Browser push | Approval needed, error | Instant |
| Email digest | Daily summary | Batched (8am) |
| Mobile push (PWA) | Urgent: agent error, approval | Instant |

**Priority Levels:**
```
P0 (Urgent):    Agent error, approval gate, budget alert
                → Push notification + sound + badge
                
P1 (Important): Task completed, email arrived, meeting reminder
                → Push notification + badge
                
P2 (FYI):       Activity logged, doc updated, cost update
                → In-app only, batched
                
P3 (Quiet):     Heartbeat check, memory update
                → No notification, log only
```

**User Preferences:**
- Per-channel enable/disable
- Quiet hours (e.g., 11pm–8am)
- Per-agent notification level
- Digest frequency (daily/weekly/off)

---

#### 8. Model Router
**Priority:** P1  
**Complexity:** Medium  
**Dependencies:** Agent Management, Cost Tracking

**Description:** Visual interface for selecting which AI model powers each task. See cost/speed/quality tradeoffs at a glance. Set budget caps.

**UI Design:**
```
┌─────────────────────────────────────────────────┐
│  🧠 Model Router                                │
├─────────────────────────────────────────────────┤
│                                                  │
│  ┌─────────────────────────────────────────┐    │
│  │ Task: Research account                  │    │
│  │                                          │    │
│  │  ◉ Claude Opus      $$$  ⚡⚡  🧠🧠🧠   │    │
│  │  ○ Claude Sonnet     $$   ⚡⚡⚡ 🧠🧠     │    │
│  │  ○ Gemini 2.5 Pro    $$   ⚡⚡⚡ 🧠🧠     │    │
│  │  ○ Claude Haiku      $    ⚡⚡⚡⚡ 🧠       │    │
│  │  ○ GPT-4o            $$   ⚡⚡⚡ 🧠🧠     │    │
│  │                                          │    │
│  │  Est. cost: $0.15  |  Est. time: 45s    │    │
│  └─────────────────────────────────────────┘    │
│                                                  │
│  📊 Budget                                      │
│  ├─ Daily:   $2.40 / $10.00  ████░░░░░░        │
│  ├─ Weekly:  $14.20 / $50.00 ██████░░░░        │
│  └─ Monthly: $48.00 / $200   █████░░░░░        │
│                                                  │
│  ⚠️ Auto-downgrade to Sonnet when daily > $8    │
└─────────────────────────────────────────────────┘
```

**Features:**
- Default model per task type (research → Opus, drafts → Sonnet, summaries → Haiku)
- Budget caps: daily, weekly, monthly with alert thresholds
- Auto-downgrade: switch to cheaper model when approaching budget
- Cost history chart (daily/weekly/monthly trends)
- Per-model performance scores based on task outcomes
- A/B comparison: run same task on two models, compare output

---

### P2 — Nice to Have (V2)

#### 9. Mobile PWA
**Priority:** P2  
**Complexity:** High  
**Dependencies:** All P0 features stable

**Description:** Installable Progressive Web App optimized for mobile. Bottom navigation, swipe gestures, offline capability, push notifications.

**PWA Requirements:**
- `manifest.json` with Oregon Ducks themed icons
- Service worker for offline caching (app shell + recent data)
- Bottom navigation bar (Dashboard, Agents, Chat, Vault, Settings)
- Pull-to-refresh on all list views
- Swipe gestures: left to archive, right to approve
- Haptic feedback on actions (where supported)
- Add-to-homescreen prompt

**Offline Capabilities:**
| Feature | Offline Support |
|---------|----------------|
| Read vault docs | ✅ Cached |
| View activity feed | ✅ Last sync |
| Send commands | 📝 Queued, sync when online |
| Chat with agents | ❌ Requires connection |
| View dashboards | ✅ Last snapshot |

**Bottom Navigation:**
```
┌──────────────────────────────────────┐
│                                      │
│          [Main Content Area]         │
│                                      │
├──────────────────────────────────────┤
│  🏠    🤖    💬    📚    ⚙️         │
│ Home  Agents  Chat  Vault  Settings  │
└──────────────────────────────────────┘
```

---

#### 10. Integration Hub
**Priority:** P2  
**Complexity:** Very High  
**Dependencies:** OAuth infrastructure, per-service API work

**Description:** Unified view of all connected services. See emails, calendar events, GitHub PRs, Salesforce deals, and Drive files in one place. Agents can read from and write to these services.

**Integrations (Priority Order):**

| Integration | Read | Write | Agent Access | Auth |
|-------------|------|-------|--------------|------|
| Gmail | ✅ Inbox, search | ✅ Draft, send | ✅ | OAuth2 |
| Google Calendar | ✅ Events | ✅ Create/update | ✅ | OAuth2 |
| Google Drive | ✅ Files, search | ✅ Upload, create | ✅ | OAuth2 |
| Salesforce | ✅ Accounts, deals | ✅ Update fields | ✅ | OAuth2 |
| GitHub | ✅ Repos, PRs, issues | ✅ Create issues | ✅ | OAuth App |
| Outlook | ✅ Via existing API | ✅ Draft | ✅ | Bridge (existing) |
| Slack | ✅ Messages | ✅ Post | ✅ | Bot Token |
| Linear | ✅ Issues | ✅ Create/update | ✅ | API Key |

**UI: Integration Hub Page**
```
┌─────────────────────────────────────────────────┐
│  🔌 Integrations                                │
├─────────────────────────────────────────────────┤
│                                                  │
│  ✅ Gmail          samson@...      [Manage]      │
│     12 unread · Last sync 2m ago                │
│                                                  │
│  ✅ Google Calendar  samson@...    [Manage]      │
│     3 events today · Next: 2pm standup          │
│                                                  │
│  ✅ Salesforce     fortinet.my...  [Manage]      │
│     8 active deals · $1.2M pipeline             │
│                                                  │
│  ⬚ GitHub         Not connected   [Connect]     │
│  ⬚ Linear         Not connected   [Connect]     │
│                                                  │
└─────────────────────────────────────────────────┘
```

**Agent Integration Protocol:**
Agents can reference integrations in commands:
```
"Check my inbox for anything from Portland Public Schools"
→ Agent queries Gmail API → Returns relevant emails

"Create a Salesforce task to follow up with OHSU next week"  
→ Agent creates task via SF API → Confirms in chat
```

---

#### 11. Analytics Dashboard
**Priority:** P2  
**Complexity:** Medium  
**Dependencies:** Cost tracking data, agent logs

**Description:** Comprehensive analytics on agent performance, cost trends, task completion rates, and model efficiency.

**Dashboard Panels:**
```
┌─────────────────────────────────────────────────┐
│  📊 Analytics                    [7d ▾]         │
├─────────────────────────────────────────────────┤
│                                                  │
│  ┌──────────────┐  ┌──────────────┐             │
│  │ Tasks Done   │  │ Total Cost   │             │
│  │    47         │  │   $23.40     │             │
│  │  ↑12% vs last│  │  ↓8% vs last │             │
│  └──────────────┘  └──────────────┘             │
│                                                  │
│  Cost by Model (7d)                             │
│  ┌──────────────────────────────────┐           │
│  │ █████████████░░░ Opus    $15.20  │           │
│  │ ████████░░░░░░░ Sonnet   $5.80  │           │
│  │ ███░░░░░░░░░░░░ Gemini   $2.40  │           │
│  └──────────────────────────────────┘           │
│                                                  │
│  Agent Efficiency                                │
│  ┌──────────────────────────────────┐           │
│  │ paul-main:     4.2 tasks/day    │           │
│  │ research:      2.8 tasks/day    │           │
│  │ email-drafter: 6.1 tasks/day    │           │
│  └──────────────────────────────────┘           │
│                                                  │
│  Daily Cost Trend (30d)                         │
│  $5 ┤                                           │
│  $4 ┤     ╭─╮                                   │
│  $3 ┤  ╭──╯ ╰──╮    ╭─╮                        │
│  $2 ┤──╯       ╰────╯ ╰──╮                     │
│  $1 ┤                     ╰──                   │
│     └──────────────────────────                 │
│                                                  │
└─────────────────────────────────────────────────┘
```

**Tracked Metrics:**
- Tasks completed per day/week/month
- Cost per task (average, by type, by model)
- Cost per agent
- Model usage distribution
- Average task duration
- Error rate / retry rate
- Most expensive tasks
- Cost savings from model routing (Opus vs Sonnet for same quality)

---

## Technical Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Second Brain Platform                      │
│                    (brain.6eyes.dev)                          │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                    Next.js 16 App                     │   │
│  │                                                       │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌──────────┐  │   │
│  │  │Dashboard│ │ Agents  │ │  Chat   │ │  Vault   │  │   │
│  │  │  Page   │ │  Page   │ │  Page   │ │  Pages   │  │   │
│  │  └────┬────┘ └────┬────┘ └────┬────┘ └────┬─────┘  │   │
│  │       │           │           │            │         │   │
│  │  ┌────▼───────────▼───────────▼────────────▼─────┐  │   │
│  │  │           React Client Components              │  │   │
│  │  │  useAgents() useChat() useEvents() useVault()  │  │   │
│  │  └──────────────────┬─────────────────────────────┘  │   │
│  │                     │                                 │   │
│  │  ┌──────────────────▼─────────────────────────────┐  │   │
│  │  │              API Routes (Edge)                  │  │   │
│  │  │  /api/agents  /api/chat  /api/events  /api/*   │  │   │
│  │  └──────────────────┬─────────────────────────────┘  │   │
│  └─────────────────────┼────────────────────────────────┘   │
│                        │                                     │
│  ┌─────────────────────▼────────────────────────────────┐   │
│  │              Gateway Bridge Layer                     │   │
│  │   Translates between Second Brain API and OpenClaw   │   │
│  │                                                       │   │
│  │  • Auth (API key / session token)                    │   │
│  │  • Request transformation                            │   │
│  │  • SSE/WebSocket relay                               │   │
│  │  • Response caching                                  │   │
│  │  • Cost metering                                     │   │
│  └─────────────────────┬────────────────────────────────┘   │
└────────────────────────┼────────────────────────────────────┘
                         │ HTTPS / WSS
                         │
┌────────────────────────▼────────────────────────────────────┐
│                  OpenClaw Gateway                            │
│                  (mcpro-server:18789)                        │
│                                                              │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐        │
│  │   Agent       │ │   Message    │ │   Session    │        │
│  │   Manager     │ │   Router     │ │   Manager    │        │
│  └──────┬───────┘ └──────┬───────┘ └──────┬───────┘        │
│         │                │                │                  │
│  ┌──────▼────────────────▼────────────────▼───────────┐     │
│  │                  Agent Runtime                      │     │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐              │     │
│  │  │ Agent 1 │ │ Agent 2 │ │ Agent N │              │     │
│  │  │ (Claude) │ │(Gemini) │ │ (GPT)   │              │     │
│  │  └─────────┘ └─────────┘ └─────────┘              │     │
│  └────────────────────────────────────────────────────┘     │
│                                                              │
│  ┌────────────────────────────────────────────────────┐     │
│  │                 Skills / Tools                      │     │
│  │  File I/O · Shell · Web · Browser · Messaging      │     │
│  │  Nodes · Calendar · Email · Search                  │     │
│  └────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

### Technology Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Frontend** | Next.js 16, React 19, Tailwind 4 | Already in use, excellent DX |
| **Real-time** | SSE (MVP), WebSocket (V1) | Progressive complexity |
| **State** | React Server Components + client hooks | Next.js native patterns |
| **Database** | SQLite (local) → Turso (edge) | Start simple, scale later |
| **Auth** | NextAuth.js with passkeys | Passwordless, modern |
| **Hosting** | Vercel (frontend), mcpro-server (gateway) | Existing infrastructure |
| **Charts** | Recharts or Tremor | React-native, Tailwind-compatible |
| **Graph Viz** | react-force-graph or d3-force | Interactive, performant |
| **PWA** | next-pwa or Serwist | Service worker + manifest |

### Gateway Bridge Design

The critical architectural challenge: **Second Brain runs on Vercel (edge), OpenClaw runs on mcpro-server (home network).** 

**Solution: Secure Tunnel + API Bridge**

```
Vercel Edge ──HTTPS──▶ Cloudflare Tunnel ──▶ mcpro-server:18789
                       (or Tailscale)
```

**Authentication Flow:**
1. User logs into Second Brain (passkey/OAuth)
2. Next.js API route receives request
3. Bridge layer adds OpenClaw API key
4. Request forwarded to Gateway via secure tunnel
5. Response streamed back to client

**Why not expose Gateway directly?**
- Security: Gateway has full system access
- Rate limiting: Need to control costs
- Transformation: Gateway API format ≠ ideal UI format
- Caching: Reduce redundant calls
- Metering: Track costs at the bridge layer

---

## Data Model

### Core Entities

```typescript
// ═══════════════════════════════════════════
// AGENTS
// ═══════════════════════════════════════════

interface Agent {
  id: string;                    // "paul-main"
  name: string;                  // "Paul"
  description: string;           // "Primary assistant"
  model: ModelId;                // "claude-opus-4"
  status: AgentStatus;           // "active" | "idle" | "paused" | "error"
  currentTask: string | null;    // "Writing platform spec..."
  uptime: number;                // seconds since spawn
  totalCost: number;             // cumulative USD
  sessionCost: number;           // current session USD
  config: AgentConfig;
  createdAt: Date;
  lastActiveAt: Date;
}

type AgentStatus = 'active' | 'idle' | 'paused' | 'error' | 'spawning' | 'terminated';

interface AgentConfig {
  model: ModelId;
  temperature: number;
  maxTokens: number;
  tools: string[];               // enabled tool names
  systemPrompt?: string;
  memoryEnabled: boolean;
  budgetLimit?: number;          // max USD per session
}

// ═══════════════════════════════════════════
// CONVERSATIONS
// ═══════════════════════════════════════════

interface Conversation {
  id: string;
  agentId: string;
  title: string;                 // auto-generated or user-set
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
  pinned: boolean;
  archived: boolean;
}

interface Message {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;               // markdown
  attachments: Attachment[];
  citations: Citation[];         // vault doc references
  model: ModelId;                // which model generated this
  cost: number;                  // USD for this message
  tokens: { input: number; output: number };
  createdAt: Date;
}

interface Citation {
  docId: string;                 // vault doc path
  title: string;
  excerpt: string;               // relevant snippet
  relevance: number;             // 0-1 score
}

// ═══════════════════════════════════════════
// PIPELINES
// ═══════════════════════════════════════════

interface Pipeline {
  id: string;
  name: string;
  description: string;
  steps: PipelineStep[];
  status: PipelineStatus;
  trigger: PipelineTrigger;
  runs: PipelineRun[];
  createdAt: Date;
  updatedAt: Date;
  isTemplate: boolean;
}

type PipelineStatus = 'draft' | 'active' | 'paused' | 'archived';

interface PipelineStep {
  id: string;
  pipelineId: string;
  type: 'agent_task' | 'approval' | 'condition' | 'delay' | 'integration' | 'notification';
  name: string;
  position: { x: number; y: number };  // for visual builder
  config: StepConfig;
  dependsOn: string[];           // step IDs that must complete first
}

interface StepConfig {
  // For agent_task
  agentId?: string;
  model?: ModelId;
  prompt?: string;
  timeout?: number;
  
  // For approval
  approvers?: string[];
  autoApproveAfter?: number;     // minutes
  
  // For condition
  expression?: string;           // evaluated against prior step output
  trueStepId?: string;
  falseStepId?: string;
  
  // For integration
  service?: string;              // "gmail" | "salesforce" | etc
  action?: string;               // "send_email" | "create_task"
  params?: Record<string, unknown>;
  
  // For delay
  delayMinutes?: number;
}

interface PipelineRun {
  id: string;
  pipelineId: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled' | 'waiting_approval';
  stepResults: StepResult[];
  totalCost: number;
  startedAt: Date;
  completedAt: Date | null;
  triggeredBy: string;           // "user" | "schedule" | "webhook"
}

interface StepResult {
  stepId: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'skipped' | 'waiting';
  output: string | null;
  cost: number;
  duration: number;              // seconds
  startedAt: Date;
  completedAt: Date | null;
  error: string | null;
}

// ═══════════════════════════════════════════
// KNOWLEDGE GRAPH
// ═══════════════════════════════════════════

interface GraphNode {
  id: string;
  type: 'document' | 'person' | 'account' | 'project' | 'decision' | 'task' | 'deal';
  label: string;
  metadata: Record<string, unknown>;
  tags: string[];
  lastModified: Date;
}

interface GraphEdge {
  source: string;                // node ID
  target: string;                // node ID
  type: 'references' | 'tagged' | 'mentions' | 'temporal' | 'semantic';
  weight: number;                // 0-1 strength
  metadata?: Record<string, unknown>;
}

// ═══════════════════════════════════════════
// COST TRACKING
// ═══════════════════════════════════════════

interface CostEntry {
  id: string;
  agentId: string;
  model: ModelId;
  taskType: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;                  // USD
  timestamp: Date;
  conversationId?: string;
  pipelineRunId?: string;
}

interface Budget {
  daily: number;                 // USD limit
  weekly: number;
  monthly: number;
  alertThreshold: number;        // 0-1 (e.g., 0.8 = alert at 80%)
  autoDowngrade: {
    enabled: boolean;
    threshold: number;           // 0-1 of daily budget
    fromModel: ModelId;
    toModel: ModelId;
  };
}

// ═══════════════════════════════════════════
// MODELS
// ═══════════════════════════════════════════

type ModelId = 
  | 'claude-opus-4'
  | 'claude-sonnet-4'
  | 'claude-haiku-3.5'
  | 'gemini-2.5-pro'
  | 'gemini-2.5-flash'
  | 'gpt-4o'
  | 'gpt-4o-mini';

interface ModelProfile {
  id: ModelId;
  name: string;
  provider: 'anthropic' | 'google' | 'openai';
  costPer1kInput: number;
  costPer1kOutput: number;
  speedRating: 1 | 2 | 3 | 4 | 5;    // 5 = fastest
  qualityRating: 1 | 2 | 3 | 4 | 5;  // 5 = best
  contextWindow: number;
  bestFor: string[];             // ["research", "coding", "creative"]
}

// ═══════════════════════════════════════════
// NOTIFICATIONS
// ═══════════════════════════════════════════

interface Notification {
  id: string;
  type: 'agent_complete' | 'approval_needed' | 'error' | 'budget_alert' | 'reminder' | 'integration';
  priority: 0 | 1 | 2 | 3;
  title: string;
  body: string;
  actionUrl?: string;
  read: boolean;
  channels: ('push' | 'email' | 'in_app')[];
  createdAt: Date;
  readAt: Date | null;
}

// ═══════════════════════════════════════════
// INTEGRATIONS
// ═══════════════════════════════════════════

interface Integration {
  id: string;
  service: string;               // "gmail" | "salesforce" | etc
  status: 'connected' | 'disconnected' | 'error';
  credentials: EncryptedCredentials;
  lastSync: Date;
  config: Record<string, unknown>;
  permissions: string[];         // scopes granted
}
```

### Database Schema (SQLite / Turso)

```sql
-- Core tables
CREATE TABLE agents (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  model TEXT NOT NULL,
  status TEXT DEFAULT 'idle',
  config JSON,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_active_at DATETIME
);

CREATE TABLE conversations (
  id TEXT PRIMARY KEY,
  agent_id TEXT REFERENCES agents(id),
  title TEXT,
  pinned BOOLEAN DEFAULT FALSE,
  archived BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT REFERENCES conversations(id),
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  model TEXT,
  cost REAL DEFAULT 0,
  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE pipelines (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'draft',
  is_template BOOLEAN DEFAULT FALSE,
  config JSON,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE pipeline_steps (
  id TEXT PRIMARY KEY,
  pipeline_id TEXT REFERENCES pipelines(id),
  type TEXT NOT NULL,
  name TEXT NOT NULL,
  config JSON,
  depends_on JSON,
  position JSON
);

CREATE TABLE pipeline_runs (
  id TEXT PRIMARY KEY,
  pipeline_id TEXT REFERENCES pipelines(id),
  status TEXT DEFAULT 'running',
  total_cost REAL DEFAULT 0,
  triggered_by TEXT,
  started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME
);

CREATE TABLE cost_entries (
  id TEXT PRIMARY KEY,
  agent_id TEXT REFERENCES agents(id),
  model TEXT NOT NULL,
  task_type TEXT,
  input_tokens INTEGER,
  output_tokens INTEGER,
  cost REAL NOT NULL,
  conversation_id TEXT,
  pipeline_run_id TEXT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE notifications (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  priority INTEGER DEFAULT 2,
  title TEXT NOT NULL,
  body TEXT,
  action_url TEXT,
  read BOOLEAN DEFAULT FALSE,
  channels JSON,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  read_at DATETIME
);

CREATE TABLE integrations (
  id TEXT PRIMARY KEY,
  service TEXT NOT NULL UNIQUE,
  status TEXT DEFAULT 'disconnected',
  credentials_encrypted BLOB,
  last_sync DATETIME,
  config JSON,
  permissions JSON
);

-- Indexes
CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at);
CREATE INDEX idx_cost_entries_agent ON cost_entries(agent_id, timestamp);
CREATE INDEX idx_cost_entries_date ON cost_entries(timestamp);
CREATE INDEX idx_notifications_unread ON notifications(read, created_at);
CREATE INDEX idx_pipeline_runs_status ON pipeline_runs(pipeline_id, status);
```

---

## Phased Roadmap

### Phase 0: Foundation (Weeks 1-2)
**Goal:** Infrastructure for everything else

| Task | Description | Effort |
|------|-------------|--------|
| Database setup | SQLite + Drizzle ORM for type-safe queries | 2d |
| Auth system | NextAuth.js with passkey support | 2d |
| Gateway bridge | Secure tunnel (Cloudflare/Tailscale) to mcpro-server | 2d |
| SSE infrastructure | EventSource endpoint + React hooks | 2d |
| Design system formalization | Component library (Button, Card, Modal, Toast, etc.) | 2d |

**Deliverables:**
- [ ] Authenticated access to Second Brain
- [ ] Database with migrations
- [ ] Live connection to OpenClaw Gateway
- [ ] SSE working with test events
- [ ] Reusable component library

---

### Phase 1: MVP (Weeks 3-6)
**Goal:** Replace Telegram as the primary interface

| Task | Priority | Effort |
|------|----------|--------|
| Agent dashboard — list, status, spawn, kill | P0 | 5d |
| Agent log viewer — expandable, streaming | P0 | 3d |
| Chat interface — send/receive, streaming | P0 | 5d |
| Enhanced command bar — ⌘K, autocomplete | P0 | 3d |
| Real-time activity feed (SSE-powered) | P0 | 2d |
| Cost tracking — per agent, per session | P0 | 2d |
| Mobile responsive polish | P0 | 2d |

**Deliverables:**
- [ ] Agent management from the browser
- [ ] Chat with agents (replaces Telegram)
- [ ] Live-updating activity feed
- [ ] Cost visibility per agent
- [ ] ⌘K command palette

**Success Metric:** Samson uses the web UI instead of Telegram for 80%+ of agent interactions.

---

### Phase 2: V1 — Power Features (Weeks 7-12)
**Goal:** Things Telegram can't do

| Task | Priority | Effort |
|------|----------|--------|
| Pipeline builder — visual, drag-and-drop | P1 | 10d |
| Pipeline templates (5 built-in) | P1 | 3d |
| Approval gates — in-browser approve/reject | P1 | 3d |
| Knowledge graph — force-directed visualization | P1 | 5d |
| Model router — visual model selection + budget | P1 | 4d |
| Notification system — push + in-app + digest | P1 | 5d |
| Analytics v1 — cost charts, task completion | P1 | 4d |

**Deliverables:**
- [ ] Visual pipeline builder with 5 templates
- [ ] Interactive knowledge graph
- [ ] Model selection with budget controls
- [ ] Push notifications
- [ ] Analytics dashboard

**Success Metric:** First multi-step pipeline runs end-to-end without CLI intervention.

---

### Phase 3: V2 — Platform (Weeks 13-20)
**Goal:** Full platform for non-technical users

| Task | Priority | Effort |
|------|----------|--------|
| PWA — installable, offline, bottom nav | P2 | 5d |
| Integration Hub — Gmail, Calendar, Drive | P2 | 8d |
| Integration Hub — Salesforce, GitHub | P2 | 6d |
| Advanced analytics — model comparison, trends | P2 | 4d |
| Agent templates — save/share agent configs | P2 | 3d |
| Onboarding flow — first-run experience | P2 | 3d |
| Multi-user support — shared agents, permissions | P2 | 5d |
| Webhook API — external triggers for pipelines | P2 | 3d |

**Deliverables:**
- [ ] Installable PWA on mobile
- [ ] 5+ integrations connected and visible
- [ ] Comprehensive analytics
- [ ] Sharable agent/pipeline templates
- [ ] External webhook triggers

**Success Metric:** A non-technical user can install the app and run their first agent within 5 minutes.

---

### Future (V3+)
- **Marketplace** — share and discover agent templates, pipeline templates
- **Team features** — shared agents, role-based access, audit logs
- **Voice interface** — talk to agents via browser microphone
- **Custom agent builder** — define agent personality, tools, and knowledge in the UI
- **Plugin SDK** — third-party developers build integrations
- **Self-hosting guide** — run Second Brain on your own infrastructure
- **White-label** — offer Second Brain as a product for other teams

---

## Competitive Landscape

### Direct Competitors

| Product | What It Does | Strengths | Weaknesses | Second Brain Advantage |
|---------|-------------|-----------|------------|----------------------|
| **OpenClaw** | CLI + Telegram AI agent platform | Powerful, flexible, multi-model, multi-channel | No visual UI, config-file-heavy, requires technical knowledge | We ARE the UI for OpenClaw — same power, 10x more accessible |
| **ChatGPT** | Conversational AI with GPTs | Best-in-class chat UX, huge ecosystem, GPT Store | No agent orchestration, no real-time background tasks, no integrations hub | Multi-agent, persistent memory, pipeline automation, integration hub |
| **Claude.ai** | Conversational AI with Projects/Artifacts | Excellent reasoning, Projects for context, Artifacts for creation | Single-threaded, no background agents, no pipeline automation | Background agents that work while you don't, visual orchestration |
| **Cursor** | AI-powered code editor | Best coding AI experience, inline completions | Code-only, not a general agent platform | General-purpose: research, email, sales, knowledge management |
| **Devin** | Autonomous coding agent | Full autonomy, runs for hours, handles complex PRs | Expensive ($500/mo), code-only, opaque process | Transparent, affordable, general-purpose, user-controlled |
| **AutoGPT / AgentGPT** | Open-source autonomous agents | Free, open-source, community-driven | Unreliable, no UI polish, limited practical use | Production-grade reliability, beautiful UI, practical workflows |
| **Langflow / Flowise** | Visual LLM pipeline builder | Drag-and-drop, open-source | Developer-focused, no agent management, no integrations | Full platform: agents + chat + pipelines + integrations + analytics |
| **Notion AI** | AI-assisted workspace | Beautiful UI, deep integration with Notion data | Reactive only (Q&A), no background agents, limited to Notion ecosystem | Proactive agents, cross-platform integrations, pipeline automation |
| **Linear** | Project management | Best-in-class issue tracking UI, fast, opinionated | No AI agents, no knowledge base, no integrations hub | AI-native from day one, knowledge + tasks + agents unified |

### Positioning Matrix

```
                    Beautiful UI
                        ▲
                        │
          Notion AI  ●  │  ● Second Brain (target)
                        │
           Linear ●     │      ● Claude.ai
                        │
          ChatGPT ●     │
                        │
  ────────────────────┼──────────────────► Agent Power
                        │
        AutoGPT ●       │     ● Devin
                        │
        Langflow ●      │  ● OpenClaw
                        │
                    Ugly / CLI
```

### Why Second Brain Wins

1. **It's the only platform that combines:**
   - Beautiful, opinionated UI (like Linear)
   - Multi-agent orchestration (like AutoGPT, but reliable)
   - Conversational AI (like ChatGPT)
   - Knowledge management (like Notion)
   - Pipeline automation (like Langflow)
   - Integration hub (like Zapier)

2. **It's built on proven infrastructure:**
   - OpenClaw provides the battle-tested agent runtime
   - We don't reinvent — we present

3. **It's designed for operators, not engineers:**
   - No YAML, no CLI, no config files
   - Visual everything: pipelines, model selection, knowledge graph
   - Install on your phone and go

4. **It grows with you:**
   - Start with chat (like ChatGPT)
   - Add pipelines when ready (like Zapier)
   - Connect integrations as needed (like IFTTT)
   - Track costs as you scale (like a business)

---

## Design Principles

### 1. Opinionated Over Flexible
Don't give users 50 options. Give them the right one. Linear won by making decisions for you. So do we.

### 2. Real-time by Default
Nothing should require a refresh. If an agent finishes a task, the user should see it immediately. SSE/WebSocket everywhere.

### 3. Mobile-First, Desktop-Capable
Design for the phone in Samson's pocket, then expand for the monitor on his desk. Not the other way around.

### 4. Transparency > Magic
Show the work. Show the cost. Show the model. Show the time. Users should always know what's happening and what it costs. No black boxes.

### 5. Oregon Ducks DNA
Dark green (#154733), gold (#fade29), deep space (#0a0f0c). Space Grotesk. This isn't a generic SaaS — it has personality and identity.

### 6. Progressive Disclosure
Dashboard shows the essentials. Expand for details. Click through for the full picture. Never overwhelm, always available.

### 7. Keyboard-First
⌘K for everything. Power users should never touch the mouse. But the mouse should work beautifully too.

---

## Open Questions

| # | Question | Impact | Needs Decision By |
|---|----------|--------|-------------------|
| 1 | **Database choice:** SQLite (local) vs Turso (edge-compatible) vs Supabase (hosted Postgres)? | Architecture | Phase 0 |
| 2 | **Tunnel solution:** Cloudflare Tunnel vs Tailscale vs ngrok for Gateway bridge? | Infrastructure | Phase 0 |
| 3 | **Auth approach:** Single-user (just Samson) vs multi-user from the start? | Scope | Phase 0 |
| 4 | **Cost data source:** Instrument at Gateway level or rely on provider APIs? | Accuracy | Phase 1 |
| 5 | **Pipeline persistence:** Store pipeline state in Gateway or in Second Brain's DB? | Architecture | Phase 2 |
| 6 | **Graph library:** D3.js (flexible, complex) vs react-force-graph (simpler, React-native)? | DX | Phase 2 |
| 7 | **WebSocket provider:** Vercel native (@vercel/realtime) vs Ably vs Pusher vs self-hosted? | Cost + reliability | Phase 1 |
| 8 | **Model router intelligence:** Rule-based (if/then) vs ML-based (learn from outcomes)? | Complexity | Phase 2 |
| 9 | **Pricing model:** If Second Brain becomes a product, free tier + paid? Per-agent? Per-seat? | Business | V3+ |
| 10 | **Open source:** MIT license the frontend? Keep core proprietary? | Strategy | V2+ |

---

## Appendix: API Contract with OpenClaw Gateway

The following API surface is needed from OpenClaw Gateway to power Second Brain. Some of these may already exist; others need to be built.

### Required Gateway Endpoints

```
# Agent Management
GET    /api/v1/agents                    # List all agents with status
GET    /api/v1/agents/:id                # Get agent details
POST   /api/v1/agents                    # Spawn new agent
PUT    /api/v1/agents/:id                # Update agent config
DELETE /api/v1/agents/:id                # Kill agent
POST   /api/v1/agents/:id/pause          # Pause agent
POST   /api/v1/agents/:id/resume         # Resume agent
GET    /api/v1/agents/:id/logs           # Get agent logs (SSE stream)

# Messaging
POST   /api/v1/agents/:id/message        # Send message to agent
GET    /api/v1/agents/:id/messages       # Get conversation history

# Sessions
GET    /api/v1/sessions                  # List active sessions
GET    /api/v1/sessions/:id              # Session details with cost

# Cost
GET    /api/v1/cost/summary              # Total cost breakdown
GET    /api/v1/cost/by-agent             # Cost per agent
GET    /api/v1/cost/by-model             # Cost per model
GET    /api/v1/cost/history              # Time-series cost data

# Events (SSE)
GET    /api/v1/events                    # SSE stream of all events

# Health
GET    /api/v1/health                    # Gateway health + version
```

---

*This spec is a living document. It will evolve as we build, learn, and iterate. The goal isn't perfection — it's direction.*

**Last updated:** February 7, 2026  
**Next review:** After Phase 0 completion
