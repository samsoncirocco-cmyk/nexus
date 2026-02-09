import { getDeviceDetails, getRecommendations } from '@/app/actions/devices';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import RecommendationCard from '@/components/devices/RecommendationCard';
import type { RecommendationType } from '@/lib/devices.types';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

const DEVICE_ICONS: Record<string, string> = {
  mac: 'laptop_mac',
  windows: 'computer',
  linux: 'developer_board',
  iphone: 'smartphone',
  android: 'phone_android',
};

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

const TYPE_LABELS: Record<RecommendationType, { label: string; icon: string; color: string }> = {
  duplicates: { label: 'Duplicate Files', icon: 'content_copy', color: 'text-amber-400' },
  'old-downloads': { label: 'Old Downloads', icon: 'download', color: 'text-blue-400' },
  'large-files': { label: 'Large Files', icon: 'hard_drive', color: 'text-red-400' },
  'old-screenshots': { label: 'Old Screenshots', icon: 'screenshot_monitor', color: 'text-purple-400' },
  'empty-folders': { label: 'Empty Folders', icon: 'folder_off', color: 'text-zinc-400' },
};

export default async function RecommendationsPage({ params }: PageProps) {
  const { id } = await params;
  const data = await getDeviceDetails(id);

  if (!data) {
    notFound();
  }

  const { device, recommendations } = data;

  // Separate pending and resolved
  const pending = recommendations.filter(r => r.status === 'pending');
  const resolved = recommendations.filter(r => r.status !== 'pending');

  // Group pending by type
  const groupedPending = new Map<RecommendationType, typeof pending>();
  for (const rec of pending) {
    const group = groupedPending.get(rec.type) || [];
    group.push(rec);
    groupedPending.set(rec.type, group);
  }

  // Calculate stats
  const totalSavings = pending.reduce((sum, r) => sum + r.savings, 0);
  const totalPending = pending.length;

  return (
    <div className="min-h-screen bg-bg-dark pb-28 md:pb-6">
      {/* Header */}
      <div className="px-4 pt-6 pb-4">
        <Link
          href={`/devices/${device.id}`}
          className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-primary transition-colors mb-4"
        >
          <span className="material-symbols-outlined text-base">arrow_back</span>
          Back to {device.name}
        </Link>

        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 size-14 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/10 border border-amber-500/20 flex items-center justify-center">
            <span className="material-symbols-outlined text-amber-400 text-2xl">
              lightbulb
            </span>
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-display font-bold text-white mb-1">
              Cleanup Recommendations
            </h1>
            <div className="flex items-center gap-3 text-sm text-zinc-400">
              <span>{device.name}</span>
              <span className="text-zinc-600">•</span>
              <span>{totalPending} pending</span>
              {totalSavings > 0 && (
                <>
                  <span className="text-zinc-600">•</span>
                  <span className="text-primary font-medium">{formatBytes(totalSavings)} savable</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      {totalPending > 0 && (
        <div className="px-4 mb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Array.from(groupedPending.entries()).map(([type, recs]) => {
              const meta = TYPE_LABELS[type];
              const typeSavings = recs.reduce((sum, r) => sum + r.savings, 0);
              return (
                <div
                  key={type}
                  className="bg-gradient-to-br from-secondary-dark to-bg-dark rounded-xl p-3 border border-primary/10"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`material-symbols-outlined text-sm ${meta.color}`}>
                      {meta.icon}
                    </span>
                    <span className="text-xs text-zinc-400">{meta.label}</span>
                  </div>
                  <div className="text-lg font-bold text-white">{recs.length}</div>
                  {typeSavings > 0 && (
                    <div className="text-xs text-primary">{formatBytes(typeSavings)}</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty State */}
      {recommendations.length === 0 && (
        <div className="px-4 mt-8">
          <div className="bg-gradient-to-br from-secondary-dark to-bg-dark rounded-xl p-8 border border-primary/20 text-center">
            <div className="inline-flex items-center justify-center size-16 rounded-full bg-emerald-500/10 mb-4">
              <span className="material-symbols-outlined text-emerald-400 text-3xl">
                check_circle
              </span>
            </div>
            <h2 className="text-xl font-display font-bold text-white mb-2">
              All Clean!
            </h2>
            <p className="text-zinc-400">
              No cleanup recommendations right now. Run a new scan to check again.
            </p>
          </div>
        </div>
      )}

      {/* Pending Recommendations */}
      {pending.length > 0 && (
        <div className="px-4 mb-6">
          <h2 className="text-lg font-display font-bold text-white mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">pending_actions</span>
            Action Needed
          </h2>
          <div className="space-y-3">
            {pending.map((rec) => (
              <RecommendationCard
                key={rec.id}
                recommendation={rec}
                deviceId={device.id}
              />
            ))}
          </div>
        </div>
      )}

      {/* Resolved Recommendations */}
      {resolved.length > 0 && (
        <div className="px-4 mb-6">
          <h2 className="text-lg font-display font-bold text-white mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-zinc-500">history</span>
            Resolved
          </h2>
          <div className="space-y-3">
            {resolved.map((rec) => (
              <RecommendationCard
                key={rec.id}
                recommendation={rec}
                deviceId={device.id}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
