# ROADMAP.md — Device Knowledge Graph Implementation

## Overview

This roadmap breaks the Device Knowledge Graph feature into 5 executable phases. Each phase is designed to be completable in a single focused session (~2-4 hours) and includes:
- Clear deliverables
- File-by-file implementation checklist
- Testing criteria
- Git commit checkpoint

## Phase 1: Scanner Script + Data Model
**Goal:** Build Python scanner that catalogs files and outputs JSON

**Duration:** 2-3 hours  
**Complexity:** Medium

### Deliverables
- Python CLI script that scans a directory
- JSON output with file metadata + summary stats
- Hash-based duplicate detection
- Progress reporting

### Files to Create
```
tools/device-scanner/
├── scan.py                    # Main scanner script
├── README.md                  # Usage instructions
└── requirements.txt           # Dependencies (if any)
```

### Implementation Steps

1. **Create project structure**
   ```bash
   mkdir -p tools/device-scanner
   cd tools/device-scanner
   ```

2. **Implement `scan.py`**
   - CLI argument parsing (directory, output, device-id)
   - Directory walker with exclusions
   - File metadata collection:
     - Path (relative to scan root)
     - Size (bytes)
     - Modified time (ISO format)
     - File extension/type
     - SHA-256 hash
   - Progress bar (files scanned, MB processed)
   - Error handling (permission errors, symlinks)

3. **Add summary statistics**
   - Total files/size
   - Breakdown by type (images, videos, documents, etc.)
   - Breakdown by age (0-30d, 31-90d, 91-180d, etc.)
   - Breakdown by size (0-1MB, 1-10MB, 10-100MB, etc.)

4. **Implement duplicate detection**
   - Group files by SHA-256 hash
   - Output duplicate groups with savings calculation
   - Sort by potential savings

5. **Write JSON output**
   - Device metadata (id, name, hostname, OS)
   - Timestamp
   - File list
   - Summary stats
   - Duplicate groups

6. **Create README.md**
   - Installation instructions
   - Usage examples
   - Expected output format

### Testing Criteria
- [ ] Scans test directory (100 files) in <10 seconds
- [ ] Handles permission errors gracefully
- [ ] Detects exact duplicates correctly
- [ ] JSON output validates against schema
- [ ] Progress reporting works
- [ ] Excludes system directories (.git, node_modules)

### Test Data Setup
```bash
# Create test directory with duplicates
mkdir -p /tmp/scanner-test/{images,docs,downloads}
cp ~/Pictures/*.jpg /tmp/scanner-test/images/
cp ~/Pictures/*.jpg /tmp/scanner-test/images/duplicate.jpg  # Create duplicate
dd if=/dev/urandom of=/tmp/scanner-test/large-file.bin bs=1M count=100
```

### Commit Checkpoint
```bash
git add tools/device-scanner/
git commit -m "feat(scanner): Phase 1 — Python scanner script + duplicate detection"
```

---

## Phase 2: Vault Integration + API Endpoint
**Goal:** Store scan results in vault, create sync API endpoint

**Duration:** 2-3 hours  
**Complexity:** Medium

### Deliverables
- Device registry in vault
- Scan results storage structure
- API endpoint for syncing scan data
- Server actions for reading device data

### Files to Create/Modify
```
vault/devices/
├── index.json                           # Device registry (create)
└── .gitkeep                             # Ensure directory tracked

src/app/api/devices/
└── sync/
    └── route.ts                         # POST handler for sync

src/app/actions/
└── devices.ts                           # Server actions (getDevices, etc.)

src/lib/
└── devices.ts                           # Device data helpers
```

### Implementation Steps

1. **Define vault structure**
   - Create `vault/devices/index.json`:
     ```json
     {
       "devices": [],
       "lastUpdated": "2026-02-08T19:00:00Z"
     }
     ```

