# OAuth Abstraction Framework - Architecture

## Design Principles

1. **Configuration over Code**: Adding a platform requires only YAML config, not new Python/TypeScript code
2. **Single Source of Truth**: One Python script handles all OAuth flows via runtime configuration
3. **PKCE by Default**: Modern OAuth security (PKCE) enabled for all platforms that support it
4. **Minimal Boilerplate**: Next.js routes are generic and handle any configured platform

## Flow Architecture

### 1. Initiate OAuth Flow

```
User → Next.js /api/auth/[platform] → oauth_flow.py --action initiate
                                           ↓
                                   Load platforms.yaml
                                   Generate state + PKCE
                                   Build auth URL
                                           ↓
                                    Return auth_url
                                           ↓
                              Redirect user to provider
```

### 2. Handle Callback

```
Provider → /api/auth/[platform]/callback?code=X&state=Y
                    ↓
            oauth_flow.py --action callback
                    ↓
            Exchange code for tokens
                    ↓
            Return tokens → Store in DB → Redirect to app
```

### 3. Refresh Token

```
App → /api/auth/[platform]/refresh (refresh_token in body)
              ↓
      oauth_flow.py --action refresh
              ↓
      Get new access_token
              ↓
      Return tokens → Update in DB
```

## Component Breakdown

### `oauth_flow.py` - The Engine

```python
def initiate_oauth(platform, user_id):
    config = load_platform_config(platform)      # From YAML
    env = get_env_vars(config)                   # From environment
    state, pkce = generate_security_params(config)
    auth_url = build_auth_url(config, env, state, pkce)
    return {auth_url, state, pkce_verifier}

def exchange_code(platform, code, state, verifier):
    config = load_platform_config(platform)
    env = get_env_vars(config)
    headers = build_token_headers(config, env)  # basic_auth vs post_body
    payload = build_token_payload(config, env, code, verifier)
    response = requests.post(config['token_url'], headers, payload)
    return parse_token_response(response, config)
```

**Key abstraction**: All platform differences are handled by `build_token_headers()` and `build_token_payload()` which use the `auth_method` config:

- `basic_auth`: Adds `Authorization: Basic {base64(client_id:secret)}`
- `post_body`: Adds `client_id` and `client_secret` to POST body
- `none`: No client authentication (PKCE-only)

### `platforms.yaml` - The Configuration

```yaml
platforms:
  linkedin:
    name: "LinkedIn"
    enabled: true
    
    # OAuth endpoints
    auth_url: "..."
    token_url: "..."
    api_base_url: "..."
    
    # Security settings
    pkce: true
    response_type: "code"
    scopes: [...]
    scope_separator: " "
    
    # Token exchange method
    auth_method: "post_body"      # ← Controls how we authenticate to token endpoint
    token_content_type: "form"    # ← Controls request body format
    
    # Environment
    env_prefix: "LINKEDIN"
    default_token_lifetime: 5184000
    
    # API extras
    default_headers:
      X-Restli-Protocol-Version: "2.0.0"
```

### Next.js Routes - The Interface

All three route files are identical except for their path segment `[platform]`. They:

1. Parse request parameters (body/query)
2. Call `oauth_flow.py` with appropriate `--action`
3. Return JSON response or redirect

```typescript
// All routes follow this pattern:
const platform = params.platform;        // From URL: /api/auth/[platform]/...
const result = await runOAuthFlow(
  platform,
  action,                                  // 'initiate' | 'callback' | 'refresh'
  args                                     // Platform-agnostic args
);
```

## Data Flow

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Request   │───▶│  Next.js    │───▶│   Python    │───▶│   OAuth     │
│   (HTTP)    │    │   Route     │    │   Script    │    │   Provider  │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
                          │                  │                  │
                          ▼                  ▼                  ▼
                   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
                   │   URL       │    │  platforms  │    │  Token/     │
                   │   params    │    │   .yaml     │    │  Auth URL   │
                   └─────────────┘    └─────────────┘    └─────────────┘
