#!/usr/bin/env python3
"""
LinkedIn OAuth 2.0 Flow Handler
Deterministic execution for LinkedIn OAuth operations.
"""

import argparse
import os
import secrets
import hashlib
import base64
import json
import sys
from datetime import datetime, timedelta
from urllib.parse import urlencode, parse_qs, urlparse
import requests
from typing import Optional, Dict, Any

# Load environment variables
LINKEDIN_CLIENT_ID = os.getenv('LINKEDIN_CLIENT_ID')
LINKEDIN_CLIENT_SECRET = os.getenv('LINKEDIN_CLIENT_SECRET')
LINKEDIN_REDIRECT_URI = os.getenv('LINKEDIN_REDIRECT_URI', 'http://localhost:3000/api/auth/linkedin/callback')
LINKEDIN_AUTH_URL = 'https://www.linkedin.com/oauth/v2/authorization'
LINKEDIN_TOKEN_URL = 'https://www.linkedin.com/oauth/v2/accessToken'


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
    """Generate OAuth URL and state for LinkedIn connection."""
    if dry_run:
        print(f"[DRY RUN] Would initiate OAuth for user: {user_id}")
        return {
            'auth_url': 'https://linkedin.com/oauth/v2/authorization?dry_run=true',
            'state': 'dry_run_state',
            'pkce_verifier': 'dry_run_verifier'
        }
    
    # Generate state and PKCE
    state = secrets.token_urlsafe(32)
    pkce = generate_pkce()
    
    # Build OAuth URL
    params = {
        'response_type': 'code',
        'client_id': LINKEDIN_CLIENT_ID,
        'redirect_uri': LINKEDIN_REDIRECT_URI,
        'state': state,
        'scope': 'r_basicprofile r_organization_social w_member_social r_member_social',
        'code_challenge': pkce['challenge'],
        'code_challenge_method': pkce['method']
    }
    
    auth_url = f"{LINKEDIN_AUTH_URL}?{urlencode(params)}"
    
    # Store state and verifier temporarily (in production: Redis/DB)
    # For now, return them for the caller to store
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
            'expires_in': 5184000,  # 60 days
            'scope': 'r_basicprofile w_member_social'
        }
    
    # Exchange code for token
    payload = {
        'grant_type': 'authorization_code',
        'code': code,
        'client_id': LINKEDIN_CLIENT_ID,
        'client_secret': LINKEDIN_CLIENT_SECRET,
        'redirect_uri': LINKEDIN_REDIRECT_URI,
        'code_verifier': verifier
    }
    
    response = requests.post(LINKEDIN_TOKEN_URL, data=payload)
    response.raise_for_status()
    
    token_data = response.json()
    
    # Calculate expiration
    expires_at = datetime.utcnow() + timedelta(seconds=token_data.get('expires_in', 5184000))
    
    return {
        'access_token': token_data['access_token'],
        'refresh_token': token_data.get('refresh_token'),
        'expires_at': expires_at.isoformat(),
        'scope': token_data.get('scope', ''),
        'token_type': token_data.get('token_type', 'Bearer')
    }


def refresh_token(refresh_token: str, dry_run: bool = False) -> Dict[str, Any]:
    """Refresh an expired access token."""
    if dry_run:
        print(f"[DRY RUN] Would refresh token: {refresh_token[:10]}...")
        return {
            'access_token': 'new_dry_run_token',
            'refresh_token': refresh_token,
            'expires_in': 5184000
        }
    
    payload = {
        'grant_type': 'refresh_token',
        'refresh_token': refresh_token,
        'client_id': LINKEDIN_CLIENT_ID,
        'client_secret': LINKEDIN_CLIENT_SECRET
    }
    
    response = requests.post(LINKEDIN_TOKEN_URL, data=payload)
    response.raise_for_status()
    
    token_data = response.json()
    expires_at = datetime.utcnow() + timedelta(seconds=token_data.get('expires_in', 5184000))
    
    return {
        'access_token': token_data['access_token'],
        'refresh_token': token_data.get('refresh_token', refresh_token),
        'expires_at': expires_at.isoformat(),
        'scope': token_data.get('scope', '')
    }


