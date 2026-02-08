# Directive: Gateway Bridge (OpenClaw Integration)

## Goal
Understand and use the gateway bridge layer that connects Second Brain to OpenClaw Gateway

## When to Use
- Spawning new agents from the UI
- Sending commands or messages to existing agents
- Checking gateway connection status
- Debugging agent communication issues
- Understanding the UI → OpenClaw data flow

## Prerequisites
- OpenClaw Gateway running at `http://192.168.0.39:18789` (local dev)
- Environment variable `OPENCLAW_GATEWAY_URL` set
- Understanding of OpenClaw WebSocket protocol
- Familiarity with Next.js API routes

## Steps

### Architecture Overview

**Data Flow**:
```
Second Brain UI (React)
    ↓
Next.js API Route (/api/gateway)
    ↓
Gateway Bridge Layer (src/lib/gateway.ts)
    ↓
OpenClaw CLI (executes WebSocket communication)
    ↓
OpenClaw Gateway (WebSocket server at :18789)
    ↓
Agent Runtime (Claude, Gemini, GPT, etc.)
```

**Why the bridge?**
- OpenClaw Gateway uses WebSocket, not REST
- Vercel (serverless) can't maintain persistent WS connections
- Bridge uses OpenClaw CLI to handle WS protocol
- Provides REST-like API for UI convenience

### Gateway Bridge API

**Endpoint**: `POST /api/gateway`

**Actions**:
- `status` — Check gateway health
- `sessions` — List active agent sessions
- `spawn` — Create a new agent session
- `send` — Send message to existing session
- `enriched` — Get merged gateway + local agent data

### Action: Check Gateway Status

**Request**:
```bash
curl -X POST http://localhost:3000/api/gateway \
  -H "Content-Type: application/json" \
  -d '{"action": "status"}'
```

**Response**:
```json
{
  "status": "ok",
  "uptime": 86400000,
  "reachable": true,
  "mode": "gateway"
}
```

**Or (when unreachable)**:
```json
{
  "status": "error",
  "reachable": false,
  "mode": "fallback",
  "error": "Gateway timeout"
}
```

### Action: List Active Sessions

**Request**:
```bash
curl -X POST http://localhost:3000/api/gateway \
  -H "Content-Type: application/json" \
  -d '{
    "action": "sessions",
    "activeMinutes": 60
  }'
```

**Parameters**:
- `activeMinutes` (optional) — Only return sessions active in last N minutes

**Response**:
```json
{
  "path": "/agent/sessions",
  "count": 3,
  "activeMinutes": 60,
  "sessions": [
    {
      "key": "agent:main:main",
      "sessionId": "abc123-def456",
      "kind": "agent",
      "model": "anthropic/claude-sonnet-4",
      "updatedAt": 1707350400000,
      "ageMs": 120000,
      "inputTokens": 25000,
      "outputTokens": 5000,
      "totalTokens": 30000,
      "contextTokens": 20000
    }
  ]
}
```

### Action: Spawn a New Agent

**Request**:
```bash
curl -X POST http://localhost:3000/api/gateway \
  -H "Content-Type: application/json" \
  -d '{
    "action": "spawn",
    "message": "Research OHSU network requirements and write a summary",
    "sessionId": "custom-session-id",
    "agent": "researcher",
    "thinking": "low",
    "timeout": 300000
  }'
```

**Parameters**:
- `message` (required) — Task instruction for the agent
- `sessionId` (optional) — Custom session ID (default: auto-generated)
- `agent` (optional) — Agent type hint
- `thinking` (optional) — Thinking level: `low`, `medium`, `high`
- `timeout` (optional) — Max execution time in ms (default: 60000)

**Response**:
```json
{
  "sessionId": "agent:main:subagent:abc123-def456",
  "status": "spawned",
  "message": "Agent spawned successfully"
}
```

**Error Response**:
```json
{
  "error": "Gateway unreachable",
  "details": "Connection timeout"
}
```

### Action: Send Message to Existing Session

**Request**:
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

**Parameters**:
- `sessionId` (required) — Target session ID
- `message` (required) — Message to send
- `thinking` (optional) — Thinking level
- `timeout` (optional) — Response timeout in ms

**Response**:
```json
{
  "sessionId": "agent:main:subagent:abc123-def456",
  "response": "I've gathered the following information about OHSU...",
  "status": "success"
}
```

### Action: Get Enriched Sessions

**Request**:
```bash
curl -X POST http://localhost:3000/api/gateway \
  -H "Content-Type: application/json" \
  -d '{"action": "enriched"}'
```

**Response**:
```json
{
  "agents": [
    {
      "id": "claude-researcher",
      "name": "Research Agent",
      "sessionId": "agent:main:subagent:abc123",
      "model": "claude-sonnet-4",
      "status": "active",
      "currentTask": "Research OHSU",
      "inputTokens": 25000,
      "outputTokens": 5000,
      "totalTokens": 30000,
      "estimatedCost": 0.015,
      "uptime": 120000
    }
  ]
}
```

**Merging Logic**:
1. Fetch sessions from gateway
2. Load `vault/agents.json` (local registry)
3. Match by session ID or agent ID
4. Merge: gateway data (tokens, status) + local data (name, task)

### Gateway Bridge Implementation (src/lib/gateway.ts)

**Key Functions**:
```typescript
// Check gateway health
export async function getGatewayStatus(): Promise<GatewayHealthResponse>

// List active sessions
export async function listSessions(activeMinutes?: number): Promise<GatewaySessionsResponse>

// Spawn new agent
export async function spawnAgent(
  message: string,
  options?: SpawnOptions
): Promise<SpawnResponse>

// Send message to session
export async function sendMessage(
  sessionId: string,
  message: string,
  options?: SendOptions
): Promise<SendResponse>

// Get enriched sessions (gateway + local merged)
export async function getEnrichedSessions(): Promise<EnrichedSession[]>
```

