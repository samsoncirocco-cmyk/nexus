#!/usr/bin/env python3
"""
Generic OAuth 2.0 + PKCE Flow Handler
Configuration-driven OAuth for any supported platform.

Usage:
    # Initiate OAuth flow
    python oauth_flow.py --platform linkedin --action initiate --user_id user123
    
    # Exchange code for token
    python oauth_flow.py --platform linkedin --action callback \
        --code XXX --state YYY --verifier ZZZ
    
    # Refresh token
    python oauth_flow.py --platform twitter --action refresh \
        --refresh_token XXX
"""

import argparse
import base64
import hashlib
import json
import os
import secrets
import sys
from datetime import datetime, timedelta
from typing import Any, Dict, Optional
from urllib.parse import urlencode

import requests
import yaml

# Load platform configurations
CONFIG_PATH = os.path.join(os.path.dirname(__file__), "platforms.yaml")


def load_platform_config(platform: str) -> Dict[str, Any]:
    """Load configuration for a specific platform."""
    with open(CONFIG_PATH, 'r') as f:
        config = yaml.safe_load(f)
    
    platforms = config.get('platforms', {})
    if platform not in platforms:
        raise ValueError(f"Unknown platform: {platform}. "
                        f"Available: {list(platforms.keys())}")
    
    platform_config = platforms[platform]
    if not platform_config.get('enabled', False):
        raise ValueError(f"Platform '{platform}' is disabled in configuration")
    
    return platform_config


def get_env_vars(platform_config: Dict[str, Any]) -> Dict[str, str]:
    """Get environment variables for a platform."""
    prefix = platform_config.get('env_prefix', platform_config['name'].upper())
    
    client_id = os.getenv(f'{prefix}_CLIENT_ID')
    client_secret = os.getenv(f'{prefix}_CLIENT_SECRET')
    redirect_uri = os.getenv(f'{prefix}_REDIRECT_URI')
    
    if not client_id:
        raise ValueError(f"Missing {prefix}_CLIENT_ID environment variable")
    
    # Some platforms (PKCE-only) don't require client_secret
    if platform_config.get('auth_method') != 'none' and not client_secret:
        raise ValueError(f"Missing {prefix}_CLIENT_SECRET environment variable")
    
    return {
        'client_id': client_id,
        'client_secret': client_secret or '',
        'redirect_uri': redirect_uri or f'http://localhost:3000/api/auth/{platform_config.get("name", "").lower()}/callback'
    }


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


def build_auth_url(platform_config: Dict[str, Any], 
                 env_vars: Dict[str, str],
                 state: str,
                 pkce: Optional[Dict[str, str]] = None) -> str:
    """Build OAuth authorization URL."""
    scopes = platform_config.get('scopes', [])
    scope_separator = platform_config.get('scope_separator', ' ')
    
    params = {
        'response_type': platform_config.get('response_type', 'code'),
        'client_id': env_vars['client_id'],
        'redirect_uri': env_vars['redirect_uri'],
        'state': state,
        'scope': scope_separator.join(scopes)
    }
    
    # Add PKCE if enabled
    if platform_config.get('pkce', False) and pkce:
        params['code_challenge'] = pkce['challenge']
        params['code_challenge_method'] = pkce['method']
    
    auth_url = platform_config['auth_url']
    return f"{auth_url}?{urlencode(params)}"


def build_token_headers(platform_config: Dict[str, Any], 
                        env_vars: Dict[str, str]) -> Dict[str, str]:
    """Build headers for token exchange based on auth method."""
    auth_method = platform_config.get('auth_method', 'post_body')
    content_type = platform_config.get('token_content_type', 'form')
    
    headers = {}
    
    # Set Content-Type
    if content_type == 'form':
        headers['Content-Type'] = 'application/x-www-form-urlencoded'
    elif content_type == 'json':
        headers['Content-Type'] = 'application/json'
    
    # Set authentication
    if auth_method == 'basic_auth':
        auth_str = f"{env_vars['client_id']}:{env_vars['client_secret']}"
        auth_b64 = base64.b64encode(auth_str.encode()).decode()
        headers['Authorization'] = f'Basic {auth_b64}'
    
    return headers


def build_token_payload(platform_config: Dict[str, Any],
                       env_vars: Dict[str, str],
                       grant_type: str,
                       code: Optional[str] = None,
                       verifier: Optional[str] = None,
                       refresh_token: Optional[str] = None) -> Dict[str, str]:
    """Build token exchange payload based on grant type."""
    auth_method = platform_config.get('auth_method', 'post_body')
    content_type = platform_config.get('token_content_type', 'form')
    
    payload = {
        'grant_type': grant_type
    }
    
    # Add client credentials if using post_body auth
    if auth_method == 'post_body':
        payload['client_id'] = env_vars['client_id']
        payload['client_secret'] = env_vars['client_secret']
    
    # Add grant-specific params
    if grant_type == 'authorization_code':
        payload['code'] = code
        payload['redirect_uri'] = env_vars['redirect_uri']
        if platform_config.get('pkce', False) and verifier:
            payload['code_verifier'] = verifier
    
    elif grant_type == 'refresh_token':
        payload['refresh_token'] = refresh_token
    
    return payload


