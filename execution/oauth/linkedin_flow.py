#!/usr/bin/env python3
"""
LinkedIn OAuth 2.0 Flow Handler
Deterministic execution for LinkedIn OAuth operations.

Functions:
- initiate_auth(user_id) → returns auth URL
- handle_callback(code, state) → exchanges for tokens
- refresh_token(refresh_token) → new access_token
- post_content(access_token, content) → publishes post
- get_profile(access_token) → user profile data
"""

import argparse
import os
import secrets
import hashlib
import base64
import json
import sys
from datetime import datetime, timedelta
from urllib.parse import urlencode
import requests
from typing import Dict, Any, Optional
from dataclasses import dataclass

# Load environment variables
LINKEDIN_CLIENT_ID = os.getenv('LINKEDIN_CLIENT_ID')
LINKEDIN_CLIENT_SECRET = os.getenv('LINKEDIN_CLIENT_SECRET')
LINKEDIN_REDIRECT_URI = os.getenv('LINKEDIN_REDIRECT_URI', 'http://localhost:3000/api/platforms/linkedin/callback')

# LinkedIn OAuth endpoints
LINKEDIN_AUTH_URL = 'https://www.linkedin.com/oauth/v2/authorization'
LINKEDIN_TOKEN_URL = 'https://www.linkedin.com/oauth/v2/accessToken'

# LinkedIn API endpoints
LINKEDIN_API_BASE = 'https://api.linkedin.com/v2'


@dataclass
class PKCEData:
    """PKCE code verifier and challenge data."""
    verifier: str
    challenge: str
    method: str = 'S256'


@dataclass
class AuthResult:
    """Result of initiate_auth."""
    auth_url: str
    state: str
    pkce_verifier: str
    expires_at: str


@dataclass
class TokenResult:
    """Result of handle_callback or refresh_token."""
    access_token: str
    refresh_token: str
    expires_at: str
    scope: str
    token_type: str = 'Bearer'


@dataclass
class PostResult:
    """Result of post_content."""
    id: str
    permalink: str
    created_at: str


@dataclass
class ProfileResult:
    """Result of get_profile."""
    id: str
    first_name: str
    last_name: str
    profile_picture: Optional[str]
    vanity_name: Optional[str] = None


def _generate_pkce() -> PKCEData:
    """Generate PKCE code verifier and challenge."""
    code_verifier = base64.urlsafe_b64encode(
        secrets.token_bytes(32)
    ).decode('utf-8').rstrip('=')
    
    code_challenge = base64.urlsafe_b64encode(
        hashlib.sha256(code_verifier.encode()).digest()
    ).decode('utf-8').rstrip('=')
    
    return PKCEData(verifier=code_verifier, challenge=code_challenge)


def initiate_auth(user_id: str) -> AuthResult:
    """
    Initiate LinkedIn OAuth flow for a user.
    
    Args:
        user_id: Internal user ID (from Supabase auth)
        
    Returns:
        AuthResult with auth_url, state, pkce_verifier, and expiration
        
    Note:
        Caller must store state and pkce_verifier temporarily (10 min expiry)
        for retrieval during callback handling.
    """
    if not LINKEDIN_CLIENT_ID:
        raise ValueError("LINKEDIN_CLIENT_ID environment variable not set")
    
    # Generate state and PKCE
    state = secrets.token_urlsafe(32)
    pkce = _generate_pkce()
    
    # Required scopes for Nexus
    scopes = 'r_liteprofile w_member_social'
    
    # Build OAuth URL
    params = {
        'response_type': 'code',
        'client_id': LINKEDIN_CLIENT_ID,
        'redirect_uri': LINKEDIN_REDIRECT_URI,
        'state': state,
        'scope': scopes,
        'code_challenge': pkce.challenge,
        'code_challenge_method': pkce.method
    }
    
    auth_url = f"{LINKEDIN_AUTH_URL}?{urlencode(params)}"
    
    expires_at = (datetime.utcnow() + timedelta(minutes=10)).isoformat()
    
    return AuthResult(
        auth_url=auth_url,
        state=state,
        pkce_verifier=pkce.verifier,
        expires_at=expires_at
    )


