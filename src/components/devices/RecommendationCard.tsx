'use client';

import { useState, useTransition } from 'react';
import type { Recommendation, RecommendationType } from '@/lib/devices.types';
import { markRecommendationDone, markRecommendationDismissed } from '@/app/actions/devices';

interface RecommendationCardProps {
  recommendation: Recommendation;
  deviceId: string;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

function getIcon(type: RecommendationType): string {
  const icons: Record<RecommendationType, string> = {
    duplicates: 'content_copy',
    'old-downloads': 'download',
    'large-files': 'hard_drive',
    'old-screenshots': 'screenshot_monitor',
    'empty-folders': 'folder_off',
  };
  return icons[type] || 'lightbulb';
}

function getColorClasses(type: RecommendationType): {
  bg: string;
  border: string;
  iconBg: string;
  iconText: string;
  badgeBg: string;
  badgeText: string;
} {
  const colorMap: Record<RecommendationType, ReturnType<typeof getColorClasses>> = {
    duplicates: {
      bg: 'from-amber-500/5 to-orange-500/5',
      border: 'border-amber-500/20',
      iconBg: 'bg-amber-500/20',
      iconText: 'text-amber-400',
      badgeBg: 'bg-amber-500/10',
      badgeText: 'text-amber-400',
    },
    'old-downloads': {
      bg: 'from-blue-500/5 to-cyan-500/5',
      border: 'border-blue-500/20',
      iconBg: 'bg-blue-500/20',
      iconText: 'text-blue-400',
      badgeBg: 'bg-blue-500/10',
      badgeText: 'text-blue-400',
    },
    'large-files': {
      bg: 'from-red-500/5 to-pink-500/5',
      border: 'border-red-500/20',
      iconBg: 'bg-red-500/20',
      iconText: 'text-red-400',
      badgeBg: 'bg-red-500/10',
      badgeText: 'text-red-400',
    },
    'old-screenshots': {
      bg: 'from-purple-500/5 to-violet-500/5',
      border: 'border-purple-500/20',
      iconBg: 'bg-purple-500/20',
      iconText: 'text-purple-400',
      badgeBg: 'bg-purple-500/10',
      badgeText: 'text-purple-400',
    },
    'empty-folders': {
      bg: 'from-zinc-500/5 to-zinc-400/5',
      border: 'border-zinc-500/20',
      iconBg: 'bg-zinc-500/20',
      iconText: 'text-zinc-400',
      badgeBg: 'bg-zinc-500/10',
      badgeText: 'text-zinc-400',
    },
  };
  return colorMap[type] || colorMap['empty-folders'];
}

function getConfidenceLabel(confidence: number): { label: string; color: string } {
  if (confidence >= 0.9) return { label: 'High', color: 'text-emerald-400' };
  if (confidence >= 0.6) return { label: 'Medium', color: 'text-amber-400' };
  return { label: 'Low', color: 'text-zinc-400' };
}

export default function RecommendationCard({ recommendation, deviceId }: RecommendationCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [status, setStatus] = useState(recommendation.status);
  const [isPending, startTransition] = useTransition();

  const colors = getColorClasses(recommendation.type);
  const confidence = getConfidenceLabel(recommendation.confidence);
  const isDone = status === 'done';
  const isDismissed = status === 'dismissed';
  const isResolved = isDone || isDismissed;

  function handleMarkDone() {
    startTransition(async () => {
      await markRecommendationDone(deviceId, recommendation.id);
      setStatus('done');
    });
  }

  function handleDismiss() {
    startTransition(async () => {
      await markRecommendationDismissed(deviceId, recommendation.id);
      setStatus('dismissed');
    });
  }

  return (
    <div
      className={`bg-gradient-to-br ${colors.bg} border ${colors.border} rounded-xl p-4 transition-all duration-300 ${
        isResolved ? 'opacity-50' : ''
      }`}
    >
      {/* Header row */}
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={`flex-shrink-0 size-10 rounded-lg ${colors.iconBg} flex items-center justify-center`}>
          <span className={`material-symbols-outlined ${colors.iconText} text-xl`}>
            {isResolved ? (isDone ? 'check_circle' : 'do_not_disturb_on') : getIcon(recommendation.type)}
          </span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className={`text-sm font-medium ${isResolved ? 'text-zinc-500 line-through' : 'text-white'}`}>
              {recommendation.title}
            </h3>
            {recommendation.savings > 0 && (
              <span className="flex-shrink-0 px-2 py-0.5 rounded bg-primary/10 text-primary text-xs font-bold">
                {formatBytes(recommendation.savings)}
              </span>
            )}
          </div>

          <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
            {recommendation.description}
          </p>

          {/* Meta badges */}
          <div className="flex items-center gap-2 mt-2">
            <span className={`text-xs ${colors.badgeText} ${colors.badgeBg} px-1.5 py-0.5 rounded capitalize`}>
              {recommendation.type.replace('-', ' ')}
            </span>
            <span className={`text-xs ${confidence.color}`}>
              {confidence.label} confidence
            </span>
            <span className="text-xs text-zinc-500">
              {recommendation.files.length} file{recommendation.files.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </div>

      {/* Actions */}
      {!isResolved && (
        <div className="flex items-center gap-2 mt-3 ml-[52px]">
          <button
            onClick={() => setExpanded(!expanded)}
            className="px-3 py-1.5 rounded-lg bg-white/5 text-zinc-300 hover:bg-white/10 transition-colors text-xs font-medium flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-sm">
              {expanded ? 'visibility_off' : 'visibility'}
            </span>
            {expanded ? 'Hide' : 'Review'} Files
          </button>

          <button
            onClick={handleMarkDone}
            disabled={isPending}
            className="px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors text-xs font-medium flex items-center gap-1 disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-sm">check</span>
            Done
          </button>

          <button
            onClick={handleDismiss}
            disabled={isPending}
            className="px-3 py-1.5 rounded-lg bg-zinc-500/10 text-zinc-400 hover:bg-zinc-500/20 transition-colors text-xs font-medium flex items-center gap-1 disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-sm">close</span>
            Dismiss
          </button>
        </div>
      )}

      {/* Status indicator for resolved items */}
      {isResolved && (
        <div className="mt-2 ml-[52px]">
          <span className={`text-xs ${isDone ? 'text-emerald-500' : 'text-zinc-500'}`}>
            {isDone ? '✓ Completed' : '✗ Dismissed'}
          </span>
        </div>
      )}

      {/* Expanded file list */}
      {expanded && !isResolved && (
        <div className="mt-3 ml-[52px] space-y-1 bg-bg-dark/50 rounded-lg p-3 max-h-60 overflow-y-auto">
          {recommendation.files.slice(0, 30).map((file, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="material-symbols-outlined text-xs text-zinc-500 mt-0.5 flex-shrink-0">
                description
              </span>
              <span className="text-xs text-zinc-300 font-mono break-all leading-relaxed">
                {file}
              </span>
            </div>
          ))}
          {recommendation.files.length > 30 && (
            <div className="text-xs text-zinc-500 pt-1">
              +{recommendation.files.length - 30} more files
            </div>
          )}
        </div>
      )}
    </div>
  );
}