2. **Create `src/lib/devices.ts`**
   - TypeScript types for Device, ScanResult, Recommendation
   - Helper functions:
     - `getDevices()` — read device registry
     - `getDevice(id)` — get single device
     - `getScanResults(deviceId)` — read scan results
     - `getLatestScan(deviceId)` — get most recent scan
     - `updateDevice(device)` — update registry
     - `saveScanResults(deviceId, scan)` — save scan JSON
     - `rotateScanHistory(deviceId)` — keep last 7 scans

3. **Implement API endpoint `src/app/api/devices/sync/route.ts`**
   - POST handler
   - Validate payload structure
   - Extract device info from payload
   - Update device registry
   - Save scan results to `vault/devices/{device-id}/scan-{timestamp}.json`
   - Rotate old scans
   - Return success response

4. **Create server actions `src/app/actions/devices.ts`**
   - `getDevices()` — for device list page
   - `getDeviceDetails(id)` — for device detail view
   - `getScanHistory(id)` — for scan history

5. **Update scanner script**
   - Add `--upload` flag
   - POST scan results to API endpoint
   - Handle API errors

6. **Add activity feed integration**
   - Log scan completion to `vault/activity.json`
   - Use existing activity helpers

### Testing Criteria
- [ ] Scanner can upload results to API
- [ ] Device appears in registry after sync
- [ ] Scan results stored correctly
- [ ] Old scans auto-rotate (keep last 7)
- [ ] API validates payloads (rejects malformed JSON)
- [ ] Server actions return correct data
- [ ] Activity feed shows scan completion

### Test Commands
```bash
# Run scanner with upload
cd tools/device-scanner
python scan.py \
  --directory /tmp/scanner-test \
  --device-id test-mac \
  --upload http://localhost:3000/api/devices/sync

# Verify in vault
cat vault/devices/index.json
ls -la vault/devices/test-mac/
```

### Commit Checkpoint
```bash
git add vault/devices/ src/app/api/devices/ src/app/actions/devices.ts src/lib/devices.ts
git commit -m "feat(devices): Phase 2 — Vault integration + sync API endpoint"
```

---

## Phase 3: /devices Page UI
**Goal:** Build device list and detail pages with visualizations

**Duration:** 3-4 hours  
**Complexity:** High (UI work)

### Deliverables
- Device list page showing all devices
- Storage breakdown visualizations
- Device detail view
- Empty states

### Files to Create
```
src/app/devices/
├── page.tsx                    # Device list page
├── [id]/
│   └── page.tsx                # Device detail page
└── loading.tsx                 # Loading state

src/components/devices/
├── DeviceCard.tsx              # Device card component
├── StorageBreakdown.tsx        # Chart components
├── FileTypeChart.tsx
├── FileAgeChart.tsx
└── FileSizeChart.tsx
```

### Implementation Steps

1. **Create device list page `src/app/devices/page.tsx`**
   - Fetch devices from server action
   - Grid layout of device cards
   - Each card shows:
     - Device name + icon
     - Last scan timestamp
     - Storage bar (used/total)
     - Quick stats (files, duplicates)
   - Empty state: "No devices yet"
   - CTA: "Connect Your First Device" with setup instructions

2. **Create `DeviceCard.tsx` component**
   - Match existing card design pattern (from dashboard)
   - Oregon Ducks theme colors
   - Material Symbols icon
   - Hover effect
   - Click to navigate to detail page

3. **Create device detail page `src/app/devices/[id]/page.tsx`**
   - Fetch device + latest scan
   - Layout sections:
     - Header: device name, stats, last scan time
     - Storage breakdown charts (3-column grid)
     - Scan history timeline
     - Quick actions (Run New Scan, View Recommendations)

4. **Create storage visualizations**
   
   **`StorageBreakdown.tsx`** (Main overview)
   - Total storage bar
   - Used vs. available
   - Color-coded by category
   
   **`FileTypeChart.tsx`**
   - Pie chart or bar chart
   - Categories: Images, Videos, Documents, Audio, Archives, Code, Other
   - Show count + size for each
   
   **`FileAgeChart.tsx`**
   - Bar chart
   - Buckets: 0-30d, 31-90d, 91-180d, 181-365d, 1+ years
   - Show count + size
   
   **`FileSizeChart.tsx`**
   - Bar chart
   - Buckets: 0-1MB, 1-10MB, 10-100MB, 100MB-1GB, 1GB+
   - Show count + size

