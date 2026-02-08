import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { getEnrichedSessions, type EnrichedSession } from '@/lib/gateway';

const VAULT_PATH = path.join(process.cwd(), 'vault');
const ACTIVITY_FILE = path.join(VAULT_PATH, 'activity.json');
const TASKS_FILE = path.join(VAULT_PATH, 'tasks.json');

export interface AgentEntry {
  id: string;
  label: string;
  status: 'running' | 'completed' | 'failed';
  model: string;
  startedAt: string;
  completedAt?: string;
  lastUpdate: string;
  summary: string;
  // Gateway-enriched fields
  source?: 'gateway' | 'local';
  tokens?: { input: number; output: number; total: number };
  contextTokens?: number;
  sessionKey?: string;
  cost?: number; // Estimated cost in USD
  // Vault-derived fields
  taskCount?: number;
  recentActivity?: Array<{ type: string; message: string; timestamp: string }>;
}

interface ActivityEntry {
  timestamp: string;
  type: string;
  agent: string;
  message: string;
}

interface Task {
  id: string;
  title: string;
  column: string;
  tags?: string[];
}

// Build agent list from vault activity.json
async function getAgentsFromVault(): Promise<AgentEntry[]> {
  try {
    // Read activity log
    const activityData = await fs.readFile(ACTIVITY_FILE, 'utf-8');
    const activities: ActivityEntry[] = JSON.parse(activityData);

    // Read tasks
    let tasks: Task[] = [];
    try {
      const tasksData = await fs.readFile(TASKS_FILE, 'utf-8');
      tasks = JSON.parse(tasksData);
    } catch {
      // Tasks file optional
    }

    // Group activities by agent
    const agentMap = new Map<string, {
      activities: ActivityEntry[];
      lastActive: string;
      completedCount: number;
      startedCount: number;
      deployedCount: number;
    }>();

    for (const activity of activities) {
      if (!activity.agent) continue;
      
      const agentName = activity.agent;
      if (!agentMap.has(agentName)) {
        agentMap.set(agentName, {
          activities: [],
          lastActive: activity.timestamp,
          completedCount: 0,
          startedCount: 0,
          deployedCount: 0,
        });
      }

      const agentData = agentMap.get(agentName)!;
      agentData.activities.push(activity);
      
      // Track latest activity
      if (new Date(activity.timestamp) > new Date(agentData.lastActive)) {
        agentData.lastActive = activity.timestamp;
      }

      // Count activity types
      if (activity.type === 'completed') agentData.completedCount++;
      if (activity.type === 'started') agentData.startedCount++;
      if (activity.type === 'deployed') agentData.deployedCount++;
    }

    // Convert to AgentEntry array
    const agents: AgentEntry[] = [];
    
    for (const [agentName, data] of agentMap.entries()) {
      // Get most recent 5 activities for this agent
      const recentActivity = data.activities
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 5)
        .map(a => ({ type: a.type, message: a.message, timestamp: a.timestamp }));

      // Determine status based on recent activity
      const mostRecentType = recentActivity[0]?.type || 'completed';
      let status: 'running' | 'completed' | 'failed' = 'completed';
      
      if (mostRecentType === 'started' || mostRecentType === 'alert') {
        status = 'running';
      } else if (mostRecentType === 'failed') {
        status = 'failed';
      }

      // Count tasks for this agent (by tag match)
      const taskCount = tasks.filter(t => 
        t.tags?.some(tag => tag.toLowerCase().includes(agentName.toLowerCase())) ||
        t.title.toLowerCase().includes(agentName.toLowerCase())
      ).length;

      // Find oldest and newest activity for duration
      const sortedActivities = [...data.activities].sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
      const firstActivity = sortedActivities[0];
      const lastActivity = sortedActivities[sortedActivities.length - 1];

      // Build summary from recent work
      let summary = `${data.completedCount} completed`;
      if (data.deployedCount > 0) summary += `, ${data.deployedCount} deployed`;
      if (data.startedCount > 0) summary += `, ${data.startedCount} started`;
      if (recentActivity.length > 0) {
        summary = recentActivity[0].message;
      }

      agents.push({
        id: `vault-${agentName}`,
        label: agentName,
        status,
        model: 'vault-derived',
        startedAt: firstActivity?.timestamp || data.lastActive,
        completedAt: status === 'completed' ? lastActivity?.timestamp : undefined,
        lastUpdate: data.lastActive,
        summary,
        source: 'local',
        taskCount,
        recentActivity,
      });
    }

    // Sort: running first, then by last update
    agents.sort((a, b) => {
      if (a.status === 'running' && b.status !== 'running') return -1;
      if (b.status === 'running' && a.status !== 'running') return 1;
      return new Date(b.lastUpdate).getTime() - new Date(a.lastUpdate).getTime();
    });

    return agents;
  } catch (error) {
    console.error('Failed to load agents from vault:', error);
    return [];
  }
}

