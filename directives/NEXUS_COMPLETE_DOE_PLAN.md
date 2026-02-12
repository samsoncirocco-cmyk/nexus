# Nexus Product: Complete DOE Implementation Plan

**Status:** Infrastructure Complete → Build Core Product  
**Goal:** Ship LinkedIn + X MVP in 4 weeks, full 6-platform product in 12 weeks  
**Framework:** DOE (Directives-Orchestration-Execution)

---

## Phase Overview

| Phase | Duration | Deliverable | Status |
|-------|----------|-------------|--------|
| 0 | Complete | Infrastructure, tests, dev environment | ✅ Done |
| 1 | Week 1-2 | Database + Auth + Platform OAuth | 🔄 In Progress |
| 2 | Week 3-4 | AI Content Engine (LinkedIn + X) | ⏳ Planned |
| 3 | Week 5-6 | Voice Matching + Publishing | ⏳ Planned |
| 4 | Week 7-8 | Analytics Dashboard | ⏳ Planned |
| 5 | Week 9-10 | Chrome Extension + Scheduling | ⏳ Planned |
| 6 | Week 11-12 | Polish + Stripe + Launch | ⏳ Planned |

---

## Phase 1: Foundation (Week 1-2)

### Directives (SOPs Required)

#### 1.1 Database Schema (`directives/database_schema.md`)
```markdown
## Tables Required

### platform_connections
- id: uuid (PK)
- user_id: uuid (FK)
- platform: enum (linkedin, twitter, substack, medium, instagram, tiktok)
- access_token: encrypted text
- refresh_token: encrypted text
- expires_at: timestamp
- profile_data: jsonb
- created_at: timestamp
- updated_at: timestamp

### content_adaptations
- id: uuid (PK)
- user_id: uuid (FK)
- original_idea: text
- adaptations: jsonb (platform → content mapping)
- voice_profile_id: uuid (FK)
- created_at: timestamp

### voice_profiles
- id: uuid (PK)
- user_id: uuid (FK)
- platform: enum
- sample_posts: text[]
- voice_characteristics: jsonb
- created_at: timestamp

### published_posts
- id: uuid (PK)
- user_id: uuid (FK)
- adaptation_id: uuid (FK)
- platform: enum
- platform_post_id: string
- status: enum (draft, scheduled, published, failed)
- published_at: timestamp
- engagement_metrics: jsonb
```

#### 1.2 Auth System (`directives/auth_system.md`)
```markdown
## Authentication Flow

1. User signs up with email/Google
2. Create user record in auth.users
3. Create default voice_profile
4. Redirect to /dashboard

## Platform OAuth Flow
1. User clicks "Connect LinkedIn"
2. Generate state, store in cache (5min TTL)
3. Redirect to LinkedIn OAuth
4. Handle callback, exchange code for tokens
5. Store encrypted tokens in platform_connections
6. Fetch profile data, store in profile_data
7. Show connected status in UI

## Security
- Tokens encrypted at rest (AES-256)
- Refresh tokens rotated on use
- OAuth state validated strictly
```

### Execution Scripts (To Create)

```python
# execution/database/setup_schema.py
"""Create all database tables in Supabase."""
# Uses Supabase Python client
# Idempotent - safe to run multiple times
# Creates tables, indexes, RLS policies

# execution/database/migrations.py
"""Handle database migrations."""
# Tracks applied migrations
# Applies new migrations in order
# Rollback capability
```

```typescript
// app/api/auth/[...nextauth]/route.ts
// NextAuth configuration with Google + email providers

// app/api/platforms/[platform]/connect/route.ts
// Initiates OAuth flow for platform

// app/api/platforms/[platform]/callback/route.ts
// Handles OAuth callback, stores tokens
```

### Orchestration Tasks

**Week 1:**
- [ ] Create `directives/database_schema.md`
- [ ] Create `execution/database/setup_schema.py`
- [ ] Run schema setup on Supabase
- [ ] Create `directives/auth_system.md`
- [ ] Implement NextAuth configuration
- [ ] Test auth flow (signup, login, logout)

**Week 2:**
- [ ] Create `directives/oauth_linkedin.md` (exists, verify)
- [ ] Create `directives/oauth_twitter.md` (exists, verify)
- [ ] Implement LinkedIn OAuth API routes
- [ ] Implement X OAuth API routes
- [ ] Test OAuth flows end-to-end
- [ ] Create platform connection UI

---

## Phase 2: AI Content Engine (Week 3-4)

