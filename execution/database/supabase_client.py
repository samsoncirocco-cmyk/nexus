#!/usr/bin/env python3
"""
Supabase Client Wrapper for Nexus

High-level wrapper functions for common database operations.
Uses supabase-py for all interactions.

Usage:
    from execution.database.supabase_client import NexusDB
    
    db = NexusDB()
    await db.store_platform_connection(user_id, "linkedin", tokens)

Environment Variables:
    SUPABASE_URL - Supabase project URL
    SUPABASE_ANON_KEY - Anon key for client operations
    SUPABASE_SERVICE_KEY - Service key for admin operations
"""

import os
import hashlib
import json
from typing import Optional, Dict, List, Any
from datetime import datetime, timezone
from dataclasses import dataclass
from enum import Enum

try:
    from supabase import create_client, Client
    from postgrest import APIError
except ImportError:
    raise ImportError("supabase-py not installed. Run: pip install supabase")


class Platform(Enum):
    LINKEDIN = "linkedin"
    X = "x"
    SUBSTACK = "substack"


class PostStatus(Enum):
    PENDING = "pending"
    PUBLISHED = "published"
    FAILED = "failed"
    SCHEDULED = "scheduled"
    DELETED = "deleted"


class ScheduleStatus(Enum):
    SCHEDULED = "scheduled"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


@dataclass
class PlatformTokens:
    """Platform OAuth tokens"""
    access_token: str
    refresh_token: Optional[str] = None
    expires_at: Optional[datetime] = None
    scope: Optional[str] = None


@dataclass
class PlatformProfile:
    """Platform profile data"""
    platform_user_id: str
    username: Optional[str] = None
    display_name: Optional[str] = None
    followers_count: Optional[int] = None
    profile_url: Optional[str] = None
    raw_data: Optional[Dict] = None


