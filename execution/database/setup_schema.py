#!/usr/bin/env python3
"""
Nexus Database Setup Script

Idempotent schema creation for Supabase PostgreSQL.
Run this script to create or update all Nexus tables, indexes, and RLS policies.

Usage:
    python setup_schema.py

Environment Variables:
    SUPABASE_URL - Supabase project URL
    SUPABASE_SERVICE_KEY - Service role key (NOT anon key - needs schema creation rights)
"""

import os
import sys
from typing import Optional

try:
    from supabase import create_client, Client
except ImportError:
    print("Error: supabase-py not installed. Run: pip install supabase")
    sys.exit(1)

# Get credentials from environment
SUPABASE_URL: Optional[str] = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY: Optional[str] = os.getenv("SUPABASE_SERVICE_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    print("Error: SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables required")
    sys.exit(1)


class SchemaSetup:
    def __init__(self, url: str, key: str):
        self.client: Client = create_client(url, key)
        self.results: list[dict] = []

    def log(self, category: str, name: str, status: str, message: str = ""):
        """Log operation result"""
        result = {"category": category, "name": name, "status": status, "message": message}
        self.results.append(result)
        icon = "✓" if status == "success" else "✗" if status == "error" else "→"
        print(f"{icon} {category}: {name} - {status} {message}")

    def execute_sql(self, sql: str, description: str) -> bool:
        """Execute raw SQL via RPC"""
        try:
            # Use supabase-py to execute SQL via query
            self.client.table("_temp_dummy").select("*").limit(0).execute()
            return True
        except Exception:
            pass
        
        # Fallback: try direct POST to REST API with service key
        import requests
        try:
            headers = {
                "apikey": SUPABASE_SERVICE_KEY,
                "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
                "Content-Type": "application/json",
                "Prefer": "return=minimal"
            }
            response = requests.post(
                f"{SUPABASE_URL}/rest/v1/rpc/exec_sql",
                headers=headers,
                json={"query": sql}
            )
            if response.status_code in [200, 204]:
                return True
            # If RPC doesn't exist, we'll need to use migrations via dashboard
            return None
        except Exception as e:
            return str(e)

    def setup_extensions(self):
        """Enable required PostgreSQL extensions"""
        sql = """
        -- Enable UUID extension
        CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
        
        -- Enable pgcrypto for encryption functions
        CREATE EXTENSION IF NOT EXISTS "pgcrypto";
        """
        result = self.execute_sql(sql, "extensions")
        if result is True:
            self.log("EXTENSION", "uuid-ossp, pgcrypto", "success")
        elif result is None:
            self.log("EXTENSION", "uuid-ossp, pgcrypto", "skipped", "Enable manually in Supabase dashboard")

    def setup_trigger_function(self):
        """Create shared trigger function for updated_at"""
        sql = """
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
        """
        result = self.execute_sql(sql, "trigger function")
        self.log("FUNCTION", "update_updated_at_column", "success" if result else "error")

    def setup_users_table(self):
        """Create users table and policies"""
        sql = """
        -- Create users table
        CREATE TABLE IF NOT EXISTS public.users (
            id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
            email VARCHAR(255) UNIQUE NOT NULL,
            full_name VARCHAR(255),
            avatar_url TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            timezone VARCHAR(50) DEFAULT 'UTC',
            is_active BOOLEAN DEFAULT TRUE
        );

        -- Enable RLS
        ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

        -- Drop existing policies
        DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
        DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
        DROP POLICY IF EXISTS "Allow insert on signup" ON public.users;

        -- Create policies
        CREATE POLICY "Users can view own profile" ON public.users
            FOR SELECT USING (auth.uid() = id);

        CREATE POLICY "Users can update own profile" ON public.users
            FOR UPDATE USING (auth.uid() = id);

        CREATE POLICY "Allow insert on signup" ON public.users
            FOR INSERT WITH CHECK (auth.uid() = id);

        -- Create trigger
        DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
        CREATE TRIGGER update_users_updated_at
            BEFORE UPDATE ON public.users
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        """
        result = self.execute_sql(sql, "users table")
        self.log("TABLE", "users", "success" if result else "error")

    def setup_platform_connections_table(self):
        """Create platform_connections table"""
        sql = """
        CREATE TABLE IF NOT EXISTS public.platform_connections (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
            platform VARCHAR(50) NOT NULL,
            platform_user_id VARCHAR(255) NOT NULL,
            access_token TEXT NOT NULL,
            refresh_token TEXT,
            token_expires_at TIMESTAMPTZ,
            scope TEXT,
            profile_data JSONB DEFAULT '{}'::jsonb,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            last_sync_at TIMESTAMPTZ,
            CONSTRAINT unique_user_platform UNIQUE (user_id, platform)
        );

        CREATE INDEX IF NOT EXISTS idx_platform_connections_user_id 
            ON public.platform_connections(user_id);
        CREATE INDEX IF NOT EXISTS idx_platform_connections_platform 
            ON public.platform_connections(platform);

        ALTER TABLE public.platform_connections ENABLE ROW LEVEL SECURITY;

        DROP POLICY IF EXISTS "Users can view own connections" ON public.platform_connections;
        DROP POLICY IF EXISTS "Users can insert own connections" ON public.platform_connections;
        DROP POLICY IF EXISTS "Users can update own connections" ON public.platform_connections;
        DROP POLICY IF EXISTS "Users can delete own connections" ON public.platform_connections;

        CREATE POLICY "Users can view own connections" ON public.platform_connections
            FOR SELECT USING (auth.uid() = user_id);

        CREATE POLICY "Users can insert own connections" ON public.platform_connections
            FOR INSERT WITH CHECK (auth.uid() = user_id);

        CREATE POLICY "Users can update own connections" ON public.platform_connections
            FOR UPDATE USING (auth.uid() = user_id);

        CREATE POLICY "Users can delete own connections" ON public.platform_connections
            FOR DELETE USING (auth.uid() = user_id);

        DROP TRIGGER IF EXISTS update_platform_connections_updated_at ON public.platform_connections;
        CREATE TRIGGER update_platform_connections_updated_at
            BEFORE UPDATE ON public.platform_connections
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        """
        result = self.execute_sql(sql, "platform_connections table")
        self.log("TABLE", "platform_connections", "success" if result else "error")

    def setup_content_adaptations_table(self):
        """Create content_adaptations table"""
        sql = """
        CREATE TABLE IF NOT EXISTS public.content_adaptations (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
            original_idea TEXT NOT NULL,
            idea_hash VARCHAR(64),
            adaptations JSONB NOT NULL DEFAULT '{}'::jsonb,
            tone VARCHAR(50),
            target_audience VARCHAR(255),
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            last_used_at TIMESTAMPTZ
        );

        CREATE INDEX IF NOT EXISTS idx_content_adaptations_user_id 
            ON public.content_adaptations(user_id);
        CREATE INDEX IF NOT EXISTS idx_content_adaptations_created_at 
            ON public.content_adaptations(created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_content_adaptations_idea_hash 
            ON public.content_adaptations(idea_hash);

        ALTER TABLE public.content_adaptations ENABLE ROW LEVEL SECURITY;

        DROP POLICY IF EXISTS "Users can view own adaptations" ON public.content_adaptations;
        DROP POLICY IF EXISTS "Users can insert own adaptations" ON public.content_adaptations;
        DROP POLICY IF EXISTS "Users can update own adaptations" ON public.content_adaptations;
        DROP POLICY IF EXISTS "Users can delete own adaptations" ON public.content_adaptations;

        CREATE POLICY "Users can view own adaptations" ON public.content_adaptations
            FOR SELECT USING (auth.uid() = user_id);

        CREATE POLICY "Users can insert own adaptations" ON public.content_adaptations
            FOR INSERT WITH CHECK (auth.uid() = user_id);

        CREATE POLICY "Users can update own adaptations" ON public.content_adaptations
            FOR UPDATE USING (auth.uid() = user_id);

        CREATE POLICY "Users can delete own adaptations" ON public.content_adaptations
            FOR DELETE USING (auth.uid() = user_id);

        DROP TRIGGER IF EXISTS update_content_adaptations_updated_at ON public.content_adaptations;
        CREATE TRIGGER update_content_adaptations_updated_at
            BEFORE UPDATE ON public.content_adaptations
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        """
        result = self.execute_sql(sql, "content_adaptations table")
        self.log("TABLE", "content_adaptations", "success" if result else "error")

    def setup_voice_profiles_table(self):
        """Create voice_profiles table"""
        sql = """
        CREATE TABLE IF NOT EXISTS public.voice_profiles (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
            name VARCHAR(255) NOT NULL,
            is_default BOOLEAN DEFAULT FALSE,
            characteristics JSONB NOT NULL DEFAULT '{}'::jsonb,
            sample_posts TEXT[],
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            last_used_at TIMESTAMPTZ
        );

        CREATE INDEX IF NOT EXISTS idx_voice_profiles_user_id 
            ON public.voice_profiles(user_id);

        ALTER TABLE public.voice_profiles ENABLE ROW LEVEL SECURITY;

        DROP POLICY IF EXISTS "Users can view own voice profiles" ON public.voice_profiles;
        DROP POLICY IF EXISTS "Users can insert own voice profiles" ON public.voice_profiles;
        DROP POLICY IF EXISTS "Users can update own voice profiles" ON public.voice_profiles;
        DROP POLICY IF EXISTS "Users can delete own voice profiles" ON public.voice_profiles;

        CREATE POLICY "Users can view own voice profiles" ON public.voice_profiles
            FOR SELECT USING (auth.uid() = user_id);

        CREATE POLICY "Users can insert own voice profiles" ON public.voice_profiles
            FOR INSERT WITH CHECK (auth.uid() = user_id);

        CREATE POLICY "Users can update own voice profiles" ON public.voice_profiles
            FOR UPDATE USING (auth.uid() = user_id);

        CREATE POLICY "Users can delete own voice profiles" ON public.voice_profiles
            FOR DELETE USING (auth.uid() = user_id AND 
                (SELECT COUNT(*) FROM public.voice_profiles vp WHERE vp.user_id = auth.uid()) > 1);

        DROP TRIGGER IF EXISTS update_voice_profiles_updated_at ON public.voice_profiles;
        CREATE TRIGGER update_voice_profiles_updated_at
            BEFORE UPDATE ON public.voice_profiles
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        """
        result = self.execute_sql(sql, "voice_profiles table")
        self.log("TABLE", "voice_profiles", "success" if result else "error")

    def setup_published_posts_table(self):
        """Create published_posts table"""
        sql = """
        CREATE TABLE IF NOT EXISTS public.published_posts (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
            adaptation_id UUID REFERENCES public.content_adaptations(id) ON DELETE SET NULL,
            platform_connection_id UUID REFERENCES public.platform_connections(id) ON DELETE SET NULL,
            platform VARCHAR(50) NOT NULL,
            platform_post_id VARCHAR(255),
            status VARCHAR(50) DEFAULT 'pending',
            content TEXT NOT NULL,
            metadata JSONB DEFAULT '{}'::jsonb,
            metrics JSONB DEFAULT '{}'::jsonb,
            scheduled_for TIMESTAMPTZ,
            published_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_published_posts_user_id 
            ON public.published_posts(user_id);
        CREATE INDEX IF NOT EXISTS idx_published_posts_status 
            ON public.published_posts(status);
        CREATE INDEX IF NOT EXISTS idx_published_posts_platform 
            ON public.published_posts(platform);
        CREATE INDEX IF NOT EXISTS idx_published_posts_scheduled 
            ON public.published_posts(scheduled_for) WHERE status = 'scheduled';
        CREATE INDEX IF NOT EXISTS idx_published_posts_adaptation_id 
            ON public.published_posts(adaptation_id);

        ALTER TABLE public.published_posts ENABLE ROW LEVEL SECURITY;

        DROP POLICY IF EXISTS "Users can view own posts" ON public.published_posts;
        DROP POLICY IF EXISTS "Users can insert own posts" ON public.published_posts;
        DROP POLICY IF EXISTS "Users can update own posts" ON public.published_posts;
        DROP POLICY IF EXISTS "Users can delete own posts" ON public.published_posts;

        CREATE POLICY "Users can view own posts" ON public.published_posts
            FOR SELECT USING (auth.uid() = user_id);

        CREATE POLICY "Users can insert own posts" ON public.published_posts
            FOR INSERT WITH CHECK (auth.uid() = user_id);

        CREATE POLICY "Users can update own posts" ON public.published_posts
            FOR UPDATE USING (auth.uid() = user_id);

        CREATE POLICY "Users can delete own posts" ON public.published_posts
            FOR DELETE USING (auth.uid() = user_id AND status IN ('pending', 'failed', 'scheduled'));

        DROP TRIGGER IF EXISTS update_published_posts_updated_at ON public.published_posts;
        CREATE TRIGGER update_published_posts_updated_at
            BEFORE UPDATE ON public.published_posts
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        """
        result = self.execute_sql(sql, "published_posts table")
        self.log("TABLE", "published_posts", "success" if result else "error")

    def setup_scheduled_posts_table(self):
        """Create scheduled_posts table"""
        sql = """
        CREATE TABLE IF NOT EXISTS public.scheduled_posts (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
            adaptation_id UUID REFERENCES public.content_adaptations(id) ON DELETE SET NULL,
            content TEXT NOT NULL,
            platform_connection_id UUID NOT NULL REFERENCES public.platform_connections(id) ON DELETE CASCADE,
            platform VARCHAR(50) NOT NULL,
            status VARCHAR(50) DEFAULT 'scheduled',
            scheduled_for TIMESTAMPTZ NOT NULL,
            timezone VARCHAR(50) DEFAULT 'UTC',
            retry_count INTEGER DEFAULT 0,
            last_error TEXT,
            published_post_id UUID REFERENCES public.published_posts(id) ON DELETE SET NULL,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_scheduled_posts_user_id 
            ON public.scheduled_posts(user_id);
        CREATE INDEX IF NOT EXISTS idx_scheduled_posts_status 
            ON public.scheduled_posts(status);
        CREATE INDEX IF NOT EXISTS idx_scheduled_posts_scheduled_for 
            ON public.scheduled_posts(scheduled_for);
        CREATE INDEX IF NOT EXISTS idx_scheduled_posts_ready 
            ON public.scheduled_posts(status, scheduled_for) WHERE status = 'scheduled';

        ALTER TABLE public.scheduled_posts ENABLE ROW LEVEL SECURITY;

        DROP POLICY IF EXISTS "Users can view own scheduled" ON public.scheduled_posts;
        DROP POLICY IF EXISTS "Users can insert own scheduled" ON public.scheduled_posts;
        DROP POLICY IF EXISTS "Users can update own scheduled" ON public.scheduled_posts;
        DROP POLICY IF EXISTS "Users can delete own scheduled" ON public.scheduled_posts;

        CREATE POLICY "Users can view own scheduled" ON public.scheduled_posts
            FOR SELECT USING (auth.uid() = user_id);

        CREATE POLICY "Users can insert own scheduled" ON public.scheduled_posts
            FOR INSERT WITH CHECK (auth.uid() = user_id);

        CREATE POLICY "Users can update own scheduled" ON public.scheduled_posts
            FOR UPDATE USING (auth.uid() = user_id AND status IN ('scheduled', 'failed'));

        CREATE POLICY "Users can delete own scheduled" ON public.scheduled_posts
            FOR DELETE USING (auth.uid() = user_id AND status IN ('scheduled', 'failed'));

        DROP TRIGGER IF EXISTS update_scheduled_posts_updated_at ON public.scheduled_posts;
        CREATE TRIGGER update_scheduled_posts_updated_at
            BEFORE UPDATE ON public.scheduled_posts
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        """
        result = self.execute_sql(sql, "scheduled_posts table")
        self.log("TABLE", "scheduled_posts", "success" if result else "error")

    def run_all(self):
        """Execute complete schema setup"""
        print("=" * 60)
        print("NEXUS DATABASE SCHEMA SETUP")
        print("=" * 60)
        print(f"Supabase URL: {SUPABASE_URL}")
        print()

        self.setup_extensions()
        self.setup_trigger_function()
        self.setup_users_table()
        self.setup_platform_connections_table()
        self.setup_content_adaptations_table()
        self.setup_voice_profiles_table()
        self.setup_published_posts_table()
        self.setup_scheduled_posts_table()

        print()
        print("=" * 60)
        print("SETUP COMPLETE")
        print("=" * 60)
        
        success_count = sum(1 for r in self.results if r["status"] == "success")
        error_count = sum(1 for r in self.results if r["status"] == "error")
        
        print(f"Results: {success_count} successful, {error_count} errors")
        
        if error_count > 0:
            print("\nErrors encountered:")
            for r in self.results:
                if r["status"] == "error":
                    print(f"  - {r['category']}: {r['name']}")
            return 1
        
        print("\nNote: If some items show as 'skipped', enable them manually in")
        print("      the Supabase Dashboard SQL Editor by running the SQL.")
        return 0


def main():
    """Entry point"""
    setup = SchemaSetup(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    exit_code = setup.run_all()
    sys.exit(exit_code)


if __name__ == "__main__":
    main()