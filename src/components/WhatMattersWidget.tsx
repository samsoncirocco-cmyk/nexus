'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';

interface HotTopic {
  topic: string;
  count: number;
  sources: string[];
}

interface ActionItem {
  id: string;
  title: string;
  column: string;
  age: number;
  priority: string;
}

interface StaleAlert {
  id: string;
  title: string;
  daysStale: number;
}

interface RecentDoc {
  title: string;
  path: string;
  modified: string;
}

interface WhatMattersData {
  hotTopics: HotTopic[];
  actionItems: ActionItem[];
  staleAlerts: StaleAlert[];
  recentDocs: RecentDoc[];
}

export default function WhatMattersWidget() {
  const [data, setData] = useState<WhatMattersData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState({
    topics: true,
    actions: true,
    stale: true,
    docs: true,
  });

  const fetchData = async () => {
    try {
      const res = await fetch('/api/what-matters', { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (error) {
      console.error('Failed to fetch what matters:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Auto-refresh every 5 minutes
    const interval = setInterval(fetchData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-secondary-dark to-bg-dark rounded-xl p-5 border border-primary/20 relative overflow-hidden">
        <div className="absolute -right-4 -top-4 size-24 bg-primary/10 rounded-full blur-2xl" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined text-primary animate-pulse" style={{ fontSize: 20 }}>
              query_stats
            </span>
            <h4 className="text-primary font-bold text-lg">What Matters Now</h4>
          </div>
          <div className="space-y-3">
            <div className="h-8 bg-primary/5 rounded animate-pulse" />
            <div className="h-8 bg-primary/5 rounded animate-pulse" />
            <div className="h-8 bg-primary/5 rounded animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const getAgeColor = (age: number) => {
    if (age > 7) return 'text-red-400';
    if (age > 3) return 'text-yellow-400';
    return 'text-emerald-400';
  };

  const getPriorityColor = (priority: string) => {
    if (priority === 'high') return 'border-red-500/30 bg-red-500/10';
    if (priority === 'medium') return 'border-yellow-500/30 bg-yellow-500/10';
    return 'border-primary/20 bg-primary/5';
  };

  return (
    <div className="bg-gradient-to-br from-secondary-dark to-bg-dark rounded-xl p-5 border border-primary/20 relative overflow-hidden">
      <div className="absolute -right-4 -top-4 size-24 bg-primary/10 rounded-full blur-2xl" />
      
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary" style={{ fontSize: 20, fontVariationSettings: "'FILL' 1" }}>
              query_stats
            </span>
            <h4 className="text-primary font-bold text-lg">What Matters Now</h4>
          </div>
          <div className="relative">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <div className="absolute inset-0 w-2 h-2 rounded-full bg-emerald-500 animate-ping opacity-75" />
          </div>
        </div>

        <div className="space-y-4">
          {/* Hot Topics */}
          {data.hotTopics.length > 0 && (
            <div className="bg-secondary-dark/40 border border-primary/5 rounded-lg overflow-hidden">
              <button
                onClick={() => toggleSection('topics')}
                className="w-full flex items-center justify-between p-3 hover:bg-primary/5 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-orange-400" style={{ fontSize: 16 }}>
                    local_fire_department
                  </span>
                  <span className="text-primary/70 text-xs font-bold uppercase tracking-wider">
                    Hot Topics ({data.hotTopics.length})
                  </span>
                </div>
                <span className="material-symbols-outlined text-primary/40" style={{ fontSize: 16 }}>
                  {expandedSections.topics ? 'expand_less' : 'expand_more'}
                </span>
              </button>
              
              {expandedSections.topics && (
                <div className="px-3 pb-3">
                  <div className="flex flex-wrap gap-2">
                    {data.hotTopics.map((topic, idx) => (
                      <div
                        key={idx}
                        className="px-3 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 flex items-center gap-2"
                      >
                        <span className="text-orange-300 text-xs font-medium capitalize">
                          {topic.topic}
                        </span>
                        <span className="px-1.5 py-0.5 rounded-full bg-orange-500/20 text-orange-400 text-[9px] font-bold">
                          {topic.count}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Action Items */}
          {data.actionItems.length > 0 && (
            <div className="bg-secondary-dark/40 border border-primary/5 rounded-lg overflow-hidden">
              <button
                onClick={() => toggleSection('actions')}
                className="w-full flex items-center justify-between p-3 hover:bg-primary/5 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary" style={{ fontSize: 16 }}>
                    check_circle
                  </span>
                  <span className="text-primary/70 text-xs font-bold uppercase tracking-wider">
                    Action Items ({data.actionItems.length})
                  </span>
                </div>
                <span className="material-symbols-outlined text-primary/40" style={{ fontSize: 16 }}>
                  {expandedSections.actions ? 'expand_less' : 'expand_more'}
                </span>
              </button>
              
              {expandedSections.actions && (
                <div className="px-3 pb-3 space-y-2">
                  {data.actionItems.map((item) => (
                    <Link
                      key={item.id}
                      href="/tasks"
                      className={`block px-3 py-2 rounded-lg border ${getPriorityColor(item.priority)} hover:border-primary/30 transition-colors`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-white text-xs font-medium leading-tight flex-1">
                          {item.title}
                        </p>
                        <span className={`text-[9px] font-bold uppercase tracking-wider shrink-0 ${getAgeColor(item.age)}`}>
                          {item.age}d
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[9px] font-medium uppercase">
                          {item.column}
                        </span>
                        {item.priority === 'high' && (
                          <span className="text-red-400 text-[9px] font-bold">⚠️ HIGH</span>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Stale Alerts */}
          {data.staleAlerts.length > 0 && (
            <div className="bg-secondary-dark/40 border border-yellow-500/20 rounded-lg overflow-hidden">
              <button
                onClick={() => toggleSection('stale')}
                className="w-full flex items-center justify-between p-3 hover:bg-primary/5 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-yellow-400" style={{ fontSize: 16 }}>
                    warning
                  </span>
                  <span className="text-yellow-400/70 text-xs font-bold uppercase tracking-wider">
                    Stale Alerts ({data.staleAlerts.length})
                  </span>
                </div>
                <span className="material-symbols-outlined text-primary/40" style={{ fontSize: 16 }}>
                  {expandedSections.stale ? 'expand_less' : 'expand_more'}
                </span>
              </button>
              
              {expandedSections.stale && (
                <div className="px-3 pb-3 space-y-2">
                  {data.staleAlerts.map((alert) => (
                    <Link
                      key={alert.id}
                      href="/tasks"
                      className="block px-3 py-2 rounded-lg border border-yellow-500/30 bg-yellow-500/10 hover:border-yellow-500/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-white text-xs font-medium leading-tight flex-1">
                          {alert.title}
                        </p>
                        <span className={`text-[9px] font-bold uppercase tracking-wider shrink-0 ${
                          alert.daysStale > 7 ? 'text-red-400' : 'text-yellow-400'
                        }`}>
                          {alert.daysStale}d stale
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Recent Vault Changes */}
          {data.recentDocs.length > 0 && (
            <div className="bg-secondary-dark/40 border border-primary/5 rounded-lg overflow-hidden">
              <button
                onClick={() => toggleSection('docs')}
                className="w-full flex items-center justify-between p-3 hover:bg-primary/5 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary" style={{ fontSize: 16 }}>
                    history
                  </span>
                  <span className="text-primary/70 text-xs font-bold uppercase tracking-wider">
                    Recently Changed ({data.recentDocs.length})
                  </span>
                </div>
                <span className="material-symbols-outlined text-primary/40" style={{ fontSize: 16 }}>
                  {expandedSections.docs ? 'expand_less' : 'expand_more'}
                </span>
              </button>
              
              {expandedSections.docs && (
                <div className="px-3 pb-3 space-y-2">
                  {data.recentDocs.map((doc, idx) => {
                    const category = doc.path.split('/')[0] || 'docs';
                    const slug = doc.path.replace(/\.md$/, '').replace(/\//g, '-');
                    
                    return (
                      <Link
                        key={idx}
                        href={`/doc/${slug}`}
                        className="block px-3 py-2 rounded-lg border border-primary/10 bg-primary/5 hover:border-primary/20 transition-colors"
                      >
                        <p className="text-white text-xs font-medium leading-tight capitalize">
                          {doc.title}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="px-2 py-0.5 rounded-full bg-primary/15 text-primary text-[9px] font-medium uppercase">
                            {category}
                          </span>
                          <span className="text-primary/40 text-[9px]" suppressHydrationWarning>
                            {(() => {
                              try {
                                return formatDistanceToNow(new Date(doc.modified), { addSuffix: true });
                              } catch {
                                return doc.modified;
                              }
                            })()}
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Empty state */}
          {data.hotTopics.length === 0 && 
           data.actionItems.length === 0 && 
           data.staleAlerts.length === 0 && 
           data.recentDocs.length === 0 && (
            <div className="text-center py-6">
              <span className="material-symbols-outlined text-primary/30 mb-2" style={{ fontSize: 28 }}>
                check_circle
              </span>
              <p className="text-primary/40 text-sm">All clear! Nothing urgent right now.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
