#!/usr/bin/env python3
"""
Medium OAuth 2.0 Flow Handler
Deterministic execution for Medium OAuth operations.
Note: Medium tokens do not expire, no refresh needed.
"""

import argparse
import os
import secrets
import json
import sys
from datetime import datetime
from typing import Dict, Any, Optional
import requests

# Environment variables
MEDIUM_CLIENT_ID = os.getenv('MEDIUM_CLIENT_ID')
MEDIUM_CLIENT_SECRET = os.getenv('MEDIUM_CLIENT_SECRET')
MEDIUM_REDIRECT_URI = os.getenv('MEDIUM_REDIRECT_URI', 'http://localhost:3000/api/auth/medium/callback')

MEDIUM_AUTH_URL = 'https://medium.com/m/oauth/authorize'
MEDIUM_TOKEN_URL = 'https://api.medium.com/v1/tokens'
MEDIUM_API_BASE = 'https://api.medium.com/v1'


def initiate_oauth(user_id: str, dry_run: bool = False) -> Dict[str, Any]:
    """Generate OAuth URL for Medium connection."""
    if dry_run:
        print(f"[DRY RUN] Would initiate Medium OAuth for user: {user_id}")
        return {
            'auth_url': 'https://medium.com/m/oauth/authorize?dry_run=true',
            'state': 'dry_run_state'
        }
    
    state = secrets.token_urlsafe(32)
    
    params = {
        'client_id': MEDIUM_CLIENT_ID,
        'response_type': 'code',
        'redirect_uri': MEDIUM_REDIRECT_URI,
        'state': state,
        'scope': 'basicProfile listPublications publishPost'
    }
    
    from urllib.parse import urlencode
    auth_url = f"{MEDIUM_AUTH_URL}?{urlencode(params)}"
    
    return {
        'auth_url': auth_url,
        'state': state,
        'expires_at': (datetime.utcnow().timestamp() + 600)  # 10 min
    }


def exchange_code(code: str, state: str, dry_run: bool = False) -> Dict[str, Any]:
    """Exchange OAuth code for access token."""
    if dry_run:
        print(f"[DRY RUN] Would exchange code: {code[:10]}...")
        return {
            'access_token': 'dry_run_token',
            'refresh_token': None,  # Medium tokens don't expire
            'expires_at': None,
            'scope': 'basicProfile listPublications publishPost'
        }
    
    payload = {
        'code': code,
        'client_id': MEDIUM_CLIENT_ID,
        'client_secret': MEDIUM_CLIENT_SECRET,
        'grant_type': 'authorization_code',
        'redirect_uri': MEDIUM_REDIRECT_URI
    }
    
    response = requests.post(MEDIUM_TOKEN_URL, data=payload)
    response.raise_for_status()
    
    token_data = response.json()
    
    # Medium tokens don't expire
    return {
        'access_token': token_data['access_token'],
        'refresh_token': None,
        'expires_at': None,
        'scope': token_data.get('scope', ''),
        'token_type': token_data.get('token_type', 'Bearer')
    }


def get_user(access_token: str, dry_run: bool = False) -> Dict[str, Any]:
    """Get authenticated user info."""
    if dry_run:
        return {
            'data': {
                'id': 'dry_run_user_id',
                'username': 'testuser',
                'name': 'Test User',
                'url': 'https://medium.com/@testuser',
                'imageUrl': 'https://example.com/avatar.jpg'
            }
        }
    
    headers = {
        'Authorization': f'Bearer {access_token}',
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    }
    
    response = requests.get(
        f'{MEDIUM_API_BASE}/me',
        headers=headers
    )
    response.raise_for_status()
    
    return response.json()


def get_publications(access_token: str, user_id: str, dry_run: bool = False) -> Dict[str, Any]:
    """Get user's publications."""
    if dry_run:
        return {
            'data': [
                {
                    'id': 'dry_run_pub_id',
                    'name': 'Test Publication',
                    'url': 'https://medium.com/test-pub'
                }
            ]
        }
    
    headers = {
        'Authorization': f'Bearer {access_token}',
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    }
    
    response = requests.get(
        f'{MEDIUM_API_BASE}/users/{user_id}/publications',
        headers=headers
    )
    response.raise_for_status()
    
    return response.json()


def create_post(
    access_token: str,
    user_id: str,
    title: str,
    content: str,
    content_format: str = 'html',
    tags: list = None,
    publish_status: str = 'public',
    notify_followers: bool = True,
    publication_id: str = None,
    dry_run: bool = False
) -> Dict[str, Any]:
    """Create a post on Medium."""
    if dry_run:
        print(f"[DRY RUN] Would create Medium post: {title}")
        return {
            'data': {
                'id': 'dry_run_post_id',
                'title': title,
                'url': 'https://medium.com/@testuser/test-post',
                'publishedAt': datetime.utcnow().isoformat()
            }
        }
    
    headers = {
        'Authorization': f'Bearer {access_token}',
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    }
    
    payload = {
        'title': title,
        'contentFormat': content_format,
        'content': content,
        'tags': tags or [],
        'publishStatus': publish_status,
        'notifyFollowers': notify_followers
    }
    
    # Post to publication if specified, else to user's profile
    if publication_id:
        url = f'{MEDIUM_API_BASE}/publications/{publication_id}/posts'
    else:
        url = f'{MEDIUM_API_BASE}/users/{user_id}/posts'
    
    response = requests.post(url, headers=headers, json=payload)
    response.raise_for_status()
    
    result = response.json()
    result['created_at'] = datetime.utcnow().isoformat()
    
    return result


def main():
    parser = argparse.ArgumentParser(description='Medium OAuth Flow Handler')
    parser.add_argument('--action', required=True,
                       choices=['initiate', 'callback', 'user', 'publications', 'post'])
    parser.add_argument('--user_id', help='User ID')
    parser.add_argument('--code', help='OAuth code')
    parser.add_argument('--state', help='OAuth state')
    parser.add_argument('--access_token', help='Access token')
    parser.add_argument('--author_id', help='Medium author/user ID')
    parser.add_argument('--publication_id', help='Publication ID (optional)')
    parser.add_argument('--title', help='Post title')
    parser.add_argument('--content', help='Post content (HTML or markdown)')
    parser.add_argument('--content_format', default='html', choices=['html', 'markdown'])
    parser.add_argument('--tags', help='Comma-separated tags')
    parser.add_argument('--publish_status', default='public', choices=['public', 'draft'])
    parser.add_argument('--notify', type=bool, default=True, help='Notify followers')
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
            
        elif args.action == 'user':
            if not args.access_token:
                print("Error: --access_token required", file=sys.stderr)
                sys.exit(1)
            result = get_user(args.access_token, args.dry_run)
            
        elif args.action == 'publications':
            if not all([args.access_token, args.author_id]):
                print("Error: --access_token and --author_id required", file=sys.stderr)
                sys.exit(1)
            result = get_publications(args.access_token, args.author_id, args.dry_run)
            
        elif args.action == 'post':
            if not all([args.access_token, args.author_id, args.title, args.content]):
                print("Error: --access_token, --author_id, --title, --content required", file=sys.stderr)
                sys.exit(1)
            tags = args.tags.split(',') if args.tags else []
            result = create_post(
                args.access_token,
                args.author_id,
                args.title,
                args.content,
                args.content_format,
                tags,
                args.publish_status,
                args.notify,
                args.publication_id,
                args.dry_run
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
