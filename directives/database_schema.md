# Database Schema Documentation - Nexus

## Overview
This document defines the PostgreSQL database schema for Nexus, a multi-platform content adaptation tool. All tables use Row Level Security (RLS) for data isolation.

**Tech Stack:** PostgreSQL 15+ (via Supabase), UUID primary keys

---

## Users Table

Core user authentication and profile information.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | User identifier (matches auth.users.id) |
| email | VARCHAR(255) | UNIQUE, NOT NULL | User email address |
| full_name | VARCHAR(255) | | Display name |
| avatar_url | TEXT | | Profile picture URL |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Account creation time |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Last update time |
| timezone | VARCHAR(50) | DEFAULT 'UTC' | User's timezone for scheduling |
| is_active | BOOLEAN | DEFAULT TRUE | Account status |

### RLS Policies
- `SELECT`: Users can read their own data
- `INSERT`: Service role only (triggered by auth signup)
- `UPDATE`: Users can update their own data

---

## Platform Connections Table

Stores OAuth tokens and platform-specific profile data for connected social accounts.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Connection identifier |
| user_id | UUID | NOT NULL, FK → users(id) ON DELETE CASCADE | Owner |
| platform | VARCHAR(50) | NOT NULL | Platform name (linkedin, x, substack, etc.) |
| platform_user_id | VARCHAR(255) | NOT NULL | User ID on the external platform |
| access_token | TEXT | NOT NULL | Encrypted OAuth access token |
| refresh_token | TEXT | | Encrypted OAuth refresh token |
| token_expires_at | TIMESTAMPTZ | | Access token expiration |
| scope | TEXT | | Granted OAuth scopes |
| profile_data | JSONB | | Platform profile (username, followers, etc.) |
| is_active | BOOLEAN | DEFAULT TRUE | Connection status |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Connection time |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Last update |
| last_sync_at | TIMESTAMPTZ | | Last profile sync |

### Indexes
- `idx_platform_connections_user_id` ON user_id
- `idx_platform_connections_platform` ON platform
- `idx_platform_connections_user_platform` UNIQUE ON (user_id, platform)

### RLS Policies
- `SELECT`: Users can read their own connections
- `INSERT`: Users can add their own connections
- `UPDATE`: Users can update their own connections
- `DELETE`: Users can delete their own connections

---

## Content Adaptations Table

Stores original content ideas and their platform-specific adaptations.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Adaptation identifier |
| user_id | UUID | NOT NULL, FK → users(id) ON DELETE CASCADE | Creator |
| original_idea | TEXT | NOT NULL | The base idea/concept text |
| idea_hash | VARCHAR(64) | | SHA-256 hash of original_idea (deduplication) |
| adaptations | JSONB | NOT NULL | Platform variations: `{linkedin: "...", x: "..."}` |
| tone | VARCHAR(50) | | Desired tone (professional, casual, etc.) |
| target_audience | VARCHAR(255) | | Audience description |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Creation time |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Last update |
| last_used_at | TIMESTAMPTZ | | Last time adapted content was used |

### Indexes
- `idx_content_adaptations_user_id` ON user_id
- `idx_content_adaptations_created_at` ON created_at DESC
- `idx_content_adaptations_idea_hash` ON idea_hash

### RLS Policies
- `SELECT`: Users can read their own adaptations
- `INSERT`: Users can create their own adaptations
- `UPDATE`: Users can update their own adaptations
- `DELETE`: Users can delete their own adaptations

### JSONB Schema (adaptations)
```json
{
  "linkedin": {
    "text": "Full post text",
    "hashtags": ["tag1", "tag2"],
    "media_urls": ["..."]
  },
  "x": {
    "text": "280 char version",
    "thread": [...]
  },
  "substack": {
    "title": "Article title",
    "body": "Full article content"
  }
}
```

---

## Voice Profiles Table

User-specific writing style characteristics for content generation.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Profile identifier |
| user_id | UUID | NOT NULL, FK → users(id) ON DELETE CASCADE | Owner |
| name | VARCHAR(255) | NOT NULL | Profile name (e.g., "Professional", "Casual") |
| is_default | BOOLEAN | DEFAULT FALSE | Whether this is the default profile |
| characteristics | JSONB | NOT NULL | Voice characteristics configuration |
| sample_posts | TEXT[] | | Example posts to learn from |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Creation time |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Last update |
| last_used_at | TIMESTAMPTZ | | Last usage time |

### Indexes
- `idx_voice_profiles_user_id` ON user_id
- `idx_voice_profiles_user_default` UNIQUE (user_id) WHERE is_default = TRUE

### RLS Policies
- `SELECT`: Users can read their own voice profiles
- `INSERT`: Users can create their own profiles
- `UPDATE`: Users can update their own profiles
- `DELETE`: Users can delete their own profiles (if not only profile)

