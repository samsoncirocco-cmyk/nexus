# Directive: Deploy to Vercel

## Goal
Deploy Second Brain to production at https://brain.6eyes.dev

## When to Use
- After making code changes that need to go live
- When updating vault content that should be reflected in production
- When environment variables need updating

## Prerequisites
- Code committed and pushed to `main` branch
- Vercel CLI installed (`npm i -g vercel`) OR GitHub integration active
- Environment variables configured in Vercel dashboard
- Local build passes: `npm run build`

## Steps

### Option A: Automatic Deploy (Recommended)
1. Commit your changes:
   ```bash
   git add -A
   git commit -m "feat: your change description"
   git push origin main
   ```

2. Vercel auto-deploys from GitHub on push to `main`

3. Monitor deployment at https://vercel.com/dashboard

4. Check live site: https://brain.6eyes.dev

### Option B: Manual Deploy with CLI
1. Ensure you're in the project root:
   ```bash
   cd /home/samson/.openclaw/workspace/projects/second-brain
   ```

2. Run a production build locally first:
   ```bash
   npm run build
   ```

3. Fix any TypeScript/lint errors if the build fails

4. Deploy to production:
   ```bash
   vercel --prod
   ```

5. Confirm the deployment URL matches `brain.6eyes.dev`

### Environment Variables (Vercel Dashboard)
Navigate to: https://vercel.com/your-account/second-brain/settings/environment-variables

Required variables:
```
GEMINI_API_KEY=your_gemini_api_key
OPENCLAW_GATEWAY_URL=http://192.168.0.39:18789
OPENCLAW_API_KEY=$OPENCLAW_GATEWAY_TOKEN
NEXT_PUBLIC_APP_URL=https://brain.6eyes.dev
```

**Note**: Changing env vars requires a redeploy to take effect.

## Expected Output

### Successful Deployment
```
✓ Production deployment ready!
✓ Deployment URL: https://brain.6eyes.dev
✓ Build time: ~2-3 minutes
✓ All checks passed
```

### Vercel Dashboard
- ✅ Status: Ready
- ✅ Domains: brain.6eyes.dev
- ✅ Functions: 12 API routes deployed
- ✅ Build Output: Next.js optimized

### Live Site Check
1. Visit https://brain.6eyes.dev
2. Should load dashboard without errors
3. PIN auth should work (3437)
4. Vault content should be up-to-date

## Edge Cases

### Build Fails with TypeScript Errors
```bash
# Fix type errors locally first
npm run lint
npm run build

# Then deploy again
vercel --prod
```

### Environment Variable Missing
- Add via Vercel dashboard
- Trigger redeploy: `vercel --prod` or push to `main`

### Deployment Succeeds But Site Shows Old Version
- Clear browser cache: Cmd+Shift+R (macOS) or Ctrl+Shift+R (Windows)
- Check deployment logs for cache issues
- May take 1-2 minutes for CDN to propagate

### OpenClaw Gateway Unreachable in Production
**Expected behavior**: Gateway is on local network (192.168.0.39), unreachable from Vercel.

**Fallback**: App reads from `vault/agents.json` instead of live gateway.

**Solution**: This is by design. Live agent monitoring only works when running locally.

### Vault Content Not Updated
- Vault files are baked into the build
- Must redeploy after vault changes
- Alternatively: Load vault from external source (future enhancement)

### Domain Not Resolving
- Check Vercel domain settings
- Verify DNS records at registrar
- May take up to 48 hours for DNS propagation (rare)

## Cost
- **Time**: 2-5 minutes (build + deploy)
- **Vercel**: Free tier (sufficient for personal use)
- **API Calls**: None (Gemini calls happen on user requests, not deploy)

---

**Related Directives**:
- `local-dev-setup.md` — Run locally before deploying
- `vault-management.md` — Update content before deploy
- `agent-monitoring.md` — Understand agent limitations in production
