# DOE Framework Integration for Nexus

## What I've Built

### Directives (SOPs)
- `directives/AGENT_OPERATING_MANUAL.md` - The full DOE framework spec
- `directives/README.md` - DOE integration guide for Nexus
- `directives/oauth_linkedin.md` - LinkedIn OAuth SOP
- `directives/oauth_twitter.md` - X/Twitter OAuth SOP

### Execution Scripts
- `execution/oauth/linkedin_flow.py` - LinkedIn OAuth handler (initiate, callback, refresh, post)
- `execution/oauth/twitter_flow.py` - X OAuth handler (initiate, callback, refresh, post)
- `execution/utils/supabase_client.py` - Database operations for platform connections

## How It Works

**When a user wants to connect LinkedIn:**

1. **Orchestration (me):**
   - Read `directives/oauth_linkedin.md`
   - Check if scripts exist ✓
   - Call `linkedin_flow.py --action=initiate --user_id={id}`
   - Store state/verifier temporarily
   - Redirect user to LinkedIn

2. **After LinkedIn callback:**
   - Call `linkedin_flow.py --action=callback --code={code} --verifier={stored}`
   - Get tokens
   - Call `supabase_client.py --action=store` to save connection
   - Update UI

3. **When posting:**
   - Call `supabase_client.py --action=get` to retrieve token
   - Call `linkedin_flow.py --action=post --access_token={token} --content={text}`
   - Return result to user

## Next Steps

### Immediate
1. Add remaining platform directives:
   - `directives/oauth_substack.md`
   - `directives/oauth_medium.md`
   - `directives/oauth_instagram.md`
   - `directives/oauth_tiktok.md`

2. Create corresponding execution scripts

3. Build Next.js API routes that orchestrate:
   - `/api/auth/[platform]/route.ts` - Initiates OAuth
   - `/api/auth/[platform]/callback/route.ts` - Handles callback
   - `/api/post/[platform]/route.ts` - Publishes content

### Environment Setup
```bash
# Add to .env
LINKEDIN_CLIENT_ID=xxx
LINKEDIN_CLIENT_SECRET=xxx
LINKEDIN_REDIRECT_URI=https://nexus.example.com/api/auth/linkedin/callback

TWITTER_CLIENT_ID=xxx
TWITTER_CLIENT_SECRET=xxx
TWITTER_REDIRECT_URI=https://nexus.example.com/api/auth/twitter/callback

SUPABASE_URL=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx
```

## Testing

```bash
# Test LinkedIn flow
cd execution/oauth
python linkedin_flow.py --action=initiate --user_id=test123 --dry-run

python linkedin_flow.py --action=post \
  --access_token=test_token \
  --content="Testing Nexus DOE framework" \
  --dry-run

# Test database
cd execution/utils
python supabase_client.py --action=list --user_id=test123
```

## Self-Annealing

When OAuth flows break:
1. Read error from execution script
2. Fix the script
3. Test with --dry-run
4. Update directive with new edge case
5. System is now stronger

---

**Status:** Phase 1 DOE infrastructure complete. Ready to scale to all platforms.
