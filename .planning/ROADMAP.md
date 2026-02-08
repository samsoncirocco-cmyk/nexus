# Roadmap: Device Knowledge Graph

## Overview

Build a device scanning and knowledge management feature for Second Brain in 6 phases. Start with the Python scanner that catalogs files on Mac, then sync to the vault, add duplicate detection, build the `/devices` UI page with storage visualizations, add cleanup recommendations, and finally integrate with existing vault search. Each phase delivers incremental, usable functionality.

## Phases

- [ ] **Phase 1: Device Scanner** — Python script that catalogs files with metadata and hashes
- [ ] **Phase 2: Vault Sync** — API endpoint and data pipeline to store scan results in vault
- [ ] **Phase 3: Duplicate Detection** — Hash-based duplicate finder with grouping and space analysis
- [ ] **Phase 4: Devices Page & Storage Viz** — `/devices` page with storage breakdown charts
- [ ] **Phase 5: Cleanup Recommendations** — Smart recommendations engine with UI cards
- [ ] **Phase 6: Search Integration** — Device files searchable via existing vault search

## Phase Details

### Phase 1: Device Scanner
**Goal**: A working Python scanner that catalogs files from configurable directories, captures metadata, and outputs structured JSON
**Depends on**: Nothing (first phase)
**Requirements**: SCAN-01, SCAN-02, SCAN-03, SCAN-04, SCAN-05, SCAN-06
**Success Criteria** (what must be TRUE):
  1. Running `python scanner.py` scans ~/Downloads, ~/Desktop, ~/Documents, ~/Pictures by default
  2. Output JSON contains path, filename, size, type, created/modified/accessed dates, and SHA-256 hash per file
  3. Scan directories are configurable via CLI args or config file
  4. Re-running skips files that haven't changed (incremental mode)
  5. Scanner completes on a typical Mac home directory in under 5 minutes
**Plans**: 2 plans

Plans:
- [ ] 01-01: Core scanner — walk directories, collect metadata, compute hashes, output JSON
- [ ] 01-02: Incremental mode — cache previous hashes, skip unchanged files, add CLI config

### Phase 2: Vault Sync
**Goal**: Scanner can push its catalog to Second Brain, which stores it as vault JSON alongside existing data
**Depends on**: Phase 1
**Requirements**: SYNC-01, SYNC-02, SYNC-03, SYNC-04
**Success Criteria** (what must be TRUE):
  1. `POST /api/devices/sync` accepts scanner catalog JSON and stores in `vault/devices/`
  2. Each device has a persistent UUID stored in scanner config
  3. Subsequent syncs merge with existing data (upsert by file path)
  4. Server action `getDeviceCatalog()` reads stored device data
**Plans**: 2 plans

Plans:
- [ ] 02-01: API endpoint — POST /api/devices/sync with validation, vault storage via vault-io
- [ ] 02-02: Device identity & merge — UUID generation, upsert logic, server action for reading

### Phase 3: Duplicate Detection
**Goal**: System finds and groups duplicate files by hash, calculates wasted space
**Depends on**: Phase 2
**Requirements**: DUPE-01, DUPE-02, DUPE-03, DUPE-04
**Success Criteria** (what must be TRUE):
  1. Server action returns duplicate groups (files sharing same SHA-256 hash)
  2. Each group shows all file paths and total wasted space
  3. Groups are sorted by wasted space (largest first)
  4. Duplicate detection runs in < 1 second for catalogs up to 100K files
**Plans**: 1 plan

Plans:
- [ ] 03-01: Duplicate engine — hash grouping, wasted space calculation, server action API

### Phase 4: Devices Page & Storage Visualization
**Goal**: `/devices` page shows connected devices, storage breakdown by type and folder, and file age distribution
**Depends on**: Phase 2 (Phase 3 optional but enhances)
**Requirements**: PAGE-01, PAGE-02, PAGE-03, PAGE-06, STOR-01, STOR-02, STOR-03, STOR-04
**Success Criteria** (what must be TRUE):
  1. `/devices` is accessible from sidebar and bottom nav
  2. Page shows device name, last scan timestamp, total files scanned
  3. Interactive treemap/bar chart shows storage by file type
  4. Directory-level storage breakdown is visible
  5. File age histogram shows distribution of file creation dates
  6. Page is mobile-responsive and matches dark green/gold theme
**Plans**: 3 plans

Plans:
- [ ] 04-01: Page scaffold — `/devices` route, nav integration, device summary card
- [ ] 04-02: Storage charts — file type treemap, directory breakdown, using CSS/SVG (no heavy chart lib)
- [ ] 04-03: File age & polish — creation date histogram, responsive layout, loading skeletons

### Phase 5: Cleanup Recommendations
**Goal**: Smart recommendations identify old downloads, large stale files, and duplicate photos with estimated savings
**Depends on**: Phase 3, Phase 4
**Requirements**: CLEAN-01, CLEAN-02, CLEAN-03, CLEAN-04, CLEAN-05, PAGE-04, PAGE-05
**Success Criteria** (what must be TRUE):
  1. Recommendations engine identifies old downloads (>90 days in ~/Downloads)
  2. Large files (>100MB) not accessed in 6+ months are flagged
  3. Duplicate photos in ~/Pictures are surfaced
  4. Each recommendation shows estimated space savings
  5. Recommendations display as cards on `/devices` page (no auto-delete action)
  6. Duplicate groups section is expandable with individual file details
**Plans**: 2 plans

Plans:
- [ ] 05-01: Recommendations engine — rules for old downloads, stale large files, duplicate photos
- [ ] 05-02: UI cards — recommendation cards on /devices page, duplicate group expander

### Phase 6: Search Integration
**Goal**: Device file metadata is searchable via existing vault search infrastructure
**Depends on**: Phase 2
**Requirements**: SRCH-01, SRCH-02
**Success Criteria** (what must be TRUE):
  1. Searching in vault search returns matching device files by filename/path
  2. Device file results show file type icon, path, and size
**Plans**: 1 plan

Plans:
- [ ] 06-01: Search adapter — extend vault search to index device catalog JSON, render device file results

## Progress

**Execution Order:** Phases 1 → 2 → 3 → 4 → 5 → 6

| Phase | Plans Complete | Status | Completed |
|-------|---------------|--------|-----------|
| 1. Device Scanner | 0/2 | Not started | - |
| 2. Vault Sync | 0/2 | Not started | - |
| 3. Duplicate Detection | 0/1 | Not started | - |
| 4. Devices Page & Storage Viz | 0/3 | Not started | - |
| 5. Cleanup Recommendations | 0/2 | Not started | - |
| 6. Search Integration | 0/1 | Not started | - |

---
*Roadmap created: 2026-02-08*
*Last updated: 2026-02-08 after initialization*
