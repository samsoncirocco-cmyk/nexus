# Device Knowledge Graph - Vault Structure

This directory stores device scan data and metadata for the Device Knowledge Graph feature.

---

## Directory Structure

```
vault/devices/
├── index.json                           # Device registry (all known devices)
├── {device-id}/                         # Per-device data
│   ├── scan-{timestamp}.json            # Scan results
│   ├── recommendations.json             # Cleanup recommendations (Phase 4)
│   └── metadata.json                    # Device metadata (optional)
└── README.md                            # This file
```

---

## Data Models

### Device Registry (`index.json`)

Tracks all known devices and their basic stats.

```json
{
  "devices": [
    {
      "id": "mac-mini-m2",
      "name": "Mac Mini M2",
      "type": "mac",
      "hostname": "mcpro-server",
      "os": "Darwin 23.1.0",
      "lastScan": "2026-02-08T19:30:00Z",
      "storageTotal": 512000000000,
      "storageUsed": 384000000000,
      "totalFiles": 12457,
      "duplicateGroups": 34,
      "potentialSavings": 124000000
    }
  ],
  "lastUpdated": "2026-02-08T19:30:00Z",
  "version": "1.0"
}
```

**Fields:**
- `id` (string) — Unique device identifier (e.g., "mac-mini-m2")
- `name` (string) — Display name
- `type` (string) — Device type ("mac", "iphone", "windows", "linux")
- `hostname` (string) — Network hostname
- `os` (string) — Operating system string
- `lastScan` (ISO timestamp) — When last scan completed
- `storageTotal` (number) — Total storage in bytes
- `storageUsed` (number) — Used storage in bytes
- `totalFiles` (number) — Total files from latest scan
- `duplicateGroups` (number) — Number of duplicate groups found
- `potentialSavings` (number) — Total bytes saveable from duplicates

---

### Scan Results (`{device-id}/scan-{timestamp}.json`)

Full scan output from scanner script.

```json
{
  "device": {
    "id": "mac-mini-m2",
    "name": "mac-mini-m2",
    "type": "mac",
    "hostname": "mcpro-server",
    "os": "Darwin 23.1.0"
  },
  "scan": {
    "timestamp": "2026-02-08T19:30:00Z",
    "duration": 45.3,
    "root": "/Users/samson/Downloads"
  },
  "summary": {
    "totalFiles": 1247,
    "totalSize": 5428000000,
    "errors": 2,
    "byType": {
      "images": { "count": 523, "size": 2500000000 },
      "documents": { "count": 234, "size": 890000000 },
      "videos": { "count": 45, "size": 1800000000 }
    },
    "byAge": {
      "0-30d": { "count": 123, "size": 450000000 },
      "31-90d": { "count": 345, "size": 1200000000 }
    },
    "bySize": {
      "0-1MB": { "count": 890, "size": 234000000 },
      "1-10MB": { "count": 234, "size": 1200000000 }
    }
  },
  "duplicates": {
    "groups": 34,
    "totalFiles": 89,
    "totalSavings": 124000000,
    "details": [
      {
        "hash": "a3f8b9c2d1e4f5...",
        "files": ["photo1.jpg", "backup/photo1.jpg"],
        "count": 2,
        "size": 2400000,
        "savings": 2400000
      }
    ]
  },
  "files": [
    {
      "path": "document.pdf",
      "size": 245678,
      "mtime": "2024-01-15T10:30:00Z",
      "type": "documents",
      "extension": ".pdf",
      "hash": "a3f8b9c2d1e4f5..."
    }
  ]
}
```

**Scan History:**
- Keep last 7 scans per device
- Auto-rotate old scans (delete when >7)
- Naming: `scan-{YYYYMMDD-HHMMSS}.json`

---

### Recommendations (`{device-id}/recommendations.json`)

Generated cleanup recommendations (Phase 4).

