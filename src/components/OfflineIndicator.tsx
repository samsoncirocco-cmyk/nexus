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
      setShowBanner(true);
      // Auto-dismiss "Back online!" message after 2 seconds
      setTimeout(() => setShowBanner(false), 2000);
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

  if (!showBanner) return null;

  return (
    <div
      className={`
        fixed top-0 left-0 right-0 z-[10000]
        flex items-center justify-center gap-3
        px-4 py-3 backdrop-blur-md
        border-b
        animate-in slide-in-from-top duration-300
        ${
          isOnline
            ? "bg-[#154733]/95 border-[#154733]/60 text-[#FEE123]"
            : "bg-[#154733]/95 border-[#154733]/60 text-[#FEE123]"
        }
      `}
      role="alert"
      aria-live="assertive"
    >
      <span
        className="material-symbols-outlined text-[20px] md:text-[22px]"
        style={{ fontVariationSettings: "'FILL' 1" }}
      >
        {isOnline ? "cloud_done" : "cloud_off"}
      </span>
      <span className="text-sm md:text-base font-semibold tracking-tight">
        {isOnline
          ? "Back online!"
          : "You're offline — some features may not work"}
      </span>
    </div>
  );
}
