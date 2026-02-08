# Directive: AI Ask (Gemini-Powered Q&A)

## Goal
Understand and work with the `/ask` AI agent that answers natural language questions using vault context

## When to Use
- User asks a question about accounts, deals, projects, or knowledge in the vault
- Need to synthesize information across multiple vault documents
- Want AI-powered insights based on stored knowledge
- Testing or debugging the AI Q&A feature

## Prerequisites
- `GEMINI_API_KEY` environment variable set
- Vault populated with markdown documents
- App running locally or deployed

## Steps

### Using the Ask Feature (End User)

1. **Navigate to /ask** in the browser:
   ```
   http://localhost:3000/ask
   # or
   https://brain.6eyes.dev/ask
   ```

2. **Type a question** in natural language:
   - "What do we know about OHSU?"
   - "Summarize all E-Rate leads in Oregon"
   - "What's our sales methodology for healthcare accounts?"
   - "Show me all active projects"

3. **Submit the question** and wait for response (typically 2-5 seconds)

4. **Review the answer** — it will include:
   - Natural language response
   - Citations to source documents (e.g., `[accounts/ohsu.md]`)
   - Clickable links to cited documents

### How It Works (Architecture)

**Request Flow**:
```
User Question
    ↓
POST /api/ask { question }
    ↓
1. Load vault context (buildVaultContext)
2. Build prompt with system instructions + vault content
3. Send to Gemini 2.0 Flash
4. Parse response for citations
5. Return { answer, sources }
    ↓
UI displays answer + linked sources
```

**Code Location**: `src/app/api/ask/route.ts`

**Key Functions**:
- `buildVaultContext()` — Loads all markdown docs from vault
- `POST /api/ask` — Handles question, calls Gemini, returns answer

### Customizing the System Prompt

**Current Prompt** (in `src/app/api/ask/route.ts`):
```typescript
const SYSTEM_PROMPT = `You are the Second Brain AI assistant for Samson Cirocco.

You have access to his personal knowledge vault containing accounts, deals, 
projects, concepts, journal entries, E-Rate leads, competitive intel, and 
sales playbooks.

RULES:
- Answer questions based on the vault content. Cite which documents you're 
  referencing by their file path.
- If the information isn't in the vault, say so clearly. Don't make things up.
- Be concise and direct. No corporate fluff.
- When referencing documents, format citations as [document-path] so the UI 
  can link them.
- For questions about deals, accounts, or pipeline: reference the relevant 
  vault docs.
- For questions about concepts or strategies: synthesize from the relevant 
  playbooks and frameworks.
- You can cross-reference multiple documents to give comprehensive answers.`;
```

**To modify**:
1. Edit `src/app/api/ask/route.ts`
2. Update `SYSTEM_PROMPT` constant
3. Test locally
4. Deploy

### Testing the Ask API Directly

**Using curl**:
```bash
curl -X POST http://localhost:3000/api/ask \
  -H "Content-Type: application/json" \
  -d '{"question": "What accounts are in Oregon?"}'
```

**Expected Response**:
```json
{
  "answer": "Based on the vault, there are several Oregon accounts:\n\n1. **OHSU** [accounts/ohsu.md] - Oregon Health Sciences University...\n2. **Portland Public Schools** [accounts/portland-schools.md] - ...",
  "sources": [
    "accounts/ohsu.md",
    "accounts/portland-schools.md"
  ]
}
```

### Debugging Issues

#### No Answer / Empty Response
**Cause**: Gemini API key missing or invalid

**Solution**:
```bash
# Check env var
echo $GEMINI_API_KEY

# Set in .env.local
GEMINI_API_KEY=your_actual_key

# Restart dev server
npm run dev
```

#### Answer Says "Not in Vault" But It Is
**Cause**: Vault context not loading properly or document missing frontmatter

**Solution**:
1. Verify document has valid YAML frontmatter
2. Check `buildVaultContext()` output:
   ```typescript
   // In src/app/api/ask/route.ts, add logging:
   const { context, docNames } = buildVaultContext();
   console.log('Loaded docs:', docNames);
   ```

