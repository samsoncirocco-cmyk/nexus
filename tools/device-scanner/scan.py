#!/usr/bin/env python3
"""
Device Scanner - Phase 1 + 2
Scans directories, catalogs files, detects duplicates, generates JSON output.
Can optionally upload results to Second Brain API.

Usage:
    python scan.py --directory ~/Downloads --device-id mac-mini-m2 --output scan.json
    python scan.py --directory ~/Downloads --device-id mac-mini-m2 --upload http://localhost:3000
"""

import os
import sys
import json
import hashlib
import argparse
from pathlib import Path
from datetime import datetime, timezone
from collections import defaultdict
from typing import Dict, List, Any, Optional
import platform
import socket
import urllib.request
import urllib.error

# File type categories
FILE_TYPES = {
    'images': {'.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg', '.webp', '.heic', '.heif', '.tiff', '.raw'},
    'videos': {'.mp4', '.mov', '.avi', '.mkv', '.flv', '.wmv', '.webm', '.m4v', '.mpeg', '.mpg'},
    'documents': {'.pdf', '.doc', '.docx', '.txt', '.rtf', '.odt', '.pages', '.md', '.tex'},
    'audio': {'.mp3', '.wav', '.flac', '.aac', '.ogg', '.m4a', '.wma'},
    'archives': {'.zip', '.tar', '.gz', '.bz2', '.7z', '.rar', '.dmg', '.iso'},
    'code': {'.py', '.js', '.ts', '.jsx', '.tsx', '.html', '.css', '.java', '.cpp', '.c', '.h', '.go', '.rs', '.rb', '.php', '.swift', '.kt'},
    'spreadsheets': {'.xls', '.xlsx', '.csv', '.numbers', '.ods'},
    'presentations': {'.ppt', '.pptx', '.key', '.odp'},
}

# Directories to exclude
EXCLUDE_DIRS = {
    '.git', '.svn', '.hg',
    'node_modules', '__pycache__', '.pytest_cache',
    'Library/Caches', 'Library/Logs',
    '.Trash', '.cache',
    'venv', 'env', '.venv',
    '.DS_Store',
}

# Age buckets (in days)
AGE_BUCKETS = [
    (30, '0-30d'),
    (90, '31-90d'),
    (180, '91-180d'),
    (365, '181-365d'),
    (float('inf'), '1y+'),
]

# Size buckets (in bytes)
SIZE_BUCKETS = [
    (1_000_000, '0-1MB'),
    (10_000_000, '1-10MB'),
    (100_000_000, '10-100MB'),
    (1_000_000_000, '100MB-1GB'),
    (float('inf'), '1GB+'),
]


def get_file_type(extension: str) -> str:
    """Categorize file by extension."""
    ext = extension.lower()
    for category, extensions in FILE_TYPES.items():
        if ext in extensions:
            return category
    return 'other'


def hash_file(filepath: Path, chunk_size: int = 8192) -> Optional[str]:
    """Calculate SHA-256 hash of file."""
    try:
        sha256 = hashlib.sha256()
        with open(filepath, 'rb') as f:
            while chunk := f.read(chunk_size):
                sha256.update(chunk)
        return sha256.hexdigest()
    except (OSError, IOError) as e:
        return None


def get_age_bucket(mtime: float) -> str:
    """Determine age bucket for a file."""
    age_days = (datetime.now(timezone.utc).timestamp() - mtime) / 86400
    for threshold, label in AGE_BUCKETS:
        if age_days < threshold:
            return label
    return '1y+'


def get_size_bucket(size: int) -> str:
    """Determine size bucket for a file."""
    for threshold, label in SIZE_BUCKETS:
        if size < threshold:
            return label
    return '1GB+'


def should_exclude(path: Path) -> bool:
    """Check if path should be excluded."""
    parts = path.parts
    for exclude in EXCLUDE_DIRS:
        if exclude in parts:
            return True
    return False


def format_bytes(bytes_value: int) -> str:
    """Format bytes as human-readable string."""
    for unit in ['B', 'KB', 'MB', 'GB', 'TB']:
        if bytes_value < 1024.0:
            return f"{bytes_value:.1f} {unit}"
        bytes_value /= 1024.0
    return f"{bytes_value:.1f} PB"


