import Link from 'next/link';
import { Device } from '@/lib/devices.types';

interface DeviceCardProps {
  device: Device;
}

const DEVICE_ICONS: Record<Device['type'], string> = {
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
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function DeviceCard({ device }: DeviceCardProps) {
  const storagePercent = device.storageTotal && device.storageUsed
    ? Math.round((device.storageUsed / device.storageTotal) * 100)
    : 0;

  return (
    <Link href={`/devices/${device.id}`}>
      <div className="bg-gradient-to-br from-secondary-dark to-bg-dark rounded-xl p-5 border border-primary/20 relative overflow-hidden group hover:border-primary/40 transition-all duration-300 hover:shadow-[0_0_30px_rgba(250,222,41,0.15)]">
        {/* Glow effect */}
        <div className="absolute -right-4 -top-4 size-24 bg-primary/10 rounded-full blur-2xl group-hover:bg-primary/15 transition-colors" />
        
        <div className="relative z-10">
          {/* Header */}
          <div className="flex items-start gap-3 mb-4">
            <div className="flex-shrink-0 size-12 rounded-lg bg-bg-dark/50 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary text-2xl">
                {DEVICE_ICONS[device.type]}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-display font-bold text-white truncate">
                {device.name}
              </h3>
              <p className="text-xs text-zinc-400 capitalize">
                {device.type} {device.os && `• ${device.os}`}
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="space-y-3 mb-4">
            {/* Storage Bar */}
            {device.storageTotal && device.storageUsed ? (
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-zinc-400">Storage</span>
                  <span className="text-zinc-300 font-medium">
                    {formatBytes(device.storageUsed)} / {formatBytes(device.storageTotal)}
                  </span>
                </div>
                <div className="h-2 bg-bg-dark rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      storagePercent > 90
                        ? 'bg-gradient-to-r from-red-500 to-orange-500'
                        : storagePercent > 75
                        ? 'bg-gradient-to-r from-amber-500 to-yellow-500'
                        : 'bg-gradient-to-r from-emerald-500 to-primary'
                    }`}
                    style={{ width: `${storagePercent}%` }}
                  />
                </div>
              </div>
            ) : null}

            {/* Quick Stats */}
            <div className="flex items-center gap-4">
              {device.totalFiles !== undefined && (
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-zinc-400 text-sm">
                    description
                  </span>
                  <span className="text-xs text-zinc-300">
                    {device.totalFiles.toLocaleString()} files
                  </span>
                </div>
              )}
              {device.duplicateGroups !== undefined && device.duplicateGroups > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-amber-400 text-sm">
                    content_copy
                  </span>
                  <span className="text-xs text-amber-300">
                    {device.duplicateGroups} duplicates
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-3 border-t border-white/5">
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-zinc-500 text-sm">
                schedule
              </span>
              <span className="text-xs text-zinc-400">
                {formatRelativeTime(device.lastScan)}
              </span>
            </div>
            {device.potentialSavings !== undefined && device.potentialSavings > 0 && (
              <div className="px-2 py-1 rounded bg-primary/10 text-primary text-xs font-medium">
                {formatBytes(device.potentialSavings)} savable
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