### Directives (SOPs Required)

#### 2.1 Content Adaptation Engine (`directives/content_adaptation.md`) ✅ EXISTS
- Single input → 6 platform outputs
- Per-platform formatting rules
- Voice matching integration
- Prompt templates for each platform

#### 2.2 Voice Matching System (`directives/voice_matching.md`)
```markdown
## Voice Profile Creation

1. User provides 3-5 sample posts
2. Analyze:
   - Vocabulary complexity
   - Sentence length
   - Emoji usage
   - Humor/seriousness ratio
   - Hook styles
   - CTA patterns

3. Store voice_characteristics JSON:
   {
     "formality": 0.7,
     "avg_sentence_length": 15,
     "emoji_frequency": 0.3,
     "humor_score": 0.4,
     "data_driven": true,
     "storytelling": true
   }

4. Apply to prompts:
   "Adapt content to match voice profile: formal but accessible, 
    use occasional emojis, prefer data-driven claims..."
```

### Execution Scripts

```python
# execution/content/adapt_content.py
"""Main content adaptation engine."""
# Input: idea, platforms[], user_id, voice_style
# Output: platform-specific adaptations
# Parallel processing for all platforms
# Caching for identical requests

# execution/content/voice_analyzer.py
"""Analyze user's voice from sample posts."""
# Input: sample_posts[]
# Output: voice_characteristics JSON
# Uses Claude to analyze patterns

# execution/content/prompt_builder.py
"""Build platform-specific prompts."""
# Input: idea, platform, voice_profile
# Output: formatted prompt for LLM
# Uses templates from directive
```

```typescript
// app/api/content/adapt/route.ts
// POST: receives idea, platforms, user_id
// Calls adapt_content.py
// Returns adaptations JSON
// Rate limited per user
```

### Orchestration Tasks

**Week 3:**
- [ ] Verify `directives/content_adaptation.md` is current
- [ ] Create `execution/content/adapt_content.py`
- [ ] Create `execution/content/prompt_builder.py`
- [ ] Implement `/api/content/adapt` route
- [ ] Build Content Composer UI
- [ ] Test LinkedIn + X output quality

**Week 4:**
- [ ] Create `directives/voice_matching.md`
- [ ] Create `execution/content/voice_analyzer.py`
- [ ] Build Voice Profile creation UI
- [ ] Integrate voice matching into adaptation
- [ ] Quality testing with real user samples
- [ ] Optimize prompts based on results

---

## Phase 3: Voice Matching + Publishing (Week 5-6)

### Directives

#### 3.1 Publishing System (`directives/publishing_system.md`)
```markdown
## Publishing Flow

1. User reviews adapted content
2. User clicks "Publish to LinkedIn"
3. System:
   - Retrieves access_token from DB
   - Calls LinkedIn API with content
   - Stores published_post record
   - Returns platform_post_id

4. For platforms without API:
   - Generate copy-to-clipboard content
   - Chrome extension assists posting
   - User confirms manual post
   - Store published_post with status="manual"

## Error Handling
- Token expired → refresh automatically
- Rate limited → queue for retry
- API error → notify user, keep draft
```

### Execution Scripts

```python
# execution/oauth/linkedin_flow.py ✅ EXISTS
"""LinkedIn OAuth and posting."""
# Already have: initiate, callback, refresh
# Add: post_content(access_token, content)

# execution/oauth/twitter_flow.py ✅ EXISTS
"""X OAuth and posting."""
# Already have: initiate, callback, refresh
# Add: post_content(access_token, content)

# execution/publishing/publisher.py
"""Unified publishing interface."""
# Input: platform, content, user_id
# Output: result (success/failure, post_id, error)
# Routes to correct platform handler
```

```typescript
// app/api/publish/[platform]/route.ts
// POST: content, user_id
// Calls publisher.py
// Returns result + post_id
```

### Orchestration Tasks

**Week 5:**
- [ ] Verify LinkedIn/X OAuth scripts have posting
- [ ] Create `execution/publishing/publisher.py`
- [ ] Implement `/api/publish/[platform]` routes
- [ ] Build Preview + Publish UI
- [ ] Add copy-to-clipboard fallback

**Week 6:**
- [ ] Create Chrome extension structure
- [ ] Build extension popup UI
- [ ] Add "Post to LinkedIn/X" buttons
- [ ] Test end-to-end publishing flow
- [ ] Error handling + retry logic

---

## Phase 4: Analytics Dashboard (Week 7-8)

### Directives

