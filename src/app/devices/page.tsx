import { getDevices } from '@/app/actions/devices';
import Link from 'next/link';
import DeviceCard from '@/components/devices/DeviceCard';

export const metadata = {
  title: 'Devices — Second Brain',
  description: 'Device storage and cleanup recommendations',
};

export const dynamic = 'force-dynamic';

export default async function DevicesPage() {
  const devices = await getDevices();

  return (
    <div className="min-h-screen bg-bg-dark pb-28 md:pb-6">
      {/* Header */}
      <div className="px-4 pt-6 pb-4">
        <div className="flex items-center gap-3 mb-2">
          <span className="material-symbols-outlined text-primary text-3xl">
            storage
          </span>
          <h1 className="text-2xl font-display font-bold text-white">
            Devices
          </h1>
        </div>
        <p className="text-zinc-400 text-sm">
          Storage analysis and cleanup recommendations across your devices
        </p>
      </div>

      {/* Empty State */}
      {devices.length === 0 && (
        <div className="px-4 mt-12">
          <div className="bg-gradient-to-br from-secondary-dark to-bg-dark rounded-xl p-8 border border-primary/20 text-center">
            <div className="inline-flex items-center justify-center size-16 rounded-full bg-primary/10 mb-4">
              <span className="material-symbols-outlined text-primary text-3xl">
                devices
              </span>
            </div>
            <h2 className="text-xl font-display font-bold text-white mb-2">
              No Devices Connected
            </h2>
            <p className="text-zinc-400 mb-6 max-w-md mx-auto">
              Connect your first device to start scanning files, finding duplicates, and getting cleanup recommendations.
            </p>
            <div className="bg-bg-dark/50 rounded-lg p-4 text-left max-w-md mx-auto">
              <p className="text-sm font-medium text-zinc-300 mb-2">
                To scan a device:
              </p>
              <ol className="text-sm text-zinc-400 space-y-2">
                <li className="flex gap-2">
                  <span className="text-primary font-mono">1.</span>
                  <span>
                    Download the scanner:{' '}
                    <code className="text-xs bg-zinc-800 px-2 py-0.5 rounded font-mono">
                      tools/device-scanner/scan.py
                    </code>
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="text-primary font-mono">2.</span>
                  <span>
                    Run:{' '}
                    <code className="text-xs bg-zinc-800 px-2 py-0.5 rounded font-mono">
                      python scan.py --directory ~/Downloads --upload
                    </code>
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="text-primary font-mono">3.</span>
                  <span>Results will sync automatically</span>
                </li>
              </ol>
            </div>
          </div>
        </div>
      )}

      {/* Device Grid */}
      {devices.length > 0 && (
        <div className="px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {devices.map((device) => (
              <DeviceCard key={device.id} device={device} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
