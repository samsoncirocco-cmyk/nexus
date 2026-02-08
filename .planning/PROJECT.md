# PROJECT.md — Device Knowledge Graph

## What We're Building

An intelligent device scanner and knowledge graph feature for Second Brain that uses computer vision and AI to help people clean, organize, and understand their digital lives across phones and computers.

**In scope for this project:**
- `/devices` page in Second Brain showing connected devices, storage breakdown, cleanup recommendations
- Python scanner script for Mac that catalogs files (size, type, modified date, hash for dedup)
- File metadata sync to Second Brain vault as JSON
- Hash-based duplicate detection
- Storage breakdown visualizations (by type, by age, by size)
- Cleanup recommendations engine (unused files >6mo, duplicate photos, empty folders, old downloads)
- Integration with existing vault search and knowledge graph

## Why We're Building This

### The Problem
1. **Everyone's devices are a mess** — thousands of photos, screenshots, downloads, forgotten files
2. **"Storage full" is a constant nag** on phones and laptops
3. **Existing tools are dumb:**
   - CleanMyMac ($40) — just finds big files and caches
   - Google Files — basic "delete old downloads" suggestions
   - CCleaner — registry cleaner theater, no intelligence
4. **Nobody wants to manually sort 10,000 photos**
5. **People lose valuable information buried in device clutter** — screenshots of important info, receipts, research notes

### The Insight
**Knowledge extraction is the moat.** Existing cleaners just find files to delete. We can:
- Use computer vision to understand *what's in the files* (screenshot OCR, photo quality scoring)
- Build a knowledge graph connecting files to each other ("these 12 screenshots are from one research session")
- Extract structured knowledge from device clutter ("47 apartment screenshots" → apartment hunting note in vault)
- Make intelligent recommendations based on usage patterns, not just file size

### The Opportunity
- **Validated need:** Everyone has messy devices
- **Differentiated:** No one else combines vision + knowledge graphs + intelligent organization
- **Privacy-first:** On-device processing, raw files never leave your device
- **Distribution:** Build as Second Brain feature first, validate UX, then silo off as standalone product

## Target User

**Primary:** Anyone with a messy phone/computer who wants AI to understand and organize their digital life

**Personas:**
1. **Digital packrat** — saves everything, never deletes, phone always full
2. **Screenshot addict** — takes 50+ screenshots a week, never reviews them
3. **Photo hoarder** — thousands of photos, many duplicates/blurry, never curated
4. **Knowledge worker** — lots of research downloads, PDFs, browser screenshots, wants to extract insights

**User stories:**
- "I want to know what's taking up space on my phone without manually sorting through 5,000 photos"
- "I take tons of screenshots but never look at them again — I want AI to extract the useful information"
- "I have 3 copies of the same receipt PDF across 4 devices — help me find duplicates"
- "I saved 100 apartment listings as screenshots last month — turn that into a structured comparison doc"

## Technical Approach

### Architecture

