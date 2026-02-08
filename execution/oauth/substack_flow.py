#!/usr/bin/env python3
"""
Substack API Key Handler
Deterministic execution for Substack API operations (API key auth, no OAuth).
Note: Substack API is not officially documented; endpoints reverse-engineered.
"""

import argparse
import os
import json
import sys
from datetime import datetime
from typing import Dict, Any, Optional
import requests
from urllib.parse import urlparse

# Note: No OAuth endpoints - Substack uses API keys
SUBSTACK_API_BASE = 'https://substack.com/api/v1'


def validate_publication_url(url: str) -> tuple:
    """Validate and extract publication info from URL."""
    parsed = urlparse(url)
    
    if not parsed.netloc or '.substack.com' not in parsed.netloc:
        raise ValueError(f"Invalid Substack URL: {url}. Must be https://*.substack.com")
    
    # Extract publication slug
    parts = parsed.netloc.split('.')
    if len(parts) >= 3 and parts[-2] == 'substack':
        publication_slug = parts[-3]
    else:
        raise ValueError(f"Cannot extract publication slug from: {url}")
    
    return publication_slug, parsed.netloc


def connect_account(
    api_key: str,
    publication_url: str,
    dry_run: bool = False
) -> Dict[str, Any]:
    """Validate API key and return connection info."""
    if dry_run:
        print(f"[DRY RUN] Would connect Substack: {publication_url}")
        return {
            'user_id': 'dry_run_user_id',
            'username': 'testuser',
            'publication_slug': 'testpub',
            'publication_url': publication_url,
            'connected_at': datetime.utcnow().isoformat(),
            'status': 'active'
        }
    
    # Validate URL format
    pub_slug, pub_domain = validate_publication_url(publication_url)
    
    # Validate API key by calling user endpoint
    headers = {
        'Authorization': f'Token {api_key}',
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    }
    
    response = requests.get(f'{SUBSTACK_API_BASE}/user', headers=headers)
    response.raise_for_status()
    
    user_data = response.json()
    
    # Get publication info
    pub_response = requests.get(
        f'https://{pub_domain}/api/v1/publication',
        headers=headers
    )
    pub_data = pub_response.json() if pub_response.status_code == 200 else {}
    
    return {
        'user_id': user_data.get('id'),
        'username': user_data.get('username'),
        'name': user_data.get('name'),
        'publication_slug': pub_slug,
        'publication_url': publication_url,
        'publication_name': pub_data.get('name'),
        'connected_at': datetime.utcnow().isoformat(),
        'status': 'active'
    }


def validate_connection(api_key: str, dry_run: bool = False) -> Dict[str, Any]:
    """Validate that API key is still active."""
    if dry_run:
        return {
            'valid': True,
            'user_id': 'dry_run_user_id',
            'status': 'active'
        }
    
    headers = {
        'Authorization': f'Token {api_key}',
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    }
    
    response = requests.get(f'{SUBSTACK_API_BASE}/user', headers=headers)
    
    if response.status_code == 200:
        user_data = response.json()
        return {
            'valid': True,
            'user_id': user_data.get('id'),
            'username': user_data.get('username'),
            'status': 'active'
        }
    elif response.status_code == 401:
        return {
            'valid': False,
            'error': 'invalid_token',
            'status': 'revoked'
        }
    else:
        response.raise_for_status()


def get_posts(
    api_key: str,
    publication_domain: str,
    limit: int = 10,
    dry_run: bool = False
) -> Dict[str, Any]:
    """Get posts from the publication."""
    if dry_run:
        return {
            'posts': [
                {
                    'id': 'dry_run_post_id',
                    'title': 'Test Post',
                    'slug': 'test-post',
                    'post_date': datetime.utcnow().isoformat(),
                    'audience': 'everyone'
                }
            ],
            'count': 1
        }
    
    headers = {
        'Authorization': f'Token {api_key}',
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    }
    
    params = {
        'limit': limit,
        'sort_by': 'newest'
    }
    
    response = requests.get(
        f'https://{publication_domain}/api/v1/posts',
        headers=headers,
        params=params
    )
    response.raise_for_status()
    
    return response.json()


