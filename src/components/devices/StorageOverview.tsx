import { Device, ScanResult } from '@/lib/devices.types';

interface StorageOverviewProps {
  device: Device;
  scan: ScanResult;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

export default function StorageOverview({ device, scan }: StorageOverviewProps) {
  const storagePercent = device.storageTotal && device.storageUsed
    ? Math.round((device.storageUsed / device.storageTotal) * 100)
    : 0;

  const stats = [
    {
      icon: 'description',
      label: 'Total Files',
      value: scan.summary.totalFiles.toLocaleString(),
      color: 'text-blue-400',
    },
    {
      icon: 'folder',
      label: 'Total Size',
      value: formatBytes(scan.summary.totalSize),
      color: 'text-emerald-400',
    },
    {
      icon: 'content_copy',
      label: 'Duplicate Groups',
      value: scan.duplicates.groups.toLocaleString(),
      color: 'text-amber-400',
    },
    {
      icon: 'delete_sweep',
      label: 'Potential Savings',
      value: formatBytes(scan.duplicates.totalSavings),
      color: 'text-primary',
    },
  ];

  return (
    <div className="bg-gradient-to-br from-secondary-dark to-bg-dark rounded-xl p-6 border border-primary/20 relative overflow-hidden">
      <div className="absolute -right-8 -top-8 size-32 bg-primary/5 rounded-full blur-3xl" />
      
      <div className="relative z-10">
        <h2 className="text-lg font-display font-bold text-white mb-6 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">
            analytics
          </span>
          Storage Overview
        </h2>

        {/* Storage Bar */}
        {device.storageTotal && device.storageUsed ? (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-zinc-300">
                {formatBytes(device.storageUsed)} used of {formatBytes(device.storageTotal)}
              </span>
              <span className={`text-sm font-bold ${
                storagePercent > 90 ? 'text-red-400' : 
                storagePercent > 75 ? 'text-amber-400' : 
                'text-emerald-400'
              }`}>
                {storagePercent}%
              </span>
            </div>
            <div className="h-3 bg-bg-dark rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
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

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="bg-bg-dark/50 rounded-lg p-4 border border-white/5"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className={`material-symbols-outlined text-sm ${stat.color}`}>
                  {stat.icon}
                </span>
                <span className="text-xs text-zinc-400">{stat.label}</span>
              </div>
              <div className={`text-xl font-display font-bold ${stat.color}`}>
                {stat.value}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