def handle_callback(code: str, state: str, pkce_verifier: str) -> TokenResult:
    """
    Exchange OAuth authorization code for access and refresh tokens.
    
    Args:
        code: Authorization code from LinkedIn callback
        state: State parameter from LinkedIn callback (must match stored)
        pkce_verifier: PKCE code verifier stored during initiate_auth
        
    Returns:
        TokenResult with access_token, refresh_token, expires_at, scope
        
    Raises:
        requests.HTTPError: If LinkedIn returns error response
    """
    if not all([LINKEDIN_CLIENT_ID, LINKEDIN_CLIENT_SECRET]):
        raise ValueError("LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET must be set")
    
    payload = {
        'grant_type': 'authorization_code',
        'code': code,
        'client_id': LINKEDIN_CLIENT_ID,
        'client_secret': LINKEDIN_CLIENT_SECRET,
        'redirect_uri': LINKEDIN_REDIRECT_URI,
        'code_verifier': pkce_verifier
    }
    
    response = requests.post(LINKEDIN_TOKEN_URL, data=payload)
    response.raise_for_status()
    
    token_data = response.json()
    
    # Calculate expiration (default 60 days = 5184000 seconds)
    expires_in = token_data.get('expires_in', 5184000)
    expires_at = (datetime.utcnow() + timedelta(seconds=expires_in)).isoformat()
    
    return TokenResult(
        access_token=token_data['access_token'],
        refresh_token=token_data.get('refresh_token', ''),
        expires_at=expires_at,
        scope=token_data.get('scope', ''),
        token_type=token_data.get('token_type', 'Bearer')
    )


def refresh_token(refresh_token: str) -> TokenResult:
    """
    Refresh an expired access token.
    
    Args:
        refresh_token: Valid refresh token from previous OAuth flow
        
    Returns:
        TokenResult with new access_token, refresh_token (may be same or new), expires_at
        
    Note:
        LinkedIn may return a new refresh_token - store both tokens after refresh.
    """
    if not all([LINKEDIN_CLIENT_ID, LINKEDIN_CLIENT_SECRET]):
        raise ValueError("LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET must be set")
    
    payload = {
        'grant_type': 'refresh_token',
        'refresh_token': refresh_token,
        'client_id': LINKEDIN_CLIENT_ID,
        'client_secret': LINKEDIN_CLIENT_SECRET
    }
    
    response = requests.post(LINKEDIN_TOKEN_URL, data=payload)
    response.raise_for_status()
    
    token_data = response.json()
    
    expires_in = token_data.get('expires_in', 5184000)
    expires_at = (datetime.utcnow() + timedelta(seconds=expires_in)).isoformat()
    
    # LinkedIn may return new refresh_token or reuse existing
    new_refresh_token = token_data.get('refresh_token', refresh_token)
    
    return TokenResult(
        access_token=token_data['access_token'],
        refresh_token=new_refresh_token,
        expires_at=expires_at,
        scope=token_data.get('scope', ''),
        token_type=token_data.get('token_type', 'Bearer')
    )


def get_profile(access_token: str) -> ProfileResult:
    """
    Get LinkedIn profile for connected user.
    
    Args:
        access_token: Valid LinkedIn access token
        
    Returns:
        ProfileResult with id, first_name, last_name, profile_picture, vanity_name
        
    Note:
        Requires r_liteprofile scope
    """
    headers = {
        'Authorization': f'Bearer {access_token}',
        'X-Restli-Protocol-Version': '2.0.0',
        'LinkedIn-Version': '202304'
    }
    
    # Get basic profile using r_liteprofile
    response = requests.get(
        f'{LINKEDIN_API_BASE}/me',
        headers=headers
    )
    response.raise_for_status()
    
    profile_data = response.json()
    
    # Extract profile ID
    person_id = profile_data.get('id', '')
    
    # Extract localized name fields
    first_name = ''
    last_name = ''
    
    localized_first = profile_data.get('localizedFirstName', '')
    localized_last = profile_data.get('localizedLastName', '')
    
    if localized_first:
        first_name = localized_first
    if localized_last:
        last_name = localized_last
    
    # Try to get profile picture
    profile_picture = None
    profile_picture_data = profile_data.get('profilePicture', {})
    display_image = profile_picture_data.get('displayImage~', {})
    elements = display_image.get('elements', [])
    if elements:
        identifiers = elements[0].get('identifiers', [])
        if identifiers:
            profile_picture = identifiers[0].get('identifier')
    
    # Get vanity name (optional, requires additional permissions)
    vanity_name = profile_data.get('vanityName')
    
    return ProfileResult(
        id=person_id,
        first_name=first_name,
        last_name=last_name,
        profile_picture=profile_picture,
        vanity_name=vanity_name
    )


