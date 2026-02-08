/**
 * OpenClaw Gateway Bridge
 * 
 * Server-side library that proxies requests from Second Brain to the OpenClaw Gateway.
 * Uses the OpenClaw CLI for reliable communication (the gateway is WebSocket-based,
 * so direct HTTP won't work — the CLI handles the WS protocol for us).
 * 
 * When running on Vercel (can't reach local gateway), falls back to local JSON files.
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

const GATEWAY_URL = process.env.OPENCLAW_GATEWAY_URL || '';
const GATEWAY_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN || '';

const VAULT_PATH = path.join(process.cwd(), 'vault');
const AGENTS_FILE = path.join(VAULT_PATH, 'agents.json');

// ─── Types ────────────────────────────────────────────────

export interface GatewaySession {
  key: string;
  kind: string;
  updatedAt: number;
  ageMs: number;
  sessionId: string;
  systemSent?: boolean;
  abortedLastRun?: boolean;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  model?: string;
  contextTokens?: number;
}

export interface GatewaySessionsResponse {
  path: string;
  count: number;
  activeMinutes: number | null;
  sessions: GatewaySession[];
}

export interface GatewayHealthResponse {
  status: 'ok' | 'error';
  channels?: string;
  agents?: string;
  sessions?: string;
  raw?: string;
}

export interface AgentSpawnResult {
  runId: string;
  status: string;
  summary: string;
  result?: {
    payloads?: Array<{
      text: string;
      mediaUrl: string | null;
    }>;
    meta?: {
      durationMs: number;
      agentMeta?: {
        sessionId: string;
        provider: string;
        model: string;
        usage?: {
          input: number;
          output: number;
          total: number;
        };
      };
    };
  };
  error?: string;
}

export interface GatewayStatus {
  reachable: boolean;
  mode: 'live' | 'fallback';
  gateway?: GatewayHealthResponse;
  sessions?: GatewaySession[];
  error?: string;
}

// ─── Helpers ──────────────────────────────────────────────

async function isGatewayReachable(): Promise<boolean> {
  try {
    // Quick check — try to run openclaw health
    const { stdout } = await execAsync('openclaw health 2>&1', { timeout: 10000 });
    return stdout.includes('ok') || stdout.includes('Telegram');
  } catch {
    return false;
  }
}

async function runClawCommand(command: string, timeoutMs = 30000): Promise<string> {
  try {
    const { stdout } = await execAsync(command, {
      timeout: timeoutMs,
      env: {
        ...process.env,
        PATH: `${process.env.HOME}/.local/bin:${process.env.HOME}/.openclaw/bin:/usr/local/bin:/usr/bin:/bin`,
        HOME: process.env.HOME || '/home/samson',
      },
    });
    return stdout.trim();
  } catch (error: unknown) {
    const err = error as { stderr?: string; message?: string };
    throw new Error(`Gateway command failed: ${err.stderr || err.message}`);
  }
}

// ─── Fallback (JSON files) ───────────────────────────────

interface LocalAgent {
  id: string;
  label: string;
  status: 'running' | 'completed' | 'failed';
  model: string;
  startedAt: string;
  completedAt?: string;
  lastUpdate: string;
  summary: string;
}

async function readLocalAgents(): Promise<LocalAgent[]> {
  try {
    const data = await fs.readFile(AGENTS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

function localAgentsToSessions(agents: LocalAgent[]): GatewaySession[] {
  return agents.map((a) => ({
    key: `local:${a.id}`,
    kind: 'local',
    updatedAt: new Date(a.lastUpdate).getTime(),
    ageMs: Date.now() - new Date(a.lastUpdate).getTime(),
    sessionId: a.id,
    model: a.model,
    // Store extra info in a way the UI can use
    _label: a.label,
    _status: a.status,
    _summary: a.summary,
    _startedAt: a.startedAt,
    _completedAt: a.completedAt,
  } as GatewaySession & Record<string, unknown>));
}

// ─── Public API ───────────────────────────────────────────

/**
 * Get gateway status — checks if gateway is reachable and returns mode info
 */
