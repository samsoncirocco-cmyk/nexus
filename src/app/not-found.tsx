import Link from 'next/link';

/**
 * 404 Not Found Page
 * Themed 404 page with navigation options
 */
export default function NotFound() {
  return (
    <div className="min-h-screen bg-bg-dark flex items-center justify-center p-4">
      <div className="max-w-lg w-full">
        {/* 404 Card */}
        <div className="bg-gradient-to-br from-secondary-dark to-bg-dark rounded-2xl p-8 border border-primary/10 relative overflow-hidden animate-scale-in">
          {/* Background glow effect */}
          <div className="absolute -right-8 -top-8 size-32 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute -left-8 -bottom-8 size-24 bg-primary/5 rounded-full blur-2xl" />
          
          <div className="relative z-10">
            {/* Icon & 404 */}
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="size-20 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center animate-breathe">
                  <span 
                    className="material-symbols-outlined text-primary" 
                    style={{ fontSize: 48 }}
                  >
                    travel_explore
                  </span>
                </div>
                <div className="absolute -top-2 -right-2 size-8 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
                  <span className="text-amber-300 text-xs font-bold">?</span>
                </div>
              </div>
            </div>

            {/* 404 Number */}
            <div className="text-center mb-2">
              <p 
                className="text-6xl md:text-7xl font-bold text-primary/30 font-display"
                style={{ letterSpacing: '-0.05em' }}
              >
                404
              </p>
            </div>

            {/* Heading */}
            <h1 className="text-center text-2xl md:text-3xl font-bold text-white mb-3 font-display">
              Page Not Found
            </h1>
            
            <p className="text-center text-primary/70 text-sm mb-8">
              The page you&apos;re looking for doesn&apos;t exist or has been moved. Let&apos;s get you back on track.
            </p>

            {/* Navigation options */}
            <div className="space-y-3 mb-6">
              <Link
                href="/"
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-primary text-bg-dark rounded-xl font-semibold text-sm hover:bg-primary-muted transition-all active:scale-95 shadow-lg shadow-primary/20"
              >
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                  home
                </span>
                Go to Dashboard
              </Link>
              
              <Link
                href="/doc"
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-secondary-dark border border-primary/20 text-white rounded-xl font-semibold text-sm hover:bg-secondary-dark/80 hover:border-primary/30 transition-all active:scale-95"
              >
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                  folder_open
                </span>
                Browse Documents
              </Link>
              
              <Link
                href="/search"
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-secondary-dark/50 border border-primary/10 text-primary rounded-xl font-semibold text-sm hover:bg-secondary-dark/70 hover:border-primary/20 transition-all active:scale-95"
              >
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                  search
                </span>
                Search
              </Link>
            </div>

            {/* Quick links */}
            <div className="pt-6 border-t border-primary/10">
              <p className="text-primary/50 text-xs font-medium mb-3 text-center uppercase tracking-wider">
                Quick Links
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Link
                  href="/tasks"
                  className="flex items-center justify-center gap-1.5 px-3 py-2 bg-secondary-dark/30 border border-primary/5 rounded-lg text-primary/70 text-xs font-medium hover:bg-secondary-dark/50 hover:border-primary/15 hover:text-primary transition-all"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                    checklist
                  </span>
                  Tasks
                </Link>
                <Link
                  href="/agents"
                  className="flex items-center justify-center gap-1.5 px-3 py-2 bg-secondary-dark/30 border border-primary/5 rounded-lg text-primary/70 text-xs font-medium hover:bg-secondary-dark/50 hover:border-primary/15 hover:text-primary transition-all"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                    smart_toy
                  </span>
                  Agents
                </Link>
                <Link
                  href="/chat"
                  className="flex items-center justify-center gap-1.5 px-3 py-2 bg-secondary-dark/30 border border-primary/5 rounded-lg text-primary/70 text-xs font-medium hover:bg-secondary-dark/50 hover:border-primary/15 hover:text-primary transition-all"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                    chat_bubble
                  </span>
                  Chat
                </Link>
                <Link
                  href="/settings"
                  className="flex items-center justify-center gap-1.5 px-3 py-2 bg-secondary-dark/30 border border-primary/5 rounded-lg text-primary/70 text-xs font-medium hover:bg-secondary-dark/50 hover:border-primary/15 hover:text-primary transition-all"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                    settings
                  </span>
                  Settings
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Fun message */}
        <div className="mt-6 text-center">
          <p className="text-primary/40 text-xs">
            🧠 Your brain is working fine. This page just doesn&apos;t exist yet.
          </p>
        </div>
      </div>
    </div>
  );
}