def scan_directory(
    directory: Path,
    device_id: str,
    skip_hash: bool = False,
    verbose: bool = False
) -> Dict[str, Any]:
    """
    Scan directory tree and collect file metadata.
    
    Returns:
        Dict with scan results including files, summaries, and duplicates.
    """
    print(f"🔍 Scanning directory: {directory}")
    print(f"📱 Device ID: {device_id}")
    print(f"⏰ Started: {datetime.now(timezone.utc).isoformat()}\n")
    
    files_data = []
    total_size = 0
    total_files = 0
    errors = 0
    hash_map = defaultdict(list)  # For duplicate detection
    
    # Summary accumulators
    type_summary = defaultdict(lambda: {'count': 0, 'size': 0})
    age_summary = defaultdict(lambda: {'count': 0, 'size': 0})
    size_summary = defaultdict(lambda: {'count': 0, 'size': 0})
    
    # Scan start time
    scan_start = datetime.now(timezone.utc)
    
    # Walk directory tree
    for root, dirs, files in os.walk(directory):
        root_path = Path(root)
        
        # Filter out excluded directories
        dirs[:] = [d for d in dirs if not should_exclude(root_path / d)]
        
        for filename in files:
            filepath = root_path / filename
            
            # Skip if excluded
            if should_exclude(filepath):
                continue
            
            try:
                # Get file stats
                stat = filepath.stat()
                size = stat.st_size
                mtime = stat.st_mtime
                
                # Get file metadata
                extension = filepath.suffix
                file_type = get_file_type(extension)
                age_bucket = get_age_bucket(mtime)
                size_bucket = get_size_bucket(size)
                
                # Calculate hash (unless skipped)
                file_hash = None
                if not skip_hash:
                    file_hash = hash_file(filepath)
                    if file_hash:
                        hash_map[file_hash].append(str(filepath.relative_to(directory)))
                
                # Store file metadata
                file_data = {
                    'path': str(filepath.relative_to(directory)),
                    'size': size,
                    'mtime': datetime.fromtimestamp(mtime, timezone.utc).isoformat(),
                    'type': file_type,
                    'extension': extension,
                }
                
                if file_hash:
                    file_data['hash'] = file_hash
                
                files_data.append(file_data)
                
                # Update summaries
                total_size += size
                total_files += 1
                
                type_summary[file_type]['count'] += 1
                type_summary[file_type]['size'] += size
                
                age_summary[age_bucket]['count'] += 1
                age_summary[age_bucket]['size'] += size
                
                size_summary[size_bucket]['count'] += 1
                size_summary[size_bucket]['size'] += size
                
                # Progress reporting (every 100 files)
                if total_files % 100 == 0:
                    print(f"📊 Progress: {total_files:,} files | {format_bytes(total_size)} | {len(hash_map)} unique hashes", end='\r')
                
            except (OSError, IOError, PermissionError) as e:
                if verbose:
                    print(f"⚠️  Error reading {filepath}: {e}", file=sys.stderr)
                errors += 1
                continue
    
    print()  # New line after progress
    
    # Detect duplicates
    duplicates = []
    total_duplicate_savings = 0
    
    for file_hash, paths in hash_map.items():
        if len(paths) > 1:
            # Get size from first file
            try:
                first_file = directory / paths[0]
                file_size = first_file.stat().st_size
                savings = file_size * (len(paths) - 1)
                total_duplicate_savings += savings
                
                duplicates.append({
                    'hash': file_hash,
                    'files': paths,
                    'count': len(paths),
                    'size': file_size,
                    'savings': savings,
                })
            except (OSError, IOError):
                continue
    
    # Sort duplicates by savings (highest first)
    duplicates.sort(key=lambda x: x['savings'], reverse=True)
    
    # Build result
    scan_end = datetime.now(timezone.utc)
    duration = (scan_end - scan_start).total_seconds()
    
    result = {
        'device': {
            'id': device_id,
            'name': device_id,  # Can be customized later
            'type': 'mac' if platform.system() == 'Darwin' else platform.system().lower(),
            'hostname': socket.gethostname(),
            'os': f"{platform.system()} {platform.release()}",
        },
        'scan': {
            'timestamp': scan_end.isoformat(),
            'duration': duration,
            'root': str(directory.resolve()),
        },
        'summary': {
            'totalFiles': total_files,
            'totalSize': total_size,
            'errors': errors,
            'byType': dict(type_summary),
            'byAge': dict(age_summary),
            'bySize': dict(size_summary),
        },
        'duplicates': {
            'groups': len(duplicates),
            'totalFiles': sum(d['count'] for d in duplicates),
            'totalSavings': total_duplicate_savings,
            'details': duplicates[:100],  # Top 100 duplicate groups
        },
        'files': files_data,
    }
    
    # Print summary
    print(f"\n✅ Scan Complete!")
    print(f"📁 Total Files: {total_files:,}")
    print(f"💾 Total Size: {format_bytes(total_size)}")
    print(f"🔄 Duplicates: {len(duplicates)} groups ({sum(d['count'] for d in duplicates):,} files)")
    print(f"💰 Potential Savings: {format_bytes(total_duplicate_savings)}")
    print(f"⏱️  Duration: {duration:.1f}s")
    if errors > 0:
        print(f"⚠️  Errors: {errors}")
    print()
    
    return result