def post_content(
    access_token: str, 
    content: str, 
    visibility: str = 'PUBLIC',
    author_urn: Optional[str] = None
) -> PostResult:
    """
    Publish a text post to LinkedIn.
    
    Args:
        access_token: Valid LinkedIn access token
        content: Post text content (max 3000 chars recommended)
        visibility: 'PUBLIC' or 'CONNECTIONS' (default: PUBLIC)
        author_urn: Optional URN (auto-fetched if not provided)
        
    Returns:
        PostResult with id, permalink, and created_at
        
    Raises:
        requests.HTTPError: If LinkedIn returns error (401=unauthorized, 403=missing scope, etc.)
    """
    if not access_token:
        raise ValueError("access_token is required")
    
    if not content:
        raise ValueError("content is required")
    
    headers = {
        'Authorization': f'Bearer {access_token}',
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
        'LinkedIn-Version': '202304'
    }
    
    # Get author URN if not provided
    if not author_urn:
        profile = get_profile(access_token)
        author_urn = f"urn:li:person:{profile.id}"
    
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
            'com.linkedin.ugc.MemberNetworkVisibility': visibility
        }
    }
    
    response = requests.post(
        f'{LINKEDIN_API_BASE}/ugcPosts',
        headers=headers,
        json=payload
    )
    response.raise_for_status()
    
    # Extract post ID from response header
    post_id = response.headers.get('X-RestLi-Id', '')
    
    # Build permalink
    person_id = author_urn.replace('urn:li:person:', '')
    permalink = f"https://www.linkedin.com/posts/{person_id}/detail/"
    
    return PostResult(
        id=post_id,
        permalink=permalink,
        created_at=datetime.utcnow().isoformat()
    )


def revoke_token(access_token: str) -> bool:
    """
    Revoke a LinkedIn access token.
    
    Args:
        access_token: Token to revoke
        
    Returns:
        True if successfully revoked
    """
    payload = {
        'token': access_token,
        'client_id': LINKEDIN_CLIENT_ID,
        'client_secret': LINKEDIN_CLIENT_SECRET
    }
    
    response = requests.post(
        'https://www.linkedin.com/oauth/v2/revoke',
        data=payload
    )
    
    return response.status_code == 200


# CLI interface for testing
def main():
    parser = argparse.ArgumentParser(description='LinkedIn OAuth Flow Handler')
    subparsers = parser.add_subparsers(dest='command', help='Command to run')
    
    # initiate_auth command
    init_parser = subparsers.add_parser('initiate_auth', help='Initiate OAuth flow')
    init_parser.add_argument('user_id', help='User ID')
    
    # handle_callback command
    callback_parser = subparsers.add_parser('handle_callback', help='Handle OAuth callback')
    callback_parser.add_argument('code', help='Authorization code')
    callback_parser.add_argument('state', help='State parameter')
    callback_parser.add_argument('pkce_verifier', help='PKCE code verifier')
    
    # refresh_token command
    refresh_parser = subparsers.add_parser('refresh_token', help='Refresh access token')
    refresh_parser.add_argument('refresh_token', help='Refresh token')
    
    # get_profile command
    profile_parser = subparsers.add_parser('get_profile', help='Get user profile')
    profile_parser.add_argument('access_token', help='Access token')
    
    # post_content command
    post_parser = subparsers.add_parser('post_content', help='Post content to LinkedIn')
    post_parser.add_argument('access_token', help='Access token')
    post_parser.add_argument('content', help='Post content')
    post_parser.add_argument('--visibility', default='PUBLIC', choices=['PUBLIC', 'CONNECTIONS'])
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        sys.exit(1)
    
    try:
        if args.command == 'initiate_auth':
            result = initiate_auth(args.user_id)
            print(json.dumps({
                'auth_url': result.auth_url,
                'state': result.state,
                'pkce_verifier': result.pkce_verifier,
                'expires_at': result.expires_at
            }, indent=2))
            
        elif args.command == 'handle_callback':
            result = handle_callback(args.code, args.state, args.pkce_verifier)
            print(json.dumps({
                'access_token': result.access_token,
                'refresh_token': result.refresh_token,
                'expires_at': result.expires_at,
                'scope': result.scope,
                'token_type': result.token_type
            }, indent=2))
            
        elif args.command == 'refresh_token':
            result = refresh_token(args.refresh_token)
            print(json.dumps({
                'access_token': result.access_token,
                'refresh_token': result.refresh_token,
                'expires_at': result.expires_at,
                'scope': result.scope,
                'token_type': result.token_type
            }, indent=2))
            
        elif args.command == 'get_profile':
            result = get_profile(args.access_token)
            print(json.dumps({
                'id': result.id,
                'first_name': result.first_name,
                'last_name': result.last_name,
                'profile_picture': result.profile_picture,
                'vanity_name': result.vanity_name
            }, indent=2))
            
        elif args.command == 'post_content':
            result = post_content(args.access_token, args.content, args.visibility)
            print(json.dumps({
                'id': result.id,
                'permalink': result.permalink,
                'created_at': result.created_at
            }, indent=2))
            
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
            'error': type(e).__name__,
            'message': str(e)
        }
        print(json.dumps(error_data), file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
