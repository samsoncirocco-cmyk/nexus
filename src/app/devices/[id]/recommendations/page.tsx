import { getDeviceDetails } from '@/app/actions/devices';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import RecommendationsClient from './RecommendationsClient';
import type { Recommendation } from '@/lib/devices.types';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

export default async function RecommendationsPage({ params }: PageProps) {
  const { id } = await params;
  const data = await getDeviceDetails(id);

  if (!data) {
    notFound();
  }

  const { device } = data;
  // Cast to the shared types (the shapes are identical, just exported from different files)
  const recommendations = data.recommendations as unknown as Recommendation[];
  const pending = recommendations.filter(r => r.status === 'pending');
  const resolved = recommendations.filter(r => r.status === 'done' || r.status === 'dismissed');
  const totalSavings = pending.reduce((sum, r) => sum + r.savings, 0);

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
            <p className="text-sm text-zinc-400">
              {pending.length} recommendation{pending.length !== 1 ? 's' : ''}
              {totalSavings > 0 && (
                <> · <span className="text-primary font-medium">{formatBytes(totalSavings)}</span> potential savings</>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      {recommendations.length > 0 && (
        <div className="px-4 mb-6">
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-gradient-to-br from-secondary-dark to-bg-dark rounded-xl p-3 border border-primary/10 text-center">
              <div className="text-xl font-bold text-primary">{pending.length}</div>
              <div className="text-xs text-zinc-400">Pending</div>
            </div>
            <div className="bg-gradient-to-br from-secondary-dark to-bg-dark rounded-xl p-3 border border-emerald-500/10 text-center">
              <div className="text-xl font-bold text-emerald-400">
                {recommendations.filter(r => r.status === 'done').length}
              </div>
              <div className="text-xs text-zinc-400">Completed</div>
            </div>
            <div className="bg-gradient-to-br from-secondary-dark to-bg-dark rounded-xl p-3 border border-zinc-500/10 text-center">
              <div className="text-xl font-bold text-zinc-400">
                {recommendations.filter(r => r.status === 'dismissed').length}
              </div>
              <div className="text-xs text-zinc-400">Dismissed</div>
            </div>
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
              Your device is clean! ✨
            </h2>
            <p className="text-zinc-400">
              No cleanup recommendations at this time. Run another scan to check again.
            </p>
          </div>
        </div>
      )}

      {/* Recommendations List */}
      {recommendations.length > 0 && (
        <RecommendationsClient
          deviceId={device.id}
          pending={pending}
          resolved={resolved}
        />
      )}
    </div>
  );
}
