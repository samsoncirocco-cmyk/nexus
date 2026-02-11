/**
 * Insights API — Auto-extract patterns from activity feed
 * Analyzes vault/activity.json and returns insight cards
 */

import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';

export const dynamic = 'force-dynamic';

interface ActivityEntry {
  id: string;
  timestamp: string;
  agent: string;
  type: string;
  title?: string;
  summary?: string;
  message?: string;
  tags?: string[];
  status?: string;
}

interface InsightCard {
  id: string;
  icon: string;
  title: string;
  value: string;
  subtitle: string;
  color: string;
}

export async function GET() {
  try {
    const activityPath = join(process.cwd(), 'vault', 'activity.json');
    const data = await readFile(activityPath, 'utf-8');
    const activities: ActivityEntry[] = JSON.parse(data);

    const now = Date.now();
    const msPerDay = 86400000;
    const msPerWeek = msPerDay * 7;

    // Filter recent activities
    const last24h = activities.filter(a => (now - new Date(a.timestamp).getTime()) < msPerDay);
    const lastWeek = activities.filter(a => (now - new Date(a.timestamp).getTime()) < msPerWeek);

    // Generate insights
    const insights: InsightCard[] = [];

    // 1. Agent tasks completed in last 24h
    const completedToday = last24h.filter(a => a.type === 'completed').length;
    if (completedToday > 0) {
      insights.push({
        id: 'tasks-24h',
        icon: 'check_circle',
        title: `${completedToday} agent task${completedToday !== 1 ? 's' : ''} completed`,
        value: completedToday.toString(),
        subtitle: 'in the last 24 hours',
        color: 'emerald',
      });
    }

    // 2. Most active agents this week
    const agentCounts = new Map<string, number>();
    lastWeek.forEach(a => {
      if (a.agent) {
        agentCounts.set(a.agent, (agentCounts.get(a.agent) || 0) + 1);
      }
    });
    const topAgents = Array.from(agentCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([agent]) => agent);
    
    if (topAgents.length > 0) {
      insights.push({
        id: 'top-agents',
        icon: 'smart_toy',
        title: 'Most active agents',
        value: topAgents.length.toString(),
        subtitle: topAgents.join(', '),
        color: 'teal',
      });
    }

    // 3. Task completion rate (completed vs started+completed)
    const completedWeek = lastWeek.filter(a => a.type === 'completed').length;
    const startedWeek = lastWeek.filter(a => a.type === 'started').length;
    const totalTasks = completedWeek + startedWeek;
    
    if (totalTasks > 0) {
      const completionRate = Math.round((completedWeek / totalTasks) * 100);
      insights.push({
        id: 'completion-rate',
        icon: 'task_alt',
        title: `${completionRate}% completion rate`,
        value: `${completionRate}%`,
        subtitle: `${completedWeek} of ${totalTasks} tasks this week`,
        color: completionRate >= 80 ? 'emerald' : completionRate >= 60 ? 'amber' : 'red',
      });
    }

    // 4. Deployments this week
    const deploymentsWeek = lastWeek.filter(a => a.type === 'deployed').length;
    if (deploymentsWeek > 0) {
      insights.push({
        id: 'deployments',
        icon: 'rocket_launch',
        title: `${deploymentsWeek} deployment${deploymentsWeek !== 1 ? 's' : ''}`,
        value: deploymentsWeek.toString(),
        subtitle: 'shipped this week',
        color: 'purple',
      });
    }

    // 5. Alerts this week
    const alertsWeek = lastWeek.filter(a => a.type === 'alert').length;
    if (alertsWeek > 0) {
      insights.push({
        id: 'alerts',
        icon: 'warning',
        title: `${alertsWeek} alert${alertsWeek !== 1 ? 's' : ''}`,
        value: alertsWeek.toString(),
        subtitle: 'need attention this week',
        color: 'amber',
      });
    }

    // 6. Activity trend (compare this week to last week)
    const twoWeeksAgo = activities.filter(a => {
      const age = now - new Date(a.timestamp).getTime();
      return age >= msPerWeek && age < msPerWeek * 2;
    });
    
    const weekOverWeekChange = lastWeek.length - twoWeeksAgo.length;
    if (Math.abs(weekOverWeekChange) > 5) {
      const direction = weekOverWeekChange > 0 ? 'up' : 'down';
      const percentage = twoWeeksAgo.length > 0 
        ? Math.round(Math.abs(weekOverWeekChange) / twoWeeksAgo.length * 100)
        : 100;
      
      insights.push({
        id: 'activity-trend',
        icon: direction === 'up' ? 'trending_up' : 'trending_down',
        title: `Activity ${direction} ${percentage}%`,
        value: `${direction === 'up' ? '+' : '-'}${percentage}%`,
        subtitle: 'compared to last week',
        color: direction === 'up' ? 'emerald' : 'blue',
      });
    }

    // Return top 5 insights
    return NextResponse.json({
      insights: insights.slice(0, 5),
      meta: {
        total_activities: activities.length,
        last_24h: last24h.length,
        last_week: lastWeek.length,
        generated_at: new Date().toISOString(),
      },
    });
  } catch (error: unknown) {
    console.error('[Insights API Error]', error);
    return NextResponse.json(
      {
        error: 'Failed to generate insights',
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
