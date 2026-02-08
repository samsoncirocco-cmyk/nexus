# REQUIREMENTS.md — Device Knowledge Graph

## Overview

This document specifies the functional requirements for the Device Knowledge Graph feature, broken into V1 (MVP) and V2 (future enhancements).

## V1 Requirements (MVP)

### 1. Mac Scanner Script

**FR-1.1: Directory Scanning**
- CLI Python script that walks a specified directory tree
- Collects metadata for each file:
  - Full path
  - File size (bytes)
  - Last modified time (mtime)
  - File type/extension
  - SHA-256 hash (for duplicate detection)
- Excludes system directories (`.git`, `node_modules`, `Library/Caches`, etc.)
- Handles symlinks gracefully (skip or follow configurable)

**FR-1.2: Progress Reporting**
- Show progress during scan (files scanned, MB processed)
- Estimate time remaining
- Allow graceful cancellation (Ctrl+C saves partial results)

**FR-1.3: JSON Output**
- Outputs structured JSON with:
  - Device metadata (hostname, OS version, scan timestamp)
  - File list with metadata
  - Summary statistics (total files, total size, breakdown by type)
  - Duplicate groups (files with same hash)

**FR-1.4: CLI Interface**
```bash
python scan.py \
  --directory ~/Downloads \
  --output scan-results.json \
  --exclude ".git,node_modules" \
  --device-id "mac-mini-m2"
```

**FR-1.5: Error Handling**
- Skip files that can't be read (permission errors)
- Log errors to stderr
- Continue scan after errors
- Include error count in output JSON

### 2. Vault Integration

**FR-2.1: Device Registry**
- `vault/devices/index.json` stores list of known devices
- Each device entry includes:
  - `id` (unique identifier, e.g., "mac-mini-m2")
  - `name` (display name)
  - `type` ("mac", "iphone", "windows")
  - `lastScan` (ISO timestamp)
  - `storageTotal` (bytes)
  - `storageUsed` (bytes)

**FR-2.2: Scan Results Storage**
- `vault/devices/{device-id}/scan-{timestamp}.json` stores scan results
- Keep last 7 scans per device
- Auto-rotate old scans (delete scans older than 7 days or >7 count)

**FR-2.3: Recommendations Storage**
- `vault/devices/{device-id}/recommendations.json` stores cleanup recommendations
- Generated from latest scan results
- Include recommendation metadata:
  - `id` (unique)
  - `type` (duplicates, old-downloads, empty-folders, large-files)
  - `title` (human-readable)
  - `description`
  - `savings` (bytes)
  - `confidence` (0.0-1.0)
  - `status` ("pending", "done", "dismissed")

### 3. API Endpoint

**FR-3.1: Sync Endpoint**
- `POST /api/devices/sync`
- Accepts JSON payload with scan results
- Validates payload structure
- Updates device registry
- Stores scan results in vault
- Returns success/error response

**FR-3.2: Authentication**
- V1: No auth (private deployment)
- V2: Require API key or session token

**FR-3.3: Payload Limits**
- Max 50 MB payload size (paginate large scans)
- Max 100k files per scan
- Return 413 if payload too large

### 4. /devices Page UI

**FR-4.1: Device List**
- Show all registered devices
- Display for each device:
  - Device name
  - Device type icon (Mac, iPhone, Windows)
  - Last scan timestamp (relative time)
  - Storage bar (used vs. total)
  - Quick stats (total files, duplicates found)
- Click device to view details

**FR-4.2: Storage Breakdown Visualization**
- **By Type:** Pie or bar chart showing breakdown by file type
  - Images, Videos, Documents, Audio, Archives, Other
  - Show count + size for each type
- **By Age:** Bar chart showing file age distribution
  - 0-30 days, 31-90 days, 91-180 days, 181-365 days, 1+ years
  - Show count + size for each bucket
- **By Size:** Bar chart showing file size distribution
  - 0-1 MB, 1-10 MB, 10-100 MB, 100 MB-1 GB, 1+ GB
  - Show count + size for each bucket

**FR-4.3: Cleanup Recommendations**
- List of actionable recommendations sorted by potential savings
- Each recommendation shows:
  - Type icon
  - Title
  - Description
  - Potential savings (MB/GB)
  - Confidence badge (high/medium/low)
  - Action buttons (Review, Dismiss, Done)
- Click recommendation to see affected files

