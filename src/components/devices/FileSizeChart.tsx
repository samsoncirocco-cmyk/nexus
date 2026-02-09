import { ScanSummary } from '@/lib/devices.types';

interface FileSizeChartProps {
  summary: ScanSummary;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

const SIZE_LABELS: Record<string, string> = {
  '0-1MB': '0-1 MB',
  '1-10MB': '1-10 MB',
  '10-100MB': '10-100 MB',
  '100MB-1GB': '100 MB - 1 GB',
  '1GB+': '1+ GB',
};

const SIZE_COLORS: Record<string, string> = {
  '0-1MB': 'from-blue-500 to-cyan-500',
  '1-10MB': 'from-emerald-500 to-teal-500',
  '10-100MB': 'from-amber-500 to-yellow-500',
  '100MB-1GB': 'from-orange-500 to-red-500',
  '1GB+': 'from-red-600 to-rose-700',
};

const SIZE_ORDER = ['0-1MB', '1-10MB', '10-100MB', '100MB-1GB', '1GB+'];

export default function FileSizeChart({ summary }: FileSizeChartProps) {
  const sizes = SIZE_ORDER
    .map((bucket) => {
      const stats = summary.bySize[bucket] || { count: 0, size: 0 };
      return {
        bucket,
        ...stats,
        percent: (stats.size / summary.totalSize) * 100,
      };
    })
    .filter(item => item.count > 0);

  const maxSize = Math.max(...sizes.map(s => s.size));

  return (
    <div className="bg-gradient-to-br from-secondary-dark to-bg-dark rounded-xl p-5 border border-primary/20">
      <h3 className="text-base font-display font-bold text-white mb-4 flex items-center gap-2">
        <span className="material-symbols-outlined text-sm text-primary">
          data_usage
        </span>
        By File Size
      </h3>

      {sizes.length === 0 ? (
        <div className="text-center py-8 text-zinc-500 text-sm">
          No data available
        </div>
      ) : (
        <div className="space-y-3">
          {sizes.map((item) => (
            <div key={item.bucket}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium text-zinc-300">
                  {SIZE_LABELS[item.bucket]}
                </span>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-zinc-400">
                    {item.count.toLocaleString()}
                  </span>
                  <span className="text-xs font-medium text-zinc-200 min-w-[50px] text-right">
                    {formatBytes(item.size)}
                  </span>
                </div>
              </div>
              <div className="h-2 bg-bg-dark rounded-full overflow-hidden">
                <div
                  className={`h-full bg-gradient-to-r ${SIZE_COLORS[item.bucket]} rounded-full transition-all duration-700`}
                  style={{ width: `${(item.size / maxSize) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