```

## Extensibility Points

### Adding New Auth Methods

To support a new token authentication method (e.g., JWT client assertions):

1. Add new value to `auth_method` enum in `platforms.yaml`
2. Add handler in `build_token_headers()`:

```python
if auth_method == 'jwt_assertion':
    jwt = generate_client_jwt(env_vars['client_id'], env_vars['client_secret'])
    headers['Authorization'] = f'Bearer {jwt}'
```

### Adding Platform-Specific API Actions

The `make_api_request()` function provides generic API access. For platform-specific actions:

```python
# In a new file: platform_actions.py
def post_to_linkedin(access_token, content):
    config = load_platform_config('linkedin')
    # LinkedIn-specific payload structure
    payload = build_linkedin_payload(content)
    return make_api_request('linkedin', access_token, '/ugcPosts', 'POST', payload)
```

## Security Model

### PKCE (Proof Key for Code Exchange)

```
Client                          Server                    Provider
   │                              │                          │
   │  1. Initiate                 │                          │
   │─────────────────────────────▶│  Generate PKCE          │
   │                              │  (verifier + challenge)   │
   │  2. Return auth_url          │                          │
   │◀─────────────────────────────│                          │
   │                              │                          │
   │  3. Redirect to Provider     │                          │
   │───────────────────────────────────────────────────────▶│
   │                              │                          │
   │  4. Callback with code     │                          │
   │◀───────────────────────────────────────────────────────│
   │                              │  Send code + verifier    │
   │  5. Exchange for token       │─────────────────────────▶│
   │─────────────────────────────▶│                          │
   │                              │  Return tokens           │
   │  6. Return tokens            │◀─────────────────────────│
   │◀─────────────────────────────│                          │
```

PKCE prevents authorization code interception attacks. The `code_challenge` is sent during authorization, and `code_verifier` is required to exchange the code.

### State Parameter

State prevents CSRF attacks:
- Generated server-side during initiation
- Returned by provider in callback
- Must match stored state
- Linked to user session

## Error Handling Strategy

All errors follow this structure:

```typescript
interface OAuthError {
  error: 'http_error' | 'config_error' | 'validation_error' | 'unexpected_error';
  status_code?: number;           // For HTTP errors
  message: string;                  // Human-readable
  response?: string;                // Provider error response (if available)
  platform?: string;                // Which platform failed
}
```

## Testing Strategy

### Unit Testing

Test individual functions with mock configs:

```python
def test_build_auth_url():
    config = {
        'auth_url': 'https://example.com/auth',
        'scopes': ['read', 'write'],
        'scope_separator': ' ',
        'pkce': True,
        'response_type': 'code'
    }
    env = {'client_id': 'test123', 'redirect_uri': 'http://localhost/callback'}
    url = build_auth_url(config, env, 'state123', {'challenge': 'abc', 'method': 'S256'})
    assert 'code_challenge=abc' in url
```

### Integration Testing

Use `--dry-run` mode to test flows without API calls:

```bash
# Test full flow for a platform
python oauth_flow.py --platform linkedin --action initiate --user_id test --dry-run
python oauth_flow.py --platform linkedin --action callback --code test --state test --verifier test --dry-run
python oauth_flow.py --platform linkedin --action refresh --refresh_token test --dry-run
```

## Performance Considerations

1. **Config Loading**: `platforms.yaml` is re-read on each request. For high traffic, consider caching.
2. **Process Spawning**: Next.js routes spawn Python processes. For production, consider:
   - Running Python as a persistent service
   - Using a Node.js OAuth library for the hot path
   - Caching tokens aggressively

## Future Enhancements

1. **Platform-Specific Post Handlers**: Abstract content posting with platform-aware formatting
2. **Token Refresh Automation**: Background job to refresh tokens before expiration
3. **Webhook Support**: Handle provider webhooks for token revocation, etc.
4. **Multi-Account Support**: Connect multiple accounts per platform per user

## Migration Path

Existing platform-specific files (`linkedin_flow.py`, `twitter_flow.py`) can be phased out:

1. Phase 1: Dual-run (run both, compare results)
2. Phase 2: Switch to generic (update callers)
3. Phase 3: Remove legacy files

Keep the legacy files as reference implementations for edge cases.
