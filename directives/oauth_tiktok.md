# TikTok OAuth Integration

## Goal
Connect user TikTok accounts to Nexus for video publishing and analytics.

## Inputs
- `user_id` (from Supabase auth)
- `redirect_uri` (OAuth callback URL)
- `scopes` (permissions: user.info.basic, video.publish, video.upload)

## Tools/Scripts
- `execution/oauth/tiktok_flow.py` - OAuth 2.0 flow handler
- `execution/oauth/token_refresh.py` - Token refresh
- `execution/utils/supabase_client.py` - Database operations

## Outputs
- OAuth 2.0 tokens stored in `platform_connections`
- Connection status in dashboard
- Error logs on failure

## Flow

### 1. Initiate OAuth 2.0
```
User clicks "Connect TikTok"
→ API route calls tiktok_flow.py --action=initiate --user_id={id}
→ Script generates OAuth 2.0 URL with anti-forgery state token
→ Redirects to TikTok authorization screen
```

### 2. Handle Callback
```
TikTok redirects to /api/auth/tiktok/callback?code={code}&state={state}
→ API validates state token (anti-forgery)
→ API route calls tiktok_flow.py --action=callback --code={code}
→ Exchanges code for access_token
→ Stores in platform_connections
→ Updates dashboard
```

### 3. Post Content
```
User creates adapted content for TikTok
→ API calls tiktok_flow.py --action=post --user_id={id} --video={path}
→ Script retrieves token from DB
→ Uploads video via TikTok API (direct upload or URL-based)
→ Returns publish_id and status
```

## Edge Cases

### Video Requirements
- TikTok requires specific video formats
- MP4 or MOV, H.264 codec
- Duration: 15s to 10 minutes (varies by account)
- Resolution: 540x960 minimum (9:16 aspect ratio)
- File size: Max 287MB for iOS, 72MB for Android upload

### Upload Methods
- **Direct Upload**: POST video file directly (best for <50MB)
- **URL-based**: Provide public URL, TikTok fetches (best for larger files)
- **Chunked Upload**: For large files, requires multiple requests

### Rate Limits
- Publish: 5 videos/day per user (free tier)
- Query: 1000 req/day per app
- Upload: Varies by method
- Implement backoff and queuing

### Creator Account Types
- TikTok requires Creator account for API access
- Personal accounts may not have all features
- Check account status before allowing connection

## TikTok API Requirements

**OAuth 2.0 Scopes:**
- `user.info.basic` - Read user profile info
- `user.info.profile` - Read extended profile info
- `user.info.stats` - Read user statistics
- `video.list` - List user's videos
- `video.query` - Query video info
- `video.publish` - Publish videos
- `video.upload` - Upload videos

**API Endpoints:**
- Authorization: `https://www.tiktok.com/auth/authorize/`
- Token Exchange: `POST https://open-api.tiktok.com/oauth/access_token/`
- Refresh Token: `POST https://open-api.tiktok.com/oauth/refresh_token/`
- Get User Info: `GET https://open-api.tiktok.com/user/info/`
- Query Videos: `GET https://open-api.tiktok.com/video/list/`
- Publish Video: `POST https://open-api.tiktok.com/video/create/`
- Query Publish Status: `GET https://open-api.tiktok.com/video/status/`

**App Setup:**
1. Register at https://developers.tiktok.com/
2. Create app and get client_key and client_secret
3. Configure redirect URIs (max 10, must be HTTPS)
4. Apply for API access (requires approval for publishing)
5. Configure scopes needed

**Video Upload Workflow:**
```python
# Option 1: Direct Upload (for small files)
POST /video/upload/
→ Returns video_id

# Option 2: URL-based (for larger files)
POST /video/create/
with source_info: {"source": "PULL_FROM_URL", "url": "https://..."}
→ TikTok fetches and processes

# Option 3: Publish API (requires pre-upload)
POST /video/publish/
with video_id from upload
→ Publishes to user's profile
```

## Environment Variables
```
TIKTOK_CLIENT_KEY=xxx
TIKTOK_CLIENT_SECRET=xxx
TIKTOK_REDIRECT_URI=https://nexus.example.com/api/auth/tiktok/callback
```

## Database Schema
Same `platform_connections` table as other platforms.

## Testing
```bash
# Test OAuth flow
python execution/oauth/tiktok_flow.py --action=initiate --dry-run

# Test video upload
python execution/oauth/tiktok_flow.py --action=upload --user_id=test --video_path=test.mp4 --dry-run

# Test publishing
python execution/oauth/tiktok_flow.py --action=post --user_id=test --video_id=xxx --caption="Test" --dry-run
```

## Learnings / Updates
- [ ] Anti-forgery state token required for security
- [ ] TikTok tokens expire in 24 hours, refresh tokens last 365 days
- [ ] Video publish requires pre-approval from TikTok
- [ ] URL-based upload is async - must poll for completion
- [ ] Private videos cannot be published via API
- [ ] Direct video upload limited to smaller files
- [ ] Creator account status affects available features
