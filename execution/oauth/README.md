# Nexus OAuth Abstraction Framework

**Adding a new OAuth platform = 10 lines of config, not 200+ lines of code.**

This framework provides a configuration-driven OAuth 2.0 + PKCE implementation that works with any supported platform. No code changes required to add new platforms—just add their configuration to `platforms.yaml`.

## Quick Start

### 1. Set up environment variables

```bash
# LinkedIn
export LINKEDIN_CLIENT_ID="your_client_id"
export LINKEDIN_CLIENT_SECRET="your_client_secret"
export LINKEDIN_REDIRECT_URI="http://localhost:3000/api/auth/linkedin/callback"

# X/Twitter
export TWITTER_CLIENT_ID="your_client_id"
export TWITTER_CLIENT_SECRET="your_client_secret"
export TWITTER_REDIRECT_URI="http://localhost:3000/api/auth/twitter/callback"
```

### 2. Initiate OAuth flow (CLI)

```bash
python execution/oauth/oauth_flow.py --platform linkedin --action initiate --user_id user123
```

### 3. Exchange code for token (CLI)

```bash
python execution/oauth/oauth_flow.py --platform linkedin --action callback \
    --code AUTH_CODE --state STATE --verifier PKCE_VERIFIER
```

### 4. Use the Next.js API routes

```bash
# Initiate
POST /api/auth/linkedin
{ "user_id": "user123" }

# Callback (automatic)
GET /api/auth/linkedin/callback?code=XXX&state=YYY

# Refresh token
POST /api/auth/linkedin/refresh
{ "refresh_token": "..." }
```

## Adding a New Platform

To add a new OAuth platform (Substack, Medium, Instagram, TikTok, etc.):

### Step 1: Add 10 lines to `platforms.yaml`

```yaml
platforms:
  # ... existing platforms ...
  
  substack:
    name: "Substack"
    enabled: true
    auth_url: "https://substack.com/oauth2/authorize"
    token_url: "https://substack.com/oauth2/token"
    api_base_url: "https://api.substack.com/v1"
    pkce: true
    response_type: "code"
    scopes: ["publish", "read"]
    scope_separator: " "
    auth_method: "basic_auth"  # or "post_body", "none"
    token_content_type: "form"  # or "json"
    env_prefix: "SUBSTACK"
    default_token_lifetime: 3600
```

### Step 2: Add environment variables

```bash
export SUBSTACK_CLIENT_ID="your_client_id"
export SUBSTACK_CLIENT_SECRET="your_client_secret"
export SUBSTACK_REDIRECT_URI="http://localhost:3000/api/auth/substack/callback"
```

### Step 3: Done! 🎉

The platform is now available at:
- `POST /api/auth/substack` - Initiate OAuth
- `GET /api/auth/substack/callback` - Handle callback
- `POST /api/auth/substack/refresh` - Refresh token

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Next.js API   │────▶│  oauth_flow.py   │────▶│  platforms.yaml │
│     Routes      │     │  (Generic OAuth) │     │   (Platform     │
│                 │     │                  │     │   Config)       │
│ /api/auth/[p]   │     │  • PKCE gen      │     │                 │
│ /callback       │     │  • Token exchange│     │ • Auth URLs     │
│ /refresh        │     │  • Refresh       │     │ • Scopes        │
│                 │     │  • API calls     │     │ • Auth methods  │
└─────────────────┘     └──────────────────┘     └─────────────────┘
        │                                               │
        │                                               │
        ▼                                               ▼
┌─────────────────┐                          ┌─────────────────┐
│  OAuth Provider │                          │  Environment    │
│  (LinkedIn, X,  │                          │  Variables      │
│   etc.)         │                          │  (CLIENT_ID,    │
│                 │                          │   SECRET, etc.) │
└─────────────────┘                          └─────────────────┘
```

### Key Components

| File | Purpose |
|------|---------|
| `oauth_flow.py` | Generic OAuth handler - no platform-specific code |
| `platforms.yaml` | Platform configurations - the ONLY file to edit for new platforms |
| `api/auth/[platform]/route.ts` | Next.js route for OAuth initiation |
| `api/auth/[platform]/callback/route.ts` | Next.js route for OAuth callback |
| `api/auth/[platform]/refresh/route.ts` | Next.js route for token refresh |

## Configuration Reference

### Platform Config Options

```yaml
platforms:
  <platform_key>:
    # Display name
    name: "Platform Name"
    
    # Enable/disable this platform
    enabled: true
    
    # OAuth endpoints
    auth_url: "https://.../authorize"
    token_url: "https://.../token"
    api_base_url: "https://.../api"
    
    # OAuth settings
    pkce: true                    # Use PKCE (recommended)
    response_type: "code"         # OAuth response type
    scopes: ["scope1", "scope2"]  # Requested scopes
    scope_separator: " "          # " " or ","
    
    # Token exchange auth method
    auth_method: "basic_auth"     # Options:
                                  # - "basic_auth": Base64(client_id:secret) header
                                  # - "post_body": client_id/secret in POST body
                                  # - "none": PKCE only, no client auth
    
    # Token endpoint content type
    token_content_type: "form"     # Options: "form", "json"
    
    # Environment variable prefix
    env_prefix: "PLATFORM"        # Looks for {PREFIX}_CLIENT_ID, etc.
    
    # Default token lifetime (seconds)
    default_token_lifetime: 3600
    
    # Optional: Default headers for API calls
    default_headers:
      X-Custom-Header: "value"
    
    # Optional: API endpoint paths
    endpoints:
      profile: "/me"
      post: "/posts"
```

## Supported Auth Methods

| Method | Description | Example Platforms |
|--------|-------------|-------------------|
| `basic_auth` | Base64(client_id:secret) in Authorization header | Twitter/X, TikTok |
| `post_body` | client_id and client_secret in POST body | LinkedIn, Instagram |
| `none` | PKCE only, no client authentication | Some mobile apps |

## Error Handling

The framework provides consistent error responses:

```json
{
  "error": "http_error",
  "status_code": 401,
  "message": "Unauthorized",
  "response": "..."
}
```

## Security Notes

1. **State Parameter**: Always validated in callback
2. **PKCE**: Enabled by default for all platforms that support it
3. **Token Storage**: Store tokens securely (database/Redis), never in client-side storage
4. **PKCE Verifier**: Store server-side keyed by state, never expose in URLs

## Migration from Legacy Flows

If you have existing platform-specific flows (like `linkedin_flow.py`):

1. Verify the new generic flow works:
   ```bash
   python oauth_flow.py --platform linkedin --action list-platforms
   ```

2. Update your code to use the generic handler:
   - Replace: `python linkedin_flow.py --action initiate ...`
   - With: `python oauth_flow.py --platform linkedin --action initiate ...`

3. Once verified, you can remove the legacy files:
   - `linkedin_flow.py` (keep as reference)
   - `twitter_flow.py` (keep as reference)

## Testing

### Dry Run Mode

Test without making actual API calls:

```bash
python oauth_flow.py --platform linkedin --action initiate --user_id test --dry-run
```

### List Available Platforms

```bash
python oauth_flow.py --action list-platforms
```

## Examples

See `platforms.yaml` for working LinkedIn and X/Twitter configurations.

## License

Part of the Nexus project.