def get_profile(access_token: str, dry_run: bool = False) -> Dict[str, Any]:
    """Get LinkedIn profile for connected user."""
    if dry_run:
        return {
            'id': 'dry_run_profile_id',
            'firstName': 'Test',
            'lastName': 'User',
            'profilePicture': None
        }
    
    headers = {
        'Authorization': f'Bearer {access_token}',
        'X-Restli-Protocol-Version': '2.0.0'
    }
    
    # Get basic profile
    response = requests.get(
        'https://api.linkedin.com/v2/me',
        headers=headers
    )
    response.raise_for_status()
    
    return response.json()


def post_content(access_token: str, content: str, dry_run: bool = False) -> Dict[str, Any]:
    """Post content to LinkedIn."""
    if dry_run:
        print(f"[DRY RUN] Would post: {content[:50]}...")
        return {
            'id': 'dry_run_post_id',
            'permalink': 'https://linkedin.com/posts/dry-run',
            'created_at': datetime.utcnow().isoformat()
        }
    
    headers = {
        'Authorization': f'Bearer {access_token}',
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0'
    }
    
    # Get profile ID first
    profile = get_profile(access_token)
    author_urn = f"urn:li:person:{profile['id']}"
    
    payload = {
        'author': author_urn,
        'lifecycleState': 'PUBLISHED',
        'specificContent': {
            'com.linkedin.ugc.ShareContent': {
                'shareCommentary': {
                    'text': content
                },
                'shareMediaCategory': 'NONE'
            }
        },
        'visibility': {
            'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
        }
    }
    
    response = requests.post(
        'https://api.linkedin.com/v2/ugcPosts',
        headers=headers,
        json=payload
    )
    response.raise_for_status()
    
    return {
        'id': response.headers.get('X-RestLi-Id', 'unknown'),
        'permalink': f"https://linkedin.com/posts/{profile['id']}/detail/",
        'created_at': datetime.utcnow().isoformat()
    }


def main():
    parser = argparse.ArgumentParser(description='LinkedIn OAuth Flow Handler')
    parser.add_argument('--action', required=True, 
                       choices=['initiate', 'callback', 'refresh', 'profile', 'post'])
    parser.add_argument('--user_id', help='User ID for the connection')
    parser.add_argument('--code', help='OAuth authorization code')
    parser.add_argument('--state', help='OAuth state parameter')
    parser.add_argument('--verifier', help='PKCE code verifier')
    parser.add_argument('--refresh_token', help='Refresh token for token refresh')
    parser.add_argument('--access_token', help='Access token for API calls')
    parser.add_argument('--content', help='Content to post')
    parser.add_argument('--dry-run', action='store_true', help='Run without making actual API calls')
    
    args = parser.parse_args()
    
    try:
        if args.action == 'initiate':
            if not args.user_id:
                print("Error: --user_id required for initiate", file=sys.stderr)
                sys.exit(1)
            result = initiate_oauth(args.user_id, args.dry_run)
            
        elif args.action == 'callback':
            if not all([args.code, args.state, args.verifier]):
                print("Error: --code, --state, and --verifier required for callback", file=sys.stderr)
                sys.exit(1)
            result = exchange_code(args.code, args.state, args.verifier, args.dry_run)
            
        elif args.action == 'refresh':
            if not args.refresh_token:
                print("Error: --refresh_token required for refresh", file=sys.stderr)
                sys.exit(1)
            result = refresh_token(args.refresh_token, args.dry_run)
            
        elif args.action == 'profile':
            if not args.access_token:
                print("Error: --access_token required for profile", file=sys.stderr)
                sys.exit(1)
            result = get_profile(args.access_token, args.dry_run)
            
        elif args.action == 'post':
            if not all([args.access_token, args.content]):
                print("Error: --access_token and --content required for post", file=sys.stderr)
                sys.exit(1)
            result = post_content(args.access_token, args.content, args.dry_run)
        
        print(json.dumps(result, indent=2))
        
    except requests.exceptions.HTTPError as e:
        error_data = {
            'error': 'http_error',
            'status_code': e.response.status_code,
            'message': str(e),
            'response': e.response.text if hasattr(e.response, 'text') else None
        }
        print(json.dumps(error_data), file=sys.stderr)
        sys.exit(1)
        
    except Exception as e:
        error_data = {
            'error': 'unexpected_error',
            'message': str(e)
        }
        print(json.dumps(error_data), file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
