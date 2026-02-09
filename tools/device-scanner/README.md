# Device Scanner

Python CLI tool for scanning Mac directories, cataloging files, and detecting duplicates.

Part of the **Device Knowledge Graph** feature for Second Brain.

---

## Features

- 📁 **Directory Scanning** — Recursively walks directories
- 🔐 **SHA-256 Hashing** — Detects exact duplicates by content hash
- 📊 **Summary Statistics** — Breakdown by type, age, and size
- ⚡ **Progress Reporting** — Real-time scan progress
- 🛡️ **Error Handling** — Gracefully handles permission errors
- 🎯 **Smart Exclusions** — Skips system directories (.git, node_modules, caches)
- 💾 **JSON Output** — Structured data for vault storage

---

## Requirements

- **Python:** 3.8+ (uses standard library only, no dependencies)
- **OS:** macOS (tested), Linux (should work), Windows (untested)

---

## Installation

No installation required! Uses Python standard library only.

```bash
# Make executable (optional)
chmod +x scan.py

# Or run with python
python scan.py --help
```

---

## Usage

### Basic Scan (Local JSON Output)

Scan a directory and save results:

```bash
python scan.py \
  --directory ~/Downloads \
  --device-id mac-mini-m2
```

**Output:** `scan-mac-mini-m2-{timestamp}.json`

### Custom Output File

```bash
python scan.py \
  --directory ~/Documents \
  --device-id macbook-pro \
  --output my-scan-results.json
```

### Skip Hashing (Faster)

Skip SHA-256 hashing if you don't need duplicate detection:

```bash
python scan.py \
  --directory ~/Pictures \
  --device-id mac-mini-m2 \
  --skip-hash
```

⚠️ **Note:** Duplicate detection won't work without hashing.

### Verbose Mode

Show errors during scan:

```bash
python scan.py \
  --directory /Users/samson \
  --device-id mac-mini-m2 \
  --verbose
```

---

## Output Format

The scanner outputs structured JSON with:

### Device Metadata
```json
{
  "device": {
    "id": "mac-mini-m2",
    "name": "mac-mini-m2",
    "type": "mac",
    "hostname": "mcpro-server",
    "os": "Darwin 23.1.0"
  }
}
```

### Scan Metadata
```json
{
  "scan": {
    "timestamp": "2026-02-08T19:30:00Z",
    "duration": 45.3,
    "root": "/Users/samson/Downloads"
  }
}
```

### Summary Statistics
```json
{
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
  }
}
```

### Duplicate Groups
```json
{
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
  }
}
```

### File List
```json
{
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

---

## Excluded Directories

The scanner automatically excludes:

- **Version control:** `.git`, `.svn`, `.hg`
- **Dependencies:** `node_modules`, `__pycache__`, `.pytest_cache`
- **System:** `Library/Caches`, `Library/Logs`, `.Trash`, `.cache`
- **Virtual envs:** `venv`, `env`, `.venv`

---

## File Type Categories

Files are categorized into:

- **images** — jpg, png, gif, svg, webp, heic, etc.
- **videos** — mp4, mov, avi, mkv, webm, etc.
- **documents** — pdf, doc, docx, txt, md, etc.
- **audio** — mp3, wav, flac, aac, etc.
- **archives** — zip, tar, gz, dmg, etc.
- **code** — py, js, ts, html, css, java, etc.
- **spreadsheets** — xls, xlsx, csv, numbers
- **presentations** — ppt, pptx, key
- **other** — everything else

---

## Performance

**Benchmarks** (Mac Mini M2, SSD):
- 10,000 files in ~1-2 minutes
- Hashing speed: ~100-200 MB/s (parallelized in chunks)

**Tips for faster scans:**
- Use `--skip-hash` if you don't need duplicate detection
- Scan smaller directories (e.g., ~/Downloads instead of entire home)
- Exclude large directories with many small files

---

## Error Handling

The scanner handles:
- **Permission errors** — Skips files it can't read
- **Symlinks** — Follows symlinks (be careful with loops!)
- **Missing files** — Continues on errors
- **Interruption** — Ctrl+C gracefully exits

All errors are counted in the summary. Use `--verbose` to see details.

---

## Examples

### Scan Downloads folder
```bash
python scan.py --directory ~/Downloads --device-id mac-mini-m2
```

### Scan entire home directory (may take a while!)
```bash
python scan.py --directory ~ --device-id mac-mini-m2 --verbose
```

### Quick scan without hashing
```bash
python scan.py --directory ~/Documents --device-id mac-mini-m2 --skip-hash
```

### Test with small directory
```bash
# Create test directory
mkdir -p /tmp/scanner-test
cp ~/Pictures/*.jpg /tmp/scanner-test/

# Scan it
python scan.py --directory /tmp/scanner-test --device-id test-device
```

---

## Integration with Second Brain

**Phase 2** will add:
- `--upload` flag to sync results to Second Brain API
- Automatic device registration
- Scan history management

For now, manually upload the JSON output to `vault/devices/{device-id}/`.

---

## Troubleshooting

### "Permission denied" errors

Some system directories are protected. The scanner skips these and continues. Use `--verbose` to see which files failed.

### Scan is slow

- Large directories with many files take time
- Hashing is CPU-intensive — try `--skip-hash` for faster scans
- Consider scanning smaller subdirectories

### Output file already exists

The scanner uses timestamps in filenames to avoid collisions. If you use `--output`, make sure the path is unique.

---

## Future Enhancements (V2+)

- **Upload to API** — `--upload` flag to sync to Second Brain
- **Incremental scans** — Only scan changed files
- **Progress bar** — Visual progress indicator (tqdm)
- **Multiprocessing** — Parallel hashing for speed
- **iOS support** — Scanner for iPhone/iPad

---

## License

Part of Second Brain. See main project LICENSE.

---

## Questions?

See main project docs: `.planning/ROADMAP.md`, `.planning/REQUIREMENTS.md`

---

## Phase 2: Sync to Second Brain

### Upload Scan Results

Upload scan results directly to Second Brain API:

```bash
# Local development
python scan.py \
  --directory ~/Downloads \
  --device-id mac-mini-m2 \
  --upload http://localhost:3000

# Production
python scan.py \
  --directory ~/Downloads \
  --device-id mac-mini-m2 \
  --upload https://brain.6eyes.dev
```

**What happens:**
1. Scanner performs full scan
2. Results are uploaded to `/api/devices/sync`
3. Device appears in `/devices` page
4. Scan history is maintained (last 7 scans)
5. Activity feed is updated

**Upload + Save:**
```bash
python scan.py \
  --directory ~/Downloads \
  --device-id mac-mini-m2 \
  --upload http://localhost:3000 \
  --output backup-scan.json
```

Uploads to API **and** saves local copy.