3. Restart server to rebuild vault index

#### Citations Not Linking
**Cause**: Document path format doesn't match expected pattern

**Solution**: Ensure citations follow `[path/to/doc.md]` format

The UI extracts citations using regex: `/\[([^\]]+\.md)\]/g`

#### Slow Response (>10 seconds)
**Cause**: Large vault context exceeds token limits

**Solution**:
1. Check token usage in Gemini dashboard
2. Reduce vault size by archiving old documents
3. Implement semantic search to filter context (future enhancement)

Current model: `gemini-2.0-flash` (fast, cheap)
Alternative: `gemini-2.0-flash-thinking-exp` (slower, better reasoning)

### Improving Answer Quality

**Strategies**:
1. **Better vault docs** — More structured, detailed markdown
2. **Rich frontmatter** — Add more metadata tags
3. **Cross-references** — Link related docs with `[See also](./other.md)`
4. **System prompt tuning** — Adjust instructions for tone/style
5. **Few-shot examples** — Add example Q&A pairs to prompt

**Example Enhancement** (add to system prompt):
```typescript
const SYSTEM_PROMPT = `...

EXAMPLES:
Q: "What's our approach to E-Rate sales?"
A: Based on [concepts/erate-playbook.md], our approach includes...

Q: "Who's the CIO at OHSU?"
A: According to [accounts/ohsu.md], the CIO is Jane Smith (jane.smith@ohsu.edu).

Now answer the user's question:`;
```

### Cost Tracking

**Gemini 2.0 Flash Pricing** (as of Feb 2026):
- Input: $0.075 per 1M tokens
- Output: $0.30 per 1M tokens

**Typical Ask Query**:
- Vault context: ~20,000 tokens (all docs)
- Question: ~50 tokens
- Answer: ~500 tokens
- **Cost per query**: ~$0.0002 (effectively free)

**Monthly estimate** (100 queries/day):
- 3,000 queries/month
- ~$0.60/month total

**To implement cost tracking**:
1. Log token usage from Gemini response
2. Store in `vault/activity.json` or BigQuery
3. Display in `/analytics` dashboard

## Expected Output

### Successful Query
```
User: "What do we know about OHSU?"

AI Response:
"Based on the vault, OHSU is Oregon Health Sciences University 
[accounts/ohsu.md], the state's only academic health center with 
3,000+ students and 18,000+ employees. There's a network upgrade 
project planned for Q3 2026 [accounts/ohsu.md]. The CIO is Jane Smith."

Sources:
- accounts/ohsu.md

Time: 2.3 seconds
Cost: ~$0.0002
```

### Query with No Relevant Info
```
User: "What's the weather in Portland?"

AI Response:
"I don't have weather information in the vault. The vault contains 
accounts, projects, and knowledge documents, but not real-time data 
like weather."

Sources: []
```

## Edge Cases

### Question Exceeds Token Limit
**Rare**: Gemini 2.0 Flash supports 1M token context

**Mitigation**: Implement semantic search to filter vault before sending to AI

### Sensitive Information in Vault
**Risk**: All vault content is sent to Gemini

**Solution**:
- Don't store passwords/keys in vault docs
- Use `.env` for secrets
- Consider local LLM for truly sensitive data

### Rate Limiting
**Gemini Free Tier**: 15 requests/minute

**Solution**:
- Implement client-side debouncing
- Add loading state to prevent spam
- Upgrade to paid tier if needed

### Stale Vault Context
**Problem**: New docs not reflected in answers

**Solution**: Vault context is loaded fresh on each request (no caching)

If implementing caching in future:
- Invalidate cache on vault file changes
- Max cache age: 5 minutes

## Cost
- **Time**: 2-5 seconds per query
- **Tokens**: ~20,500 input + ~500 output per query
- **Money**: ~$0.0002 per query (effectively free)
- **Gemini Quota**: 15 requests/min (free tier)

---

**Related Directives**:
- `vault-management.md` — Create better source documents
- `knowledge-graph.md` — Alternative way to explore vault
- `bigquery-memory.md` — Log queries for analytics
