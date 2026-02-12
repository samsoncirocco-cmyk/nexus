# LinkedIn OAuth Integration

## Goal
Connect user LinkedIn accounts to Nexus for content publishing via LinkedIn Marketing API.

## Inputs
- `user_id` (from Supabase auth)
- `redirect_uri` (OAuth callback URL - must match LinkedIn app settings)
- `state` (CSRF protection token)
- `code` (authorization code from LinkedIn)

## Outputs
- OAuth tokens stored in `platform_connections` table
- User profile data (LinkedIn ID, name, profile picture)
- Connection status in dashboard
- Error logs if connection fails

## OAuth 2.0 Flow (PKCE)

LinkedIn OAuth 2.0 with Proof Key for Code Exchange (PKCE) is required for security.

### Flow Steps

```
1. User clicks "Connect LinkedIn"
   → Frontend calls POST /api/platforms/linkedin/connect
   → Script generates PKCE pair (verifier + challenge)
   → Stores state + verifier temporarily (Redis/DB: 10 min expiry)
   → Returns auth URL to frontend
   → Frontend redirects user to LinkedIn

2. User authorizes on LinkedIn
   → LinkedIn redirects to /api/platforms/linkedin/callback
   → Query params: code, state

3. Handle callback
   → Retrieve stored verifier using state
   → Exchange code + verifier for tokens
   → Fetch user profile (r_liteprofile scope)
   → Store tokens in platform_connections table
   → Redirect user to dashboard with success message

4. Post content (later)
   → Use stored access_token
   → Call LinkedIn UGC Posts API
   → Handle expired tokens (401) → refresh → retry
```

### PKCE Implementation

```python
# Generate code_verifier (43-128 chars, URL-safe base64)
code_verifier = base64.urlsafe_b64encode(secrets.token_bytes(32)).decode().rstrip('=')

# Generate code_challenge (SHA256 hash of verifier, URL-safe base64)
code_challenge = base64.urlsafe_b64encode(
    hashlib.sha256(code_verifier.encode()).digest()
).decode().rstrip('=')

# Include in auth URL: code_challenge_method=S256&code_challenge={challenge}
# Exchange step: include code_verifier={verifier}
```

## Required Scopes

| Scope | Description | Used For |
|-------|-------------|----------|
| `r_liteprofile` | Read basic profile (id, name, photo) | User identification, display name |
| `w_member_social` | Create posts on member's behalf | Publishing content |

**Note:** LinkedIn has deprecated `r_basicprofile`. Use `r_liteprofile` for new apps.

**Migration:** Existing apps using `r_basicprofile` should migrate to `r_liteprofile` + `r_emailaddress` if email is needed.

## Token Management

### Token Request
```http
POST https://www.linkedin.com/oauth/v2/accessToken
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code&
code={CODE}&
client_id={CLIENT_ID}&
client_secret={CLIENT_SECRET}&
redirect_uri={REDIRECT_URI}&
code_verifier={PKCE_VERIFIER}
```

### Token Response
```json
{
  "access_token": "AQU123...",
  "expires_in": 5184000,
  "refresh_token": "AQV456...",
  "scope": "r_liteprofile w_member_social",
  "token_type": "Bearer"
}
```

### Token Refresh Logic

**When to refresh:**
- Access tokens expire in 5184000 seconds (~60 days)
- Refresh tokens valid for 1 year
- Attempt refresh when API returns 401 Unauthorized
- Proactive refresh: within 7 days of expiry

**Refresh Flow:**
```python
POST https://www.linkedin.com/oauth/v2/accessToken
Content-Type: application/x-www-form-urlencoded

grant_type=refresh_token&
refresh_token={REFRESH_TOKEN}&
client_id={CLIENT_ID}&
client_secret={CLIENT_SECRET}
```

**Refresh Response:**
```json
{
  "access_token": "NEW_AQU...",
  "expires_in": 5184000,
  "refresh_token": "NEW_AQV...",  // May generate new refresh_token
  "scope": "r_liteprofile w_member_social"
}
```

**Important:** LinkedIn may return a new refresh_token. Store both tokens after refresh.

**Failure handling:**
- If refresh fails with `invalid_grant` → refresh token expired/revoked
- Mark connection as `expired` in DB
- Prompt user to reconnect

## Post Creation API Specs

### Endpoint
```
POST https://api.linkedin.com/v2/ugcPosts
```

### Headers
```
Authorization: Bearer {access_token}
Content-Type: application/json
X-Restli-Protocol-Version: 2.0.0
```

