'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface LinkedInConnection {
  connected: boolean;
  status?: string;
  scopes?: string;
  expires_at?: string;
  profile?: {
    id: string;
    firstName?: string;
    lastName?: string;
    profilePicture?: string;
  };
  error?: string;
}

interface LinkedInPostResponse {
  success: boolean;
  post_id?: string;
  permalink?: string;
  error?: string;
  message?: string;
}

/**
 * LinkedInConnect Component
 * 
 * Dashboard UI for managing LinkedIn OAuth connection.
 * Features:
 * - Connect/disconnect LinkedIn account
 * - Display connection status and profile info
 * - Post content directly to LinkedIn
 * - Error handling and reconnection flow
 */
export function LinkedInConnect() {
  const [connection, setConnection] = useState<LinkedInConnection | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [postContent, setPostContent] = useState('');
  const [posting, setPosting] = useState(false);
  const [postResult, setPostResult] = useState<LinkedInPostResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch connection status on mount
  const checkConnection = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/auth/linkedin', {
        headers: {
          'x-user-id': 'default-user', // In production, get from auth context
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to check connection status');
      }
      
      const data = await response.json();
      setConnection(data);
    } catch (err) {
      console.error('Error checking LinkedIn connection:', err);
      setConnection({ connected: false });
      setError('Failed to check connection status');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  // Handle OAuth initiation
  const handleConnect = async () => {
    try {
      setConnecting(true);
      setError(null);
      
      const response = await fetch('/api/auth/linkedin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': 'default-user',
        },
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to initiate OAuth');
      }
      
      const data = await response.json();
      
      if (data.auth_url) {
        // Redirect to LinkedIn OAuth
        window.location.href = data.auth_url;
      } else {
        throw new Error('No authorization URL received');
      }
    } catch (err) {
      console.error('Error connecting LinkedIn:', err);
      setError(err instanceof Error ? err.message : 'Failed to connect');
      setConnecting(false);
    }
  };

  // Handle disconnect
  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect your LinkedIn account?')) {
      return;
    }
    
    try {
      setDisconnecting(true);
      setError(null);
      
      const response = await fetch('/api/auth/linkedin', {
        method: 'DELETE',
        headers: {
          'x-user-id': 'default-user',
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to disconnect');
      }
      
      await checkConnection();
    } catch (err) {
      console.error('Error disconnecting LinkedIn:', err);
      setError(err instanceof Error ? err.message : 'Failed to disconnect');
    } finally {
      setDisconnecting(false);
    }
  };

  // Handle post to LinkedIn
  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!postContent.trim()) return;
    
    try {
      setPosting(true);
      setPostResult(null);
      setError(null);
      
      const response = await fetch('/api/post/linkedin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': 'default-user',
        },
        body: JSON.stringify({
          content: postContent,
          visibility: 'PUBLIC',
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to post');
      }
      
      setPostResult(data);
      setPostContent('');
    } catch (err) {
      console.error('Error posting to LinkedIn:', err);
      setPostResult({
        success: false,
        error: 'post_failed',
        message: err instanceof Error ? err.message : 'Failed to post',
      });
    } finally {
      setPosting(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="p-6 bg-gradient-to-br from-[#0077B5]/5 to-bg-dark rounded-xl border border-[#0077B5]/20">
        <div className="flex items-center gap-3">
          <div className="skeleton size-10 rounded-lg" />
          <div className="flex-1">
            <div className="skeleton w-32 h-4 rounded mb-2" />
            <div className="skeleton w-48 h-3 rounded" />
          </div>
        </div>
      </div>
    );
  }

  const isConnected = connection?.connected;
  const profile = connection?.profile;
  const expiresDate = connection?.expires_at 
    ? new Date(connection.expires_at).toLocaleDateString() 
    : null;

  return (
    <div className="bg-gradient-to-br from-[#0077B5]/5 to-bg-dark rounded-xl border border-[#0077B5]/20 overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-[#0077B5]/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* LinkedIn Icon */}
            <div className="size-10 rounded-lg bg-[#0077B5] flex items-center justify-center text-white font-bold text-lg">
              in
            </div>
            <div>
              <h3 className="font-bold text-white">LinkedIn</h3>
              <p className="text-xs text-primary/50">
                {isConnected ? 'Connected' : 'Not connected'}
              </p>
            </div>
          </div>
          
          {/* Connection Status Badge */}
          {isConnected ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/20 text-emerald-400 text-xs font-bold">
              <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Connected
            </span>
          ) : connection?.status === 'expired' ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/20 text-amber-400 text-xs font-bold">
              <span className="size-1.5 rounded-full bg-amber-400" />
              Expired
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary/50 text-xs font-bold">
              <span className="size-1.5 rounded-full bg-primary/30" />
              Disconnected
            </span>
          )}
        </div>
      </div>

      {/* Profile Info (if connected) */}
      {isConnected && profile && (
        <div className="px-6 py-4 bg-[#0077B5]/5 border-b border-[#0077B5]/10">
          <div className="flex items-center gap-3">
            {profile.profilePicture ? (
              <img 
                src={profile.profilePicture} 
                alt="Profile" 
                className="size-10 rounded-full border border-[#0077B5]/20"
              />
            ) : (
              <div className="size-10 rounded-full bg-[#0077B5]/20 border border-[#0077B5]/30 flex items-center justify-center">
                <span className="material-symbols-outlined text-[#0077B5]" style={{ fontSize: 20 }}>
                  person
                </span>
              </div>
            )}
            <div>
              <p className="font-semibold text-white text-sm">
                {profile.firstName} {profile.lastName}
              </p>
              {expiresDate && (
                <p className="text-xs text-primary/40">
                  Token expires: {expiresDate}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="p-6 space-y-4">
        {/* Error Message */}
        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            <div className="flex items-start gap-2">
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>error</span>
              <p>{error}</p>
            </div>
          </div>
        )}

        {/* Post Form (only when connected) */}
        {isConnected && (
          <form onSubmit={handlePost} className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-primary/50 uppercase tracking-wider mb-2">
                Post to LinkedIn
              </label>
              <textarea
                value={postContent}
                onChange={(e) => setPostContent(e.target.value)}
                placeholder="What do you want to share?"
                maxLength={3000}
                rows={4}
                className="w-full px-3 py-2.5 rounded-lg bg-bg-dark border border-primary/20 text-white placeholder:text-primary/30 text-sm resize-none focus:outline-none focus:border-[#0077B5]/50 transition-colors"
              />
              <p className="text-right text-xs text-primary/30 mt-1">
                {postContent.length}/3000
              </p>
            </div>

            <div className="flex items-center justify-between">
              <button
                type="submit"
                disabled={!postContent.trim() || posting}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0077B5] text-white text-sm font-bold hover:bg-[#006396] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {posting ? (
                  <>
                    <span className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Posting...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>send</span>
                    Post
                  </>
                )}
              </button>

              {/* Disconnect Button */}
              <button
                type="button"
                onClick={handleDisconnect}
                disabled={disconnecting}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold hover:bg-red-500/20 transition-colors"
              >
                {disconnecting ? (
                  <>
                    <span className="size-3 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin" />
                    Disconnecting...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>link_off</span>
                    Disconnect
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Post Result */}
        {postResult && (
          <div className={`p-3 rounded-lg border text-sm ${
            postResult.success 
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
              : 'bg-red-500/10 border-red-500/20 text-red-400'
          }`}>
            <div className="flex items-start gap-2">
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                {postResult.success ? 'check_circle' : 'error'}
              </span>
              <div>
                <p className="font-semibold">
                  {postResult.success ? 'Posted successfully!' : 'Post failed'}
                </p>
                {postResult.permalink && (
                  <a 
                    href={postResult.permalink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs underline hover:no-underline mt-1 inline-block"
                  >
                    View on LinkedIn
                  </a>
                )}
                {postResult.message && !postResult.success && (
                  <p className="text-xs mt-1 opacity-80">{postResult.message}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Connect Button (only when disconnected) */}
        {!isConnected && (
          <div className="space-y-3">
            <p className="text-sm text-primary/60">
              Connect your LinkedIn account to post content directly from Nexus.
            </p>
            <button
              onClick={handleConnect}
              disabled={connecting}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-[#0077B5] text-white font-bold hover:bg-[#006396] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {connecting ? (
                <>
                  <span className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined" style={{ fontSize: 20 }}>link</span>
                  Connect LinkedIn
                </>
              )}
            </button>
            
            {connection?.status === 'expired' && (
              <p className="text-xs text-amber-400/80 text-center">
                Your connection has expired. Reconnect to continue posting.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * LinkedInConnectMinimal - Minimal version for embedding in other dashboards
 */
export function LinkedInConnectMinimal() {
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/auth/linkedin', {
      headers: { 'x-user-id': 'default-user' },
    })
      .then(r => r.json())
      .then(data => {
        setConnected(data.connected);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Link 
        href="/settings"
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/5 border border-primary/10 text-primary/50 text-sm"
      >
        <span className="size-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        Checking...
      </Link>
    );
  }

  return (
    <Link 
      href="/settings"
      className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors ${
        connected 
          ? 'bg-[#0077B5]/10 border-[#0077B5]/20 text-[#0077B5] hover:bg-[#0077B5]/20' 
          : 'bg-primary/5 border-primary/10 text-primary/50 hover:bg-primary/10'
      }`}
    >
      <span className="font-bold">in</span>
      <span className="text-xs font-medium">
        {connected ? 'Connected' : 'Connect'}
      </span>
    </Link>
  );
}