def upload_scan_results(result: Dict[str, Any], api_url: str) -> bool:
    """
    Upload scan results to Second Brain API.
    
    Args:
        result: Scan result dictionary
        api_url: Base URL of Second Brain (e.g., http://localhost:3000)
    
    Returns:
        True if successful, False otherwise
    """
    # Construct API endpoint
    if not api_url.endswith('/'):
        api_url += '/'
    endpoint = f"{api_url}api/devices/sync"
    
    print(f"\n📤 Uploading to {endpoint}...")
    
    try:
        # Convert to JSON
        payload = json.dumps(result).encode('utf-8')
        
        # Create request
        req = urllib.request.Request(
            endpoint,
            data=payload,
            headers={
                'Content-Type': 'application/json',
                'Content-Length': str(len(payload)),
            },
            method='POST'
        )
        
        # Send request
        with urllib.request.urlopen(req, timeout=30) as response:
            response_data = json.loads(response.read().decode('utf-8'))
            
            if response_data.get('success'):
                print(f"✅ Upload successful!")
                print(f"   Device: {response_data.get('device', {}).get('name')}")
                print(f"   Scan count: {response_data.get('device', {}).get('scanCount')}")
                return True
            else:
                print(f"⚠️  Upload failed: {response_data.get('error', 'Unknown error')}")
                return False
                
    except urllib.error.HTTPError as e:
        print(f"❌ HTTP Error {e.code}: {e.reason}")
        try:
            error_data = json.loads(e.read().decode('utf-8'))
            print(f"   {error_data.get('error', 'Unknown error')}")
        except:
            pass
        return False
        
    except urllib.error.URLError as e:
        print(f"❌ Connection failed: {e.reason}")
        print(f"   Make sure Second Brain is running at {api_url}")
        return False
        
    except Exception as e:
        print(f"❌ Upload error: {e}")
        return False


def main():
    parser = argparse.ArgumentParser(
        description='Device Scanner - Catalog files and detect duplicates',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python scan.py --directory ~/Downloads --device-id mac-mini-m2
  python scan.py --directory /Users/samson --device-id mac-mini-m2 --output scan.json --skip-hash
  python scan.py --directory ~/Documents --device-id macbook-pro --verbose
        """
    )
    
    parser.add_argument(
        '--directory',
        type=str,
        required=True,
        help='Directory to scan (e.g., ~/Downloads, /Users/samson)',
    )
    
    parser.add_argument(
        '--device-id',
        type=str,
        required=True,
        help='Unique device identifier (e.g., mac-mini-m2)',
    )
    
    parser.add_argument(
        '--output',
        type=str,
        default=None,
        help='Output JSON file path (default: scan-{device-id}-{timestamp}.json)',
    )
    
    parser.add_argument(
        '--skip-hash',
        action='store_true',
        help='Skip SHA-256 hashing (faster, but no duplicate detection)',
    )
    
    parser.add_argument(
        '--verbose',
        action='store_true',
        help='Verbose output (show errors)',
    )
    
    parser.add_argument(
        '--upload',
        type=str,
        default=None,
        help='Upload results to Second Brain API (e.g., http://localhost:3000 or https://brain.6eyes.dev)',
    )
    
    args = parser.parse_args()
    
    # Expand and validate directory
    directory = Path(args.directory).expanduser().resolve()
    if not directory.exists():
        print(f"❌ Error: Directory does not exist: {directory}", file=sys.stderr)
        sys.exit(1)
    
    if not directory.is_dir():
        print(f"❌ Error: Not a directory: {directory}", file=sys.stderr)
        sys.exit(1)
    
    # Run scan
    try:
        result = scan_directory(
            directory=directory,
            device_id=args.device_id,
            skip_hash=args.skip_hash,
            verbose=args.verbose,
        )
    except KeyboardInterrupt:
        print("\n⚠️  Scan interrupted by user", file=sys.stderr)
        sys.exit(1)
    
    # Determine output file
    if args.output:
        output_file = Path(args.output)
    else:
        timestamp = datetime.now(timezone.utc).strftime('%Y%m%d-%H%M%S')
        output_file = Path(f"scan-{args.device_id}-{timestamp}.json")
    
    # Write JSON output (if output specified or no upload)
    if args.output or not args.upload:
        try:
            with open(output_file, 'w') as f:
                json.dump(result, f, indent=2)
            print(f"💾 Saved: {output_file.resolve()}")
        except IOError as e:
            print(f"❌ Error writing output: {e}", file=sys.stderr)
            sys.exit(1)
    
    # Upload to API if requested
    if args.upload:
        success = upload_scan_results(result, args.upload)
        if not success:
            print(f"⚠️  Upload failed, but local file saved: {output_file.resolve()}")
            sys.exit(1)
    
    print(f"✨ Done!\n")


if __name__ == '__main__':
    main()
