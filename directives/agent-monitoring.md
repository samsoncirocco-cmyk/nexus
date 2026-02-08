# Directive: Agent Monitoring

## Goal
Monitor active agents via the `/agents` page and understand how agent status is tracked

## When to Use
- Checking which agents are currently running
- Viewing agent status, model, cost, and current task
- Debugging agent behavior or stuck sessions
- Understanding agent lifecycle in Second Brain

## Prerequisites
- OpenClaw Gateway running at `http://192.168.0.39:18789` (local dev)
- OR `vault/agents.json` populated (production fallback)
- Understanding of OpenClaw session model

## Steps

### Viewing Active Agents (UI)

1. **Navigate to `/agents`** in the browser:
   ```
   http://localhost:3000/agents
   # or
   https://brain.6eyes.dev/agents
   ```

2. **Agent cards show**:
   - Session ID
   - Agent type (main, subagent, skill)
   - Model (claude-sonnet-4, gemini-2.0-flash, etc.)
   - Status (active, idle, completed)
   - Token usage (input/output/total)
   - Estimated cost
   - Uptime / last activity
   - Current task (if available)

3. **Refresh** to get latest status (future: auto-refresh via WebSocket)

### How Agent Data is Fetched

**Request Flow**:
```
GET /api/agents
    ↓
Check if OpenClaw Gateway is reachable
    ↓
YES: POST /api/gateway { action: 'enriched' }
    ↓
Fetch live sessions from gateway
Merge with local agent registry (vault/agents.json)
    ↓
NO: Read vault/agents.json (fallback)
    ↓
Return agent list
```

**Code Locations**:
- `src/app/api/agents/route.ts` — API endpoint
- `src/lib/gateway.ts` — Gateway client (`getEnrichedSessions`)
- `vault/agents.json` — Local agent registry

### Agent Data Schema

**From OpenClaw Gateway**:
```typescript
{
  "key": "agent:main:main",
  "sessionId": "abc123-def456",
  "kind": "agent",
  "model": "anthropic/claude-sonnet-4",
  "updatedAt": 1707350400000,  // Unix timestamp
  "ageMs": 120000,  // Age in milliseconds
  "inputTokens": 25000,
  "outputTokens": 5000,
  "totalTokens": 30000,
  "contextTokens": 20000,
  "systemSent": true,
  "abortedLastRun": false
}
```

**From vault/agents.json** (local registry):
```json
{
  "agents": [
    {
      "id": "claude-researcher",
      "name": "Research Agent",
      "type": "researcher",
      "model": "claude-sonnet-4",
      "status": "active",
      "currentTask": "Research OHSU network requirements",
      "spawnedAt": "2026-02-08T00:00:00.000Z"
    }
  ]
}
```

**Merged (enriched) view**:
```typescript
{
  "id": "claude-researcher",
  "name": "Research Agent",
  "sessionId": "abc123-def456",
  "model": "claude-sonnet-4",
  "status": "active",
  "currentTask": "Research OHSU network requirements",
  "inputTokens": 25000,
  "outputTokens": 5000,
  "totalTokens": 30000,
  "estimatedCost": 0.015,  // $0.015
  "uptime": 120000,  // 2 minutes
  "lastActivity": "2026-02-08T00:02:00.000Z"
}
```

### Checking Gateway Status

**Test gateway reachability**:
```bash
curl http://192.168.0.39:18789/status
```

**Expected Response**:
```json
{
  "status": "ok",
  "uptime": 86400000,
  "activeSessions": 3
}
```

**If unreachable**: Second Brain falls back to `vault/agents.json`

### Spawning a New Agent (via Gateway Bridge)

**Using the UI**:
1. Open Command Bar (`⌘K`)
2. Type command: "Research OHSU network requirements"
3. Select agent type (researcher, writer, etc.)
4. Agent spawns via `/api/gateway` → `action: 'spawn'`

**Using the API**:
```bash
curl -X POST http://localhost:3000/api/gateway \
  -H "Content-Type: application/json" \
  -d '{
    "action": "spawn",
    "message": "Research OHSU network requirements and compile a report",
    "agent": "researcher",
    "thinking": "low",
    "timeout": 300000
  }'
```

**Response**:
```json
{
  "sessionId": "agent:main:subagent:abc123-def456",
  "status": "spawned",
  "message": "Agent spawned successfully"
}
```

### Sending Messages to an Agent

**POST /api/gateway** with `action: 'send'`:
```bash
curl -X POST http://localhost:3000/api/gateway \
  -H "Content-Type: application/json" \
  -d '{
    "action": "send",
    "sessionId": "agent:main:subagent:abc123-def456",
    "message": "What have you found so far?",
    "thinking": "low",
    "timeout": 60000
  }'
```

### Understanding Agent Status

**Status Values**:
- `active` — Currently processing a task
- `idle` — Waiting for input
- `completed` — Task finished, session may close soon
- `error` — Encountered an error
- `blocked` — Waiting on external dependency

**Detecting Stuck Agents**:
```typescript
// Agent hasn't updated in >5 minutes
const STUCK_THRESHOLD = 5 * 60 * 1000;
const isStuck = (Date.now() - agent.updatedAt) > STUCK_THRESHOLD;
```

### Cost Calculation

