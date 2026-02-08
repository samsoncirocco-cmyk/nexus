import { getDeviceDetails } from '@/app/actions/devices';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import StorageOverview from '@/components/devices/StorageOverview';
import FileTypeChart from '@/components/devices/FileTypeChart';
import FileAgeChart from '@/components/devices/FileAgeChart';
import FileSizeChart from '@/components/devices/FileSizeChart';
import DuplicatesSection from '@/components/devices/DuplicatesSection';

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

function formatRelativeTime(isoString: string | null): string {
  if (!isoString) return 'Never';
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default async function DeviceDetailPage({ params }: PageProps) {
  const { id } = await params;
  const data = await getDeviceDetails(id);

  if (!data) {
    notFound();
  }

  const { device, latestScan, recommendationCount, totalSavings } = data;

  return (
    <div className="min-h-screen bg-bg-dark pb-28 md:pb-6">
      {/* Header */}
      <div className="px-4 pt-6 pb-4">
        <Link
          href="/devices"
          className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-primary transition-colors mb-4"
        >
          <span className="material-symbols-outlined text-base">arrow_back</span>
          Back to Devices
        </Link>

        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 size-16 rounded-xl bg-gradient-to-br from-secondary-dark to-bg-dark border border-primary/20 flex items-center justify-center">
            <span className="material-symbols-outlined text-primary text-3xl">
              {DEVICE_ICONS[device.type]}
            </span>
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-display font-bold text-white mb-1">
              {device.name}
            </h1>
            <div className="flex items-center gap-3 text-sm text-zinc-400">
              <span className="capitalize">{device.type}</span>
              {device.os && (
                <>
                  <span className="text-zinc-600">•</span>
                  <span>{device.os}</span>
                </>
              )}
              {device.lastScan && (
                <>
                  <span className="text-zinc-600">•</span>
                  <span>Last scan {formatRelativeTime(device.lastScan)}</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* No Scan State */}
      {!latestScan && (
        <div className="px-4 mt-8">
          <div className="bg-gradient-to-br from-secondary-dark to-bg-dark rounded-xl p-8 border border-primary/20 text-center">
            <div className="inline-flex items-center justify-center size-16 rounded-full bg-primary/10 mb-4">
              <span className="material-symbols-outlined text-primary text-3xl">
                pending_actions
              </span>
            </div>
            <h2 className="text-xl font-display font-bold text-white mb-2">
              No Scans Yet
            </h2>
            <p className="text-zinc-400 mb-4">
              Run your first scan to see storage breakdown and cleanup recommendations.
            </p>
            <code className="inline-block bg-bg-dark px-4 py-2 rounded text-sm text-zinc-300 font-mono">
              python scan.py --directory ~/Downloads --device-id {device.id} --upload
            </code>
          </div>
        </div>
      )}

      {/* Main Content */}
      {latestScan && (
        <>
          {/* Storage Overview */}
          <div className="px-4 mb-6">
            <StorageOverview device={device} scan={latestScan} />
          </div>

          {/* Recommendations Banner */}
          {recommendationCount > 0 && (
            <div className="px-4 mb-6">
              <Link href={`/devices/${device.id}/recommendations`}>
                <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30 rounded-xl p-4 hover:border-amber-500/50 transition-colors group">
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 size-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                      <span className="material-symbols-outlined text-amber-400">
                        lightbulb
                      </span>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-white font-medium">
                        {recommendationCount} Cleanup Recommendation{recommendationCount !== 1 ? 's' : ''}
                      </h3>
                      <p className="text-sm text-amber-300">
                        Potential savings: {formatBytes(totalSavings)}
                      </p>
                    </div>
                    <span className="material-symbols-outlined text-amber-400 group-hover:translate-x-1 transition-transform">
                      arrow_forward
                    </span>
                  </div>
                </div>
              </Link>
            </div>
          )}

          {/* Duplicates Section */}
          {latestScan.duplicates.groups > 0 && (
            <div className="px-4 mb-6">
              <DuplicatesSection duplicates={latestScan.duplicates} deviceId={device.id} />
            </div>
          )}

          {/* Storage Breakdown Charts */}
          <div className="px-4 mb-6">
            <h2 className="text-lg font-display font-bold text-white mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">
                pie_chart
              </span>
              Storage Breakdown
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <FileTypeChart summary={latestScan.summary} />
              <FileAgeChart summary={latestScan.summary} />
              <FileSizeChart summary={latestScan.summary} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