export async function getGatewayStatus(): Promise<GatewayStatus> {
  const reachable = await isGatewayReachable();

  if (!reachable) {
    return {
      reachable: false,
      mode: 'fallback',
      error: 'Gateway not reachable — using local JSON fallback',
    };
  }

  try {
    const raw = await runClawCommand('openclaw health 2>&1');
    return {
      reachable: true,
      mode: 'live',
      gateway: {
        status: 'ok',
        raw,
      },
    };
  } catch (err: unknown) {
    return {
      reachable: false,
      mode: 'fallback',
      error: (err as Error).message,
    };
  }
}

/**
 * List active sessions from the gateway (or fallback to local agents.json)
 */
export async function listSessions(activeMinutes?: number): Promise<GatewaySessionsResponse> {
  const reachable = await isGatewayReachable();

  if (!reachable) {
    // Fallback to local agents.json
    const agents = await readLocalAgents();
    return {
      path: AGENTS_FILE,
      count: agents.length,
      activeMinutes: activeMinutes || null,
      sessions: localAgentsToSessions(agents),
    };
  }

  try {
    const activeFlag = activeMinutes ? `--active ${activeMinutes}` : '';
    const raw = await runClawCommand(`openclaw sessions --json ${activeFlag}`);
    const data: GatewaySessionsResponse = JSON.parse(raw);
    return data;
  } catch {
    // Fallback
    const agents = await readLocalAgents();
    return {
      path: AGENTS_FILE,
      count: agents.length,
      activeMinutes: activeMinutes || null,
      sessions: localAgentsToSessions(agents),
    };
  }
}

/**
 * Spawn a sub-agent with a task via the gateway
 */
