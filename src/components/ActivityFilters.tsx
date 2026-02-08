'use client';

import Link from 'next/link';
import type { ActivityEntry } from '@/app/actions/activity';

type FilterType = 'all' | 'gmail' | 'calendar' | 'drive' | 'agent' | 'manual';

interface ActivityFiltersProps {
  activity: ActivityEntry[];
  activeFilter: string;
}

export default function ActivityFilters({ activity, activeFilter }: ActivityFiltersProps) {
  // Count events by source
  const counts = activity.reduce((acc, entry) => {
    const source = entry.source || 'manual';
    acc[source] = (acc[source] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const filters: { type: FilterType; label: string; emoji: string }[] = [
    { type: 'all', label: 'All', emoji: '🌐' },
    { type: 'gmail', label: 'Email', emoji: '📧' },
    { type: 'calendar', label: 'Calendar', emoji: '📅' },
    { type: 'drive', label: 'Drive', emoji: '📁' },
    { type: 'agent', label: 'Agents', emoji: '🤖' },
    { type: 'manual', label: 'Notes', emoji: '📝' },
  ];

  return (
    <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-2 snap-x snap-mandatory -mx-6 px-6 md:mx-0 md:px-0">
      {filters.map((filter) => {
        const count = filter.type === 'all' ? activity.length : counts[filter.type] || 0;
        const isActive = activeFilter === filter.type;
        
        // Don't show filter if there are no events (except 'all')
        if (filter.type !== 'all' && count === 0) return null;

        const href = filter.type === 'all' ? '/activity' : `/activity?source=${filter.type}`;

        return (
          <Link
            key={filter.type}
            href={href}
            className={`px-4 py-2.5 rounded-full text-sm font-bold whitespace-nowrap transition-all flex items-center gap-1.5 snap-start min-h-[44px] ${
              isActive
                ? 'bg-primary text-bg-dark shadow-lg shadow-primary/20'
                : 'bg-card-dark hover:bg-secondary-dark/60 text-foreground-muted'
            }`}
          >
            <span>{filter.emoji}</span>
            <span>{filter.label}</span>
            {count > 0 && (
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                  isActive ? 'bg-bg-dark/20' : 'bg-primary/10 text-primary'
                }`}
              >
                {count}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
