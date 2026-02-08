#!/usr/bin/env python3
"""
TikTok OAuth 2.0 Flow Handler
Deterministic execution for TikTok Login Kit OAuth operations.
Note: Requires anti-forgery state token for security.
"""

import argparse
import os
import secrets
import json
import sys
import time
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
import requests

# Environment variables
TIKTOK_CLIENT_KEY = os.getenv('TIKTOK_CLIENT_KEY')
TIKTOK_CLIENT_SECRET = os.getenv('TIKTOK_CLIENT_SECRET')
TIKTOK_REDIRECT_URI = os.getenv('TIKTOK_REDIRECT_URI', 'http://localhost:3000/api/auth/tiktok/callback')

TIKTOK_AUTH_URL = 'https://www.tiktok.com/v2/auth/authorize/'
TIKTOK_TOKEN_URL = 'https://open-api.tiktok.com/oauth/access_token/'
TIKTOK_REFRESH_URL = 'https://open-api.tiktok.com/oauth/refresh_token/'
TIKTOK_API_BASE = 'https://open-api.tiktok.com'


def generate_state_token() -> str:
    """Generate anti-forgery state token."""
    return secrets.token_urlsafe(32)


def initiate_oauth(user_id: str, dry_run: bool = False) -> Dict[str, Any]:
    """Generate OAuth URL for TikTok connection with anti-forgery state."""
    if dry_run:
        print(f"[DRY RUN] Would initiate TikTok OAuth for user: {user_id}")
        return {
            'auth_url': 'https://www.tiktok.com/v2/auth/authorize/?dry_run=true',
            'state': 'dry_run_state',
            'anti_forgery_token': 'dry_run_csrf_token'
        }
    
    state = generate_state_token()
    
    params = {
        'client_key': TIKTOK_CLIENT_KEY,
        'response_type': 'code',
        'scope': 'user.info.basic,user.info.profile,video.publish,video.upload',
        'redirect_uri': TIKTOK_REDIRECT_URI,
        'state': state
    }
    
    from urllib.parse import urlencode
    auth_url = f"{TIKTOK_AUTH_URL}?{urlencode(params)}"
    
    return {
        'auth_url': auth_url,
        'state': state,
        'anti_forgery_token': state,
        'expires_at': int((datetime.utcnow() + timedelta(minutes=10)).timestamp())
    }


def exchange_code(code: str, state: str, dry_run: bool = False) -> Dict[str, Any]:
    """Exchange OAuth code for access token."""
    if dry_run:
        print(f"[DRY RUN] Would exchange code: {code[:10]}...")
        return {
            'access_token': 'dry_run_token',
            'refresh_token': 'dry_run_refresh_token',
            'expires_at': int((datetime.utcnow() + timedelta(hours=24)).timestamp()),
            'open_id': 'dry_run_open_id',
            'scope': 'user.info.basic,video.publish'
        }
    
    payload = {
        'client_key': TIKTOK_CLIENT_KEY,
        'client_secret': TIKTOK_CLIENT_SECRET,
        'code': code,
        'grant_type': 'authorization_code',
        'redirect_uri': TIKTOK_REDIRECT_URI
    }
    
    response = requests.post(TIKTOK_TOKEN_URL, json=payload)
    response.raise_for_status()
    
    data = response.json()
    
    if data.get('error_code') != 0:
        raise Exception(f"TikTok error: {data.get('description', 'Unknown error')}")
    
    token_data = data.get('data', {})
    
    return {
        'access_token': token_data['access_token'],
        'refresh_token': token_data.get('refresh_token'),
        'expires_at': int(datetime.utcnow().timestamp() + token_data.get('expires_in', 86400)),
        'open_id': token_data.get('open_id'),
        'scope': token_data.get('scope', '')
    }