export async function spawnAgent(
  message: string,
  options: {
    sessionId?: string;
    agent?: string;
    thinking?: string;
    timeout?: number;
  } = {}
): Promise<AgentSpawnResult> {
  const reachable = await isGatewayReachable();

  if (!reachable) {
    return {
      runId: `fallback-${Date.now()}`,
      status: 'fallback',
      summary: 'Gateway unreachable — command queued locally',
      error: 'Gateway not reachable. Command saved to commands.json but not dispatched to an agent.',
    };
  }

  try {
    const sessionFlag = options.sessionId
      ? `--session-id "${options.sessionId}"`
      : '';
    const agentFlag = options.agent ? `--agent ${options.agent}` : '';
    const thinkingFlag = options.thinking ? `--thinking ${options.thinking}` : '';
    const timeoutSec = options.timeout || 120;

    // Escape message for shell
    const escapedMessage = message.replace(/'/g, "'\\''");

    const cmd = `openclaw agent ${sessionFlag} ${agentFlag} ${thinkingFlag} --message '${escapedMessage}' --json --timeout ${timeoutSec}`;
    const raw = await runClawCommand(cmd, (timeoutSec + 10) * 1000);
    
    return JSON.parse(raw);
  } catch (err: unknown) {
    return {
      runId: `error-${Date.now()}`,
      status: 'error',
      summary: 'Agent spawn failed',
      error: (err as Error).message,
    };
  }
}

/**
 * Send a message to an existing session
 */
export async function sendMessage(
  sessionId: string,
  message: string,
  options: {
    thinking?: string;
    timeout?: number;
  } = {}
): Promise<AgentSpawnResult> {
  return spawnAgent(message, {
    sessionId,
    thinking: options.thinking,
    timeout: options.timeout,
  });
}

/**
 * Get enriched session data — merges gateway sessions with local agents.json
 * for a complete picture of agent activity
 */
export async function getEnrichedSessions(): Promise<{
  mode: 'live' | 'fallback';
  sessions: EnrichedSession[];
}> {
  const reachable = await isGatewayReachable();
  const localAgents = await readLocalAgents();

  if (!reachable) {
    return {
      mode: 'fallback',
      sessions: localAgents.map(agentToEnrichedSession),
    };
  }

  try {
    // Fetch active sessions (last 60 minutes for good coverage)
    const raw = await runClawCommand('openclaw sessions --active 60 --json');
    const data: GatewaySessionsResponse = JSON.parse(raw);

    const enriched: EnrichedSession[] = data.sessions.map((s) => {
      // Try to match with local agent data
      const localMatch = localAgents.find(
        (a) => s.key.includes(a.id) || s.sessionId === a.id
      );

      const tokens = {
        input: s.inputTokens || 0,
        output: s.outputTokens || 0,
        total: s.totalTokens || 0,
      };

      const cost = tokens.total > 0 ? calculateCost(tokens, s.model || '') : undefined;

      return {
        id: s.sessionId,
        key: s.key,
        label: localMatch?.label || parseSessionLabel(s.key),
        status: inferSessionStatus(s, localMatch),
        model: s.model || localMatch?.model || 'unknown',
        startedAt: localMatch?.startedAt || new Date(s.updatedAt - s.ageMs).toISOString(),
        lastUpdate: new Date(s.updatedAt).toISOString(),
        summary: localMatch?.summary || `Session ${s.key}`,
        tokens,
        contextTokens: s.contextTokens || 0,
        cost,
        source: 'gateway' as const,
      };
    });

    // Add local agents not found in gateway sessions
    for (const agent of localAgents) {
      const exists = enriched.some(
        (e) => e.key.includes(agent.id) || e.id === agent.id
      );
      if (!exists) {
        enriched.push(agentToEnrichedSession(agent));
      }
    }

    return { mode: 'live', sessions: enriched };
  } catch {
    return {
      mode: 'fallback',
      sessions: localAgents.map(agentToEnrichedSession),
    };
  }
}

// ─── Enriched Session Type ────────────────────────────────

export interface EnrichedSession {
  id: string;
  key: string;
  label: string;
  status: 'running' | 'completed' | 'failed' | 'idle';
  model: string;
  startedAt: string;
  lastUpdate: string;
  summary: string;
  tokens: {
    input: number;
    output: number;
    total: number;
  };
  contextTokens: number;
  cost?: number; // Estimated cost in USD
  source: 'gateway' | 'local';
}

// ─── Utilities ────────────────────────────────────────────

function parseSessionLabel(key: string): string {
  // "agent:main:main" → "Main Agent"
  // "agent:main:subagent:uuid" → "Sub-Agent"  
  // "agent:main:cron:uuid" → "Cron Job"
  const parts = key.split(':');
  if (parts.includes('subagent')) return 'Sub-Agent';
  if (parts.includes('cron')) return 'Cron Job';
  if (parts[parts.length - 1] === 'main') return 'Main Agent';
  return parts[parts.length - 1] || key;
}

/**
 * Calculate cost estimate based on token usage and model
 */
function calculateCost(tokens: { input: number; output: number }, model: string): number {
  // Pricing per 1M tokens (approximate, Feb 2026)
  const pricing: Record<string, { input: number; output: number }> = {
    'claude-opus-4': { input: 15, output: 75 },
    'claude-opus-4-6': { input: 15, output: 75 },
    'claude-sonnet-4': { input: 3, output: 15 },
    'claude-sonnet-4-5': { input: 3, output: 15 },
    'claude-sonnet-4-5-20250929': { input: 3, output: 15 },
    'claude-haiku-4': { input: 0.25, output: 1.25 },
  };

  // Find matching model pricing
  let modelPricing = { input: 3, output: 15 }; // Default to Sonnet pricing
  for (const [modelKey, price] of Object.entries(pricing)) {
    if (model.includes(modelKey)) {
      modelPricing = price;
      break;
    }
  }

  const inputCost = (tokens.input / 1_000_000) * modelPricing.input;
  const outputCost = (tokens.output / 1_000_000) * modelPricing.output;
  
  return inputCost + outputCost;
}

function inferSessionStatus(
  session: GatewaySession,
  localAgent?: LocalAgent
): 'running' | 'completed' | 'failed' | 'idle' {
  if (localAgent?.status) {
    if (localAgent.status === 'running') return 'running';
    if (localAgent.status === 'failed') return 'failed';
    if (localAgent.status === 'completed') return 'completed';
  }
  // If session was updated recently (within 5 min), consider it active
  if (session.ageMs < 5 * 60 * 1000) return 'running';
  return 'idle';
}

function agentToEnrichedSession(agent: LocalAgent): EnrichedSession {
  return {
    id: agent.id,
    key: `local:${agent.id}`,
    label: agent.label,
    status: agent.status === 'running' ? 'running' : agent.status === 'failed' ? 'failed' : 'completed',
    model: agent.model,
    startedAt: agent.startedAt,
    lastUpdate: agent.lastUpdate,
    summary: agent.summary,
    tokens: { input: 0, output: 0, total: 0 },
    contextTokens: 0,
    source: 'local',
  };
}
