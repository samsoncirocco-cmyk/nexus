'use client';

import { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';

interface Email {
  from: string;
  to: string;
  subject: string;
  date: string;
  body_preview?: string;
  account: string;
  isUnread: boolean;
}

type FilterType = 'all' | 'unread' | 'personal' | 'nau';

export default function InboxPage() {
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('unread');
  const [expandedEmail, setExpandedEmail] = useState<number | null>(null);

  const fetchEmails = async () => {
    setLoading(true);
    try {
      const accountParam = filter === 'personal' ? 'personal' : filter === 'nau' ? 'nau' : 'all';
      const filterParam = filter === 'unread' || filter === 'personal' || filter === 'nau' ? 'unread' : 'all';
      
      const response = await fetch(`/api/inbox?account=${accountParam}&filter=${filterParam}&count=30`);
      const data = await response.json();
      
      if (data.success) {
        setEmails(data.emails || []);
      }
    } catch (error) {
      console.error('Failed to fetch emails:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmails();
    // Auto-refresh every 60 seconds
    const interval = setInterval(fetchEmails, 60000);
    return () => clearInterval(interval);
  }, [filter]);

  // AI Triage: Flag urgent emails
  const urgentKeywords = ['deadline', 'urgent', 'asap', 'eod', 'payment', 'overdue', 'critical', 'immediately'];
  const urgentEmails = emails.filter(email => {
    const text = `${email.subject} ${email.body_preview || ''}`.toLowerCase();
    return urgentKeywords.some(keyword => text.includes(keyword));
  });

  const unreadCount = emails.filter(e => e.isUnread).length;
  const accountCounts = {
    personal: emails.filter(e => e.account === 'personal').length,
    nau: emails.filter(e => e.account === 'nau').length,
  };

  const getDisplayEmails = () => {
    switch (filter) {
      case 'unread':
        return emails.filter(e => e.isUnread);
      case 'personal':
        return emails.filter(e => e.account === 'personal');
      case 'nau':
        return emails.filter(e => e.account === 'nau');
      default:
        return emails;
    }
  };

  const displayEmails = getDisplayEmails();

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="size-10 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center">
            <span className="material-symbols-outlined text-primary" style={{ fontSize: 22 }}>mail</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-primary">Unified Inbox</h1>
            <p className="text-primary/60 text-sm">All your emails in one place</p>
          </div>
        </div>
      </div>

      {/* AI Triage Summary */}
      {urgentEmails.length > 0 && (
        <div className="mb-6 bg-gradient-to-br from-orange-900/30 to-bg-dark rounded-xl p-5 border border-orange-500/20">
          <div className="flex items-start gap-3 mb-4">
            <div className="size-9 rounded-lg bg-orange-500/20 border border-orange-500/30 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-orange-400" style={{ fontSize: 20 }}>warning</span>
            </div>
            <div className="flex-1">
              <h3 className="text-orange-400 font-bold text-sm uppercase tracking-wider mb-1">
                Needs Attention
              </h3>
              <p className="text-white/80 text-sm">
                {urgentEmails.length} email{urgentEmails.length !== 1 ? 's' : ''} appear{urgentEmails.length === 1 ? 's' : ''} urgent
              </p>
            </div>
          </div>

          <div className="space-y-2">
            {urgentEmails.slice(0, 3).map((email, idx) => {
              const accountColor = email.account === 'personal' ? 'blue' : 'purple';
              return (
                <div
                  key={idx}
                  className="bg-orange-500/5 border border-orange-500/20 rounded-lg p-3 hover:bg-orange-500/10 transition-colors cursor-pointer"
                  onClick={() => {
                    const emailIndex = emails.findIndex(e => e === email);
                    setExpandedEmail(expandedEmail === emailIndex ? null : emailIndex);
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                          accountColor === 'blue' 
                            ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' 
                            : 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                        }`}>
                          {email.account === 'personal' ? 'Gmail' : 'NAU'}
                        </span>
                        <span className="text-white/60 text-xs truncate">{email.from}</span>
                      </div>
                      <p className="text-white font-semibold text-sm truncate">{email.subject}</p>
                      {email.body_preview && (
                        <p className="text-white/60 text-xs mt-1 line-clamp-2">{email.body_preview}</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Stats Bar */}
      <div className="mb-4 bg-secondary-dark/40 border border-primary/10 rounded-xl p-4">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary" style={{ fontSize: 16 }}>mail</span>
              <span className="text-white font-semibold">{unreadCount} unread</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-primary/40">•</span>
              <span className="text-white/60">{emails.length} total</span>
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="size-2 rounded-full bg-blue-500" />
              <span className="text-white/60">{accountCounts.personal} Gmail</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="size-2 rounded-full bg-purple-500" />
              <span className="text-white/60">{accountCounts.nau} NAU</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="mb-4 flex items-center gap-2 overflow-x-auto pb-2">
        {[
          { value: 'unread' as FilterType, label: 'Unread', icon: 'mark_email_unread' },
          { value: 'all' as FilterType, label: 'All', icon: 'inbox' },
          { value: 'personal' as FilterType, label: 'Gmail', icon: 'mail' },
          { value: 'nau' as FilterType, label: 'NAU', icon: 'school' },
        ].map((filterOption) => (
          <button
            key={filterOption.value}
            onClick={() => setFilter(filterOption.value)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              filter === filterOption.value
                ? 'bg-primary text-bg-dark'
                : 'bg-secondary-dark/60 text-white/60 hover:text-white hover:bg-secondary-dark border border-primary/10'
            }`}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
              {filterOption.icon}
            </span>
            {filterOption.label}
          </button>
        ))}
      </div>

      {/* Email List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="bg-secondary-dark/40 border border-primary/5 rounded-xl p-4 animate-pulse">
              <div className="flex items-start gap-3">
                <div className="size-10 rounded-full bg-primary/10" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-primary/10 rounded w-1/3" />
                  <div className="h-3 bg-primary/10 rounded w-2/3" />
                  <div className="h-3 bg-primary/10 rounded w-1/2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : displayEmails.length === 0 ? (
        <div className="text-center py-16 bg-secondary-dark/40 border border-primary/10 rounded-xl">
          <div className="size-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-4">
            <span className="material-symbols-outlined text-primary" style={{ fontSize: 32 }}>
              inbox
            </span>
          </div>
          <h3 className="text-white font-semibold mb-2">No emails found</h3>
          <p className="text-white/60 text-sm">
            {filter === 'unread' ? 'You\'re all caught up!' : 'No emails match this filter'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {displayEmails.map((email, idx) => {
            const isExpanded = expandedEmail === idx;
            const accountColor = email.account === 'personal' ? 'blue' : 'purple';
            
            return (
              <div
                key={idx}
                className={`border rounded-xl transition-all cursor-pointer ${
                  email.isUnread
                    ? 'bg-secondary-dark/60 border-primary/20 hover:border-primary/30'
                    : 'bg-secondary-dark/30 border-primary/5 hover:border-primary/15'
                } ${isExpanded ? 'ring-2 ring-primary/30' : ''}`}
                onClick={() => setExpandedEmail(isExpanded ? null : idx)}
              >
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    {/* Unread indicator */}
                    {email.isUnread && (
                      <div className="size-2 rounded-full bg-primary mt-2 shrink-0" />
                    )}
                    
                    {/* Avatar */}
                    <div className="size-10 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="material-symbols-outlined text-primary" style={{ fontSize: 18 }}>
                        person
                      </span>
                    </div>

                    {/* Email content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider shrink-0 ${
                            accountColor === 'blue' 
                              ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' 
                              : 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                          }`}>
                            {email.account === 'personal' ? 'Gmail' : 'NAU'}
                          </span>
                          <span className={`text-sm truncate ${
                            email.isUnread ? 'text-white font-semibold' : 'text-white/70'
                          }`}>
                            {email.from}
                          </span>
                        </div>
                        <span className="text-primary/50 text-xs shrink-0" suppressHydrationWarning>
                          {(() => {
                            try {
                              return formatDistanceToNow(new Date(email.date), { addSuffix: true });
                            } catch {
                              return email.date;
                            }
                          })()}
                        </span>
                      </div>

                      <h3 className={`text-sm mb-1 ${
                        email.isUnread ? 'text-white font-bold' : 'text-white/80 font-medium'
                      } ${isExpanded ? '' : 'truncate'}`}>
                        {email.subject || '(No subject)'}
                      </h3>

                      {email.body_preview && (
                        <p className={`text-white/60 text-xs ${
                          isExpanded ? 'whitespace-pre-wrap' : 'truncate'
                        }`}>
                          {email.body_preview}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded view indicator */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-2 border-t border-primary/10">
                    <div className="flex items-center gap-2 text-xs text-primary/50">
                      <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                        expand_less
                      </span>
                      <span>Click to collapse</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
