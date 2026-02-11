'use client';

import { useState } from 'react';
import { DuplicatesSummary } from '@/lib/devices.types';

interface DuplicatesSectionProps {
  duplicates: DuplicatesSummary;
  deviceId: string;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

export default function DuplicatesSection({ duplicates, deviceId }: DuplicatesSectionProps) {
  const [expanded, setExpanded] = useState(false);
  
  const topGroups = duplicates.details
    .sort((a, b) => b.savings - a.savings)
    .slice(0, 5);

  return (
    <div className="bg-gradient-to-br from-amber-500/5 to-orange-500/5 border border-amber-500/20 rounded-xl p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-base font-display font-bold text-white mb-1 flex items-center gap-2">
            <span className="material-symbols-outlined text-sm text-amber-400">
              content_copy
            </span>
            Duplicate Files
          </h3>
          <p className="text-sm text-zinc-400">
            {duplicates.groups} groups • {duplicates.totalFiles} files • {formatBytes(duplicates.totalSavings)} savable
          </p>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-colors text-xs font-medium flex items-center gap-1"
        >
          {expanded ? 'Hide' : 'Show'} Details
          <span className={`material-symbols-outlined text-sm transition-transform ${expanded ? 'rotate-180' : ''}`}>
            expand_more
          </span>
        </button>
      </div>

      {expanded && (
        <div className="space-y-3 pt-4 border-t border-amber-500/20">
          {topGroups.map((group, index) => (
            <div key={group.hash} className="bg-bg-dark/50 rounded-lg p-3">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-amber-400">
                    #{index + 1}
                  </span>
                  <span className="text-xs text-zinc-400">
                    {group.count} copies
                  </span>
                </div>
                <span className="text-xs font-medium text-primary">
                  {formatBytes(group.savings)} savable
                </span>
              </div>
              <div className="space-y-1">
                {group.files.slice(0, 3).map((file, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="material-symbols-outlined text-xs text-zinc-500 mt-0.5">
                      {i === 0 ? 'check_circle' : 'cancel'}
                    </span>
                    <span className="text-xs text-zinc-300 font-mono break-all">
                      {file}
                    </span>
                  </div>
                ))}
                {group.files.length > 3 && (
                  <span className="text-xs text-zinc-500 ml-6">
                    +{group.files.length - 3} more
                  </span>
                )}
              </div>
            </div>
          ))}
          {duplicates.groups > 5 && (
            <div className="text-center pt-2">
              <span className="text-xs text-zinc-500">
                +{duplicates.groups - 5} more duplicate groups
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