def parse_token_response(response: requests.Response, 
                        platform_config: Dict[str, Any]) -> Dict[str, Any]:
    """Parse token response and calculate expiration."""
    response.raise_for_status()
    token_data = response.json()
    
    # Calculate expiration
    expires_in = token_data.get('expires_in', 
                                platform_config.get('default_token_lifetime', 3600))
    expires_at = datetime.utcnow() + timedelta(seconds=expires_in)
    
    return {
        'access_token': token_data['access_token'],
        'refresh_token': token_data.get('refresh_token'),
        'expires_at': expires_at.isoformat(),
        'expires_in': expires_in,
        'scope': token_data.get('scope', ''),
        'token_type': token_data.get('token_type', 'Bearer')
    }


def initiate_oauth(platform: str, user_id: str, dry_run: bool = False) -> Dict[str, Any]:
    """Generate OAuth URL and state for any supported platform."""
    platform_config = load_platform_config(platform)
    
    if dry_run:
        return {
            'auth_url': f'https://example.com/oauth?platform={platform}&dry_run=true',
            'state': 'dry_run_state',
            'pkce_verifier': 'dry_run_verifier' if platform_config.get('pkce') else None,
            'platform': platform,
            'user_id': user_id
        }
    
    platform_config = load_platform_config(platform)
    env_vars = get_env_vars(platform_config)
    
    # Generate state and PKCE
    state = secrets.token_urlsafe(32)
    pkce = generate_pkce() if platform_config.get('pkce', False) else None
    
    # Build OAuth URL
    auth_url = build_auth_url(platform_config, env_vars, state, pkce)
    
    result = {
        'auth_url': auth_url,
        'state': state,
        'expires_at': (datetime.utcnow() + timedelta(minutes=10)).isoformat(),
        'platform': platform,
        'user_id': user_id
    }
    
    if pkce:
        result['pkce_verifier'] = pkce['verifier']
    
    return result


def exchange_code(platform: str, 
                  code: str, 
                  state: str, 
                  verifier: Optional[str] = None,
                  dry_run: bool = False) -> Dict[str, Any]:
    """Exchange OAuth code for access token."""
    if dry_run:
        return {
            'access_token': f'dry_run_token_{platform}',
            'refresh_token': f'dry_run_refresh_{platform}',
            'expires_in': 3600,
            'scope': 'read write',
            'platform': platform
        }
    
    platform_config = load_platform_config(platform)
    env_vars = get_env_vars(platform_config)
    
    # Build request
    headers = build_token_headers(platform_config, env_vars)
    payload = build_token_payload(
        platform_config, env_vars, 
        grant_type='authorization_code',
        code=code, verifier=verifier
    )
    
    # Send request
    content_type = platform_config.get('token_content_type', 'form')
    if content_type == 'form':
        response = requests.post(
            platform_config['token_url'],
            headers=headers,
            data=urlencode(payload)
        )
    else:
        response = requests.post(
            platform_config['token_url'],
            headers=headers,
            json=payload
        )
    
    result = parse_token_response(response, platform_config)
    result['platform'] = platform
    return result


def refresh_token(platform: str, 
                  refresh_token: str, 
                  dry_run: bool = False) -> Dict[str, Any]:
    """Refresh an expired access token."""
    if dry_run:
        return {
            'access_token': f'new_dry_run_token_{platform}',
            'refresh_token': refresh_token,
            'expires_in': 3600,
            'platform': platform
        }
    
    platform_config = load_platform_config(platform)
    env_vars = get_env_vars(platform_config)
    
    # Build request
    headers = build_token_headers(platform_config, env_vars)
    payload = build_token_payload(
        platform_config, env_vars,
        grant_type='refresh_token',
        refresh_token=refresh_token
    )
    
    # Send request
    content_type = platform_config.get('token_content_type', 'form')
    if content_type == 'form':
        response = requests.post(
            platform_config['token_url'],
            headers=headers,
            data=urlencode(payload)
        )
    else:
        response = requests.post(
            platform_config['token_url'],
            headers=headers,
            json=payload
        )
    
    result = parse_token_response(response, platform_config)
    # Keep old refresh token if new one not provided
    if not result.get('refresh_token'):
        result['refresh_token'] = refresh_token
    result['platform'] = platform
    return result


