# Medium OAuth Integration

## Goal
Connect user Medium accounts to Nexus for blog post publishing.

## Inputs
- `user_id` (from Supabase auth)
- `redirect_uri` (OAuth callback URL)
- `scopes` (permissions: basicProfile, listPublications, publishPost)

## Tools/Scripts
- `execution/oauth/medium_flow.py` - OAuth 2.0 flow handler
- `execution/oauth/token_refresh.py` - Token refresh
- `execution/utils/supabase_client.py` - Database operations

## Outputs
- OAuth 2.0 tokens stored in `platform_connections`
- Connection status in dashboard
- Error logs on failure

## Flow

### 1. Initiate OAuth 2.0
```
User clicks "Connect Medium"
→ API route calls medium_flow.py --action=initiate --user_id={id}
→ Script generates OAuth 2.0 URL
→ Redirects to Medium authorization screen
```

### 2. Handle Callback
```
Medium redirects to /api/auth/medium/callback?code={code}&state={state}
→ API route calls medium_flow.py --action=callback --code={code}
→ Exchanges code for access_token
→ Stores in platform_connections
→ Updates dashboard
```

### 3. Post Content
```
User creates adapted content for Medium
→ API calls medium_flow.py --action=post --user_id={id} --content={text} --title={title}
→ Script retrieves token from DB
→ Posts to Medium API
→ Returns post_id and URL
```

## Edge Cases

### Post Content Formatting
- Medium uses HTML format for post content
- Convert markdown to HTML before posting
- Handle images via URL references

### Publication vs Personal Profile
- User may want to post to publication (org) vs personal
- Query publications list first
- Allow selection of target publication

### Rate Limits
- Medium: 100 posts/day per user
- 10 req/minute for write operations
- Implement basic throttling

### Duplicate Posts
- Medium does not allow identical content duplicates
- Hash content and check before posting
- Add timestamp suffix if needed

## Medium API Requirements

**OAuth 2.0 Scopes:**
- `basicProfile` - Read user profile info
- `listPublications` - List user's publications
- `publishPost` - Publish posts under user's name

**API Endpoints:**
- Authorization: `https://medium.com/m/oauth/authorize`
- Token Exchange: `https://api.medium.com/v1/tokens`
- Get User: `GET https://api.medium.com/v1/me`
- Get Publications: `GET https://api.medium.com/v1/users/{userId}/publications`
- Create Post: `POST https://api.medium.com/v1/users/{userId}/posts`
- Create Publication Post: `POST https://api.medium.com/v1/publications/{publicationId}/posts`

**App Setup:**
1. Create app at https://medium.com/me/applications
2. Get client_id and client_secret
3. Add OAuth 2.0 redirect URLs
4. Request publish permissions

**Post Format:**
```json
{
  "title": "Post Title",
  "contentFormat": "html",
  "content": "<p>Post body in HTML</p>",
  "tags": ["tag1", "tag2"],
  "publishStatus": "public|draft",
  "notifyFollowers": true
}
```

## Environment Variables
```
MEDIUM_CLIENT_ID=xxx
MEDIUM_CLIENT_SECRET=xxx
MEDIUM_REDIRECT_URI=https://nexus.example.com/api/auth/medium/callback
```

## Database Schema
Same `platform_connections` table as other platforms.

## Testing
```bash
python execution/oauth/medium_flow.py --action=initiate --dry-run
python execution/oauth/medium_flow.py --action=post --user_id=test --title="Test" --content="Hello" --dry-run
```

## Learnings / Updates
- [ ] Medium OAuth tokens do not expire (no refresh needed)
- [ ] Posts can be published as draft first
- [ ] Image uploads require separate hosting (Medium fetches from URL)
- [ ] Publications require separate permission scope
