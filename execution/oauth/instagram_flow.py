#!/usr/bin/env python3
"""
Instagram OAuth 2.0 Flow Handler
Deterministic execution for Instagram OAuth operations via Facebook Graph API.
Note: Requires Instagram Business/Creator account connected to Facebook Page.
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
INSTAGRAM_APP_ID = os.getenv('INSTAGRAM_APP_ID')
INSTAGRAM_APP_SECRET = os.getenv('INSTAGRAM_APP_SECRET')
INSTAGRAM_REDIRECT_URI = os.getenv('INSTAGRAM_REDIRECT_URI', 'http://localhost:3000/api/auth/instagram/callback')

# Facebook Graph API endpoints (Instagram uses Facebook Graph API)
FB_AUTH_URL = 'https://www.facebook.com/v18.0/dialog/oauth'
FB_TOKEN_URL = 'https://graph.facebook.com/v18.0/oauth/access_token'
FB_DEBUG_TOKEN_URL = 'https://graph.instagram.com/debug_token'
INSTAGRAM_API_BASE = 'https://graph.instagram.com'
FB_GRAPH_BASE = 'https://graph.facebook.com/v18.0'


def initiate_oauth(user_id: str, dry_run: bool = False) -> Dict[str, Any]:
    """Generate OAuth URL for Instagram connection."""
    if dry_run:
        print(f"[DRY RUN] Would initiate Instagram OAuth for user: {user_id}")
        return {
            'auth_url': 'https://www.facebook.com/v18.0/dialog/oauth?dry_run=true',
            'state': 'dry_run_state'
        }
    
    state = secrets.token_urlsafe(32)
    
    params = {
        'client_id': INSTAGRAM_APP_ID,
        'redirect_uri': INSTAGRAM_REDIRECT_URI,
        'state': state,
        'scope': 'instagram_basic,instagram_content_publish,pages_read_engagement',
        'response_type': 'code'
    }
    
    from urllib.parse import urlencode
    auth_url = f"{FB_AUTH_URL}?{urlencode(params)}"
    
    return {
        'auth_url': auth_url,
        'state': state,
        'expires_at': (datetime.utcnow().timestamp() + 600)  # 10 min
    }


def exchange_code(code: str, state: str, dry_run: bool = False) -> Dict[str, Any]:
    """Exchange OAuth code for short-lived token, then get long-lived token."""
    if dry_run:
        print(f"[DRY RUN] Would exchange code: {code[:10]}...")
        return {
            'access_token': 'dry_run_long_lived_token',
            'refresh_token': None,  # Instagram uses long-lived tokens (60 days)
            'expires_at': int((datetime.utcnow() + timedelta(days=60)).timestamp()),
            'scope': 'instagram_basic,instagram_content_publish'
        }
    
    # Step 1: Exchange code for short-lived token
    params = {
        'client_id': INSTAGRAM_APP_ID,
        'client_secret': INSTAGRAM_APP_SECRET,
        'code': code,
        'grant_type': 'authorization_code',
        'redirect_uri': INSTAGRAM_REDIRECT_URI
    }
    
    response = requests.get(FB_TOKEN_URL, params=params)
    response.raise_for_status()
    
    token_data = response.json()
    short_lived_token = token_data['access_token']
    
    # Step 2: Exchange for long-lived token (60 days)
    long_lived_url = 'https://graph.instagram.com/access_token'
    long_lived_params = {
        'grant_type': 'ig_exchange_token',
        'client_secret': INSTAGRAM_APP_SECRET,
        'access_token': short_lived_token
    }
    
    ll_response = requests.get(long_lived_url, params=long_lived_params)
    ll_response.raise_for_status()
    
    long_lived_data = ll_response.json()
    
    return {
        'access_token': long_lived_data['access_token'],
        'refresh_token': None,
        'expires_at': int(datetime.utcnow().timestamp() + long_lived_data.get('expires_in', 5184000)),
        'scope': token_data.get('scope', 'instagram_basic,instagram_content_publish'),
        'token_type': 'Bearer'
    }


def refresh_long_lived_token(access_token: str, dry_run: bool = False) -> Dict[str, Any]:
    """Refresh a long-lived Instagram token before expiry (60 days)."""
    if dry_run:
        print(f"[DRY RUN] Would refresh token: {access_token[:10]}...")
        return {
            'access_token': 'new_dry_run_token',
            'expires_at': int((datetime.utcnow() + timedelta(days=60)).timestamp()),
            'scope': 'instagram_basic,instagram_content_publish'
        }
    
    refresh_url = 'https://graph.instagram.com/refresh_access_token'
    params = {
        'grant_type': 'ig_refresh_token',
        'access_token': access_token
    }
    
    response = requests.get(refresh_url, params=params)
    response.raise_for_status()
    
    token_data = response.json()
    
    return {
        'access_token': token_data['access_token'],
        'refresh_token': None,
        'expires_at': int(datetime.utcnow().timestamp() + token_data.get('expires_in', 5184000)),
        'scope': token_data.get('scope', '')
    }


def get_user_info(access_token: str, dry_run: bool = False) -> Dict[str, Any]:
    """Get Instagram user info."""
    if dry_run:
        return {
            'id': 'dry_run_ig_user_id',
            'username': 'testuser',
            'account_type': 'BUSINESS'  # or PERSONAL
        }
    
    params = {
        'fields': 'id,username,account_type,media_count',
        'access_token': access_token
    }
    
    response = requests.get(f'{INSTAGRAM_API_BASE}/me', params=params)
    response.raise_for_status()
    
    return response.json()


def get_account(access_token: str, page_id: str, dry_run: bool = False) -> Dict[str, Any]:
    """Get connected Instagram Business account from Facebook Page."""
    if dry_run:
        return {
            'instagram_business_account': {
                'id': 'dry_run_ig_business_id'
            }
        }
    
    params = {
        'fields': 'instagram_business_account',
        'access_token': access_token
    }
    
    response = requests.get(f'{FB_GRAPH_BASE}/{page_id}', params=params)
    response.raise_for_status()
    
    return response.json()


def create_media_container(
    access_token: str,
    ig_user_id: str,
    media_type: str = 'IMAGE',
    image_url: str = None,
    video_url: str = None,
    caption: str = '',
    dry_run: bool = False
) -> Dict[str, Any]:
    """Create a media container for publishing."""
    if dry_run:
        print(f"[DRY RUN] Would create media container: {media_type}")
        return {
            'id': 'dry_run_container_id',
            'status': 'FINISHED'
        }
    
    params = {
        'access_token': access_token
    }
    
    if media_type == 'IMAGE':
        params['image_url'] = image_url
    elif media_type == 'VIDEO':
        params['video_url'] = video_url
        params['media_type'] = 'REELS'  # or VIDEO for feed videos
    
    if caption:
        params['caption'] = caption
    
    response = requests.post(
        f'{FB_GRAPH_BASE}/{ig_user_id}/media',
        params=params
    )
    response.raise_for_status()
    
    return response.json()


def check_media_status(
    access_token: str,
    container_id: str,
    dry_run: bool = False
) -> Dict[str, Any]:
    """Check media container processing status."""
    if dry_run:
        return {
            'id': container_id,
            'status': 'FINISHED'
        }
    
    params = {
        'fields': 'status_code',
        'access_token': access_token
    }
    
    response = requests.get(
        f'{FB_GRAPH_BASE}/{container_id}',
        params=params
    )
    response.raise_for_status()
    
    return response.json()


def publish_media(
    access_token: str,
    ig_user_id: str,
    container_id: str,
    dry_run: bool = False
) -> Dict[str, Any]:
    """Publish media container to Instagram."""
    if dry_run:
        print(f"[DRY RUN] Would publish media: {container_id}")
        return {
            'id': 'dry_run_media_id',
            'permalink': 'https://instagram.com/p/dryrun'
        }
    
    params = {
        'creation_id': container_id,
        'access_token': access_token
    }
    
    response = requests.post(
        f'{FB_GRAPH_BASE}/{ig_user_id}/media_publish',
        params=params
    )
    response.raise_for_status()
    
    result = response.json()
    result['published_at'] = datetime.utcnow().isoformat()
    
    return result


def post_with_media(
    access_token: str,
    ig_user_id: str,
    media_url: str,
    caption: str,
    media_type: str = 'IMAGE',
    dry_run: bool = False
) -> Dict[str, Any]:
    """Full workflow: create container, check status, publish."""
    # Step 1: Create container
    if media_type == 'IMAGE':
        container = create_media_container(
            access_token, ig_user_id, 'IMAGE',
            image_url=media_url, caption=caption, dry_run=dry_run
        )
    else:
        container = create_media_container(
            access_token, ig_user_id, 'VIDEO',
            video_url=media_url, caption=caption, dry_run=dry_run
        )
    
    container_id = container['id']
    
    # Step 2: For videos, wait for processing
    if media_type == 'VIDEO':
        max_attempts = 10
        for i in range(max_attempts):
            status = check_media_status(access_token, container_id, dry_run)
            if status.get('status_code') == 'FINISHED':
                break
            time.sleep(2)  # Wait 2 seconds between checks
    
    # Step 3: Publish
    result = publish_media(access_token, ig_user_id, container_id, dry_run)
    
    return result


def main():
    parser = argparse.ArgumentParser(description='Instagram OAuth Flow Handler')
    parser.add_argument('--action', required=True,
                       choices=['initiate', 'callback', 'refresh', 'user', 'account', 
                               'create_container', 'check_status', 'publish', 'post'])
    parser.add_argument('--user_id', help='User ID')
    parser.add_argument('--code', help='OAuth code')
    parser.add_argument('--state', help='OAuth state')
    parser.add_argument('--access_token', help='Access token')
    parser.add_argument('--ig_user_id', help='Instagram Business Account ID')
    parser.add_argument('--page_id', help='Facebook Page ID (for getting IG account)')
    parser.add_argument('--media_url', help='Image/Video URL')
    parser.add_argument('--caption', help='Post caption')
    parser.add_argument('--media_type', default='IMAGE', choices=['IMAGE', 'VIDEO'])
    parser.add_argument('--container_id', help='Media container ID')
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
            if not args.access_token:
                print("Error: --access_token required", file=sys.stderr)
                sys.exit(1)
            result = refresh_long_lived_token(args.access_token, args.dry_run)
            
        elif args.action == 'user':
            if not args.access_token:
                print("Error: --access_token required", file=sys.stderr)
                sys.exit(1)
            result = get_user_info(args.access_token, args.dry_run)
            
        elif args.action == 'account':
            if not all([args.access_token, args.page_id]):
                print("Error: --access_token and --page_id required", file=sys.stderr)
                sys.exit(1)
            result = get_account(args.access_token, args.page_id, args.dry_run)
            
        elif args.action == 'create_container':
            if not all([args.access_token, args.ig_user_id, args.media_url]):
                print("Error: --access_token, --ig_user_id, --media_url required", file=sys.stderr)
                sys.exit(1)
            result = create_media_container(
                args.access_token, args.ig_user_id, args.media_type,
                args.media_url, args.caption, args.dry_run
            )
            
        elif args.action == 'check_status':
            if not all([args.access_token, args.container_id]):
                print("Error: --access_token and --container_id required", file=sys.stderr)
                sys.exit(1)
            result = check_media_status(args.access_token, args.container_id, args.dry_run)
            
        elif args.action == 'publish':
            if not all([args.access_token, args.ig_user_id, args.container_id]):
                print("Error: --access_token, --ig_user_id, --container_id required", file=sys.stderr)
                sys.exit(1)
            result = publish_media(args.access_token, args.ig_user_id, args.container_id, args.dry_run)
            
        elif args.action == 'post':
            if not all([args.access_token, args.ig_user_id, args.media_url]):
                print("Error: --access_token, --ig_user_id, --media_url required", file=sys.stderr)
                sys.exit(1)
            result = post_with_media(
                args.access_token, args.ig_user_id, args.media_url,
                args.caption or '', args.media_type, args.dry_run
            )
        
        print(json.dumps(result, indent=2))
        
    except requests.exceptions.HTTPError as e:
        error = {
            'error': 'http_error',
            'status': e.response.status_code,
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
