# CODEBASE.md — Second Brain Architecture

## Tech Stack
- **Framework:** Next.js 16.1.6 (App Router)
- **React:** 19.2.3
- **TypeScript:** 5.9.3
- **Styling:** Tailwind CSS v4 (native @import support)
- **Deployment:** Vercel (ISR, serverless functions)
- **Testing:** Vitest + Testing Library
- **Data Layer:** 
  - Vault (local JSON + markdown files)
  - Google Cloud BigQuery (data lake)
  - Vertex AI (text-embedding-005, 768-dim vectors)
  - Gemini API (@google/generative-ai)

## File Structure

```
second-brain/
├── src/
│   ├── app/                      # Next.js 15 App Router pages
│   │   ├── page.tsx              # Dashboard (/)
│   │   ├── activity/page.tsx     # Activity feed
│   │   ├── agents/page.tsx       # Agent fleet management
│   │   ├── analytics/page.tsx    # Analytics dashboard
│   │   ├── ask/page.tsx          # AI Q&A with vault knowledge
│   │   ├── chat/page.tsx         # Chat with Paul (AI agent)
│   │   ├── commands/page.tsx     # Command queue
│   │   ├── deals/page.tsx        # Sales pipeline
│   │   ├── directives/page.tsx   # DOE framework directives
│   │   ├── doc/                  # Document viewer/editor
│   │   │   ├── page.tsx          # Doc browser root
│   │   │   ├── [...slug]/page.tsx # Dynamic doc viewer
│   │   │   ├── edit/[...slug]/page.tsx # Doc editor
│   │   │   └── new/page.tsx      # New doc creator
│   │   ├── graph/page.tsx        # Knowledge graph visualization
│   │   ├── inbox/page.tsx        # Email/notifications inbox
│   │   ├── login/page.tsx        # Auth page
│   │   ├── memory/page.tsx       # Memory/journal
│   │   ├── search/page.tsx       # Search UI
│   │   ├── settings/page.tsx     # Settings
│   │   ├── tasks/page.tsx        # Task board (kanban)
│   │   ├── layout.tsx            # Root layout (theme, nav)
│   │   ├── globals.css           # Tailwind v4 theme
│   │   ├── middleware.ts         # Request middleware
│   │   └── actions/              # Server actions
│   ├── components/               # React components
│   │   ├── NavShell.tsx          # Bottom nav (mobile-first)
│   │   ├── CommandBar.tsx        # Command input bar
│   │   ├── CommandPalette.tsx    # Cmd+K palette
│   │   ├── DashboardClient.tsx   # Client components for dashboard
│   │   ├── ErrorBoundary.tsx     # Error handling
│   │   └── ...
│   └── lib/                      # Core utilities
│       ├── paths.ts              # Vault path helpers (VAULT_PATH, WRITABLE_VAULT)
│       ├── vault-io.ts           # Vault file I/O (readJsonFile, writeJsonFile)
│       ├── vault-index.ts        # Vault indexing
│       ├── documents.ts          # Document parsing (gray-matter)
│       ├── gateway.ts            # OpenClaw Gateway API client
│       ├── datalake.ts           # BigQuery data lake client
│       ├── directives.ts         # DOE directive system
│       ├── search.ts             # Vertex AI embeddings search
│       ├── searchMock.ts         # Search mock for dev
│       └── tasks.ts              # Task management
├── vault/                        # Knowledge base (markdown + JSON)
│   ├── concepts/                 # Concept documents
│   ├── journal/                  # Daily journal entries
│   ├── projects/                 # Project documentation
│   ├── accounts/                 # Account/credential docs
│   ├── erate/                    # E-Rate intelligence
│   ├── intel/                    # Intelligence reports
│   ├── marketing/                # Marketing materials
│   ├── reports/                  # Reports
│   ├── repos/                    # Code repository docs
│   ├── activity.json             # Activity feed data
│   ├── agents.json               # Agent definitions
│   ├── commands.json             # Command queue
│   ├── deals.json                # Sales deals
│   ├── tasks.json                # Task board data
│   ├── config.json               # App config
│   ├── INDEX.md                  # Vault index/readme
│   └── ...
├── .planning/                    # GSD project planning docs
├── package.json
├── tsconfig.json
└── next.config.ts
```

## Existing Pages (20 total)

