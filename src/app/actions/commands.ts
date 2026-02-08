'use server';

import fs from 'fs/promises';
import path from 'path';
import { semanticSearch, queryDatalake, logAction } from '../../../openclaw/skills';

const VAULT_PATH = path.join(process.cwd(), 'vault');
const COMMANDS_FILE = path.join(VAULT_PATH, 'commands.json');
const QUEUE_FILE = path.join(VAULT_PATH, 'commands-queue.json');

export interface CommandEntry {
  id: string;
  timestamp: string;
  text: string;
  status: 'pending' | 'processing' | 'done' | 'error';
  mode?: 'gateway' | 'local';
  result?: string;
  error?: string;
}

interface QueuedCommand {
  id: string;
  timestamp: string;
  text: string;
  type: string;
}

interface ExecuteResult {
  status: 'done' | 'queued' | 'error';
  message: string;
  data?: unknown;
  error?: string;
}

// ─── Get Commands ─────────────────────────────────────────

export async function getCommands(): Promise<CommandEntry[]> {
  try {
    const data = await fs.readFile(COMMANDS_FILE, 'utf-8');
    const commands: CommandEntry[] = JSON.parse(data);
    return commands.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  } catch {
    return [];
  }
}

// ─── Save Command ─────────────────────────────────────────

async function saveCommand(command: CommandEntry): Promise<void> {
  try {
    await fs.mkdir(VAULT_PATH, { recursive: true });
    const commands = await getCommands();
    commands.push(command);
    await fs.writeFile(COMMANDS_FILE, JSON.stringify(commands, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save command:', err);
  }
}

// ─── Queue Command ────────────────────────────────────────

async function queueCommand(command: QueuedCommand): Promise<void> {
  try {
    await fs.mkdir(VAULT_PATH, { recursive: true });
    let queue: QueuedCommand[] = [];
    
    try {
      const data = await fs.readFile(QUEUE_FILE, 'utf-8');
      queue = JSON.parse(data);
    } catch {
      // File doesn't exist, start with empty queue
    }
    
    queue.push(command);
    await fs.writeFile(QUEUE_FILE, JSON.stringify(queue, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to queue command:', err);
  }
}

// ─── Parse Command Type ───────────────────────────────────

function parseCommandType(text: string): { type: string; query: string } {
  const lower = text.toLowerCase().trim();
  
  // Search patterns
  if (lower.startsWith('search') || lower.startsWith('find') || lower.includes('look for')) {
    return { type: 'search', query: text.replace(/^(search|find|look for)\s+/i, '') };
  }
  
  // Query patterns
  if (lower.startsWith('query') || lower.startsWith('show') || lower.startsWith('list')) {
    return { type: 'query', query: text.replace(/^(query|show|list)\s+/i, '') };
  }
  
  // Status check
  if (lower.includes('status') || lower.includes('health')) {
    return { type: 'status', query: text };
  }
  
  // Deploy/build
  if (lower.includes('deploy') || lower.includes('build')) {
    return { type: 'deploy', query: text };
  }
  
  // Default to agent task
  return { type: 'agent', query: text };
}

// ─── Execute Command ──────────────────────────────────────

export async function executeCommand(text: string): Promise<ExecuteResult> {
  const commandId = `cmd-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const { type, query } = parseCommandType(text);
  
  try {
    // ─── Search commands ─────────────────────────────────
    
    if (type === 'search') {
      const result = await semanticSearch({
        query,
        maxResults: 10,
      });
      
      await saveCommand({
        id: commandId,
        timestamp: new Date().toISOString(),
        text,
        status: 'done',
        mode: 'local',
        result: `Found ${result.totalHits} results`,
      });
      
      return {
        status: 'done',
        message: `Found ${result.totalHits} results`,
        data: result,
      };
    }
    
    // ─── Query commands ──────────────────────────────────
    
    if (type === 'query') {
      const result = await queryDatalake({
        question: query,
      });
      
      await saveCommand({
        id: commandId,
        timestamp: new Date().toISOString(),
        text,
        status: 'done',
        mode: 'local',
        result: `Query returned ${result.totalRows} rows`,
      });
      
      return {
        status: 'done',
        message: `Query returned ${result.totalRows} rows`,
        data: result,
      };
    }
    
    // ─── Status commands ─────────────────────────────────
    
    if (type === 'status') {
      const status = {
        mode: 'local',
        timestamp: new Date().toISOString(),
        vault: await checkVaultStatus(),
      };
      
      await saveCommand({
        id: commandId,
        timestamp: new Date().toISOString(),
        text,
        status: 'done',
        mode: 'local',
        result: 'Status check complete',
      });
      
      return {
        status: 'done',
        message: 'Status check complete',
        data: status,
      };
    }
    
    // ─── Deploy/build commands ───────────────────────────
    
    if (type === 'deploy') {
      // Queue these for manual processing
      await queueCommand({
        id: commandId,
        timestamp: new Date().toISOString(),
        text,
        type,
      });
      
      await saveCommand({
        id: commandId,
        timestamp: new Date().toISOString(),
        text,
        status: 'pending',
        mode: 'local',
        result: 'Queued for processing',
      });
      
      return {
        status: 'queued',
        message: 'Command queued for processing',
      };
    }
    
    // ─── Agent tasks ─────────────────────────────────────
    
    // Queue agent tasks and log to BigQuery
    await queueCommand({
      id: commandId,
      timestamp: new Date().toISOString(),
      text,
      type,
    });
    
    // Log to BigQuery via events API
    await logAction({
      agentId: 'second-brain',
      eventType: 'command.queued',
      source: 'commands-ui',
      payload: {
        commandId,
        text,
        type,
        mode: 'local',
      },
    }).catch((err) => {
      console.error('Failed to log command to BigQuery:', err);
    });
    
    await saveCommand({
      id: commandId,
      timestamp: new Date().toISOString(),
      text,
      status: 'pending',
      mode: 'local',
      result: 'Queued for agent processing',
    });
    
    return {
      status: 'queued',
      message: 'Command queued for agent processing',
    };
    
  } catch (err) {
    const errorMsg = (err as Error).message;
    
    await saveCommand({
      id: commandId,
      timestamp: new Date().toISOString(),
      text,
      status: 'error',
      mode: 'local',
      error: errorMsg,
    });
    
    return {
      status: 'error',
      message: 'Command execution failed',
      error: errorMsg,
    };
  }
}

// ─── Helpers ──────────────────────────────────────────────

async function checkVaultStatus(): Promise<Record<string, unknown>> {
  try {
    const files = await fs.readdir(VAULT_PATH);
    const jsonFiles = files.filter(f => f.endsWith('.json'));
    
    const stats: Record<string, unknown> = {
      totalFiles: files.length,
      jsonFiles: jsonFiles.length,
    };
    
    // Try to read commands.json for command count
    try {
      const commands = await getCommands();
      stats.totalCommands = commands.length;
      stats.pendingCommands = commands.filter(c => c.status === 'pending').length;
    } catch {
      stats.totalCommands = 0;
    }
    
    return stats;
  } catch {
    return { error: 'Failed to read vault directory' };
  }
}