**FR-4.4: File Browser (Optional for V1)**
- Browse files from latest scan
- Tree view or flat list with filters
- Show file metadata (size, mtime, type)
- Search/filter by name, type, size, date
- Click file to see details (path, hash, duplicates)

**FR-4.5: Empty States**
- No devices: Show "Connect your first device" CTA with setup instructions
- No scans: Show "Run your first scan" instructions
- No recommendations: Show "Your device is clean! ✨"

### 5. Duplicate Detection

**FR-5.1: Hash-Based Detection**
- Use SHA-256 hashing for file content
- Group files by hash
- Files with same hash = exact duplicates

**FR-5.2: Duplicate Recommendation**
- For each duplicate group (>1 file):
  - Keep oldest file (by mtime)
  - Recommend deleting newer copies
  - Show potential savings (size × (count - 1))
- Sort by savings (highest first)

**FR-5.3: Duplicate Details**
- Show all file paths in duplicate group
- Highlight which file will be kept
- Allow user to choose which to keep (V2)

### 6. Cleanup Recommendations Engine

**FR-6.1: Old Downloads**
- Files in Downloads folder older than 6 months
- Exclude files that have been moved/opened recently
- Confidence: 0.8 (high)

**FR-6.2: Empty Folders**
- Folders with 0 files (recursively)
- Exclude system folders
- Confidence: 1.0 (certain)

**FR-6.3: Large Files**
- Single files >100 MB not accessed in 3+ months
- Common culprits: old VMs, disk images, archives
- Confidence: 0.7 (medium)

**FR-6.4: Unused Apps (macOS)**
- Applications in /Applications not opened in 6+ months (V2)
- Check system logs for last launch time
- Confidence: 0.6 (medium)

**FR-6.5: Old Screenshots**
- Files in ~/Desktop matching screenshot naming pattern
- Older than 30 days
- Confidence: 0.8 (high)

### 7. Activity Feed Integration

**FR-7.1: Log Scan Completions**
- Post to `vault/activity.json` when scan completes:
  - "Scanned Mac Mini M2 — 12,457 files, 384 GB, found 34 duplicates"
  - Type: "note"
  - Source: "device-scanner"

**FR-7.2: Log Cleanup Actions**
- Post when user completes recommendation:
  - "Deleted 34 duplicate photos — saved 45 MB"
  - Type: "completed"
  - Source: "device-cleaner"

### 8. Knowledge Graph Integration (V1 Basic)

**FR-8.1: Device Nodes**
- Add device as node in knowledge graph
- Node type: "device"
- Metadata: name, type, storage stats

**FR-8.2: Scan Event Nodes**
- Add scan event as node
- Node type: "scan"
- Connected to device node
- Metadata: timestamp, file count, size

**FR-8.3: Graph Visualization**
- Show devices and scans in existing `/graph` page
- Use existing graph rendering (D3.js or similar)

---

## V2 Requirements (Future)

These features are **out of scope for V1 MVP** but documented for future development.

### 9. Computer Vision Pipeline

**FR-9.1: Screenshot OCR**
- Use Gemini Vision API to extract text from screenshots
- Store extracted text in scan results
- Make searchable via Vertex AI embeddings

**FR-9.2: Photo Quality Scoring**
- Detect blurry photos (vision API or on-device ML)
- Score photo quality (0.0-1.0)
- Recommend deleting low-quality photos

**FR-9.3: Duplicate Photo Detection**
- Perceptual hashing for near-duplicate detection
- Catch similar photos beyond exact hash matches
- Show similarity score

**FR-9.4: Content Categorization**
- Classify images: receipts, memes, screenshots, documents, photos
- Use vision API or on-device CoreML
- Group recommendations by category ("delete 47 meme screenshots")

### 10. Knowledge Extraction

**FR-10.1: Session Detection**
- Group files by timestamp proximity + content similarity
- "These 12 screenshots are from one research session on Feb 8"
- Recommend creating vault doc from session

**FR-10.2: Concept Extraction**
- "47 apartment screenshots" → generate `vault/projects/apartment-hunting.md`
- Extract structured data (listings, prices, locations)
- Use vision OCR + Gemini summarization

**FR-10.3: Document Linking**
- Link device files to existing vault docs
- "This receipt PDF relates to your 'Business Expenses 2024' doc"
- Show in knowledge graph

### 11. iOS/iPhone Scanner

**FR-11.1: Swift Scanner App**
- Native iOS app
- Catalog Photos library (no file system access on iOS)
- Scan Files app documents
- Metadata: photo EXIF, file size, dates

