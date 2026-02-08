# X / Twitter OAuth Integration

## Goal
Connect user X/Twitter accounts to Nexus for content publishing and analytics.

## Inputs
- `user_id` (from Supabase auth)
- `redirect_uri` (OAuth callback URL)
- `scopes` (permissions: tweet.read, tweet.write, users.read)

## Tools/Scripts
- `execution/oauth/twitter_flow.py` - OAuth 2.0 flow handler
- `execution/oauth/token_refresh.py` - Token refresh
- `execution/utils/supabase_client.py` - Database operations

## Outputs
- OAuth 2.0 tokens stored in `platform_connections`
- Connection status in dashboard
- Error logs on failure

## Flow

### 1. Initiate OAuth 2.0
```
User clicks "Connect X"
→ API route calls twitter_flow.py --action=initiate --user_id={id}
→ Script generates OAuth 2.0 URL with PKCE
→ Redirects to X authorization screen
```

### 2. Handle Callback
```
X redirects to /api/auth/twitter/callback?code={code}&state={state}
→ API route calls twitter_flow.py --action=callback --code={code}
→ Exchanges code for access_token
→ Stores in platform_connections
→ Updates dashboard
```

### 3. Post Content
```
User creates adapted content for X
→ API calls twitter_flow.py --action=post --user_id={id} --content={text}
→ Script retrieves token from DB
→ Posts to X API v2
→ Returns post_id and metrics
```

## Edge Cases

### Tweet Length > 280 chars
- Truncate with "..." and link to full post
- Or split into thread (separate directive)

### Media Uploads
- X requires media upload before tweet creation
- Use chunked upload for videos > 5MB
- Images: PNG/JPG/GIF/WebP, max 5MB

### Rate Limits (API v2)
- POST tweet: 200 per 15 min per user
- GET timeline: 1500 per 15 min per app
- Implement rate limit headers check

### Free vs Paid API Tiers
- Free: 1500 tweets/month read, 500 posts/month write
- Basic ($100/mo): 10K read, 3000 write, 50K posts/month
- Check tier before operations

## X API Requirements

**OAuth 2.0 Scopes:**
- `tweet.read` - Read tweets
- `tweet.write` - Create tweets
- `users.read` - Read user profile
- `offline.access` - Get refresh token

**App Setup:**
1. Create app at https://developer.twitter.com/en/portal/dashboard
2. Enable OAuth 2.0
3. Add callback URLs
4. Get client_id (no secret needed for PKCE)

## Environment Variables
```
TWITTER_CLIENT_ID=xxx
TWITTER_CLIENT_SECRET=xxx  # Only needed for confidential clients
TWITTER_REDIRECT_URI=https://nexus.example.com/api/auth/twitter/callback
```

## Database Schema
Same `platform_connections` table as other platforms.

## Testing
```bash
python execution/oauth/twitter_flow.py --action=initiate --dry-run
python execution/oauth/twitter_flow.py --action=post --user_id=test --content="Hello X" --dry-run
```

## Learnings / Updates
- [ ] X API v2 required for new apps
- [ ] OAuth 2.0 PKCE is recommended flow
- [ ] Free tier limits may be too low for power users
