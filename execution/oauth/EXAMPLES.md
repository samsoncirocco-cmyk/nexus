# OAuth Framework Examples

## Adding a New Platform: Instagram

Here's exactly how to add Instagram OAuth support (10 lines of config):

### Step 1: Add to `platforms.yaml`

```yaml
platforms:
  # ... existing platforms ...
  
  instagram:
    name: "Instagram"
    enabled: true
    auth_url: "https://api.instagram.com/oauth/authorize"
    token_url: "https://api.instagram.com/oauth/access_token"
    api_base_url: "https://graph.instagram.com"
    pkce: false                    # Instagram doesn't support PKCE
    response_type: "code"
    scopes: ["user_profile", "user_media"]
    scope_separator: ","
    auth_method: "post_body"         # client_id/secret in POST body
    token_content_type: "form"
    env_prefix: "INSTAGRAM"
    default_token_lifetime: 5184000  # 60 days
```

### Step 2: Add Environment Variables

```bash
export INSTAGRAM_CLIENT_ID="your_app_id"
export INSTAGRAM_CLIENT_SECRET="your_app_secret"
export INSTAGRAM_REDIRECT_URI="http://localhost:3000/api/auth/instagram/callback"
```

### Step 3: Test

```bash
# Check it's enabled
python execution/oauth/oauth_flow.py --action list-platforms

# Should see: instagram: { enabled: true, ... }

# Test initiation
python execution/oauth/oauth_flow.py --platform instagram --action initiate --user_id test123

# Full flow
POST /api/auth/instagram
{ "user_id": "test123" }
```

That's it! No new code files, no route changes.

---

## Adding a New Platform: TikTok

```yaml
tiktok:
  name: "TikTok"
  enabled: true
  auth_url: "https://www.tiktok.com/v2/auth/authorize/"
  token_url: "https://open.tiktokapis.com/v2/oauth/token/"
  api_base_url: "https://open.tiktokapis.com/v2"
  pkce: true
  response_type: "code"
  scopes: ["user.info.basic", "video.publish"]
  scope_separator: ","
  auth_method: "basic_auth"          # TikTok uses Basic Auth
  token_content_type: "form"
  env_prefix: "TIKTOK"
  default_token_lifetime: 86400      # 24 hours
```

---

## Platform Config Patterns

### OAuth 2.0 + PKCE (Modern Standard)

Used by: LinkedIn, Twitter/X, TikTok

```yaml
pkce: true
auth_method: "basic_auth" or "post_body"
token_content_type: "form"
```

### OAuth 2.0 without PKCE (Legacy)

Used by: Instagram, Medium, older APIs

```yaml
pkce: false
auth_method: "post_body"
token_content_type: "form"
```

### OAuth 2.0 with JSON Token Endpoint

Used by: Some newer APIs

```yaml
auth_method: "post_body"
token_content_type: "json"
```

---

## Full Example: LinkedIn Config

```yaml
linkedin:
  name: "LinkedIn"
  enabled: true
  
  # Endpoints
  auth_url: "https://www.linkedin.com/oauth/v2/authorization"
  token_url: "https://www.linkedin.com/oauth/v2/accessToken"
  api_base_url: "https://api.linkedin.com/v2"
  
  # OAuth 2.0 + PKCE
  pkce: true
  response_type: "code"
  scopes:
    - "r_basicprofile"
    - "r_organization_social"
    - "w_member_social"
    - "r_member_social"
  scope_separator: " "
  
  # Token exchange: credentials in POST body
  auth_method: "post_body"
  token_content_type: "form"
  
  # LinkedIn-specific headers for API calls
  default_headers:
    X-Restli-Protocol-Version: "2.0.0"
  
  # Environment
  env_prefix: "LINKEDIN"
  
  # Token lasts 60 days
  default_token_lifetime: 5184000
```

---

## Environment Variable Patterns

| Platform | Required Env Vars |
|----------|-------------------|
| All | `{PREFIX}_CLIENT_ID` |
| All except PKCE-only | `{PREFIX}_CLIENT_SECRET` |
| All | `{PREFIX}_REDIRECT_URI` (optional, has default) |

Examples:
- `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET`, `LINKEDIN_REDIRECT_URI`
- `TWITTER_CLIENT_ID`, `TWITTER_CLIENT_SECRET`, `TWITTER_REDIRECT_URI`
- `INSTAGRAM_CLIENT_ID`, `INSTAGRAM_CLIENT_SECRET`

---

## Testing a New Platform

### 1. Validate Config

```bash
python oauth_flow.py --action list-platforms
```

Look for your platform with `enabled: true` and `has_credentials: true`.

### 2. Dry-Run Test

```bash
# Initiate
python oauth_flow.py --platform <your_platform> --action initiate \
    --user_id test --dry-run

# Callback
python oauth_flow.py --platform <your_platform> --action callback \
    --code test_code --state test_state --verifier test_verifier --dry-run

# Refresh
python oauth_flow.py --platform <your_platform> --action refresh \
    --refresh_token test_refresh --dry-run
```

### 3. Real Test

```bash
# 1. Initiate (returns auth_url)
python oauth_flow.py --platform <your_platform> --action initiate --user_id test123

# 2. Visit auth_url in browser, authorize

# 3. Exchange code (from callback URL)
python oauth_flow.py --platform <your_platform> --action callback \
    --code "CODE_FROM_URL" --state "STATE_FROM_URL" --verifier "VERIFIER_FROM_STEP_1"

# 4. You should get access_token!
```

---

## Common Platform Differences

| Platform | PKCE | Auth Method | Scope Sep | Notes |
|----------|------|-------------|-----------|-------|
| LinkedIn | Yes | post_body | space | Uses Restli protocol headers |
| Twitter/X | Yes | basic_auth | space | Short-lived tokens (2h) |
| Instagram | No | post_body | comma | Basic Display API |
| TikTok | Yes | basic_auth | comma | Video-specific scopes |
| Medium | No | post_body | comma | Long-lived tokens (1 year) |
| Substack | ? | ? | ? | Check their OAuth docs |

---

## Troubleshooting

### "Unknown platform"

Platform not in `platforms.yaml` or `enabled: false`.

### "Missing CLIENT_ID"

Environment variable not set. Check `{PREFIX}_CLIENT_ID`.

### "401 Unauthorized" during token exchange

Usually means wrong `auth_method`:
- Try `basic_auth` if using `post_body`
- Try `post_body` if using `basic_auth`
- Check `client_secret` is correct

### "Invalid code_verifier"

PKCE mismatch. Make sure you're using the same verifier from the initiate step.

### "Invalid scope"

Check `scope_separator` - some platforms use spaces, some use commas.
