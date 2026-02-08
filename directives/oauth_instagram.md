# Instagram OAuth Integration

## Goal
Connect user Instagram accounts to Nexus for content publishing (stories, posts, reels) and analytics.

## Inputs
- `user_id` (from Supabase auth)
- `redirect_uri` (OAuth callback URL)
- `scopes` (permissions: instagram_basic, instagram_content_publish)

## Tools/Scripts
- `execution/oauth/instagram_flow.py` - OAuth 2.0 flow handler
- `execution/oauth/token_refresh.py` - Token refresh (long-lived tokens)
- `execution/utils/supabase_client.py` - Database operations

## Outputs
- OAuth 2.0 tokens stored in `platform_connections`
- Connection status in dashboard
- Error logs on failure

## Flow

### 1. Initiate OAuth 2.0
```
User clicks "Connect Instagram"
→ API route calls instagram_flow.py --action=initiate --user_id={id}
→ Script generates OAuth 2.0 URL via Facebook Login
→ Redirects to Meta authorization screen
```

### 2. Handle Callback
```
Meta redirects to /api/auth/instagram/callback?code={code}&state={state}
→ API route calls instagram_flow.py --action=callback --code={code}
→ Exchanges code for short-lived access_token
→ Exchanges for long-lived token (60 days)
→ Stores in platform_connections
→ Updates dashboard
```

### 3. Post Content
```
User creates adapted content for Instagram
→ API calls instagram_flow.py --action=post --user_id={id} --media={path}
→ Script retrieves token from DB
→ Uploads media to Instagram API
→ Returns media_id and status
```

## Edge Cases

### Business Account Required
- Instagram Basic Display API: read-only, personal accounts only
- Instagram Graph API: publishing, requires Business/Creator account
- Must check account type before connecting
- Provide migration guide if personal account

### Media Upload Workflow
- Instagram requires media upload then container creation
- For photos: Direct upload
- For videos: Must check processing status before publishing
- Single API call for single media, carousel requires multiple

### Rate Limits (Graph API)
- 200 calls/hour per user for publishing
- 100 calls/hour for insights
- Implement request queuing

### Hashtag Limits
- Max 30 hashtags per post
- Exceeding causes post rejection
- Truncate or warn if over limit

## Instagram API Requirements

**OAuth 2.0 Scopes:**
- `instagram_basic` - Read profile and media (Basic Display)
- `instagram_content_publish` - Publish posts (Graph API)
- `instagram_manage_insights` - Read analytics (optional)
- `pages_read_engagement` - Required for Business accounts

**API Endpoints:**
- Authorization: `https://www.facebook.com/v18.0/dialog/oauth`
- Token Exchange: `https://graph.facebook.com/v18.0/oauth/access_token`
- Long-lived Token: `https://graph.instagram.com/access_token`
- Get User: `GET https://graph.instagram.com/me`
- Get Media: `GET https://graph.instagram.com/me/media`
- Publish Media: `POST https://graph.facebook.com/v18.0/{ig-user-id}/media`
- Publish Container: `POST https://graph.facebook.com/v18.0/{ig-user-id}/media_publish`

**App Setup:**
1. Create app at https://developers.facebook.com/
2. Add Instagram Basic Display and Instagram Graph API products
3. Configure OAuth redirect URLs
4. Get App ID and App Secret
5. User needs Instagram Business/Creator account connected to Facebook Page

**Media Publishing Workflow:**
```
1. POST /media (create container)
   → Returns creation_id
2. GET /media?creation_id={id} (check status)
   → Wait for status: "FINISHED"
3. POST /media_publish (publish)
   → Returns media_id
```

## Environment Variables
```
INSTAGRAM_APP_ID=xxx           # Same as Facebook App ID
INSTAGRAM_APP_SECRET=xxx       # Same as Facebook App Secret
INSTAGRAM_REDIRECT_URI=https://nexus.example.com/api/auth/instagram/callback
```

## Database Schema
Same `platform_connections` table as other platforms.
Note: Instagram uses long-lived tokens valid for 60 days, refresh before expiry.

## Testing
```bash
# Test OAuth flow
python execution/oauth/instagram_flow.py --action=initiate --dry-run

# Test media upload (requires actual image)
python execution/oauth/instagram_flow.py --action=upload --user_id=test --image_path=test.jpg --dry-run

# Test posting
python execution/oauth/instagram_flow.py --action=post --user_id=test --caption="Test" --dry-run
```

## Learnings / Updates
- [ ] Personal Instagram accounts cannot publish via API
- [ ] Must be Business/Creator account linked to Facebook Page
- [ ] Videos require async processing - must poll for status
- [ ] Carousel posts require multiple media containers
- [ ] Stories publishing limited to approved partners only
- [ ] Long-lived tokens last 60 days, refresh at 50 days