def refresh_token(refresh_token: str, dry_run: bool = False) -> Dict[str, Any]:
    """Refresh access token (TikTok tokens expire in 24 hours)."""
    if dry_run:
        print(f"[DRY RUN] Would refresh token: {refresh_token[:10]}...")
        return {
            'access_token': 'new_dry_run_token',
            'refresh_token': refresh_token,
            'expires_at': int((datetime.utcnow() + timedelta(hours=24)).timestamp()),
            'open_id': 'dry_run_open_id'
        }
    
    payload = {
        'client_key': TIKTOK_CLIENT_KEY,
        'client_secret': TIKTOK_CLIENT_SECRET,
        'grant_type': 'refresh_token',
        'refresh_token': refresh_token
    }
    
    response = requests.post(TIKTOK_REFRESH_URL, json=payload)
    response.raise_for_status()
    
    data = response.json()
    
    if data.get('error_code') != 0:
        raise Exception(f"TikTok error: {data.get('description', 'Unknown error')}")
    
    token_data = data.get('data', {})
    
    return {
        'access_token': token_data['access_token'],
        'refresh_token': token_data.get('refresh_token', refresh_token),
        'expires_at': int(datetime.utcnow().timestamp() + token_data.get('expires_in', 86400)),
        'open_id': token_data.get('open_id'),
        'scope': token_data.get('scope', '')
    }


def get_user_info(access_token: str, open_id: str, dry_run: bool = False) -> Dict[str, Any]:
    """Get TikTok user info."""
    if dry_run:
        return {
            'data': {
                'user': {
                    'open_id': 'dry_run_open_id',
                    'union_id': 'dry_run_union_id',
                    'avatar_url': 'https://example.com/avatar.jpg',
                    'display_name': 'Test User',
                    'bio_description': 'Test bio'
                }
            }
        }
    
    params = {
        'open_id': open_id,
        'access_token': access_token
    }
    
    response = requests.get(
        f'{TIKTOK_API_BASE}/user/info/',
        params=params
    )
    response.raise_for_status()
    
    return response.json()


def query_videos(access_token: str, open_id: str, cursor: int = 0, dry_run: bool = False) -> Dict[str, Any]:
    """Query user's videos."""
    if dry_run:
        return {
            'data': {
                'videos': [
                    {
                        'id': 'dry_run_video_id',
                        'title': 'Test Video',
                        'create_time': int(datetime.utcnow().timestamp())
                    }
                ],
                'cursor': 0,
                'has_more': False
            }
        }
    
    params = {
        'open_id': open_id,
        'access_token': access_token,
        'cursor': cursor,
        'max_count': 20
    }
    
    response = requests.get(
        f'{TIKTOK_API_BASE}/video/list/',
        params=params
    )
    response.raise_for_status()
    
    return response.json()


def upload_video_direct(
    access_token: str,
    open_id: str,
    video_file_path: str,
    title: str = '',
    dry_run: bool = False
) -> Dict[str, Any]:
    """Upload video directly to TikTok (for small files <50MB)."""
    if dry_run:
        print(f"[DRY RUN] Would upload video: {video_file_path}")
        return {
            'data': {
                'video_id': 'dry_run_video_id',
                'upload_url': 'https://example.com/upload'
            }
        }
    
    # Step 1: Initiate upload
    params = {
        'open_id': open_id,
        'access_token': access_token,
        'source_info': json.dumps({
            'source': 'FILE_UPLOAD',
            'video_size': os.path.getsize(video_file_path)
        })
    }
    
    if title:
        params['title'] = title
    
    response = requests.post(
        f'{TIKTOK_API_BASE}/video/upload/',
        params=params
    )
    response.raise_for_status()
    
    data = response.json()
    if data.get('error_code') != 0:
        raise Exception(f"TikTok error: {data.get('description', 'Unknown error')}")
    
    # Step 2: Upload video file to provided URL
    upload_data = data.get('data', {})
    upload_url = upload_data.get('upload_url')
    
    if upload_url:
        with open(video_file_path, 'rb') as f:
            upload_response = requests.put(upload_url, data=f)
            upload_response.raise_for_status()
    
    return upload_data


def create_video_from_url(
    access_token: str,
    open_id: str,
    video_url: str,
    title: str = '',
    dry_run: bool = False
) -> Dict[str, Any]:
    """Create video from public URL (TikTok fetches from URL)."""
    if dry_run:
        print(f"[DRY RUN] Would create video from URL: {video_url}")
        return {
            'data': {
                'video_id': 'dry_run_video_id',
                'share_id': 'dry_run_share_id'
            }
        }
    
    params = {
        'open_id': open_id,
        'access_token': access_token,
        'source_info': json.dumps({
            'source': 'PULL_FROM_URL',
            'url': video_url
        })
    }
    
    if title:
        params['title'] = title
    
    response = requests.post(
        f'{TIKTOK_API_BASE}/video/create/',
        params=params
    )
    response.raise_for_status()
    
    data = response.json()
    
    if data.get('error_code') != 0:
        raise Exception(f"TikTok error: {data.get('description', 'Unknown error')}")
    
    return data


