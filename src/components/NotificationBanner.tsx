"use client";

import { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";

type NotificationType = "success" | "error" | "info";

interface Notification {
  id: number;
  message: string;
  type: NotificationType;
}

interface NotificationContextType {
  notify: (message: string, type?: NotificationType) => void;
}

const NotificationContext = createContext<NotificationContextType>({
  notify: () => {},
});

export function useNotification() {
  return useContext(NotificationContext);
}

const TYPE_STYLES: Record<NotificationType, string> = {
  success:
    "bg-[#fade29]/10 border-[#fade29]/40 text-[#fade29]",
  error:
    "bg-red-500/10 border-red-500/40 text-red-400",
  info:
    "bg-emerald-500/10 border-emerald-500/40 text-emerald-400",
};

const TYPE_ICONS: Record<NotificationType, string> = {
  success: "check_circle",
  error: "error",
  info: "info",
};

function Banner({ notification, onDismiss }: { notification: Notification; onDismiss: (id: number) => void }) {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Animate in
    requestAnimationFrame(() => setVisible(true));

    // Auto-dismiss after 5s
    timerRef.current = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onDismiss(notification.id), 300);
    }, 5000);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [notification.id, onDismiss]);

  const handleDismiss = () => {
    setVisible(false);
    setTimeout(() => onDismiss(notification.id), 300);
  };

  return (
    <div
      className={`
        flex items-center gap-3 px-4 py-3 rounded-lg border backdrop-blur-md
        transition-all duration-300 ease-out cursor-pointer
        ${TYPE_STYLES[notification.type]}
        ${visible ? "translate-y-0 opacity-100" : "-translate-y-4 opacity-0"}
      `}
      onClick={handleDismiss}
      role="alert"
    >
      <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
        {TYPE_ICONS[notification.type]}
      </span>
      <span className="text-sm font-medium flex-1">{notification.message}</span>
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleDismiss();
        }}
        className="opacity-60 hover:opacity-100 transition-opacity"
      >
        <span className="material-symbols-outlined text-[18px]">close</span>
      </button>
    </div>
  );
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const idRef = useRef(0);

  const notify = useCallback((message: string, type: NotificationType = "info") => {
    const id = ++idRef.current;
    setNotifications((prev) => [...prev, { id, message, type }]);
  }, []);

  const dismiss = useCallback((id: number) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  return (
    <NotificationContext.Provider value={{ notify }}>
      {children}
      {/* Notification stack */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-2 w-[90vw] max-w-md pointer-events-none">
        <div className="flex flex-col gap-2 pointer-events-auto">
          {notifications.map((n) => (
            <Banner key={n.id} notification={n} onDismiss={dismiss} />
          ))}
        </div>
      </div>
    </NotificationContext.Provider>
  );
}