**Token costs by model** (approximate):
```typescript
const COST_PER_1M_TOKENS = {
  'claude-sonnet-4': { input: 3.00, output: 15.00 },
  'claude-opus-4': { input: 15.00, output: 75.00 },
  'gemini-2.0-flash': { input: 0.075, output: 0.30 },
  'gpt-4o': { input: 5.00, output: 15.00 }
};

function estimateCost(agent) {
  const model = agent.model.split('/').pop();
  const costs = COST_PER_1M_TOKENS[model] || { input: 0, output: 0 };
  
  const inputCost = (agent.inputTokens / 1_000_000) * costs.input;
  const outputCost = (agent.outputTokens / 1_000_000) * costs.output;
  
  return inputCost + outputCost;
}
```

**Displaying cost**:
```
Agent: claude-researcher
Tokens: 25,000 in / 5,000 out
Cost: $0.015
```

### Updating vault/agents.json Manually

**When to update**:
- Agent completes a task → set status to `completed`
- Agent starts new task → update `currentTask`
- Agent errors out → set status to `error`, add `errorMessage`

**Example manual update**:
```bash
cd vault
nano agents.json

# Update the agent entry:
{
  "id": "claude-researcher",
  "name": "Research Agent",
  "status": "completed",
  "currentTask": null,
  "completedAt": "2026-02-08T00:05:00.000Z"
}
```

**Auto-sync** (future feature):
Poll gateway every 30s and update `vault/agents.json` automatically.

### Agent Lifecycle Events

**Log to activity feed**:
```typescript
// Agent spawned
POST /api/activity {
  type: 'agent_spawn',
  title: 'Agent spawned: claude-researcher',
  metadata: { sessionId, model, task }
}

// Agent completed
POST /api/activity {
  type: 'agent_complete',
  title: 'Agent completed: claude-researcher',
  metadata: { sessionId, duration, tokens, cost }
}

// Agent error
POST /api/activity {
  type: 'error',
  title: 'Agent error: claude-researcher',
  metadata: { sessionId, error }
}
```

## Expected Output

### Agent List View
```
Active Agents (3)

┌────────────────────────────────────────────────────────┐
│ 🤖 Research Agent (claude-researcher)                  │
│ Model: claude-sonnet-4                                 │
│ Status: Active • Uptime: 2m 15s                        │
│ Task: Research OHSU network requirements               │
│ Tokens: 25,000 in / 5,000 out                          │
│ Cost: $0.015                                           │
└────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────┐
│ ✍️ Writer Agent (claude-writer)                        │
│ Model: claude-sonnet-4                                 │
│ Status: Idle • Last active: 5m ago                     │
│ Task: None                                             │
│ Tokens: 8,000 in / 2,000 out                           │
│ Cost: $0.005                                           │
└────────────────────────────────────────────────────────┘
```

### Dashboard Agent Widget
```
Running Agents (2 active)

┌────────────────────────────────────────┐
│ 🤖 claude-researcher                   │
│    Researching OHSU...                 │
│    ████████░░ 80% (2m)                 │
└────────────────────────────────────────┘

┌────────────────────────────────────────┐
│ ✍️ claude-writer                       │
│    Idle                                │
└────────────────────────────────────────┘
```

## Edge Cases

### Gateway Unreachable (Production)
**Cause**: Gateway is on local network (192.168.0.39), not accessible from Vercel

**Behavior**: Falls back to `vault/agents.json`

**Limitation**: No live updates, shows last known state

**Solution for production**:
1. Expose gateway via Cloudflare Tunnel / Tailscale
2. Or deploy gateway to cloud VM
3. Or poll and sync `vault/agents.json` periodically

### Stale Data in vault/agents.json
**Problem**: Agent finished but JSON not updated

**Detection**: Check `updatedAt` timestamp
```typescript
const STALE_THRESHOLD = 10 * 60 * 1000;  // 10 minutes
const isStale = (Date.now() - agent.updatedAt) > STALE_THRESHOLD;
```

**Solution**: Implement auto-sync or manual cleanup

### Session Key vs Agent ID Mismatch
**Problem**: Gateway uses session keys (`agent:main:main`), UI uses friendly IDs (`claude-researcher`)

**Mapping**: Maintain in `vault/agents.json`
```json
{
  "id": "claude-researcher",
  "sessionKey": "agent:main:subagent:abc123",
  "name": "Research Agent"
}
```

### Multiple Sessions per Agent
**Problem**: Same agent type spawned multiple times

**Behavior**: Each gets a unique session ID

**UI**: Group by agent type or show separately

### Agent Crashes/Errors
**Detection**: `abortedLastRun: true` from gateway

**Handling**:
```typescript
if (agent.abortedLastRun) {
  agent.status = 'error';
  agent.errorMessage = 'Last run aborted';
}
```

**UI Indicator**: Red border, error icon, "FAILED" badge

### Cost Calculation Inaccurate
**Cause**: Model pricing changes or unknown model

**Solution**:
- Update cost table in code
- Default to $0 for unknown models
- Add "estimate" disclaimer in UI

### WebSocket Not Implemented Yet
**Current**: Agent page requires manual refresh

**Future**: Real-time updates via Server-Sent Events (SSE) or WebSocket

**Workaround**: Auto-refresh every 30s with JavaScript timer

## Cost
- **Gateway API**: Free (local OpenClaw instance)
- **Agent Monitoring**: No direct cost (piggybacks on existing sessions)
- **Storage**: ~1 KB per agent in `vault/agents.json`

---

**Related Directives**:
- `gateway-bridge.md` — Understand gateway communication
- `activity-feed.md` — Log agent lifecycle events
- `task-management.md` — Assign tasks to agents
