#!/usr/bin/env python3
"""
X / Twitter OAuth 2.0 Flow Handler
Deterministic execution for Twitter/X OAuth operations.
"""

import argparse
import os
import secrets
import base64
import hashlib
import json
import sys
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
import requests

# Environment variables
TWITTER_CLIENT_ID = os.getenv('TWITTER_CLIENT_ID')
TWITTER_CLIENT_SECRET = os.getenv('TWITTER_CLIENT_SECRET')  # Optional for PKCE
TWITTER_REDIRECT_URI = os.getenv('TWITTER_REDIRECT_URI', 'http://localhost:3000/api/auth/twitter/callback')

TWITTER_AUTH_URL = 'https://twitter.com/i/oauth2/authorize'
TWITTER_TOKEN_URL = 'https://api.twitter.com/2/oauth2/token'
TWITTER_API_BASE = 'https://api.twitter.com/2'


def generate_pkce() -> Dict[str, str]:
    """Generate PKCE code verifier and challenge."""
    code_verifier = base64.urlsafe_b64encode(
        secrets.token_bytes(32)
    ).decode('utf-8').rstrip('=')
    
    code_challenge = base64.urlsafe_b64encode(
        hashlib.sha256(code_verifier.encode()).digest()
    ).decode('utf-8').rstrip('=')
    
    return {
        'verifier': code_verifier,
        'challenge': code_challenge,
        'method': 'S256'
    }


def initiate_oauth(user_id: str, dry_run: bool = False) -> Dict[str, Any]:
    """Generate OAuth URL for X connection."""
    if dry_run:
        print(f"[DRY RUN] Would initiate X OAuth for user: {user_id}")
        return {
            'auth_url': 'https://twitter.com/i/oauth2/authorize?dry_run=true',
            'state': 'dry_run_state',
            'pkce_verifier': 'dry_run_verifier'
        }
    
    state = secrets.token_urlsafe(32)
    pkce = generate_pkce()
    
    params = {
        'response_type': 'code',
        'client_id': TWITTER_CLIENT_ID,
        'redirect_uri': TWITTER_REDIRECT_URI,
        'state': state,
        'scope': 'tweet.read tweet.write users.read offline.access',
        'code_challenge': pkce['challenge'],
        'code_challenge_method': pkce['method']
    }
    
    from urllib.parse import urlencode
    auth_url = f"{TWITTER_AUTH_URL}?{urlencode(params)}"
    
    return {
        'auth_url': auth_url,
        'state': state,
        'pkce_verifier': pkce['verifier'],
        'expires_at': (datetime.utcnow() + timedelta(minutes=10)).isoformat()
    }


def exchange_code(code: str, state: str, verifier: str, dry_run: bool = False) -> Dict[str, Any]:
    """Exchange OAuth code for access token."""
    if dry_run:
        print(f"[DRY RUN] Would exchange code: {code[:10]}...")
        return {
            'access_token': 'dry_run_token',
            'refresh_token': 'dry_run_refresh',
            'expires_in': 7200,  # 2 hours
            'scope': 'tweet.read tweet.write users.read'
        }
    
    # Build auth header
    auth_str = f"{TWITTER_CLIENT_ID}:{TWITTER_CLIENT_SECRET or ''}"
    auth_bytes = auth_str.encode('ascii')
    auth_b64 = base64.b64encode(auth_bytes).decode('ascii')
    
    headers = {
        'Authorization': f'Basic {auth_b64}',
        'Content-Type': 'application/x-www-form-urlencoded'
    }
    
    from urllib.parse import urlencode
    payload = urlencode({
        'grant_type': 'authorization_code',
        'code': code,
        'redirect_uri': TWITTER_REDIRECT_URI,
        'code_verifier': verifier
    })
    
    response = requests.post(TWITTER_TOKEN_URL, headers=headers, data=payload)
    response.raise_for_status()
    
    token_data = response.json()
    expires_at = datetime.utcnow() + timedelta(seconds=token_data.get('expires_in', 7200))
    
    return {
        'access_token': token_data['access_token'],
        'refresh_token': token_data.get('refresh_token'),
        'expires_at': expires_at.isoformat(),
        'scope': token_data.get('scope', ''),
        'token_type': token_data.get('token_type', 'Bearer')
    }


