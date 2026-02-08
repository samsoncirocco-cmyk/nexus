# Requirements: Device Knowledge Graph

**Defined:** 2026-02-08
**Core Value:** Users can see exactly what's on their devices, find duplicates instantly, and get actionable cleanup recommendations.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Scanner

- [ ] **SCAN-01**: Python scanner script catalogs all files in specified directories on Mac
- [ ] **SCAN-02**: Scanner captures metadata per file: path, filename, size, file type/extension, created date, modified date, last accessed date
- [ ] **SCAN-03**: Scanner computes SHA-256 hash for each file (for duplicate detection)
- [ ] **SCAN-04**: Scanner outputs catalog as structured JSON (one file per scan run)
- [ ] **SCAN-05**: Scanner supports configurable scan directories (e.g., ~/Downloads, ~/Desktop, ~/Documents, ~/Pictures)
- [ ] **SCAN-06**: Scanner can be re-run incrementally (skip files already hashed if unchanged)

### Sync

- [ ] **SYNC-01**: Scanner POSTs catalog JSON to Second Brain API endpoint (`/api/devices/sync`)
- [ ] **SYNC-02**: API endpoint validates and stores device catalog in vault as JSON (`vault/devices/`)
- [ ] **SYNC-03**: Each device has a unique identifier persisted across scans
- [ ] **SYNC-04**: Sync merges new scan data with existing catalog (upsert, not overwrite)

### Duplicate Detection

- [ ] **DUPE-01**: System identifies duplicate files by matching SHA-256 hashes
- [ ] **DUPE-02**: Duplicate groups show all file paths sharing the same hash
- [ ] **DUPE-03**: Duplicate groups show total wasted space (size × (count - 1))
- [ ] **DUPE-04**: User can view duplicate groups sorted by wasted space

### Storage Visualization

- [ ] **STOR-01**: User can view total storage usage broken down by file type (images, videos, documents, archives, code, other)
- [ ] **STOR-02**: User can view storage usage broken down by top-level directory
- [ ] **STOR-03**: User can view file age distribution (created date histogram)
- [ ] **STOR-04**: Storage breakdown displays as interactive charts/treemaps on the `/devices` page

### Cleanup Recommendations

- [ ] **CLEAN-01**: System identifies old downloads (files in ~/Downloads older than 90 days)
- [ ] **CLEAN-02**: System identifies large files (> 100MB) not accessed in 6+ months
- [ ] **CLEAN-03**: System identifies duplicate photos in ~/Pictures
- [ ] **CLEAN-04**: System surfaces all cleanup recommendations with estimated space savings
- [ ] **CLEAN-05**: Recommendations are displayed as actionable cards (never auto-delete)

### Devices Page

- [ ] **PAGE-01**: `/devices` page accessible from Second Brain navigation
- [ ] **PAGE-02**: Page displays connected devices with last scan timestamp
- [ ] **PAGE-03**: Page shows storage breakdown visualization
- [ ] **PAGE-04**: Page shows duplicate files section with expandable groups
- [ ] **PAGE-05**: Page shows cleanup recommendations section
- [ ] **PAGE-06**: Page is mobile-first, matches Second Brain design system (dark green/gold theme)

### Search Integration

- [ ] **SRCH-01**: Device file metadata is searchable via existing vault search
- [ ] **SRCH-02**: Search results include device files with path, type, and size context

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Computer Vision

- **CV-01**: Screenshot OCR extracts text from screenshots using Gemini Vision
- **CV-02**: Photo quality scoring detects blurry/duplicate-looking photos
- **CV-03**: Content categorization labels photos by content type (receipt, meme, screenshot, photo)

### Knowledge Extraction

- **KE-01**: System generates vault documents from device scan patterns (e.g., "apartment hunting session" from clustered screenshots)
- **KE-02**: Device files link to vault concepts via knowledge graph

### Cross-Device

- **XDEV-01**: iOS scanner app captures file metadata from iPhone
- **XDEV-02**: Cross-device duplicate detection (same photo on phone and Mac)
- **XDEV-03**: Unified knowledge graph spans all connected devices

### Smart Grouping

- **SG-01**: System groups related screenshots by time proximity and content similarity
- **SG-02**: Groups are named by inferred activity ("Research session", "Shopping comparison")

## Out of Scope

| Feature | Reason |
|---------|--------|
| Automatic file deletion | Safety — always recommend, never auto-delete |
| Cloud storage scanning (GDrive, iCloud) | Scope — future expansion after device scanning works |
| Windows support | Mac-first — Samson develops on macOS |
| Real-time file watching | Complexity — scan-based approach is simpler and sufficient |
| File content indexing (full-text search of PDFs, etc.) | Scope — metadata-only for v1 |
| Native Mac app for scanner | Complexity — Python CLI script is sufficient for v1 |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| SCAN-01 | Phase 1 | Pending |
| SCAN-02 | Phase 1 | Pending |
| SCAN-03 | Phase 1 | Pending |
| SCAN-04 | Phase 1 | Pending |
| SCAN-05 | Phase 1 | Pending |
| SCAN-06 | Phase 1 | Pending |
| SYNC-01 | Phase 2 | Pending |
| SYNC-02 | Phase 2 | Pending |
| SYNC-03 | Phase 2 | Pending |
| SYNC-04 | Phase 2 | Pending |
| DUPE-01 | Phase 3 | Pending |
| DUPE-02 | Phase 3 | Pending |
| DUPE-03 | Phase 3 | Pending |
| DUPE-04 | Phase 3 | Pending |
| STOR-01 | Phase 4 | Pending |
| STOR-02 | Phase 4 | Pending |
| STOR-03 | Phase 4 | Pending |
| STOR-04 | Phase 4 | Pending |
| CLEAN-01 | Phase 5 | Pending |
| CLEAN-02 | Phase 5 | Pending |
| CLEAN-03 | Phase 5 | Pending |
| CLEAN-04 | Phase 5 | Pending |
| CLEAN-05 | Phase 5 | Pending |
| PAGE-01 | Phase 4 | Pending |
| PAGE-02 | Phase 4 | Pending |
| PAGE-03 | Phase 4 | Pending |
| PAGE-04 | Phase 5 | Pending |
| PAGE-05 | Phase 5 | Pending |
| PAGE-06 | Phase 4 | Pending |
| SRCH-01 | Phase 6 | Pending |
| SRCH-02 | Phase 6 | Pending |

**Coverage:**
- v1 requirements: 27 total
- Mapped to phases: 27
- Unmapped: 0 ✓

---
*Requirements defined: 2026-02-08*
*Last updated: 2026-02-08 after initial definition*
