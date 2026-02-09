---
title: "Second Brain"
date: "2026-02-06"
tags: ["active", "infrastructure"]
description: "The knowledge base you're reading right now"
---

# Second Brain

## Overview

A Next.js app that serves as Samson's external memory. I (Paul) populate it with documents from our conversations.

## Stack

- **Next.js 14** - App Router, React Server Components
- **Tailwind CSS** - Styling
- **gray-matter** - Markdown frontmatter parsing
- **remark** - Markdown to HTML conversion
- **date-fns** - Date formatting

## Structure

```
second-brain/
├── src/
│   ├── app/           # Next.js pages
│   ├── components/    # React components
│   └── lib/           # Document utilities
└── vault/             # The actual documents
    ├── concepts/      # Deep dives on ideas
    ├── journal/       # Daily entries
    └── projects/      # Project documentation
```

## Running Locally

```bash
cd projects/second-brain
npm run dev
```

Then visit `http://localhost:3000`

## How I Update It

As we have conversations:

1. **End of day** - I write a journal entry summarizing what we discussed
2. **Deep dives** - When we explore something in depth, I create a concept doc
3. **Projects** - When we start building something, I document it

## Design Principles

- **Dark theme** - Easy on the eyes
- **Fast** - No database, just files
- **Simple** - Focus on content, not features
- **Portable** - It's just markdown in a folder

## Device Knowledge Graph V1 (Feb 2026)

A full-stack device management feature that lets you scan local devices, visualize storage, get cleanup recommendations, and view everything in the knowledge graph.

**What shipped:**
- **Python Scanner** (`tools/device-scanner/scan.py`) — Scans directories, catalogs files, detects duplicates via SHA-256
- **Vault Integration** — Device registry, scan history (rotated, last 7), recommendations storage
- **API Endpoint** — `POST /api/devices/sync` for scanner uploads
- **Device Pages** — `/devices` (list), `/devices/[id]` (detail with charts), `/devices/[id]/recommendations`
- **Recommendations Engine** — 5 types: duplicates, old downloads, large files, old screenshots, empty folders
- **Knowledge Graph** — Device and scan nodes integrated into `/graph`
- **Activity Feed** — Scan completions and cleanup actions logged

**5 Phases, 45 minutes total build time:**
1. Scanner Script + Data Model (3 min)
2. Vault Integration + API (20 min)
3. /devices Page UI (22 min)
4. Recommendations Engine (19 min)
5. Knowledge Graph Integration (19 min)

See: [Device Knowledge Graph](/doc/projects/device-knowledge-graph)

## Future Ideas

- [ ] Computer vision pipeline (Gemini Vision for screenshot OCR)
- [ ] iOS scanner app
- [ ] Cross-device knowledge graph
- [ ] Smart session grouping
- [ ] Cloud storage duplicate detection

---

*Built February 6, 2026. Device Knowledge Graph shipped February 9, 2026.*