5. **Choose charting library**
   - Option A: Recharts (React-friendly, simple)
   - Option B: Chart.js (more features)
   - Option C: Pure CSS bars (lightweight, no deps)
   - **Recommendation:** Start with CSS bars, upgrade to Recharts if needed

6. **Add navigation**
   - Update `src/components/NavShell.tsx` to include Devices link
   - Icon: `storage` or `devices`
   - Add to quick links on dashboard

7. **Style matching existing theme**
   - Dark green cards (`bg-secondary-dark`)
   - Gold accents (`text-primary`)
   - Material Symbols icons
   - Gradient effects
   - Card hover states

### Testing Criteria
- [ ] Device list loads without errors
- [ ] Empty state displays correctly
- [ ] Device cards show correct data
- [ ] Detail page loads with charts
- [ ] Charts render correctly (no NaN, no crashes)
- [ ] Mobile-responsive layout
- [ ] Navigation works (NavShell + dashboard links)
- [ ] Loading states work

### Test Data
```bash
# Generate test device with realistic data
cd tools/device-scanner
python scan.py \
  --directory ~/Downloads \
  --device-id mac-mini-m2 \
  --upload http://localhost:3000/api/devices/sync
```

### Commit Checkpoint
```bash
git add src/app/devices/ src/components/devices/
git commit -m "feat(devices): Phase 3 — UI with storage breakdown visualizations"
```

---

## Phase 4: Duplicate Detection + Recommendations Engine
**Goal:** Generate cleanup recommendations from scan data

**Duration:** 2-3 hours  
**Complexity:** Medium

### Deliverables
- Recommendations engine
- Recommendation types: duplicates, old downloads, large files, empty folders
- Recommendations display UI
- Mark as done/dismissed functionality

### Files to Create/Modify
```
src/lib/
└── recommendations.ts          # Recommendation engine

vault/devices/{device-id}/
└── recommendations.json        # Generated recommendations

src/app/devices/[id]/
└── recommendations/
    └── page.tsx                # Recommendations view

src/components/devices/
├── RecommendationCard.tsx      # Individual recommendation
└── RecommendationsList.tsx     # List view
```

### Implementation Steps

1. **Create `src/lib/recommendations.ts`**
   - `generateRecommendations(scan: ScanResult): Recommendation[]`
   - Recommendation generators:
     - `findDuplicates(files)` — group by hash
     - `findOldDownloads(files)` — Downloads folder >6mo
     - `findLargeFiles(files)` — >100MB, not accessed 3+mo
     - `findOldScreenshots(files)` — ~/Desktop screenshots >30d
     - `findEmptyFolders(files)` — 0 files recursively
   - Sort by potential savings (bytes)
   - Add confidence scores

2. **Integrate into sync workflow**
   - After saving scan results, generate recommendations
   - Save to `vault/devices/{device-id}/recommendations.json`
   - Update device registry with recommendation count

3. **Create recommendations page**
   - Route: `/devices/[id]/recommendations`
   - Fetch recommendations from vault
   - Group by type (Duplicates, Old Files, Large Files, etc.)
   - Sort by savings

4. **Create `RecommendationCard.tsx`**
   - Show:
     - Type icon + badge
     - Title
     - Description
     - Potential savings (MB/GB)
     - Confidence badge (High/Medium/Low)
     - File count
   - Actions:
     - "Review" button — expand to show file list
     - "Dismiss" button — mark as dismissed
     - "Done" button — mark as completed
   - Expand state shows affected files

5. **Add actions for recommendations**
   - `markRecommendationDone(deviceId, recId)`
   - `markRecommendationDismissed(deviceId, recId)`
   - Update `recommendations.json`
   - Log to activity feed