### Request Body
```json
{
  "author": "urn:li:person:{PERSON_ID}",
  "lifecycleState": "PUBLISHED",
  "specificContent": {
    "com.linkedin.ugc.ShareContent": {
      "shareCommentary": {
        "text": "Hello LinkedIn! This is my post content."
      },
      "shareMediaCategory": "NONE"
    }
  },
  "visibility": {
    "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
  }
}
```

### Visibility Options
- `PUBLIC` - Anyone on LinkedIn
- `CONNECTIONS` - 1st degree connections only

### Media Categories
- `NONE` - Text-only post
- `ARTICLE` - Link to article
- `IMAGE` - Image upload (requires separate asset upload)
- `VIDEO` - Video upload (requires separate asset upload)

### Response
```json
"urn:li:share:123456789"  // Returned in X-RestLi-Id header
```

### Error Codes
| HTTP | Error | Description |
|------|-------|-------------|
| 401 | Invalid access token | Token expired, needs refresh |
| 403 | Insufficient permissions | Scope `w_member_social` missing |
| 422 | Validation failed | Invalid URN, malformed content |
| 429 | Rate limit exceeded | Too many requests |

## API Limits
- **Posts per day:** 150 for personal accounts
- **Rate limits:** 100 req/day basic, 500 req/day with enterprise
- **Retry after 429:** Check `X-RateLimit-Reset` header

## Environment Variables
```
LINKEDIN_CLIENT_ID=your_client_id
LINKEDIN_CLIENT_SECRET=your_client_secret
LINKEDIN_REDIRECT_URI=https://nexus.example.com/api/platforms/linkedin/callback
```

## Database Schema

`platform_connections` table:
```sql
INSERT INTO platform_connections (
  user_id,
  platform,
  platform_user_id,      -- LinkedIn person ID
  access_token,
  refresh_token,
  token_expires_at,      -- ISO 8601 timestamp
  scopes,                -- 'r_liteprofile w_member_social'
  connection_status,     -- 'connected', 'expired', 'revoked'
  profile_data,          -- JSON: {name, profilePicture}
  created_at,
  updated_at
) VALUES (...)
```

## Tools/Scripts

- `execution/oauth/linkedin_flow.py` - Main OAuth flow handler
  - `initiate_auth(user_id)` → {auth_url, state}
  - `handle_callback(code, state)` → tokens + profile
  - `refresh_token(refresh_token)` → new access_token
  - `post_content(access_token, content)` → post_id
  - `get_profile(access_token)` → profile data

- `execution/oauth/token_refresh.py` - Background token refresh

- `execution/utils/supabase_client.py` - Database operations

## Edge Cases

### Token Expired Mid-Request
1. API call returns 401
2. Trigger refresh flow
3. Update stored token
4. Retry original request
5. If refresh fails → mark expired, notify user

### User Revokes Access
- LinkedIn returns `invalid_grant` on refresh
- Mark connection as `revoked` in DB
- Notify user to reconnect

### Rate Limits
- Track remaining requests via headers
- Implement exponential backoff
- Queue requests if limit hit

### Multiple Connection Attempts
- Check for existing connection first
- If exists and valid → return success
- If exists and expired → trigger refresh
- Only create new if no valid connection

## Testing

```bash
# Test OAuth initiation
python execution/oauth/linkedin_flow.py initiate_auth test_user_123

# Test callback simulation
python execution/oauth/linkedin_flow.py handle_callback fake_code fake_state

# Test token refresh
python execution/oauth/linkedin_flow.py refresh_token fake_refresh_token

# Test profile fetch
python execution/oauth/linkedin_flow.py get_profile fake_access_token

# Test post (dry run)
python execution/oauth/linkedin_flow.py post_content fake_token "Hello World" --dry-run
```

## LinkedIn App Setup Checklist

- [ ] Create app at https://developer.linkedin.com/
- [ ] Add OAuth 2.0 redirect URLs
- [ ] Enable Marketing Developer Platform access
- [ ] Request `r_liteprofile` product permission
- [ ] Request `w_member_social` product permission
- [ ] Test in sandbox mode
- [ ] Submit for review (for production)

## References

- OAuth 2.0 docs: https://docs.microsoft.com/en-us/linkedin/shared/authentication/authorization-code-flow
- UGC Posts API: https://docs.microsoft.com/en-us/linkedin/marketing/integrations/community-management/shares/ugc-post-api
- Rate limits: https://docs.microsoft.com/en-us/linkedin/shared/api-guide/concepts/rate-limits
