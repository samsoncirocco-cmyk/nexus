'use client';

import { useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { EmailItemSkeleton } from './skeletons/EmailItemSkeleton';

interface Email {
  from: string;
  subject: string;
  date: string;
  snippet: string;
  account: string;
}

interface EmailDigestData {
  success: boolean;
  count: number;
  emails: Email[];
}

export default function EmailDigest() {
  const [data, setData] = useState<EmailDigestData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/email-digest', { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (error) {
      console.error('Failed to fetch email digest:', error);
      setData({ success: false, count: 0, emails: [] });
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

  // Extract sender name from "Name <email>" format
  const getSenderName = (from: string): string => {
    const match = from.match(/^(.+?)\s*</);
    return match ? match[1].trim() : from.split('@')[0];
  };

  // Get account badge color
  const getAccountColor = (account: string) => {
    return account === 'personal' 
      ? 'bg-blue-500/15 text-blue-300 border-blue-500/30'
      : 'bg-purple-500/15 text-purple-300 border-purple-500/30';
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-secondary-dark to-bg-dark rounded-xl p-5 border border-primary/20 relative overflow-hidden">
        <div className="absolute -right-4 -top-4 size-24 bg-primary/10 rounded-full blur-2xl" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined text-primary animate-pulse" style={{ fontSize: 20 }}>
              mail
            </span>
            <h4 className="text-primary font-bold text-lg">Email Digest</h4>
          </div>
          <div className="space-y-2">
            <EmailItemSkeleton />
            <EmailItemSkeleton />
          </div>
        </div>
      </div>
    );
  }

  if (!data || data.emails.length === 0) {
    return (
      <div className="bg-gradient-to-br from-secondary-dark to-bg-dark rounded-xl p-5 border border-primary/20 relative overflow-hidden">
        <div className="absolute -right-4 -top-4 size-24 bg-primary/10 rounded-full blur-2xl" />
        
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary" style={{ fontSize: 20, fontVariationSettings: "'FILL' 1" }}>
                mail
              </span>
              <h4 className="text-primary font-bold text-lg">Email Digest</h4>
            </div>
            <div className="px-2 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span className="text-emerald-400 text-[9px] font-bold uppercase tracking-wider">0 Unread</span>
            </div>
          </div>

          <div className="text-center py-8">
            <div className="size-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-3">
              <span className="material-symbols-outlined text-emerald-400" style={{ fontSize: 28, fontVariationSettings: "'FILL' 1" }}>
                mark_email_read
              </span>
            </div>
            <p className="text-primary/50 text-sm">No unread emails! 🎉</p>
            <p className="text-primary/30 text-xs mt-1">Inbox zero achieved</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-secondary-dark to-bg-dark rounded-xl p-5 border border-primary/20 relative overflow-hidden hover:border-primary/30 transition-colors">
      <div className="absolute -right-4 -top-4 size-24 bg-primary/10 rounded-full blur-2xl" />
      
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary" style={{ fontSize: 20, fontVariationSettings: "'FILL' 1" }}>
              mail
            </span>
            <h4 className="text-primary font-bold text-lg">Email Digest</h4>
          </div>
          <div className="px-2 py-1 rounded-full bg-primary/15 border border-primary/30 flex items-center gap-1">
            <div className="relative">
              <div className="w-1.5 h-1.5 rounded-full bg-primary" />
              <div className="absolute inset-0 w-1.5 h-1.5 rounded-full bg-primary animate-ping opacity-75" />
            </div>
            <span className="text-primary text-[9px] font-bold uppercase tracking-wider">
              {data.count} Unread
            </span>
          </div>
        </div>

        <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar">
          {data.emails.map((email, idx) => (
            <div
              key={idx}
              className="bg-secondary-dark/40 border border-primary/5 rounded-xl p-3 hover:border-primary/20 hover:bg-secondary-dark/60 transition-all group"
            >
              <div className="flex items-start gap-3">
                {/* Unread indicator */}
                <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5" />

                {/* Email content */}
                <div className="flex-1 min-w-0">
                  {/* Header: account badge + from + time */}
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border shrink-0 ${getAccountColor(email.account)}`}>
                        {email.account}
                      </span>
                      <span className="text-primary/70 text-xs font-medium truncate">
                        {getSenderName(email.from)}
                      </span>
                    </div>
                    <span className="text-primary/40 text-[10px] font-medium shrink-0" suppressHydrationWarning>
                      {(() => {
                        try {
                          return formatDistanceToNow(new Date(email.date), { addSuffix: false });
                        } catch {
                          return 'recently';
                        }
                      })()}
                    </span>
                  </div>

                  {/* Subject */}
                  <p className="text-white text-sm font-semibold leading-tight truncate mb-1 group-hover:text-primary transition-colors">
                    {email.subject}
                  </p>

                  {/* Snippet */}
                  {email.snippet && (
                    <p className="text-primary/50 text-xs leading-relaxed line-clamp-2">
                      {email.snippet}...
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* View all link */}
        <div className="mt-3 pt-3 border-t border-primary/10">
          <a
            href="/inbox"
            className="flex items-center justify-center gap-1 text-primary/60 text-xs font-bold uppercase tracking-widest hover:text-primary transition-colors group"
          >
            View Inbox
            <span className="material-symbols-outlined text-primary/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all" style={{ fontSize: 14 }}>
              arrow_forward
            </span>
          </a>
        </div>
      </div>
    </div>
  );
}