def create_post(
    api_key: str,
    publication_domain: str,
    title: str,
    content: str,
    content_format: str = 'html',
    subtitle: str = '',
    draft: bool = True,
    send_email: bool = False,
    tags: list = None,
    dry_run: bool = False
) -> Dict[str, Any]:
    """Create a new post on Substack."""
    if dry_run:
        print(f"[DRY RUN] Would create Substack post: {title}")
        return {
            'id': 'dry_run_post_id',
            'title': title,
            'slug': 'test-post',
            'post_date': datetime.utcnow().isoformat(),
            'draft': draft,
            'url': f'https://{publication_domain}/p/test-post'
        }
    
    headers = {
        'Authorization': f'Token {api_key}',
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    }
    
    # Convert markdown to HTML if needed (basic conversion)
    if content_format == 'markdown':
        # Note: In production, use a proper markdown-to-HTML converter
        # This is a simplified version
        content = content.replace('\n\n', '</p><p>').replace('\n', '<br>')
        content = f'<p>{content}</p>'
    
    payload = {
        'title': title,
        'subtitle': subtitle,
        'body': content,
        'draft': draft,
        'audience': 'everyone' if send_email else 'only_paid',
        'send': send_email,
        'tags': tags or []
    }
    
    response = requests.post(
        f'https://{publication_domain}/api/v1/posts',
        headers=headers,
        json=payload
    )
    response.raise_for_status()
    
    result = response.json()
    result['created_at'] = datetime.utcnow().isoformat()
    
    return result


def get_subscribers(
    api_key: str,
    publication_domain: str,
    dry_run: bool = False
) -> Dict[str, Any]:
    """Get subscriber count and stats."""
    if dry_run:
        return {
            'publication': {
                'id': 'dry_run_pub_id',
                'name': 'Test Publication'
            },
            'subscribers': {
                'total': 1000,
                'paid': 50,
                'free': 950
            },
            'stats': {
                'open_rate': 0.45,
                'click_rate': 0.12
            }
        }
    
    headers = {
        'Authorization': f'Token {api_key}',
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    }
    
    # Get publication info
    pub_response = requests.get(
        f'https://{publication_domain}/api/v1/publication',
        headers=headers
    )
    pub_response.raise_for_status()
    pub_data = pub_response.json()
    
    # Get subscriber stats
    stats_response = requests.get(
        f'https://{publication_domain}/api/v1/subscribers/stats',
        headers=headers
    )
    stats_data = stats_response.json() if stats_response.status_code == 200 else {}
    
    return {
        'publication': pub_data,
        'subscribers': stats_data.get('subscribers', {}),
        'stats': stats_data.get('stats', {})
    }


def main():
    parser = argparse.ArgumentParser(description='Substack API Handler')
    parser.add_argument('--action', required=True,
                       choices=['connect', 'validate', 'posts', 'publish', 'subscribers'])
    parser.add_argument('--api_key', help='Substack API key')
    parser.add_argument('--user_id', help='User ID (for storage reference)')
    parser.add_argument('--publication_url', help='Substack publication URL')
    parser.add_argument('--title', help='Post title')
    parser.add_argument('--content', help='Post content')
    parser.add_argument('--content_format', default='html', choices=['html', 'markdown'])
    parser.add_argument('--subtitle', help='Post subtitle')
    parser.add_argument('--tags', help='Comma-separated tags')
    parser.add_argument('--draft', type=lambda x: x.lower() == 'true', default=True,
                       help='Save as draft (true/false)')
    parser.add_argument('--send_email', type=lambda x: x.lower() == 'true', default=False,
                       help='Send as newsletter (true/false)')
    parser.add_argument('--limit', type=int, default=10, help='Number of posts to fetch')
    parser.add_argument('--dry-run', action='store_true', help='Dry run mode')
    
    args = parser.parse_args()
    
    try:
        if args.action == 'connect':
            if not all([args.api_key, args.publication_url]):
                print("Error: --api_key and --publication_url required", file=sys.stderr)
                sys.exit(1)
            result = connect_account(args.api_key, args.publication_url, args.dry_run)
            
        elif args.action == 'validate':
            if not args.api_key:
                print("Error: --api_key required", file=sys.stderr)
                sys.exit(1)
            result = validate_connection(args.api_key, args.dry_run)
            
        elif args.action == 'posts':
            if not all([args.api_key, args.publication_url]):
                print("Error: --api_key and --publication_url required", file=sys.stderr)
                sys.exit(1)
            _, domain = validate_publication_url(args.publication_url)
            result = get_posts(args.api_key, domain, args.limit, args.dry_run)
            
        elif args.action == 'publish':
            if not all([args.api_key, args.publication_url, args.title, args.content]):
                print("Error: --api_key, --publication_url, --title, --content required", file=sys.stderr)
                sys.exit(1)
            _, domain = validate_publication_url(args.publication_url)
            tags = args.tags.split(',') if args.tags else []
            result = create_post(
                args.api_key, domain, args.title, args.content,
                args.content_format, args.subtitle, args.draft,
                args.send_email, tags, args.dry_run
            )
            
        elif args.action == 'subscribers':
            if not all([args.api_key, args.publication_url]):
                print("Error: --api_key and --publication_url required", file=sys.stderr)
                sys.exit(1)
            _, domain = validate_publication_url(args.publication_url)
            result = get_subscribers(args.api_key, domain, args.dry_run)
        
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
        
    except ValueError as e:
        error = {
            'error': 'validation_error',
            'message': str(e)
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