def check_video_status(
    access_token: str,
    open_id: str,
    video_ids: list,
    dry_run: bool = False
) -> Dict[str, Any]:
    """Check video processing/publish status."""
    if dry_run:
        return {
            'data': {
                'videos': [
                    {
                        'id': 'dry_run_video_id',
                        'status': 'published',
                        'fail_reason': None
                    }
                ]
            }
        }
    
    params = {
        'open_id': open_id,
        'access_token': access_token,
        'video_ids': json.dumps(video_ids)
    }
    
    response = requests.post(
        f'{TIKTOK_API_BASE}/video/status/',
        params=params
    )
    response.raise_for_status()
    
    return response.json()


def main():
    parser = argparse.ArgumentParser(description='TikTok OAuth Flow Handler')
    parser.add_argument('--action', required=True,
                       choices=['initiate', 'callback', 'refresh', 'user', 'videos',
                               'upload', 'create_url', 'status'])
    parser.add_argument('--user_id', help='User ID')
    parser.add_argument('--code', help='OAuth code')
    parser.add_argument('--state', help='OAuth state')
    parser.add_argument('--access_token', help='Access token')
    parser.add_argument('--refresh_token', help='Refresh token')
    parser.add_argument('--open_id', help='TikTok Open ID')
    parser.add_argument('--video_path', help='Local video file path')
    parser.add_argument('--video_url', help='Public video URL')
    parser.add_argument('--title', help='Video title/caption')
    parser.add_argument('--cursor', type=int, default=0, help='Pagination cursor')
    parser.add_argument('--video_ids', help='Comma-separated video IDs')
    parser.add_argument('--dry-run', action='store_true', help='Dry run mode')
    
    args = parser.parse_args()
    
    try:
        if args.action == 'initiate':
            if not args.user_id:
                print("Error: --user_id required", file=sys.stderr)
                sys.exit(1)
            result = initiate_oauth(args.user_id, args.dry_run)
            
        elif args.action == 'callback':
            if not all([args.code, args.state]):
                print("Error: --code and --state required", file=sys.stderr)
                sys.exit(1)
            result = exchange_code(args.code, args.state, args.dry_run)
            
        elif args.action == 'refresh':
            if not args.refresh_token:
                print("Error: --refresh_token required", file=sys.stderr)
                sys.exit(1)
            result = refresh_token(args.refresh_token, args.dry_run)
            
        elif args.action == 'user':
            if not all([args.access_token, args.open_id]):
                print("Error: --access_token and --open_id required", file=sys.stderr)
                sys.exit(1)
            result = get_user_info(args.access_token, args.open_id, args.dry_run)
            
        elif args.action == 'videos':
            if not all([args.access_token, args.open_id]):
                print("Error: --access_token and --open_id required", file=sys.stderr)
                sys.exit(1)
            result = query_videos(args.access_token, args.open_id, args.cursor, args.dry_run)
            
        elif args.action == 'upload':
            if not all([args.access_token, args.open_id, args.video_path]):
                print("Error: --access_token, --open_id, --video_path required", file=sys.stderr)
                sys.exit(1)
            result = upload_video_direct(
                args.access_token, args.open_id, args.video_path,
                args.title or '', args.dry_run
            )
            
        elif args.action == 'create_url':
            if not all([args.access_token, args.open_id, args.video_url]):
                print("Error: --access_token, --open_id, --video_url required", file=sys.stderr)
                sys.exit(1)
            result = create_video_from_url(
                args.access_token, args.open_id, args.video_url,
                args.title or '', args.dry_run
            )
            
        elif args.action == 'status':
            if not all([args.access_token, args.open_id, args.video_ids]):
                print("Error: --access_token, --open_id, --video_ids required", file=sys.stderr)
                sys.exit(1)
            video_id_list = args.video_ids.split(',')
            result = check_video_status(args.access_token, args.open_id, video_id_list, args.dry_run)
        
        print(json.dumps(result, indent=2))
        
    except requests.exceptions.HTTPError as e:
        error = {
            'error': 'http_error',
            'status': e.response.status_code if hasattr(e.response, 'status_code') else None,
            'message': str(e),
            'response': e.response.text if hasattr(e.response, 'text') else None
        }
        print(json.dumps(error), file=sys.stderr)
        sys.exit(1)
        
    except Exception as e:
        error = {
            'error': 'unexpected',
            'message': str(e)
        }
        print(json.dumps(error), file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