function enrichedToAgent(session: EnrichedSession): AgentEntry {
  return {
    id: session.id,
    label: session.label,
    status: session.status === 'idle' ? 'completed' : session.status,
    model: session.model,
    startedAt: session.startedAt,
    lastUpdate: session.lastUpdate,
    summary: session.summary,
    source: session.source,
    tokens: session.tokens,
    contextTokens: session.contextTokens,
    sessionKey: session.key,
    cost: session.cost,
  };
}

export async function GET(req: NextRequest) {
  try {
    // Always start with vault data
    const vaultAgents = await getAgentsFromVault();
    
    // Try to enhance with gateway data (optional)
    const useGateway = req.nextUrl.searchParams.get('source') !== 'local';
    
    if (useGateway) {
      try {
        const { mode, sessions } = await getEnrichedSessions();
        if (mode === 'live' && sessions.length > 0) {
          // Merge gateway data with vault data
          const gatewayAgents = sessions.map(enrichedToAgent);
          
          // Create a map of gateway agents by label
          const gatewayMap = new Map(gatewayAgents.map(a => [a.label, a]));
          
          // Merge: gateway data takes precedence for matching labels
          const mergedAgents: AgentEntry[] = [];
          const processedLabels = new Set<string>();
          
          // Add gateway agents (with vault enhancement if available)
          for (const gwAgent of gatewayAgents) {
            const vaultMatch = vaultAgents.find(v => v.label === gwAgent.label);
            mergedAgents.push({
              ...gwAgent,
              taskCount: vaultMatch?.taskCount,
              recentActivity: vaultMatch?.recentActivity,
            });
            processedLabels.add(gwAgent.label);
          }
          
          // Add vault-only agents
          for (const vaultAgent of vaultAgents) {
            if (!processedLabels.has(vaultAgent.label)) {
              mergedAgents.push(vaultAgent);
            }
          }
          
          // Sort: running first, then by last update
          mergedAgents.sort((a, b) => {
            if (a.status === 'running' && b.status !== 'running') return -1;
            if (b.status === 'running' && a.status !== 'running') return 1;
            return new Date(b.lastUpdate).getTime() - new Date(a.lastUpdate).getTime();
          });
          
          return NextResponse.json(mergedAgents);
        }
      } catch (error) {
        console.error('Gateway fetch failed, using vault only:', error);
        // Fall through to vault-only
      }
    }

    // Return vault data only
    return NextResponse.json(vaultAgents);
  } catch (error) {
    console.error('Failed to load agents:', error);
    return NextResponse.json([]);
  }
}

// Legacy POST endpoint (kept for compatibility, writes to activity.json now)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Read existing activity
    let activities: ActivityEntry[] = [];
    try {
      const data = await fs.readFile(ACTIVITY_FILE, 'utf-8');
      activities = JSON.parse(data);
    } catch {
      activities = [];
    }

    // Add new activity entry
    const newActivity: ActivityEntry = {
      timestamp: body.timestamp || new Date().toISOString(),
      type: body.status || 'completed',
      agent: body.label || body.id,
      message: body.summary || 'Activity logged',
    };

    activities.unshift(newActivity);

    // Keep last 1000 entries
    if (activities.length > 1000) {
      activities = activities.slice(0, 1000);
    }

    await fs.writeFile(ACTIVITY_FILE, JSON.stringify(activities, null, 2), 'utf-8');

    return NextResponse.json(newActivity, { status: 201 });
  } catch (error) {
    console.error('Failed to log activity:', error);
    return NextResponse.json({ error: 'Failed to update agent' }, { status: 500 });
  }
}