**FR-11.2: On-Device Processing**
- Hash photos on-device
- Detect duplicates locally
- Sync metadata only (never upload photos)

**FR-11.3: Photo Cleanup UI**
- Show duplicates, blurry photos, screenshots
- Swipe-to-delete interface
- Bulk actions

### 12. Cross-Device Knowledge Graph

**FR-12.1: File Identity**
- Same file on multiple devices → one graph node
- Match by hash, not path
- Show "exists on: Mac, iPhone, iCloud"

**FR-12.2: Sync Status**
- Show which devices have which files
- Recommend syncing important files
- Detect abandoned files (deleted on one device, still on others)

### 13. Advanced Recommendations

**FR-13.1: Smart Session Grouping**
- "8 PDFs and 12 screenshots from Tuesday = apartment research"
- Recommend consolidating into vault doc
- Auto-generate summary

**FR-13.2: Unused App Detection**
- Check last launch time (macOS system logs)
- "Haven't opened in 9 months" → recommend uninstall
- Show app size

**FR-13.3: Cloud Storage Duplicates**
- Detect files that exist locally + in Google Drive/iCloud
- Recommend deleting local copy if cloud-synced
- Requires OAuth integration

---

## Out of Scope

These features will NOT be implemented:

### Auto-Deletion
- Never auto-delete files
- Always require user confirmation
- Even with 100% confidence recommendations

### Cloud Storage Scanning
- No Google Drive scanning (V1)
- No iCloud scanning (V1)
- Local device only

### Windows Support
- Mac-first approach
- Windows scanner is future work (V2+)

### Real-Time Monitoring
- No background file monitoring
- User-initiated scans only
- No auto-sync daemon (V1)

---

## Non-Functional Requirements

### Performance

**NFR-1: Scanner Speed**
- Scan 10,000 files in <2 minutes (on SSD)
- Hash files at >100 MB/s (parallelized)
- Use multiprocessing for CPU-bound tasks

**NFR-2: UI Response Time**
- Page load <2 seconds
- Storage visualization renders <500ms
- Recommendations load <1 second

**NFR-3: API Latency**
- Sync endpoint responds in <5 seconds for 50 MB payload
- Paginate large scans if needed

### Scalability

**NFR-4: File Count Limits**
- Support up to 1M files per device (with pagination)
- Support up to 10 devices per user (V1)
- Handle 1 TB+ storage per device

**NFR-5: Scan History**
- Keep last 7 scans per device
- Auto-rotate old scans
- Compress scan JSON for storage efficiency

### Privacy & Security

**NFR-6: No Cloud File Storage**
- Never upload raw file contents
- Only metadata syncs to Second Brain
- Hashes are one-way (SHA-256)

**NFR-7: Path Privacy**
- Allow relative path display (hide username in paths)
- Option to redact sensitive paths in UI
- Never log file contents

**NFR-8: Local Processing**
- Scanner runs entirely on user's device
- No telemetry or analytics
- User controls all data

### Reliability

**NFR-9: Error Handling**
- Scanner continues after permission errors
- API endpoint validates all inputs
- UI handles missing/corrupted data gracefully

**NFR-10: Data Integrity**
- Atomic writes to vault JSON files
- Validate scan results before storing
- Backup device registry before updates

### Usability

**NFR-11: Setup Friction**
- Scanner setup in <2 minutes
- No dependencies beyond Python stdlib (V1)
- Clear error messages

**NFR-12: Mobile-Friendly UI**
- `/devices` page works on mobile
- Touch-friendly controls
- Responsive charts/visualizations

---

## Acceptance Criteria

### V1 MVP is complete when:

- [ ] Mac scanner script runs successfully on mcpro-server
- [ ] Scanner outputs valid JSON matching spec
- [ ] Scan results sync to Second Brain vault
- [ ] Device appears in `/devices` page with correct stats
- [ ] Storage breakdown charts display correctly
- [ ] Duplicate detection finds >0 duplicates in test data
- [ ] Recommendations engine generates ≥3 recommendations
- [ ] User can mark recommendations as done/dismissed
- [ ] Activity feed shows scan completion
- [ ] Knowledge graph shows device + scan nodes
- [ ] All tests pass
- [ ] Documentation is complete

### Ready to Ship:

- [ ] Code reviewed
- [ ] Deployed to production (Vercel)
- [ ] Tested on real device (Mac Mini M2)
- [ ] No critical bugs
- [ ] Performance meets NFRs
- [ ] User can complete full workflow: scan → review → act on recommendations