**OpenClaw CLI Usage**:
```typescript
// Example: spawn agent via CLI
const { stdout } = await execAsync(
  `openclaw spawn --message "${message}" --agent "${agent}"`
);
```

**Fallback Mode**:
When gateway is unreachable (e.g., on Vercel):
```typescript
if (!gatewayReachable) {
  // Fall back to vault/agents.json
  const agentsFile = path.join(process.cwd(), 'vault', 'agents.json');
  const data = JSON.parse(await fs.readFile(agentsFile, 'utf-8'));
  return data.agents;
}
```

### Testing Gateway Communication

**Health Check**:
```bash
# Direct gateway ping
curl http://192.168.0.39:18789/status

# Via bridge
curl -X POST http://localhost:3000/api/gateway \
  -H "Content-Type: application/json" \
  -d '{"action": "status"}'
```

**End-to-End Test**:
```bash
# 1. Spawn agent
curl -X POST http://localhost:3000/api/gateway \
  -H "Content-Type: application/json" \
  -d '{
    "action": "spawn",
    "message": "Say hello and then stop"
  }'

# Response: { "sessionId": "agent:main:subagent:xyz" }

# 2. Send follow-up message
curl -X POST http://localhost:3000/api/gateway \
  -H "Content-Type: application/json" \
  -d '{
    "action": "send",
    "sessionId": "agent:main:subagent:xyz",
    "message": "What did I just ask you to do?"
  }'
```

### Debugging Gateway Issues

**Gateway not responding**:
```bash
# Check if gateway is running
ps aux | grep openclaw

# Check gateway logs
tail -f ~/.openclaw/logs/gateway.log

# Restart gateway
openclaw gateway restart
```

**Bridge API errors**:
```bash
# Enable verbose logging in gateway.ts
console.log('[Gateway]', requestData);

# Check Next.js dev server logs
npm run dev
```

**Timeout errors**:
- Default timeout: 60 seconds
- Increase for long-running tasks: `"timeout": 300000` (5 minutes)

**WebSocket connection issues**:
- Verify gateway is listening on correct port (18789)
- Check firewall rules
- Test with `openclaw status` CLI command

### Security Considerations

**API Token**:
```env
OPENCLAW_API_KEY=$OPENCLAW_GATEWAY_TOKEN
```

- Currently a static token (not secure for production)
- Future: Implement proper authentication (JWT, OAuth)

**Network Security**:
- Gateway runs on local network (192.168.0.39)
- Not exposed to internet (good for security)
- UI can't reach gateway from Vercel (limitation)

**Input Validation**:
```typescript
// Sanitize user input before sending to gateway
message = message.trim().slice(0, 10000);  // Max 10K chars
```

## Expected Output

### Successful Agent Spawn
```json
{
  "sessionId": "agent:main:subagent:f3a2b1c4",
  "status": "spawned"
}
```

### Gateway Status (Healthy)
```json
{
  "status": "ok",
  "reachable": true,
  "uptime": 86400000,
  "activeSessions": 3
}
```

### Gateway Status (Unreachable)
```json
{
  "status": "error",
  "reachable": false,
  "mode": "fallback",
  "error": "ECONNREFUSED"
}
```

## Edge Cases

### Gateway Unreachable (Production)
**Cause**: Gateway on local network, Vercel can't reach it

**Behavior**: All gateway actions fail gracefully

**Fallback**:
- `status` → Returns offline status
- `sessions` → Reads from `vault/agents.json`
- `spawn` / `send` → Returns error

**Solution**:
1. Expose gateway via Cloudflare Tunnel
2. Deploy gateway to cloud VM with public IP
3. Use Tailscale for secure remote access

### Session ID Not Found
**Problem**: Trying to send message to non-existent session

**Response**:
```json
{
  "error": "Session not found",
  "sessionId": "agent:main:subagent:invalid"
}
```

**Solution**: Verify session exists via `sessions` action first

### Spawn Fails Silently
**Cause**: Agent crashes immediately after spawn

**Detection**: Check gateway logs or session list

**Mitigation**:
- Add error handling in agent code
- Implement retry logic
- Log spawn events to activity feed

### Message Too Long
**Problem**: Very long prompts exceed token limits

**Validation**:
```typescript
const MAX_MESSAGE_LENGTH = 10000;
if (message.length > MAX_MESSAGE_LENGTH) {
  return { error: 'Message too long', max: MAX_MESSAGE_LENGTH };
}
```

### Concurrent Spawn Requests
**Problem**: UI spawns same agent multiple times quickly

**Behavior**: Each gets a unique session ID

**Solution**: Debounce spawn button or check for duplicate tasks

### Gateway Version Mismatch
**Problem**: Bridge expects newer gateway API than installed version

**Detection**: API call returns unexpected response shape

**Solution**: Update OpenClaw Gateway to latest version

## Cost
- **Gateway API**: Free (self-hosted OpenClaw)
- **Agent Runtime**: Token costs vary by model (see agent-monitoring.md)
- **Network**: Local network traffic (free)

**Token Costs** (passed through to model):
- Claude Sonnet 4: $3/1M input, $15/1M output
- Gemini 2.0 Flash: $0.075/1M input, $0.30/1M output

---

**Related Directives**:
- `agent-monitoring.md` — View spawned agents
- `task-management.md` — Delegate tasks that spawn agents
- `local-dev-setup.md` — Set up OpenClaw Gateway locally