#### 4.1 Analytics System (`directives/analytics_system.md`)
```markdown
## Data Collection

1. Polling jobs (every 6 hours):
   - Fetch post metrics from each platform API
   - Update engagement_metrics JSON
   - Calculate cross-platform performance

2. Metrics tracked:
   - LinkedIn: impressions, reactions, comments, reposts, clicks
   - X: impressions, engagements, retweets, replies, likes
   - Substack: opens, clicks, unsubscribes
   - etc.

## Dashboard Views
- Overview: All platforms, last 30 days
- Per-platform: Detailed breakdown
- Per-post: Performance across platforms
- Cross-platform: Which platforms drive what
```

### Execution Scripts

```python
# execution/analytics/sync_metrics.py
"""Sync metrics from all platforms."""
# Scheduled job (Inngest/Trigger.dev)
# Fetches metrics for published posts
# Updates database

# execution/analytics/aggregations.py
"""Calculate cross-platform insights."""
# Input: date range, user_id
# Output: aggregated metrics
# Best performing content types
- Platform comparison
```

### Orchestration Tasks

**Week 7:**
- [ ] Create `directives/analytics_system.md`
- [ ] Create `execution/analytics/sync_metrics.py`
- [ ] Implement analytics API routes
- [ ] Build Overview dashboard
- [ ] Build Per-platform views

**Week 8:**
- [ ] Create `execution/analytics/aggregations.py`
- [ ] Build Cross-platform comparison
- [ ] Add date range filtering
- [ ] Performance insights (AI-generated)
- [ ] Export capabilities

---

## Phase 5: Chrome Extension + Scheduling (Week 9-10)

### Directives

#### 5.1 Chrome Extension (`directives/chrome_extension.md`)
```markdown
## Features

1. Content Saver:
   - Right-click any text → "Save to Nexus"
   - Save URLs for later adaptation
   - Tag saved content

2. Quick Composer:
   - Popup with brain dump input
   - Generate + preview adaptations
   - One-click post or schedule

3. Platform Integration:
   - "Post with Nexus" buttons on LinkedIn/X
   - Auto-fill adapted content
   - Track manual posts

## Permissions
- activeTab (for content scripts)
- storage (for saved content)
- contextMenus (for right-click)
```

#### 5.2 Scheduling System (`directives/scheduling_system.md`)
```markdown
## Scheduling Flow

1. User selects "Schedule for later"
2. Pick date/time
3. Store in scheduled_posts table
4. Background job checks every 5 minutes
5. When time arrives:
   - Publish to platform
   - Update status
   - Notify user

## Recurring Posts
- Weekly series option
- Template + variable slots
- Auto-generate variations
```

### Execution Scripts

```python
# execution/scheduling/scheduler.py
"""Handle scheduled posts."""
# Check scheduled_posts for due items
# Publish via publisher.py
# Handle failures with retry

# execution/jobs/cron.py
"""Cron job runner."""
# Inngest/Trigger.dev configuration
# Schedules sync_metrics, scheduler
```

### Orchestration Tasks

**Week 9:**
- [ ] Set up Plasmo framework
- [ ] Build content saver feature
- [ ] Build quick composer popup
- [ ] Add LinkedIn/X integration buttons
- [ ] Publish to Chrome Web Store (dev)

**Week 10:**
- [ ] Create `directives/scheduling_system.md`
- [ ] Create `execution/scheduling/scheduler.py`
- [ ] Build Schedule UI
- [ ] Implement cron jobs
- [ ] Add recurring posts feature

---

## Phase 6: Polish + Launch (Week 11-12)

### Directives

#### 6.1 Payment Integration (`directives/payments.md`)
```markdown
## Stripe Integration

1. Products:
   - Starter: $49/mo (2 platforms, 50 posts)
   - Pro: $99/mo (4 platforms, unlimited)
   - Business: $179/mo (all platforms)

2. Flow:
   - User selects plan
   - Stripe Checkout
   - Webhook updates subscription
   - Feature gating based on tier

3. Usage tracking:
   - Count posts per month
   - Enforce limits
   - Upgrade prompts
```

### Execution Scripts

```python
# execution/payments/stripe_webhook.py
"""Handle Stripe webhooks."""
# checkout.session.completed
# invoice.paid
# subscription.cancelled

# execution/payments/usage_tracker.py
"""Track feature usage."""
# Count posts per user/month
# Enforce platform limits
# Check subscription status
```

### Orchestration Tasks