def make_api_request(platform: str,
                    access_token: str,
                    endpoint: str,
                    method: str = 'GET',
                    data: Optional[Dict] = None,
                    dry_run: bool = False) -> Dict[str, Any]:
    """Make authenticated API request to platform."""
    if dry_run:
        return {
            'endpoint': endpoint,
            'method': method,
            'platform': platform,
            'dry_run': True
        }
    
    platform_config = load_platform_config(platform)
    api_base = platform_config.get('api_base_url', '')
    
    # Build headers
    headers = {
        'Authorization': f'Bearer {access_token}'
    }
    
    # Add platform-specific default headers
    default_headers = platform_config.get('default_headers', {})
    headers.update(default_headers)
    
    # Make request
    url = f"{api_base}{endpoint}"
    
    if method == 'GET':
        response = requests.get(url, headers=headers)
    elif method == 'POST':
        if headers.get('Content-Type') == 'application/json':
            response = requests.post(url, headers=headers, json=data)
        else:
            response = requests.post(url, headers=headers, data=data)
    else:
        raise ValueError(f"Unsupported HTTP method: {method}")
    
    response.raise_for_status()
    return response.json()


def list_platforms() -> Dict[str, Any]:
    """List all available platforms and their status."""
    with open(CONFIG_PATH, 'r') as f:
        config = yaml.safe_load(f)
    
    platforms = config.get('platforms', {})
    result = {}
    
    for key, platform in platforms.items():
        result[key] = {
            'name': platform.get('name', key),
            'enabled': platform.get('enabled', False),
            'pkce': platform.get('pkce', False),
            'auth_method': platform.get('auth_method', 'post_body'),
            'has_credentials': bool(
                os.getenv(f"{platform.get('env_prefix', key.upper())}_CLIENT_ID")
            )
        }
    
    return result


def main():
    parser = argparse.ArgumentParser(
        description='Generic OAuth 2.0 Flow Handler',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Initiate OAuth for LinkedIn
  python oauth_flow.py --platform linkedin --action initiate --user_id user123
  
  # Exchange code for token
  python oauth_flow.py --platform linkedin --action callback \\
      --code AUTH_CODE --state STATE --verifier PKCE_VERIFIER
  
  # Refresh token
  python oauth_flow.py --platform twitter --action refresh \\
      --refresh_token REFRESH_TOKEN
  
  # List available platforms
  python oauth_flow.py --action list-platforms
        """
    )
    
    parser.add_argument('--platform', 
                       help='Platform identifier (e.g., linkedin, twitter)')
    parser.add_argument('--action', required=True,
                       choices=['initiate', 'callback', 'refresh', 'api', 'list-platforms'],
                       help='OAuth action to perform')
    parser.add_argument('--user_id', help='User ID for the connection')
    parser.add_argument('--code', help='OAuth authorization code')
    parser.add_argument('--state', help='OAuth state parameter')
    parser.add_argument('--verifier', help='PKCE code verifier')
    parser.add_argument('--refresh_token', help='Refresh token')
    parser.add_argument('--access_token', help='Access token for API calls')
    parser.add_argument('--endpoint', help='API endpoint (for api action)')
    parser.add_argument('--method', default='GET', 
                       choices=['GET', 'POST'],
                       help='HTTP method for API calls')
    parser.add_argument('--data', help='JSON data for POST requests')
    parser.add_argument('--dry-run', action='store_true',
                       help='Run without making actual API calls')
    
    args = parser.parse_args()
    
    try:
        if args.action == 'list-platforms':
            result = list_platforms()
        
        elif args.action == 'initiate':
            if not args.platform or not args.user_id:
                print("Error: --platform and --user_id required", file=sys.stderr)
                sys.exit(1)
            result = initiate_oauth(args.platform, args.user_id, args.dry_run)
        
        elif args.action == 'callback':
            if not args.platform:
                print("Error: --platform required", file=sys.stderr)
                sys.exit(1)
            if not all([args.code, args.state]):
                print("Error: --code and --state required", file=sys.stderr)
                sys.exit(1)
            result = exchange_code(
                args.platform, args.code, args.state, args.verifier, args.dry_run
            )
        
        elif args.action == 'refresh':
            if not args.platform or not args.refresh_token:
                print("Error: --platform and --refresh_token required", file=sys.stderr)
                sys.exit(1)
            result = refresh_token(args.platform, args.refresh_token, args.dry_run)
        
        elif args.action == 'api':
            if not all([args.platform, args.access_token, args.endpoint]):
                print("Error: --platform, --access_token, and --endpoint required", 
                      file=sys.stderr)
                sys.exit(1)
            data = json.loads(args.data) if args.data else None
            result = make_api_request(
                args.platform, args.access_token, args.endpoint,
                args.method, data, args.dry_run
            )
        
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
