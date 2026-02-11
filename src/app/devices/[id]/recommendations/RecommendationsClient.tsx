'use client';

import { useState } from 'react';
import RecommendationCard from '@/components/devices/RecommendationCard';
import type { Recommendation } from '@/lib/devices.types';

interface RecommendationsClientProps {
  deviceId: string;
  pending: Recommendation[];
  resolved: Recommendation[];
}

export default function RecommendationsClient({
  deviceId,
  pending,
  resolved,
}: RecommendationsClientProps) {
  const [showResolved, setShowResolved] = useState(false);

  return (
    <div className="px-4">
      {/* Pending Recommendations */}
      {pending.length > 0 && (
        <div className="mb-6">
          <h2 className="text-base font-display font-bold text-white mb-3 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-lg">
              pending_actions
            </span>
            Action Items
          </h2>
          <div className="space-y-3">
            {pending.map(rec => (
              <RecommendationCard
                key={rec.id}
                recommendation={rec}
                deviceId={deviceId}
              />
            ))}
          </div>
        </div>
      )}

      {/* Resolved Recommendations */}
      {resolved.length > 0 && (
        <div>
          <button
            onClick={() => setShowResolved(!showResolved)}
            className="flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-300 transition-colors mb-3"
          >
            <span className={`material-symbols-outlined text-base transition-transform ${showResolved ? 'rotate-180' : ''}`}>
              expand_more
            </span>
            {resolved.length} resolved recommendation{resolved.length !== 1 ? 's' : ''}
          </button>

          {showResolved && (
            <div className="space-y-3">
              {resolved.map(rec => (
                <RecommendationCard
                  key={rec.id}
                  recommendation={rec}
                  deviceId={deviceId}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