| Route | Purpose | Data Source |
|-------|---------|-------------|
| `/` | Dashboard | vault/activity.json, tasks.json, deals.json, agents.json, BigQuery |
| `/tasks` | Task board (kanban) | vault/tasks.json |
| `/activity` | Activity feed | vault/activity.json, BigQuery events |
| `/agents` | Agent fleet | vault/agents.json |
| `/commands` | Command queue | vault/commands.json |
| `/chat` | Chat with Paul | Gemini API |
| `/analytics` | Analytics | BigQuery data lake |
| `/graph` | Knowledge graph | vault/* (all markdown docs) |
| `/ask` | AI Q&A | Vertex AI embeddings + Gemini |
| `/doc` | Document browser | vault/* (categories) |
| `/doc/[...slug]` | Document viewer | vault/{category}/{slug}.md |
| `/doc/edit/[...slug]` | Document editor | vault/{category}/{slug}.md |
| `/doc/new` | New document | - |
| `/directives` | DOE directives | vault/directives.json |
| `/settings` | Settings | vault/config.json |
| `/deals` | Sales pipeline | vault/deals.json |
| `/inbox` | Email/notifications | Outlook API (Windows VM) |
| `/login` | Auth | - |
| `/memory` | Memory/journal | vault/journal/ |
| `/search` | Search UI | Vertex AI embeddings |

## Data Sources

### 1. Vault (JSON + Markdown)
- **Location:** `vault/` directory (bundled with app)
- **Read:** Use `readJsonFile()` or `readWithFallback()` from `@/lib/paths`
- **Write:** Use `writeJsonFile()` from `@/lib/vault-io` (writes to `/tmp/vault` on Vercel)
- **Patterns:**
  - JSON files for structured data (tasks, activity, deals, agents)
  - Markdown files with YAML frontmatter for documents (concepts, journal, projects)
  - Parse frontmatter with `gray-matter` package
  - Use `getAllDocuments()` and `getDocumentsByCategory()` from `@/lib/documents`

### 2. Google Cloud BigQuery
- **Project:** `tatt-pro`
- **Location:** `us-central1`
- **Client:** `@google-cloud/bigquery`
- **Auth:** Application Default Credentials (ADC)
- **Usage:** Data lake queries (insights, observations, event logs)

### 3. Vertex AI Embeddings
- **Model:** `text-embedding-005` (768 dimensions)
- **SDK:** `@google-cloud/aiplatform` or `vertexai` Python SDK
- **Auth:** ADC
- **Usage:** Semantic search, document similarity

### 4. Gemini API
- **Package:** `@google/generative-ai`
- **Usage:** `/ask` Q&A, `/chat` conversations

## Key Patterns & Conventions

### Vault I/O
```typescript
// ✅ ALWAYS use @/lib/paths helpers
import { readJsonFile, writeJsonFile, getVaultFilePath } from '@/lib/vault-io';

// Read JSON with fallback
const tasks = await readJsonFile(getVaultFilePath('tasks.json'), []);

// Write JSON (atomic, uses temp file)
await writeJsonFile(getVaultFilePath('tasks.json'), tasks);
```

### Document Parsing (Markdown)
```typescript
import matter from 'gray-matter';
import fs from 'fs/promises';

const raw = await fs.readFile(filePath, 'utf-8');
const { data: frontmatter, content } = matter(raw);
// frontmatter: { title, date, tags, description }
// content: markdown body
```

### ISR (Incremental Static Regeneration)
```typescript
// Page-level revalidation
export const revalidate = 60; // seconds

// Or force dynamic
export const dynamic = 'force-dynamic';
```

### Server Actions
```typescript
// src/app/actions/tasks.ts
'use server';

export async function getTasks() {
  const tasks = await readJsonFile(getVaultFilePath('tasks.json'), []);
  return tasks;
}
```

## Theme & Design System

### Colors
- **Primary:** `#FADE29` (gold/yellow) — Oregon Ducks yellow
- **Secondary Dark:** `#154733` (dark green) — Oregon Ducks green
- **Background:** `#0a0f0c` (near-black)
- **Card:** `#141a17` (dark gray-green)

### Typography
- **Display:** JetBrains Mono (headings, monospace)
- **Body:** Outfit (UI text)

### Icons
- **Library:** Material Symbols Outlined (Google Fonts)
- **Usage:** `<span className="material-symbols-outlined">icon_name</span>`

### Component Patterns
- **Mobile-first:** Bottom navigation (NavShell)
- **Card design:** Rounded corners, border glow effects, gradient overlays
- **Animations:** Slide-up entrance, breathe effects, glow pulses
- **Glass morphism:** Subtle backdrop blur on cards

### Example Card Component
```tsx
<div className="bg-gradient-to-br from-secondary-dark to-bg-dark rounded-xl p-5 border border-primary/20 relative overflow-hidden group hover:border-primary/30 transition-colors">
  <div className="absolute -right-4 -top-4 size-24 bg-primary/10 rounded-full blur-2xl" />
  <div className="relative z-10">
    {/* Content */}
  </div>
</div>
```

## Deployment

- **Platform:** Vercel
- **Build:** `npm run build`
- **Env vars:** None required (uses ADC for GCP)
- **Writable storage:** `/tmp/vault` (ephemeral on Vercel)
- **Static assets:** `public/` directory

## Development

```bash
npm run dev          # Start dev server (localhost:3000)
npm run build        # Production build
npm run test         # Run tests
npm run test:watch   # Watch mode
npm run lint         # ESLint
```

## Key Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| next | 16.1.6 | Framework |
| react | 19.2.3 | UI library |
| tailwindcss | ^4 | Styling |
| gray-matter | ^4.0.3 | Frontmatter parsing |
| @google-cloud/aiplatform | ^6.4.0 | Vertex AI |
| @google-cloud/bigquery | ^8.1.1 | BigQuery |
| @google/generative-ai | ^0.24.1 | Gemini API |
| date-fns | ^4.1.0 | Date utilities |
| remark | ^15.0.1 | Markdown processing |

## Authentication & Security

- **Current:** No auth (private deployment)
- **Future:** Add auth middleware in `src/middleware.ts`

## Notes for Feature Development

1. **New pages:** Create in `src/app/{route}/page.tsx`
2. **API endpoints:** Use Server Actions in `src/app/actions/`
3. **Vault data:** Always use `@/lib/vault-io` helpers
4. **New data schemas:** Add types in page or lib file, store in `vault/{name}.json`
5. **UI components:** Extract to `src/components/` if reusable
6. **Icons:** Use Material Symbols (search at fonts.google.com/icons)
7. **Colors:** Use `text-primary`, `bg-secondary-dark`, `border-primary/20` (Tailwind utilities)
8. **Testing:** Add tests to `src/lib/__tests__/`