**Week 11:**
- [ ] Create `directives/payments.md`
- [ ] Set up Stripe products
- [ ] Implement Stripe Checkout
- [ ] Create webhook handler
- [ ] Add feature gating
- [ ] Mobile responsiveness pass

**Week 12:**
- [ ] Onboarding flow
- [ ] Landing page polish
- [ ] Beta launch checklist
- [ ] Documentation
- [ ] Support system

---

## Current Execution Plan (Immediate)

### This Week (Now - Feb 18)

**Day 1-2: Database**
- [ ] Create `directives/database_schema.md`
- [ ] Create `execution/database/setup_schema.py`
- [ ] Run schema setup
- [ ] Verify tables in Supabase

**Day 3-4: Auth**
- [ ] Verify `directives/auth_system.md`
- [ ] Implement NextAuth
- [ ] Test signup/login

**Day 5-7: LinkedIn OAuth**
- [ ] Verify `directives/oauth_linkedin.md`
- [ ] Create API routes
- [ ] Test OAuth flow
- [ ] Build connection UI

### Next Week (Feb 19-25)

**Day 1-2: X OAuth**
- [ ] Verify `directives/oauth_twitter.md`
- [ ] Create API routes
- [ ] Test OAuth flow

**Day 3-4: Content Engine**
- [ ] Verify `directives/content_adaptation.md`
- [ ] Create `execution/content/adapt_content.py`
- [ ] Test LinkedIn/X output

**Day 5-7: Composer UI**
- [ ] Build content input UI
- [ ] Build platform preview cards
- [ ] Connect to adaptation API

---

## Resource Allocation

### Single Developer (Current)
**Phases:**
- Phase 1: 2 weeks (can start now)
- Phase 2: 2 weeks (blocked on Phase 1)
- Phase 3: 2 weeks (blocked on Phase 2)
- ... etc

**Total: 12 weeks minimum**

### With Additional Resources

**Option A: +1 Backend Engineer**
- They take: Database, Auth, OAuth, Publishing
- You take: AI Content Engine, Frontend, Polish
- **Compress to 6-8 weeks**

**Option B: +1 Frontend Engineer**
- They take: All UI components, Dashboard, Extension
- You take: Backend, AI Engine, DevOps
- **Compress to 8 weeks**

**Option C: +1 Full-Stack + 1 AI Specialist**
- Full-stack: Auth, OAuth, Publishing, Analytics
- AI Specialist: Content Engine, Voice Matching
- You: Architecture, Review, Integration
- **Compress to 4-6 weeks**

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| OAuth complexity | Use existing execution scripts, test thoroughly |
| AI output quality | Start with templates, iterate with user feedback |
| Platform API changes | Build abstraction layer, monitor APIs |
| Single dev bottleneck | Hire contractor for parallel work |
| Scope creep | Strict MVP definition, defer nice-to-haves |

---

## Success Criteria by Phase

### Phase 1 (Foundation)
- [ ] User can sign up/login
- [ ] User can connect LinkedIn
- [ ] User can connect X
- [ ] Tokens stored securely

### Phase 2 (Content Engine)
- [ ] Brain dump → LinkedIn post in <5 seconds
- [ ] Brain dump → X thread in <5 seconds
- [ ] Voice matching improves output quality
- [ ] Output matches platform format

### Phase 3 (Publishing)
- [ ] One-click publish to LinkedIn
- [ ] One-click publish to X
- [ ] Copy-to-clipboard for manual posting
- [ ] Chrome extension assists posting

### Phase 4 (Analytics)
- [ ] See post performance by platform
- [ ] Cross-platform comparison
- [ ] Engagement metrics synced

### Phase 5 (Extension + Scheduling)
- [ ] Save content from any webpage
- [ ] Schedule posts for future
- [ ] Quick compose from extension

### Phase 6 (Launch)
- [ ] Stripe payments working
- [ ] 3 pricing tiers functional
- [ ] Onboarding complete
- [ ] Beta users active

---

## Immediate Next Steps

**Today:**
1. Create `directives/database_schema.md`
2. Create `execution/database/setup_schema.py`
3. Run schema setup on Supabase

**This Week:**
1. Implement NextAuth
2. Verify LinkedIn OAuth execution scripts
3. Build platform connection UI

**Decision Required:**
- Hire additional developer(s)?
- Cut scope to LinkedIn-only MVP?
- Extend timeline?

---

**Created:** 2026-02-11  
**Framework:** DOE (Directives-Orchestration-Execution)  
**Owner:** Killua / Nexus Engineering
