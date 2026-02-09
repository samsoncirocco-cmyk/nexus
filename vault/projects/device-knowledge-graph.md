---
title: "Device Knowledge Graph"
date: "2026-02-09"
tags: ["active", "devices", "knowledge-graph", "infrastructure"]
description: "Scan your devices, visualize storage, get cleanup recommendations, and connect everything to the knowledge graph"
---

# Device Knowledge Graph

## Overview

The Device Knowledge Graph is a full-stack feature in Second Brain that turns your local devices into nodes in your personal knowledge graph. Scan files, visualize storage breakdowns, detect duplicates, get cleanup recommendations — all from the same place you manage your notes and documents.

**Status:** V1 MVP shipped February 9, 2026

**Live at:** [brain.6eyes.dev/devices](https://brain.6eyes.dev/devices)

## How to Use the Scanner

### Quick Start

```bash
cd tools/device-scanner

# Scan a directory
python scan.py --directory ~/Downloads --device-id "my-mac"

# Scan and upload directly to Second Brain
python scan.py --directory ~/Downloads --device-id "my-mac" \
  --upload http://localhost:3000/api/devices/sync

# Custom output
python scan.py --directory ~/Documents \
  --device-id "my-mac" \
  --output results.json \
  --exclude ".git,node_modules,__pycache__"
```

### Scanner Features

- **File cataloging** — Walks directory tree, collects path, size, mtime, type
- **SHA-256 hashing** — Detects exact duplicate files
- **Smart categorization** — Groups files into images, videos, documents, audio, archives, other
- **Progress reporting** — Shows scan progress every 100 files
- **Error handling** — Gracefully skips permission errors, continues scanning
- **Excluded directories** — Automatically skips `.git`, `node_modules`, `Library/Caches`, etc.

### CLI Options

| Flag | Description | Default |
|------|-------------|---------|
| `--directory` | Directory to scan | Required |
| `--device-id` | Unique device identifier | Required |
| `--output` | Output JSON file path | `scan-results.json` |
| `--exclude` | Comma-separated dirs to skip | Built-in list |
| `--upload` | API URL to upload results | None |

## Architecture

### Data Flow

```
Mac/Linux Device          Second Brain (Next.js)
┌──────────────┐         ┌─────────────────────────┐
│ scan.py      │ ──POST──→ /api/devices/sync       │
│ (Python CLI) │         │   ├── Validate payload   │
│              │         │   ├── Update registry     │
│ Scans files  │         │   ├── Store scan results  │
│ Hashes       │         │   ├── Generate recs       │
│ Categorizes  │         │   └── Log to activity     │
└──────────────┘         │                           │
                         │ Pages:                    │
                         │   /devices           (list)│
                         │   /devices/[id]    (detail)│
                         │   /devices/[id]/recs       │
                         │   /graph      (knowledge)  │
                         └─────────────────────────┘
```

### Key Files

**Scanner:**
- `tools/device-scanner/scan.py` — Python CLI scanner script
- `tools/device-scanner/README.md` — Scanner documentation

**Backend:**
- `src/lib/devices.ts` — Device registry helpers, scan storage, rotation
- `src/lib/devices.types.ts` — TypeScript type definitions
- `src/lib/recommendations.ts` — Cleanup recommendations engine
- `src/lib/vault-index.ts` — Knowledge graph data loader (device nodes)
- `src/app/api/devices/sync/route.ts` — Sync API endpoint
- `src/app/api/graph/route.ts` — Graph API (includes device nodes)
- `src/app/actions/devices.ts` — Server actions (mark done/dismissed)

**Frontend:**
- `src/app/devices/page.tsx` — Device list page
- `src/app/devices/[id]/page.tsx` — Device detail (charts, storage)
- `src/app/devices/[id]/recommendations/page.tsx` — Recommendations page
- `src/components/devices/` — DeviceCard, StorageOverview, FileTypeChart, FileAgeChart, FileSizeChart, DuplicatesSection, RecommendationCard

**Data:**
- `vault/devices/index.json` — Device registry
- `vault/devices/{id}/scan-{timestamp}.json` — Scan results (last 7 kept)
- `vault/devices/{id}/recommendations.json` — Active recommendations

### Recommendations Engine

5 types of cleanup recommendations, sorted by potential savings:

| Type | Description | Confidence |
|------|-------------|------------|
| **Duplicates** | Files with identical SHA-256 hashes | 1.0 (certain) |
| **Old Downloads** | Files in Downloads older than 90 days | 0.7 (medium) |
| **Large Files** | Files >100 MB not modified in 90+ days | 0.6 (medium) |
| **Old Screenshots** | Screenshots older than 30 days | 0.8 (high) |
| **Empty Folders** | Directories with no files | 1.0 (certain) |

Users can mark recommendations as "done" or "dismissed". Actions are logged to the activity feed.

## Build Stats

| Phase | Time | What |
|-------|------|------|
| Phase 1: Scanner | 3 min | Python CLI, file cataloging, SHA-256 hashing |
| Phase 2: Vault Integration | 20 min | API endpoint, device registry, scan storage |
| Phase 3: UI | 22 min | Device list, detail pages, 6 chart components |
| Phase 4: Recommendations | 19 min | Engine with 5 recommendation types |
| Phase 5: Knowledge Graph | 19 min | Device/scan nodes in graph visualization |
| **Total** | **~45 min** | **Full-stack feature, 40 files, +4,888 lines** |

## Future Plans (V2)

### Computer Vision Pipeline
- Use Gemini Vision API to extract text from screenshots (OCR)
- Photo quality scoring (detect blurry photos)
- Perceptual hashing for near-duplicate detection
- Content categorization (receipts, memes, documents)

### iOS Scanner App
- Native Swift app for iPhone
- Scan Photos library and Files app
- On-device hashing, sync metadata only
- Swipe-to-delete cleanup interface

### Cross-Device Knowledge Graph
- Same file on multiple devices = one graph node (matched by hash)
- Sync status visualization
- Abandoned file detection (deleted on one device, still on others)

### Smart Session Grouping
- Group files by timestamp proximity + content similarity
- "These 12 screenshots are from one research session"
- Auto-generate vault docs from sessions

### Cloud Storage Integration
- Detect files that exist locally + in Google Drive/iCloud
- Recommend deleting local copies of cloud-synced files

---

*Shipped February 9, 2026. Built by 3 concurrent AI agents in ~45 minutes.*