6. **Add to device detail page**
   - Summary card: "X recommendations, Y GB potential savings"
   - Top 3 recommendations preview
   - "View All" link to full page

### Testing Criteria
- [ ] Recommendations generate correctly from scan data
- [ ] Duplicate detection finds exact matches
- [ ] Old downloads recommendation works
- [ ] Large files recommendation works
- [ ] Empty folders recommendation works (if applicable)
- [ ] Recommendations sorted by savings
- [ ] Mark as done/dismissed works
- [ ] Activity feed logs recommendation actions
- [ ] UI displays recommendations correctly
- [ ] File lists expand/collapse

### Test Cases
```typescript
// Test duplicate detection
const files = [
  { path: '/a/file1.jpg', hash: 'abc123', size: 1000000, mtime: '2024-01-01' },
  { path: '/b/file2.jpg', hash: 'abc123', size: 1000000, mtime: '2024-01-02' },
];
const recs = findDuplicates(files);
expect(recs).toHaveLength(1);
expect(recs[0].savings).toBe(1000000);
```

### Commit Checkpoint
```bash
git add src/lib/recommendations.ts src/app/devices/[id]/recommendations/ src/components/devices/Recommendation*.tsx
git commit -m "feat(devices): Phase 4 — Recommendations engine + cleanup suggestions"
```

---

## Phase 5: Knowledge Graph Integration
**Goal:** Connect devices to vault knowledge graph

**Duration:** 1-2 hours  
**Complexity:** Low

### Deliverables
- Device nodes in knowledge graph
- Scan event nodes
- Graph visualization on `/graph` page
- Links from device page to graph

### Files to Modify
```
src/lib/
└── vault-index.ts              # Add device node indexing

src/app/graph/
└── page.tsx                    # Add device nodes to graph

src/lib/
└── documents.ts                # Extend to include device docs
```

### Implementation Steps

1. **Extend document indexing**
   - Treat each device as a "document"
   - Type: `device`
   - Metadata: name, type, storage stats, last scan

2. **Create graph nodes**
   - Device node: `{ id: 'device:mac-mini-m2', type: 'device', label: 'Mac Mini M2' }`
   - Scan node: `{ id: 'scan:2026-02-08', type: 'scan', label: 'Feb 8 Scan' }`
   - Edge: device → scan

3. **Update `/graph` page**
   - Fetch device data
   - Add device nodes to graph
   - Add scan nodes
   - Render with existing graph library
   - Style device nodes differently (green icon?)

4. **Add graph link from device page**
   - "View in Knowledge Graph" button
   - Deep link to graph filtered to device

5. **Activity feed integration**
   - Scan completions already logged in Phase 2
   - Verify they show in activity feed

6. **Optional: Connect files to vault docs**
   - If scanner detects file named similar to vault doc
   - Create edge: device-file → vault-doc
   - Example: `apartment-research.pdf` → `projects/apartment-hunting.md`
   - V2 feature, not required for V1

### Testing Criteria
- [ ] Device appears in knowledge graph
- [ ] Scan events appear as nodes
- [ ] Edges connect correctly
- [ ] Graph renders without errors
- [ ] Device page links to graph
- [ ] Activity feed shows scans
- [ ] Graph is navigable

### Commit Checkpoint
```bash
git add src/lib/vault-index.ts src/app/graph/page.tsx
git commit -m "feat(devices): Phase 5 — Knowledge graph integration"
```

---

## Final Integration & Testing

After all 5 phases are complete:

### End-to-End Test
1. Run scanner on real directory: `python scan.py --directory ~/Downloads --device-id mac-mini-m2 --upload`
2. Verify device appears in `/devices`
3. Check storage breakdown charts render correctly
4. Review recommendations (should have duplicates, old files, etc.)
5. Mark a recommendation as done
6. Check activity feed logs
7. View device in knowledge graph
8. Test on mobile (responsive layout)

