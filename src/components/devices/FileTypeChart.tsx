import { ScanSummary } from '@/lib/devices.types';

interface FileTypeChartProps {
  summary: ScanSummary;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

const TYPE_ICONS: Record<string, string> = {
  images: 'image',
  videos: 'movie',
  documents: 'description',
  audio: 'audio_file',
  archives: 'folder_zip',
  code: 'code',
  spreadsheets: 'table_chart',
  presentations: 'slideshow',
  other: 'draft',
};

const TYPE_COLORS: Record<string, string> = {
  images: 'from-pink-500 to-rose-500',
  videos: 'from-purple-500 to-violet-500',
  documents: 'from-blue-500 to-cyan-500',
  audio: 'from-emerald-500 to-teal-500',
  archives: 'from-amber-500 to-orange-500',
  code: 'from-green-500 to-lime-500',
  spreadsheets: 'from-emerald-500 to-green-500',
  presentations: 'from-orange-500 to-red-500',
  other: 'from-zinc-500 to-gray-500',
};

export default function FileTypeChart({ summary }: FileTypeChartProps) {
  const types = Object.entries(summary.byType)
    .map(([type, stats]) => ({
      type,
      ...stats,
      percent: (stats.size / summary.totalSize) * 100,
    }))
    .filter(item => item.count > 0)
    .sort((a, b) => b.size - a.size)
    .slice(0, 8); // Top 8 types

  const maxSize = Math.max(...types.map(t => t.size));

  return (
    <div className="bg-gradient-to-br from-secondary-dark to-bg-dark rounded-xl p-5 border border-primary/20">
      <h3 className="text-base font-display font-bold text-white mb-4 flex items-center gap-2">
        <span className="material-symbols-outlined text-sm text-primary">
          category
        </span>
        By File Type
      </h3>

      {types.length === 0 ? (
        <div className="text-center py-8 text-zinc-500 text-sm">
          No data available
        </div>
      ) : (
        <div className="space-y-3">
          {types.map((item) => (
            <div key={item.type}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-xs text-zinc-400">
                    {TYPE_ICONS[item.type] || 'draft'}
                  </span>
                  <span className="text-xs font-medium text-zinc-300 capitalize">
                    {item.type}
                  </span>
                </div>
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
                  className={`h-full bg-gradient-to-r ${TYPE_COLORS[item.type] || TYPE_COLORS.other} rounded-full transition-all duration-700`}
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