### JSONB Schema (characteristics)
```json
{
  "tone": ["professional", "approachable"],
  "style": "concise",
  "sentence_length": "short",
  "vocabulary": "industry-specific",
  "emoij_usage": "minimal",
  "formality_level": 7,
  "common_phrases": ["In my experience", "Here's why"],
  "avoid_words": ["very", "really"]
}
```

---

## Published Posts Table

Tracks published content across platforms with metrics.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Post identifier |
| user_id | UUID | NOT NULL, FK → users(id) ON DELETE CASCADE | Owner |
| adaptation_id | UUID | FK → content_adaptations(id) | Source adaptation (optional) |
| platform_connection_id | UUID | FK → platform_connections(id) | Where it was posted |
| platform | VARCHAR(50) | NOT NULL | Platform name |
| platform_post_id | VARCHAR(255) | | ID assigned by platform |
| status | VARCHAR(50) | DEFAULT 'pending' | pending, published, failed, deleted |
| content | TEXT | NOT NULL | Actual posted content |
| metadata | JSONB | | Platform-specific data |
| metrics | JSONB | | Engagement metrics (synced periodically) |
| scheduled_for | TIMESTAMPTZ | | Scheduled publish time |
| published_at | TIMESTAMPTZ | | Actual publish time |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Record creation time |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Last update |

### Indexes
- `idx_published_posts_user_id` ON user_id
- `idx_published_posts_status` ON status
- `idx_published_posts_platform` ON platform
- `idx_published_posts_scheduled` ON scheduled_for WHERE status = 'scheduled'
- `idx_published_posts_adaptation_id` ON adaptation_id

### RLS Policies
- `SELECT`: Users can read their own published posts
- `INSERT`: Users can create their own posts
- `UPDATE`: Users can update their own posts
- `DELETE`: Users can delete their own unpublished posts

### JSONB Schema (metrics)
```json
{
  "views": 1500,
  "likes": 45,
  "comments": 12,
  "shares": 8,
  "impressions": 3000,
  "engagement_rate": 0.043,
  "last_synced": "2025-02-10T12:00:00Z"
}
```

---

## Scheduled Posts Table

Queue for posts to be published at a specific time.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Schedule identifier |
| user_id | UUID | NOT NULL, FK → users(id) ON DELETE CASCADE | Owner |
| adaptation_id | UUID | FK → content_adaptations(id) | Content to post |
| content | TEXT | NOT NULL | The actual content (snapshot at schedule time) |
| platform_connection_id | UUID | NOT NULL, FK → platform_connections(id) | Target platform |
| platform | VARCHAR(50) | NOT NULL | Platform name |
| status | VARCHAR(50) | DEFAULT 'scheduled' | scheduled, processing, completed, failed, cancelled |
| scheduled_for | TIMESTAMPTZ | NOT NULL | When to publish |
| timezone | VARCHAR(50) | DEFAULT 'UTC' | For display purposes |
| retry_count | INTEGER | DEFAULT 0 | Failed attempt count |
| last_error | TEXT | | Last error message if failed |
| published_post_id | UUID | FK → published_posts(id) | Result record |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Schedule creation time |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Last update |

### Indexes
- `idx_scheduled_posts_user_id` ON user_id
- `idx_scheduled_posts_status` ON status
- `idx_scheduled_posts_scheduled_for` ON scheduled_for
- `idx_scheduled_posts_ready` ON (status, scheduled_for) WHERE status = 'scheduled'

### RLS Policies
- `SELECT`: Users can read their own scheduled posts
- `INSERT`: Users can schedule their own posts
- `UPDATE`: Users can modify their own unprocessed posts
- `DELETE`: Users can cancel their own unprocessed posts

---

## Functions & Triggers

### Auto-Update Updated At
Applies to: users, platform_connections, content_adaptations, voice_profiles, published_posts, scheduled_posts

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### Set Default Voice Profile
Ensures every user has exactly one default voice profile.

---

## Data Flow

```
User Signup
    ↓
Create users record
    ↓
Connect Platforms → platform_connections
    ↓
Create Voice Profile → voice_profiles
    ↓
Adapt Content → content_adaptations
    ↓
Schedule/Post → scheduled_posts → published_posts
```

---

## Encryption

Sensitive fields (access_token, refresh_token) are encrypted at the application layer before storage using AES-256-GCM. The encryption key is stored in environment variables, not in the database.

---

## Migrations

To add new tables or modify schema:

1. Update this documentation
2. Modify `execution/database/setup_schema.py`
3. Run the script idempotently
4. Test RLS policies with different user contexts

---

## API Access

Supabase provides auto-generated REST and GraphQL APIs. Use the PostgREST endpoint with the `anon` key for client-side operations (respects RLS) and `service_role` key for server-side operations.
