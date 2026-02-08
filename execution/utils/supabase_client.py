#!/usr/bin/env python3
"""
Supabase Client Utility
Deterministic database operations for Nexus.
"""

import os
import json
from datetime import datetime
from typing import Dict, Any, Optional, List

try:
    from supabase import create_client, Client
except ImportError:
    print("Warning: supabase package not installed. Install with: pip install supabase")
    Client = None

SUPABASE_URL = os.getenv('NEXT_PUBLIC_SUPABASE_URL') or os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY') or os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY')


def get_client() -> Client:
    """Get Supabase client."""
    if not Client:
        raise RuntimeError("Supabase client not available. Install supabase package.")
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise RuntimeError("SUPABASE_URL and SUPABASE_KEY environment variables required")
    return create_client(SUPABASE_URL, SUPABASE_KEY)


def store_platform_connection(
    user_id: str,
    platform: str,
    access_token: str,
    refresh_token: Optional[str] = None,
    expires_at: Optional[str] = None,
    scopes: str = '',
    platform_user_id: Optional[str] = None,
    metadata: Optional[Dict] = None
) -> Dict[str, Any]:
    """Store or update platform connection in database."""
    try:
        client = get_client()
        
        data = {
            'user_id': user_id,
            'platform': platform,
            'access_token': access_token,
            'refresh_token': refresh_token,
            'token_expires_at': expires_at,
            'scopes': scopes,
            'platform_user_id': platform_user_id,
            'connection_status': 'connected',
            'metadata': metadata or {},
            'updated_at': datetime.utcnow().isoformat()
        }
        
        # Upsert: insert if not exists, update if exists
        result = client.table('platform_connections').upsert(
            data,
            on_conflict='user_id,platform'
        ).execute()
        
        return {
            'success': True,
            'data': result.data,
            'action': 'upsert'
        }
        
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }


def get_platform_connection(user_id: str, platform: str) -> Optional[Dict[str, Any]]:
    """Get stored connection for user and platform."""
    try:
        client = get_client()
        
        result = client.table('platform_connections')\
            .select('*')\
            .eq('user_id', user_id)\
            .eq('platform', platform)\
            .single()\
            .execute()
        
        return result.data if result.data else None
        
    except Exception as e:
        return None


def get_all_connections(user_id: str) -> List[Dict[str, Any]]:
    """Get all platform connections for user."""
    try:
        client = get_client()
        
        result = client.table('platform_connections')\
            .select('*')\
            .eq('user_id', user_id)\
            .execute()
        
        return result.data or []
        
    except Exception as e:
        return []


def update_connection_status(
    user_id: str, 
    platform: str, 
    status: str,
    error_message: Optional[str] = None
) -> Dict[str, Any]:
    """Update connection status (connected, error, revoked, etc)."""
    try:
        client = get_client()
        
        data = {
            'connection_status': status,
            'updated_at': datetime.utcnow().isoformat()
        }
        
        if error_message:
            data['last_error'] = error_message
        
        result = client.table('platform_connections')\
            .update(data)\
            .eq('user_id', user_id)\
            .eq('platform', platform)\
            .execute()
        
        return {
            'success': True,
            'data': result.data
        }
        
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }


def delete_connection(user_id: str, platform: str) -> Dict[str, Any]:
    """Delete platform connection."""
    try:
        client = get_client()
        
        result = client.table('platform_connections')\
            .delete()\
            .eq('user_id', user_id)\
            .eq('platform', platform)\
            .execute()
        
        return {
            'success': True,
            'deleted': len(result.data or [])
        }
        
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }


def get_expiring_tokens(hours: int = 24) -> List[Dict[str, Any]]:
    """Get connections with tokens expiring within specified hours."""
    try:
        client = get_client()
        
        from datetime import timedelta
        threshold = (datetime.utcnow() + timedelta(hours=hours)).isoformat()
        
        result = client.table('platform_connections')\
            .select('*')\
            .lt('token_expires_at', threshold)\
            .eq('connection_status', 'connected')\
            .execute()
        
        return result.data or []
        
    except Exception as e:
        return []


if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(description='Supabase client utility')
    parser.add_argument('--action', choices=['get', 'list', 'store', 'delete'])
    parser.add_argument('--user_id')
    parser.add_argument('--platform')
    parser.add_argument('--data', help='JSON data for store action')
    
    args = parser.parse_args()
    
    if args.action == 'get' and args.user_id and args.platform:
        result = get_platform_connection(args.user_id, args.platform)
        print(json.dumps(result, indent=2, default=str))
        
    elif args.action == 'list' and args.user_id:
        result = get_all_connections(args.user_id)
        print(json.dumps(result, indent=2, default=str))
        
    elif args.action == 'store' and args.data:
        data = json.loads(args.data)
        result = store_platform_connection(**data)
        print(json.dumps(result, indent=2))
        
    elif args.action == 'delete' and args.user_id and args.platform:
        result = delete_connection(args.user_id, args.platform)
        print(json.dumps(result, indent=2))