```
┌─────────────────────────────────────────────────────┐
│              Second Brain (Next.js)                 │
│  ┌──────────────────────────────────────────────┐  │
│  │ /devices page                                 │  │
│  │  - Device list                                │  │
│  │  - Storage breakdown visualizations           │  │
│  │  - Cleanup recommendations                    │  │
│  │  - File browser/explorer                      │  │
│  └──────────────────────────────────────────────┘  │
│                       ▲                             │
│                       │ sync metadata               │
│                       │                             │
│  ┌──────────────────────────────────────────────┐  │
│  │ Vault (JSON)                                  │  │
│  │  - vault/devices/{device-id}/scan-results.json│  │
│  │  - vault/devices/{device-id}/recommendations  │  │
│  │  - vault/devices/index.json (device registry) │  │
│  └──────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
                       ▲
                       │ HTTP POST /api/devices/sync
                       │
┌─────────────────────────────────────────────────────┐
│         Mac Scanner (Python CLI)                    │
│  ┌──────────────────────────────────────────────┐  │
│  │ scan.py                                       │  │
│  │  - Walk directory tree                        │  │
│  │  - Collect file metadata (size, mtime, hash)  │  │
│  │  - Generate JSON output                       │  │
│  │  - Upload to Second Brain API                 │  │
│  └──────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────┐  │
│  │ Duplicate Detection                           │  │
│  │  - SHA-256 hashing                            │  │
│  │  - Group by hash                              │  │
│  └──────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

### Data Model

**Device Registry:** `vault/devices/index.json`
```json
{
  "devices": [
    {
      "id": "mac-mini-m2",
      "name": "Mac Mini M2",
      "type": "mac",
      "lastScan": "2026-02-08T19:00:00Z",
      "storageTotal": 512000000000,
      "storageUsed": 384000000000
    }
  ]
}
```

**Scan Results:** `vault/devices/{device-id}/scan-{timestamp}.json`
```json
{
  "device": "mac-mini-m2",
  "timestamp": "2026-02-08T19:00:00Z",
  "root": "/Users/samson",
  "totalFiles": 12457,
  "totalSize": 384000000000,
  "files": [
    {
      "path": "/Users/samson/Downloads/receipt-2024-01.pdf",
      "size": 245678,
      "mtime": "2024-01-15T10:30:00Z",
      "type": "pdf",
      "hash": "a3f8b9c2d1e4f5..."
    }
  ],
  "summary": {
    "byType": {
      "images": { "count": 4523, "size": 12500000000 },
      "videos": { "count": 234, "size": 98000000000 },
      "documents": { "count": 1234, "size": 5600000000 }
    },
    "byAge": {
      "0-30d": { "count": 523, "size": 2300000000 },
      "31-180d": { "count": 1234, "size": 8900000000 }
    }
  },
  "duplicates": [
    {
      "hash": "a3f8b9c2...",
      "files": ["/path/1.jpg", "/path/2.jpg"],
      "size": 2400000,
      "savings": 2400000
    }
  ]
}
```

**Recommendations:** `vault/devices/{device-id}/recommendations.json`
```json
{
  "generated": "2026-02-08T19:05:00Z",
  "recommendations": [
    {
      "id": "rec-001",
      "type": "duplicates",
      "title": "Delete 34 duplicate photos",
      "description": "Found 34 exact duplicates wasting 45 MB",
      "savings": 45000000,
      "files": ["/path/to/duplicate.jpg"],
      "confidence": 1.0,
      "action": "delete"
    },
    {
      "id": "rec-002",
      "type": "old-downloads",
      "title": "Clear old downloads folder",
      "description": "89 files in Downloads older than 6 months",
      "savings": 234000000,
      "files": ["/Users/samson/Downloads/old-file.zip"],
      "confidence": 0.8,
      "action": "review"
    }
  ]
}
```

### Technology Stack

**Scanner (Mac):**
- Python 3.12+ (already installed on mcpro-server)
- Standard library: `os`, `hashlib`, `json`, `pathlib`
- Minimal dependencies (avoid heavy installs)
- CLI tool: `python scan.py --directory ~/Downloads --output scan-results.json`

**Second Brain Integration:**
- New page: `src/app/devices/page.tsx`
- New API route: `src/app/api/devices/sync/route.ts` (POST handler)
- Vault data: `vault/devices/` directory structure
- Server action: `src/app/actions/devices.ts` (getDevices, getScanResults, getRecommendations)

**Visualizations:**
- Chart.js or Recharts for storage breakdown
- D3.js for advanced visualizations (optional V2)
- Tailwind for layout/styling (match existing design system)

### Security & Privacy

1. **No cloud storage of raw files** — only metadata syncs to Second Brain
2. **Hashes are SHA-256** (one-way, secure)
3. **Scanner runs locally** — user initiates, never auto-runs
4. **Recommendations never auto-delete** — always require user confirmation
5. **File paths stored relatively** — privacy-conscious (don't expose full system paths in UI)

## Integration with Second Brain

### Existing Infrastructure We'll Use

1. **Vault system** (`@/lib/vault-io`)
   - Store device data in `vault/devices/`
   - Use existing JSON read/write helpers

2. **Activity feed** (`vault/activity.json`)
   - Log scan completions: "Scanned Mac Mini M2 — found 34 duplicates"
   - Log cleanup actions: "Deleted 45 MB of duplicates"

3. **Task board** (`vault/tasks.json`)
   - Create tasks from recommendations: "Review 89 old downloads"

4. **Knowledge graph** (`/graph`)
   - Link device files to vault docs (V2 feature)
   - Example: "apartment-listings.md" ← connected to 47 screenshot files

5. **Search** (Vertex AI embeddings)
   - Search device files by content (V2 — requires vision pipeline)

6. **Theme & Design**
   - Match existing Oregon Ducks × Space theme (#154733 green, #FADE29 gold)
   - Use Material Symbols icons
   - Follow card-based layout patterns

## Success Metrics

**V1 (MVP) Success:**
- [ ] Scanner runs on Mac, outputs valid JSON
- [ ] Device appears in `/devices` page
- [ ] Storage breakdown chart displays correctly
- [ ] Duplicate detection finds exact matches (hash-based)
- [ ] Recommendations engine generates 3+ actionable suggestions
- [ ] User can mark recommendations as "done" or "dismissed"

**User Value:**
- User can see what's taking up space in 30 seconds
- User discovers 100+ MB of duplicates they didn't know about
- User gets actionable cleanup suggestions without manual sorting

## V2 (Future Enhancements)

These are **out of scope for V1** but documented for future phases:

1. **Computer Vision Pipeline**
   - Gemini Vision API for screenshot OCR
   - Photo quality scoring (blurry detection, duplicate photo detection beyond hash)
   - Content categorization (receipts, memes, screenshots, documents)

2. **Knowledge Extraction**
   - "47 apartment screenshots" → generate `vault/projects/apartment-hunting.md` doc
   - "12 screenshots from one research session" → create concept note
   - Group related files by content similarity (embeddings)

3. **iOS/iPhone Scanner**
   - Swift app for iPhone
   - On-device file cataloging (Photos library, Files app)
   - Sync to Second Brain via API

4. **Cross-Device Knowledge Graph**
   - Same file on multiple devices → show as one node
   - Device sync status ("file exists on Mac, missing on iPhone")

5. **Smart Session Grouping**
   - Detect research sessions from file timestamps + content
   - "These 8 PDFs and 12 screenshots are from Tuesday's apartment hunting"

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Scanner too slow on large directories | High | Stream results, show progress, allow directory exclusions |
| Hashing duplicates is CPU-intensive | Medium | Hash in chunks, use multiprocessing, cache hashes |
| Vision API costs for large photo libraries | High | V2 only, user opt-in, process in batches |
| Privacy concerns with file path exposure | Medium | Store relative paths, allow path redaction in UI |
| Vercel `/tmp` storage limits | Medium | Store only latest scan, compress old scans, implement rotation |

## Open Questions

1. **How do we handle scan history?** Keep last 7 scans? Diff between scans?
2. **Should recommendations expire?** If file is deleted externally, remove rec?
3. **How do we handle scanner updates?** Auto-update script from Second Brain?
4. **Should we support Windows?** Mac-first, but architecture should allow Windows scanner later

## Next Steps

See `ROADMAP.md` for phased implementation plan.