def refresh_token(refresh_token: str, dry_run: bool = False) -> Dict[str, Any]:
    """Refresh access token."""
    if dry_run:
        print(f"[DRY RUN] Would refresh token: {refresh_token[:10]}...")
        return {
            'access_token': 'new_dry_run_token',
            'refresh_token': refresh_token,
            'expires_in': 7200
        }
    
    auth_str = f"{TWITTER_CLIENT_ID}:{TWITTER_CLIENT_SECRET or ''}"
    auth_bytes = auth_str.encode('ascii')
    auth_b64 = base64.b64encode(auth_bytes).decode('ascii')
    
    headers = {
        'Authorization': f'Basic {auth_b64}',
        'Content-Type': 'application/x-www-form-urlencoded'
    }
    
    from urllib.parse import urlencode
    payload = urlencode({
        'grant_type': 'refresh_token',
        'refresh_token': refresh_token
    })
    
    response = requests.post(TWITTER_TOKEN_URL, headers=headers, data=payload)
    response.raise_for_status()
    
    token_data = response.json()
    expires_at = datetime.utcnow() + timedelta(seconds=token_data.get('expires_in', 7200))
    
    return {
        'access_token': token_data['access_token'],
        'refresh_token': token_data.get('refresh_token', refresh_token),
        'expires_at': expires_at.isoformat(),
        'scope': token_data.get('scope', '')
    }


def get_user(access_token: str, dry_run: bool = False) -> Dict[str, Any]:
    """Get authenticated user info."""
    if dry_run:
        return {
            'data': {
                'id': 'dry_run_user_id',
                'name': 'Test User',
                'username': 'testuser'
            }
        }
    
    headers = {
        'Authorization': f'Bearer {access_token}'
    }
    
    response = requests.get(
        f'{TWITTER_API_BASE}/users/me',
        headers=headers
    )
    response.raise_for_status()
    
    return response.json()


def post_tweet(access_token: str, text: str, dry_run: bool = False) -> Dict[str, Any]:
    """Post a tweet."""
    if dry_run:
        print(f"[DRY RUN] Would tweet: {text[:50]}...")
        return {
            'data': {
                'id': 'dry_run_tweet_id',
                'text': text
            },
            'created_at': datetime.utcnow().isoformat()
        }
    
    # Check tweet length
    if len(text) > 280:
        raise ValueError(f"Tweet exceeds 280 characters: {len(text)}")
    
    headers = {
        'Authorization': f'Bearer {access_token}',
        'Content-Type': 'application/json'
    }
    
    payload = {
        'text': text
    }
    
    response = requests.post(
        f'{TWITTER_API_BASE}/tweets',
        headers=headers,
        json=payload
    )
    response.raise_for_status()
    
    result = response.json()
    result['created_at'] = datetime.utcnow().isoformat()
    
    return result


def main():
    parser = argparse.ArgumentParser(description='X/Twitter OAuth Flow Handler')
    parser.add_argument('--action', required=True,
                       choices=['initiate', 'callback', 'refresh', 'user', 'post'])
    parser.add_argument('--user_id', help='User ID')
    parser.add_argument('--code', help='OAuth code')
    parser.add_argument('--state', help='OAuth state')
    parser.add_argument('--verifier', help='PKCE verifier')
    parser.add_argument('--refresh_token', help='Refresh token')
    parser.add_argument('--access_token', help='Access token')
    parser.add_argument('--text', help='Tweet text')
    parser.add_argument('--dry-run', action='store_true', help='Dry run mode')
    
    args = parser.parse_args()
    
    try:
        if args.action == 'initiate':
            if not args.user_id:
                print("Error: --user_id required", file=sys.stderr)
                sys.exit(1)
            result = initiate_oauth(args.user_id, args.dry_run)
            
        elif args.action == 'callback':
            if not all([args.code, args.state, args.verifier]):
                print("Error: --code, --state, --verifier required", file=sys.stderr)
                sys.exit(1)
            result = exchange_code(args.code, args.state, args.verifier, args.dry_run)
            
        elif args.action == 'refresh':
            if not args.refresh_token:
                print("Error: --refresh_token required", file=sys.stderr)
                sys.exit(1)
            result = refresh_token(args.refresh_token, args.dry_run)
            
        elif args.action == 'user':
            if not args.access_token:
                print("Error: --access_token required", file=sys.stderr)
                sys.exit(1)
            result = get_user(args.access_token, args.dry_run)
            
        elif args.action == 'post':
            if not all([args.access_token, args.text]):
                print("Error: --access_token and --text required", file=sys.stderr)
                sys.exit(1)
            result = post_tweet(args.access_token, args.text, args.dry_run)
        
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
