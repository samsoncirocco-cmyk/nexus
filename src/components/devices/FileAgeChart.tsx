import { ScanSummary } from '@/lib/devices.types';

interface FileAgeChartProps {
  summary: ScanSummary;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

const AGE_LABELS: Record<string, string> = {
  '0-30d': '0-30 days',
  '31-90d': '31-90 days',
  '91-180d': '3-6 months',
  '181-365d': '6-12 months',
  '1y+': '1+ years',
};

const AGE_COLORS: Record<string, string> = {
  '0-30d': 'from-emerald-500 to-teal-500',
  '31-90d': 'from-blue-500 to-cyan-500',
  '91-180d': 'from-amber-500 to-yellow-500',
  '181-365d': 'from-orange-500 to-red-500',
  '1y+': 'from-red-600 to-rose-700',
};

const AGE_ORDER = ['0-30d', '31-90d', '91-180d', '181-365d', '1y+'];

export default function FileAgeChart({ summary }: FileAgeChartProps) {
  const ages = AGE_ORDER
    .map((bucket) => {
      const stats = summary.byAge[bucket] || { count: 0, size: 0 };
      return {
        bucket,
        ...stats,
        percent: (stats.size / summary.totalSize) * 100,
      };
    })
    .filter(item => item.count > 0);

  const maxSize = Math.max(...ages.map(a => a.size));

  return (
    <div className="bg-gradient-to-br from-secondary-dark to-bg-dark rounded-xl p-5 border border-primary/20">
      <h3 className="text-base font-display font-bold text-white mb-4 flex items-center gap-2">
        <span className="material-symbols-outlined text-sm text-primary">
          schedule
        </span>
        By File Age
      </h3>

      {ages.length === 0 ? (
        <div className="text-center py-8 text-zinc-500 text-sm">
          No data available
        </div>
      ) : (
        <div className="space-y-3">
          {ages.map((item) => (
            <div key={item.bucket}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium text-zinc-300">
                  {AGE_LABELS[item.bucket]}
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
                  className={`h-full bg-gradient-to-r ${AGE_COLORS[item.bucket]} rounded-full transition-all duration-700`}
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
