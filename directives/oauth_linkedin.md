# LinkedIn OAuth Integration

## Goal
Connect user LinkedIn accounts to Nexus for content publishing and analytics.

## Inputs
- `user_id` (from Supabase auth)
- `redirect_uri` (OAuth callback URL)
- `scopes` (permissions to request)

## Tools/Scripts
- `execution/oauth/linkedin_flow.py` - Main OAuth flow handler
- `execution/oauth/token_refresh.py` - Background token refresh
- `execution/utils/supabase_client.py` - Database operations

## Outputs
- OAuth tokens stored in `platform_connections` table
- Connection status in dashboard
- Error logs if connection fails

## Flow

### 1. Initiate OAuth
```
User clicks "Connect LinkedIn" 
→ API route calls linkedin_flow.py --action=initiate --user_id={id}
→ Script generates OAuth URL with PKCE
→ Redirects user to LinkedIn
```

### 2. Handle Callback
```
LinkedIn redirects to /api/auth/linkedin/callback?code={code}&state={state}
→ API route calls linkedin_flow.py --action=callback --code={code} --state={state}
→ Script exchanges code for tokens
→ Stores in platform_connections table
→ Updates user dashboard
```

### 3. Token Refresh
```
Scheduled job (or pre-flight check)
→ token_refresh.py --platform=linkedin
→ Refreshes expired tokens
→ Updates database
```

## Edge Cases

### Token Expired Mid-Request
- Catch 401 from LinkedIn API
- Trigger refresh flow
- Retry original request
- Log if refresh fails

### User Revokes Access
- LinkedIn returns specific error
- Mark connection as `revoked` in DB
- Notify user to reconnect

### Rate Limits
- LinkedIn: 100 req/day for basic, 500 for enterprise
- Implement exponential backoff
- Queue requests if limit hit

### Multiple Connection Attempts
- Check for existing connection first
- If exists and valid, return success
- If exists and expired, trigger refresh
- Only create new if no valid connection

## LinkedIn API Requirements

**OAuth 2.0 Scopes:**
- `r_basicprofile` - Read basic profile
- `r_organization_social` - Read org posts (for company pages)
- `w_member_social` - Create posts
- `r_member_social` - Read member posts

**App Setup:**
1. Create app at https://developer.linkedin.com/
2. Add OAuth 2.0 redirect URLs
3. Request Marketing Developer Platform access
4. Get client_id and client_secret

## Environment Variables
```
LINKEDIN_CLIENT_ID=xxx
LINKEDIN_CLIENT_SECRET=xxx
LINKEDIN_REDIRECT_URI=https://nexus.example.com/api/auth/linkedin/callback
```

## Database Schema

Uses existing `platform_connections` table:
```sql
INSERT INTO platform_connections (
  user_id, platform, access_token, refresh_token, 
  token_expires_at, scopes, connection_status
) VALUES (...)
```

## Testing

```bash
# Test OAuth flow
python execution/oauth/linkedin_flow.py --action=initiate --user_id=test --dry-run

# Test callback handling
python execution/oauth/linkedin_flow.py --action=callback --code=test_code --dry-run

# Test token refresh
python execution/oauth/token_refresh.py --platform=linkedin --dry-run
```

## Learnings / Updates

- [ ] PKCE required for mobile apps
- [ ] LinkedIn OAuth tokens expire in 60 days
- [ ] Refresh tokens valid for 1 year
- [ ] Marketing API requires separate approval
