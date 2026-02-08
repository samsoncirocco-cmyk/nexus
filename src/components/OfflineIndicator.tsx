"use client";

import { useEffect, useState } from "react";

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(true);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Initialize state
    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      // Keep banner visible for a moment to show "Back online" message
      setTimeout(() => setShowBanner(false), 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowBanner(true);
    };

    // Listen for online/offline events
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Check service worker status
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        console.log("[OfflineIndicator] Service Worker ready, offline support enabled");
      });
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Show banner immediately when offline, or briefly when coming back online
  useEffect(() => {
    if (!isOnline) {
      setShowBanner(true);
    }
  }, [isOnline]);

  if (!showBanner) return null;

  return (
    <div
      className={`
        fixed top-0 left-0 right-0 z-[10000]
        flex items-center justify-center gap-3
        px-4 py-3 backdrop-blur-md
        border-b transition-all duration-300
        ${
          isOnline
            ? "bg-[#154733]/90 border-[#154733]/60 text-[#FEE123]"
            : "bg-[#FEE123]/95 border-[#FEE123]/80 text-[#0a0f0c]"
        }
      `}
      role="alert"
      aria-live="assertive"
    >
      <span
        className="material-symbols-outlined text-[20px] md:text-[22px]"
        style={{ fontVariationSettings: "'FILL' 1" }}
      >
        {isOnline ? "wifi" : "wifi_off"}
      </span>
      <span className="text-sm md:text-base font-semibold tracking-tight">
        {isOnline
          ? "Back online! Changes will sync."
          : "You're offline — using cached content"}
      </span>
      {isOnline && (
        <button
          onClick={() => setShowBanner(false)}
          className="ml-2 opacity-80 hover:opacity-100 transition-opacity"
          aria-label="Dismiss"
        >
          <span className="material-symbols-outlined text-[18px]">close</span>
        </button>
      )}
    </div>
  );
}