class NexusDB:
    """Nexus database client wrapper"""

    def __init__(self, 
                 url: Optional[str] = None, 
                 anon_key: Optional[str] = None,
                 service_key: Optional[str] = None):
        """
        Initialize Nexus DB client
        
        Args:
            url: Supabase URL (defaults to SUPABASE_URL env var)
            anon_key: Anon key for RLS-respecting operations
            service_key: Service key for admin operations
        """
        self.url = url or os.getenv("SUPABASE_URL")
        self.anon_key = anon_key or os.getenv("SUPABASE_ANON_KEY")
        self.service_key = service_key or os.getenv("SUPABASE_SERVICE_KEY")
        
        if not self.url:
            raise ValueError("SUPABASE_URL environment variable or url parameter required")
        
        # Create client with anon key by default (respects RLS)
        self.client: Client = create_client(self.url, self.anon_key or self.service_key)
        
        # Service client for admin operations (if available)
        self.service_client: Optional[Client] = None
        if self.service_key:
            self.service_client = create_client(self.url, self.service_key)

    def _hash_idea(self, idea: str) -> str:
        """Generate SHA-256 hash of idea text"""
        return hashlib.sha256(idea.encode()).hexdigest()

    def _now(self) -> str:
        """Get current timestamp in ISO format"""
        return datetime.now(timezone.utc).isoformat()

    # =========================================================================
    # PLATFORM CONNECTIONS
    # =========================================================================

    async def store_platform_connection(
        self,
        user_id: str,
        platform: str,
        tokens: PlatformTokens,
        profile: Optional[PlatformProfile] = None
    ) -> Dict[str, Any]:
        """
        Store or update a platform OAuth connection
        
        Args:
            user_id: The user's UUID
            platform: Platform name (linkedin, x, substack)
            tokens: OAuth tokens
            profile: Platform profile data
            
        Returns:
            The created/updated connection record
        """
        # Note: Tokens should be encrypted at application layer before calling this
        profile_data = {
            "platform_user_id": profile.platform_user_id if profile else None,
            "username": profile.username if profile else None,
            "display_name": profile.display_name if profile else None,
            "followers_count": profile.followers_count if profile else None,
            "profile_url": profile.profile_url if profile else None,
            "raw": profile.raw_data if profile else {}
        }
        
        data = {
            "user_id": user_id,
            "platform": platform.lower(),
            "platform_user_id": profile.platform_user_id if profile else "unknown",
            "access_token": tokens.access_token,  # Should be encrypted!
            "refresh_token": tokens.refresh_token,
            "token_expires_at": tokens.expires_at.isoformat() if tokens.expires_at else None,
            "scope": tokens.scope,
            "profile_data": json.dumps(profile_data),
            "is_active": True,
            "updated_at": self._now(),
            "last_sync_at": self._now()
        }
        
        try:
            # Try upsert
            result = self.client.table("platform_connections") \
                .upsert(data, on_conflict="user_id,platform") \
                .execute()
            return result.data[0] if result.data else None
        except APIError as e:
            raise DatabaseError(f"Failed to store platform connection: {e}")

    async def get_platform_connection(
        self,
        user_id: str,
        platform: str
    ) -> Optional[Dict[str, Any]]:
        """
        Get a platform connection by user and platform
        
        Args:
            user_id: The user's UUID
            platform: Platform name
            
        Returns:
            Connection record or None if not found
        """
        try:
            result = self.client.table("platform_connections") \
                .select("*") \
                .eq("user_id", user_id) \
                .eq("platform", platform.lower()) \
                .eq("is_active", True) \
                .single() \
                .execute()
            return result.data
        except APIError:
            # No rows found
            return None

    async def get_all_platform_connections(
        self,
        user_id: str
    ) -> List[Dict[str, Any]]:
        """
        Get all active platform connections for a user
        
        Args:
            user_id: The user's UUID
            
        Returns:
            List of connection records
        """
        try:
            result = self.client.table("platform_connections") \
                .select("*") \
                .eq("user_id", user_id) \
                .eq("is_active", True) \
                .execute()
            return result.data or []
        except APIError as e:
            raise DatabaseError(f"Failed to get connections: {e}")

    async def deactivate_platform_connection(
        self,
        user_id: str,
        platform: str
    ) -> bool:
        """
        Deactivate a platform connection (soft delete)
        
        Args:
            user_id: The user's UUID
            platform: Platform name
            
        Returns:
            True if successful
        """
        try:
            self.client.table("platform_connections") \
                .update({"is_active": False, "updated_at": self._now()}) \
                .eq("user_id", user_id) \
                .eq("platform", platform.lower()) \
                .execute()
            return True
        except APIError as e:
            raise DatabaseError(f"Failed to deactivate connection: {e}")

    # =========================================================================
    # CONTENT ADAPTATIONS
    # =========================================================================

    async def store_adaptation(
        self,
        user_id: str,
        idea: str,
        adaptations: Dict[str, Any],
        tone: Optional[str] = None,
        target_audience: Optional[str] = None,
        voice_profile_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Store a content adaptation
        
        Args:
            user_id: The user's UUID
            idea: Original idea text
            adaptations: Dict of platform adaptations
            tone: Desired tone
            target_audience: Target audience description
            voice_profile_id: Voice profile used for generation
            
        Returns:
            The created adaptation record
            
        Example:
            adaptations = {
                "linkedin": {"text": "...", "hashtags": [...]},
                "x": {"text": "..."},
                "substack": {"title": "...", "body": "..."}
            }
        """
        data = {
            "user_id": user_id,
            "original_idea": idea,
            "idea_hash": self._hash_idea(idea),
            "adaptations": adaptations,
            "tone": tone,
            "target_audience": target_audience,
            "created_at": self._now(),
            "updated_at": self._now(),
            "last_used_at": self._now()
        }
        
        try:
            result = self.client.table("content_adaptations") \
                .insert(data) \
                .execute()
            return result.data[0] if result.data else None
        except APIError as e:
            raise DatabaseError(f"Failed to store adaptation: {e}")

    async def get_adaptations(
        self,
        user_id: str,
        limit: int = 50,
        offset: int = 0,
        search: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Get user's content adaptations
        
        Args:
            user_id: The user's UUID
            limit: Max records to return (default 50)
            offset: Pagination offset
            search: Optional text search in original_idea
            
        Returns:
            List of adaptation records, newest first
        """
        try:
            query = self.client.table("content_adaptations") \
                .select("*") \
                .eq("user_id", user_id) \
                .order("created_at", desc=True) \
                .range(offset, offset + limit - 1)
            
            if search:
                query = query.ilike("original_idea", f"%{search}%")
            
            result = query.execute()
            return result.data or []
        except APIError as e:
            raise DatabaseError(f"Failed to get adaptations: {e}")

    async def get_adaptation_by_id(
        self,
        user_id: str,
        adaptation_id: str
    ) -> Optional[Dict[str, Any]]:
        """
        Get a specific adaptation by ID
        
        Args:
            user_id: The user's UUID
            adaptation_id: Adaptation UUID
            
        Returns:
            Adaptation record or None
        """
        try:
            result = self.client.table("content_adaptations") \
                .select("*") \
                .eq("id", adaptation_id) \
                .eq("user_id", user_id) \
                .single() \
                .execute()
            return result.data
        except APIError:
            return None

    async def update_adaptation_platform(
        self,
        user_id: str,
        adaptation_id: str,
        platform: str,
        content: Dict[str, Any]
    ) -> bool:
        """
        Update a specific platform adaptation
        
        Args:
            user_id: The user's UUID
            adaptation_id: Adaptation UUID
            platform: Platform to update
            content: New content for that platform
            
        Returns:
            True if successful
        """
        try:
            # First get current adaptations
            current = await self.get_adaptation_by_id(user_id, adaptation_id)
            if not current:
                return False
            
            adaptations = current.get("adaptations", {})
            adaptations[platform] = content
            
            self.client.table("content_adaptations") \
                .update({
                    "adaptations": adaptations,
                    "updated_at": self._now()
                }) \
                .eq("id", adaptation_id) \
                .eq("user_id", user_id) \
                .execute()
            return True
        except APIError as e:
            raise DatabaseError(f"Failed to update adaptation: {e}")

    # =========================================================================
    # VOICE PROFILES
    # =========================================================================

    async def create_voice_profile(
        self,
        user_id: str,
        name: str,
        characteristics: Dict[str, Any],
        is_default: bool = False,
        sample_posts: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Create a voice profile
        
        Args:
            user_id: The user's UUID
            name: Profile name
            characteristics: Voice characteristics JSON
            is_default: Whether this is the default profile
            sample_posts: Example posts for training
            
        Returns:
            The created profile
        """
        data = {
            "user_id": user_id,
            "name": name,
            "is_default": is_default,
            "characteristics": characteristics,
            "sample_posts": sample_posts or [],
            "created_at": self._now(),
            "updated_at": self._now()
        }
        
        try:
            result = self.client.table("voice_profiles") \
                .insert(data) \
                .execute()
            return result.data[0] if result.data else None
        except APIError as e:
            raise DatabaseError(f"Failed to create voice profile: {e}")

    async def get_voice_profiles(
        self,
        user_id: str
    ) -> List[Dict[str, Any]]:
        """
        Get all voice profiles for a user
        
        Args:
            user_id: The user's UUID
            
        Returns:
            List of voice profiles
        """
        try:
            result = self.client.table("voice_profiles") \
                .select("*") \
                .eq("user_id", user_id) \
                .execute()
            return result.data or []
        except APIError as e:
            raise DatabaseError(f"Failed to get voice profiles: {e}")

    async def get_default_voice_profile(
        self,
        user_id: str
    ) -> Optional[Dict[str, Any]]:
        """
        Get the default voice profile for a user
        
        Args:
            user_id: The user's UUID
            
        Returns:
            Default profile or None
        """
        try:
            result = self.client.table("voice_profiles") \
                .select("*") \
                .eq("user_id", user_id) \
                .eq("is_default", True) \
                .single() \
                .execute()
            return result.data
        except APIError:
            return None

    # =========================================================================
    # PUBLISHED POSTS
    # =========================================================================

    async def create_published_post(
        self,
        user_id: str,
        platform: str,
        content: str,
        adaptation_id: Optional[str] = None,
        platform_connection_id: Optional[str] = None,
        scheduled_for: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """
        Create a published post record
        
        Args:
            user_id: The user's UUID
            platform: Platform name
            content: Post content
            adaptation_id: Source adaptation (optional)
            platform_connection_id: Connection used (optional)
            scheduled_for: If scheduled for future
            
        Returns:
            The created post record
        """
        data = {
            "user_id": user_id,
            "platform": platform,
            "content": content,
            "adaptation_id": adaptation_id,
            "platform_connection_id": platform_connection_id,
            "status": PostStatus.SCHEDULED.value if scheduled_for else PostStatus.PENDING.value,
            "scheduled_for": scheduled_for.isoformat() if scheduled_for else None,
            "created_at": self._now(),
            "updated_at": self._now()
        }
        
        try:
            result = self.client.table("published_posts") \
                .insert(data) \
                .execute()
            return result.data[0] if result.data else None
        except APIError as e:
            raise DatabaseError(f"Failed to create published post: {e}")

    async def update_post_status(
        self,
        user_id: str,
        post_id: str,
        status: PostStatus,
        platform_post_id: Optional[str] = None,
        metrics: Optional[Dict] = None
    ) -> bool:
        """
        Update post status and optionally metrics
        
        Args:
            user_id: The user's UUID
            post_id: Post UUID
            status: New status
            platform_post_id: Platform-assigned ID
            metrics: Engagement metrics
            
        Returns:
            True if successful
        """
        data = {
            "status": status.value,
            "updated_at": self._now()
        }
        
        if platform_post_id:
            data["platform_post_id"] = platform_post_id
        if status == PostStatus.PUBLISHED:
            data["published_at"] = self._now()
        if metrics:
            data["metrics"] = metrics
        
        try:
            self.client.table("published_posts") \
                .update(data) \
                .eq("id", post_id) \
                .eq("user_id", user_id) \
                .execute()
            return True
        except APIError as e:
            raise DatabaseError(f"Failed to update post status: {e}")

    # =========================================================================
    # SCHEDULED POSTS
    # =========================================================================

    async def schedule_post(
        self,
        user_id: str,
        content: str,
        platform: str,
        platform_connection_id: str,
        scheduled_for: datetime,
        adaptation_id: Optional[str] = None,
        timezone: str = "UTC"
    ) -> Dict[str, Any]:
        """
        Schedule a post for future publication
        
        Args:
            user_id: The user's UUID
            content: Post content
            platform: Platform to post to
            platform_connection_id: Connection to use
            scheduled_for: When to publish
            adaptation_id: Source adaptation
            timezone: User's timezone for display
            
        Returns:
            The created scheduled post
        """
        data = {
            "user_id": user_id,
            "content": content,
            "platform": platform,
            "platform_connection_id": platform_connection_id,
            "adaptation_id": adaptation_id,
            "scheduled_for": scheduled_for.isoformat(),
            "timezone": timezone,
            "status": ScheduleStatus.SCHEDULED.value,
            "created_at": self._now(),
            "updated_at": self._now()
        }
        
        try:
            result = self.client.table("scheduled_posts") \
                .insert(data) \
                .execute()
            return result.data[0] if result.data else None
        except APIError as e:
            raise DatabaseError(f"Failed to schedule post: {e}")

    async def get_ready_scheduled_posts(
        self,
        before: Optional[datetime] = None,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """
        Get scheduled posts ready for publishing (admin/service use)
        
        Args:
            before: Get posts scheduled before this time (default: now)
            limit: Max posts to retrieve
            
        Returns:
            List of scheduled posts
            
        Note: This requires service_key for cross-user access
        """
        if not self.service_client:
            raise PermissionError("Service key required for admin operations")
        
        before = before or datetime.now(timezone.utc)
        
        try:
            result = self.service_client.table("scheduled_posts") \
                .select("*, platform_connections(*)") \
                .eq("status", ScheduleStatus.SCHEDULED.value) \
                .lte("scheduled_for", before.isoformat()) \
                .order("scheduled_for") \
                .limit(limit) \
                .execute()
            return result.data or []
        except APIError as e:
            raise DatabaseError(f"Failed to get scheduled posts: {e}")

    async def mark_schedule_processing(
        self,
        schedule_id: str
    ) -> bool:
        """
        Mark a scheduled post as processing
        
        Args:
            schedule_id: Schedule UUID
            
        Returns:
            True if successful
        """
        if not self.service_client:
            raise PermissionError("Service key required for admin operations")
        
        try:
            self.service_client.table("scheduled_posts") \
                .update({
                    "status": ScheduleStatus.PROCESSING.value,
                    "updated_at": self._now()
                }) \
                .eq("id", schedule_id) \
                .execute()
            return True
        except APIError as e:
            raise DatabaseError(f"Failed to mark processing: {e}")

    async def complete_scheduled_post(
        self,
        schedule_id: str,
        published_post_id: str,
        error: Optional[str] = None
    ) -> bool:
        """
        Mark scheduled post as complete or failed
        
        Args:
            schedule_id: Schedule UUID
            published_post_id: Resulting published post ID
            error: Error message if failed
            
        Returns:
            True if successful
        """
        if not self.service_client:
            raise PermissionError("Service key required for admin operations")
        
        status = ScheduleStatus.FAILED.value if error else ScheduleStatus.COMPLETED.value
        
        data = {
            "status": status,
            "published_post_id": published_post_id,
            "updated_at": self._now()
        }
        if error:
            data["last_error"] = error
            # Increment retry count on failure
            current = self.service_client.table("scheduled_posts") \
                .select("retry_count") \
                .eq("id", schedule_id) \
                .single().execute()
            if current.data:
                data["retry_count"] = current.data.get("retry_count", 0) + 1
        
        try:
            self.service_client.table("scheduled_posts") \
                .update(data) \
                .eq("id", schedule_id) \
                .execute()
            return True
        except APIError as e:
            raise DatabaseError(f"Failed to complete scheduled post: {e}")


class DatabaseError(Exception):
    """Database operation error"""
    pass


# =========================================================================
# Convenience Functions (for non-async contexts)
# =========================================================================

import asyncio

def store_platform_connection_sync(
    user_id: str,
    platform: str,
    tokens: PlatformTokens,
    profile: Optional[PlatformProfile] = None
) -> Dict[str, Any]:
    """Synchronous wrapper for store_platform_connection"""
    db = NexusDB()
    return asyncio.run(db.store_platform_connection(user_id, platform, tokens, profile))

def get_platform_connection_sync(
    user_id: str,
    platform: str
) -> Optional[Dict[str, Any]]:
    """Synchronous wrapper for get_platform_connection"""
    db = NexusDB()
    return asyncio.run(db.get_platform_connection(user_id, platform))

def store_adaptation_sync(
    user_id: str,
    idea: str,
    adaptations: Dict[str, Any],
    **kwargs
) -> Dict[str, Any]:
    """Synchronous wrapper for store_adaptation"""
    db = NexusDB()
    return asyncio.run(db.store_adaptation(user_id, idea, adaptations, **kwargs))

def get_adaptations_sync(
    user_id: str,
    limit: int = 50,
    **kwargs
) -> List[Dict[str, Any]]:
    """Synchronous wrapper for get_adaptations"""
    db = NexusDB()
    return asyncio.run(db.get_adaptations(user_id, limit, **kwargs))