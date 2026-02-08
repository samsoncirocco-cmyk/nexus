# Substack API Integration

## Goal
Connect user Substack accounts to Nexus for newsletter publishing and subscriber analytics.

## Inputs
- `user_id` (from Supabase auth)
- `api_key` (Substack API key)
- `publication_url` (user's Substack publication)

## Tools/Scripts
- `execution/oauth/substack_flow.py` - API key management and operations
- `execution/utils/supabase_client.py` - Database operations

## Outputs
- API key stored encrypted in `platform_connections`
- Connection status in dashboard
- Error logs on failure

## Flow

### 1. Connect Account
```
User clicks "Connect Substack"
→ Modal prompts for API key and publication URL
→ API route calls substack_flow.py --action=connect --user_id={id} --api_key={key} --url={url}
→ Script validates key by calling /user endpoint
→ Stores encrypted key in platform_connections
→ Updates dashboard
```

### 2. Validate Key
```
Periodic validation or pre-flight check
→ substack_flow.py --action=validate --user_id={id}
→ Calls /user endpoint
→ Returns connection status
```

### 3. Publish Post
```
User creates newsletter content
→ API calls substack_flow.py --action=publish --user_id={id} --title={title} --content={html}
→ Script retrieves key from DB, decrypts
→ POST to Substack API
→ Returns post URL and subscriber count
```

### 4. Get Subscriber Stats
```
Analytics refresh
→ substack_flow.py --action=stats --user_id={id}
→ GET /subscriber endpoint
→ Returns subscriber counts and engagement
```

## Edge Cases

### API Key Permissions
- Substack API keys have limited scopes
- Some operations require manual newsletter sending
- Check permissions before operations
- Handle 403 errors gracefully

### Draft vs Publish
- Substack allows draft creation
- Separate API calls for draft and publish
- User can review before sending to subscribers

### Rate Limits
- Substack: Not publicly documented
- Assume conservative limits: 100 req/hour
- Implement exponential backoff on 429 errors

### Publication URL Format
- Must be valid Substack domain (e.g., https://user.substack.com)
- Extract publication slug from URL
- Validate before storing

## Substack API Requirements

**Authentication:**
- API Key in Authorization header: `Authorization: Token {api_key}`
- No OAuth flow - direct key management

**API Endpoints:**
- Get User: `GET https://substack.com/api/v1/user`
- Get Publications: `GET https://substack.com/api/v1/publications`
- Get Publication: `GET https://{publication}.substack.com/api/v1/publication`
- Get Posts: `GET https://{publication}.substack.com/api/v1/posts`
- Create Post: `POST https://{publication}.substack.com/api/v1/posts`
- Get Subscribers: `GET https://{publication}.substack.com/api/v1/subscribers`

**App Setup:**
1. Go to Substack Settings → Account
2. Scroll to API section
3. Generate API key
4. Copy key and publication URL

**Post Creation Format:**
```json
{
  "title": "Newsletter Title",
  "body": "HTML content here...",
  "draft": false,
  "send": true,
  "publish_on_web": true,
  "email_subject": "Subject line (optional)"
}
```

## Environment Variables
```
# No special OAuth vars needed
# API keys stored encrypted in database
ENCRYPTION_KEY=xxx  # For encrypting stored API keys
```

## Database Schema
Uses `platform_connections` table with `connection_type='api_key'`:
```sql
INSERT INTO platform_connections (
  user_id, 
  platform, 
  connection_type,
  api_key_encrypted,  -- Encrypted API key
  publication_url,
  connection_status
) VALUES (...)
```

## Testing
```bash
# Test connection
python execution/oauth/substack_flow.py --action=connect --user_id=test --api_key=xxx --url=https://test.substack.com --dry-run

# Test validation
python execution/oauth/substack_flow.py --action=validate --user_id=test --dry-run

# Test publish
python execution/oauth/substack_flow.py --action=publish --user_id=test --title="Test" --content="Hello" --dry-run
```

## Learnings / Updates
- [ ] Substack API is not officially documented publicly
- [ ] API keys are permanent until manually revoked
- [ ] Some endpoints reverse-engineered from web app
- [ ] Newsletter sending may require manual confirmation in some cases
- [ ] Substack API does not support scheduling (must use web app)
- [ ] Subscriber data is limited compared to web dashboard