```json
{
  "generated": "2026-02-08T19:35:00Z",
  "deviceId": "mac-mini-m2",
  "scanTimestamp": "2026-02-08T19:30:00Z",
  "recommendations": [
    {
      "id": "rec-001",
      "type": "duplicates",
      "title": "Delete 34 duplicate photos",
      "description": "Found 34 exact duplicates wasting 45 MB",
      "savings": 45000000,
      "files": [
        "photo1-copy.jpg",
        "backup/photo1.jpg"
      ],
      "confidence": 1.0,
      "action": "delete",
      "status": "pending",
      "createdAt": "2026-02-08T19:35:00Z"
    },
    {
      "id": "rec-002",
      "type": "old-downloads",
      "title": "Clear old downloads folder",
      "description": "89 files in Downloads older than 6 months",
      "savings": 234000000,
      "files": [
        "Downloads/old-file-2023.zip",
        "Downloads/installer-v1.dmg"
      ],
      "confidence": 0.8,
      "action": "review",
      "status": "pending",
      "createdAt": "2026-02-08T19:35:00Z"
    }
  ],
  "summary": {
    "total": 2,
    "pending": 2,
    "done": 0,
    "dismissed": 0,
    "totalSavings": 279000000
  }
}
```

**Recommendation Fields:**
- `id` (string) — Unique ID (e.g., "rec-001")
- `type` (string) — "duplicates", "old-downloads", "large-files", "empty-folders", "old-screenshots"
- `title` (string) — Short description
- `description` (string) — Detailed explanation
- `savings` (number) — Potential bytes saved
- `files` (array) — Affected file paths (relative to scan root)
- `confidence` (number) — 0.0-1.0 confidence score
- `action` (string) — "delete", "review", "archive"
- `status` (string) — "pending", "done", "dismissed"
- `createdAt` (ISO timestamp) — When recommendation was generated

---

## Data Flow

### Phase 1 (Current)
1. User runs scanner: `python scan.py --directory ~/Downloads --device-id mac-mini-m2`
2. Scanner outputs: `scan-mac-mini-m2-{timestamp}.json`
3. **Manual:** User copies JSON to `vault/devices/mac-mini-m2/scan-{timestamp}.json`
4. **Manual:** User updates `index.json` with device entry

### Phase 2 (Next)
1. Scanner uploads to API: `--upload http://localhost:3000/api/devices/sync`
2. API updates `index.json` automatically
3. API saves scan to `vault/devices/{device-id}/scan-{timestamp}.json`
4. API rotates old scans (keeps last 7)

### Phase 4 (Future)
1. After scan, recommendations engine runs
2. Generates `recommendations.json`
3. Updates device registry with recommendation count
4. Logs to activity feed

---

## Usage

### Add a Device Manually (Phase 1)

1. Run scanner:
   ```bash
   python tools/device-scanner/scan.py \
     --directory ~/Downloads \
     --device-id mac-mini-m2
   ```

2. Create device directory:
   ```bash
   mkdir -p vault/devices/mac-mini-m2
   ```

3. Move scan results:
   ```bash
   mv scan-mac-mini-m2-*.json vault/devices/mac-mini-m2/
   ```

4. Update `index.json`:
   ```json
   {
     "devices": [
       {
         "id": "mac-mini-m2",
         "name": "Mac Mini M2",
         "type": "mac",
         "lastScan": "2026-02-08T19:30:00Z",
         "totalFiles": 1247,
         "duplicateGroups": 34,
         "potentialSavings": 124000000
       }
     ]
   }
   ```

---

## File Size Considerations

**Large scan results:**
- Scans with 100k+ files can produce large JSON files (10+ MB)
- Consider compressing old scans (gzip)
- Phase 2 will implement automatic rotation

**Vercel limits:**
- `/tmp` storage is ephemeral and limited
- Keep only last 7 scans per device
- Compress or paginate large scans if needed

---

## Security & Privacy

- **No raw file contents** — Only metadata stored
- **Hashes are SHA-256** — One-way, can't reconstruct files
- **Relative paths** — Privacy-conscious (no username exposure)
- **Local processing** — Scanner runs on user's device

---

## Next Steps

- **Phase 2:** API endpoint (`/api/devices/sync`)
- **Phase 3:** UI (`/devices` page)
- **Phase 4:** Recommendations engine
- **Phase 5:** Knowledge graph integration

---

See `.planning/ROADMAP.md` for full implementation plan.