### Documentation
- [ ] Update README.md with setup instructions
- [ ] Add screenshots to docs
- [ ] Write user guide for scanner CLI
- [ ] Document API endpoints
- [ ] Add inline code comments

### Deployment
```bash
# Deploy to Vercel
cd /home/samson/.openclaw/workspace/projects/second-brain
npx vercel --token m3K4sZNm5wToDVf42FcZofRY --scope team_J8oAAeW3ck0OxWkCMRALUdTE --prod --yes

# Log deployment
bash /home/samson/.openclaw/workspace/tools/post-activity.sh \
  "Device Knowledge Graph deployed to production" \
  "gsd-deploy" \
  "deployed"
```

### Final Commit
```bash
git add .
git commit -m "feat(devices): Device Knowledge Graph V1 MVP complete"
git push origin main
```

---

## Future Phases (V2+)

### Phase 6: Computer Vision Pipeline (V2)
- Gemini Vision API integration
- Screenshot OCR
- Photo quality scoring
- Content categorization

### Phase 7: Knowledge Extraction (V2)
- Session detection
- Concept extraction (screenshots → vault docs)
- Smart grouping

### Phase 8: iOS Scanner App (V2)
- Swift app for iPhone
- Photos library cataloging
- On-device processing
- Sync to Second Brain

### Phase 9: Cross-Device Graph (V2)
- File identity across devices
- Sync status
- Deduplication across devices

---

## Phase Dependencies

```
Phase 1 (Scanner) ← Independent
Phase 2 (Vault/API) ← Depends on Phase 1
Phase 3 (UI) ← Depends on Phase 2
Phase 4 (Recommendations) ← Depends on Phase 1, 2
Phase 5 (Graph) ← Depends on Phase 2, 3
```

**Critical path:** 1 → 2 → 3 → 4 → 5

**Parallel work possible:**
- Phase 3 and 4 can overlap (UI + recommendations)
- Phase 5 can start after Phase 2 (doesn't need full UI)

---

## Estimated Timeline

- **Phase 1:** 2-3 hours
- **Phase 2:** 2-3 hours
- **Phase 3:** 3-4 hours
- **Phase 4:** 2-3 hours
- **Phase 5:** 1-2 hours
- **Testing/Polish:** 2-3 hours

**Total: 12-18 hours** (2-3 focused work sessions)

---

## Success Criteria

The Device Knowledge Graph V1 MVP is complete when:

✅ Scanner runs successfully on Mac
✅ Scan results sync to Second Brain
✅ `/devices` page displays devices with stats
✅ Storage breakdown charts render correctly
✅ Duplicate detection works
✅ Recommendations engine generates actionable suggestions
✅ User can mark recommendations as done/dismissed
✅ Activity feed shows scan events
✅ Knowledge graph includes device nodes
✅ All tests pass
✅ Deployed to production
✅ User can complete workflow: scan → review → act

---

## Risk Mitigation

| Risk | Phase | Mitigation |
|------|-------|------------|
| Scanner too slow | 1 | Add multiprocessing, progress reporting, early optimization |
| Hashing CPU-intensive | 1 | Use chunk hashing, cache results, allow skip hash flag |
| Chart library bloat | 3 | Start with CSS bars, upgrade if needed |
| API payload too large | 2 | Implement pagination, compress JSON, stream results |
| Vercel /tmp storage limit | 2 | Rotate scans aggressively, compress old data |
| Vision API costs | V2 | Out of scope for V1 |

---

## Next Steps

**To start Phase 1:**
```bash
cd /home/samson/.openclaw/workspace/projects/second-brain
mkdir -p tools/device-scanner
cd tools/device-scanner
touch scan.py README.md
# Begin implementation of scan.py
```

**Before starting, confirm:**
- [ ] Python 3.12+ installed
- [ ] Second Brain dev server running (`npm run dev`)
- [ ] Test data available (create /tmp/scanner-test/)
- [ ] Git branch created (`git checkout -b feature/device-knowledge-graph`)
