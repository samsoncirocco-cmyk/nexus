import type { Metadata, Viewport } from "next";
import "./globals.css";
import NavShell from "@/components/NavShell";
import CommandPalette from "@/components/CommandPalette";
import NavigationProgress from "@/components/NavigationProgress";
import { NotificationProvider } from "@/components/NotificationBanner";
import { ServiceWorkerRegistrar } from "@/components/ServiceWorkerRegistrar";
import GlobalSearchShortcut from "@/components/GlobalSearchShortcut";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { OfflineIndicator } from "@/components/OfflineIndicator";

export const metadata: Metadata = {
  title: "Second Brain",
  description: "Your personal knowledge base — Oregon Ducks × Space Theme",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: { url: '/apple-touch-icon.png', sizes: '192x192', type: 'image/png' },
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Second Brain",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0a0f0c",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Outfit:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className="antialiased overflow-x-hidden font-body">
        <ErrorBoundary>
          <NotificationProvider>
            <OfflineIndicator />
            <NavigationProgress />
            <CommandPalette />
            <NavShell>{children}</NavShell>
            <ServiceWorkerRegistrar />
            <GlobalSearchShortcut />
          
            {/* Background ambient glow effects */}
          <div className="fixed inset-0 pointer-events-none -z-10 opacity-40" style={{ animation: 'gradientShift 20s ease-in-out infinite', backgroundSize: '200% 200%' }}>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_35%,_#fade290a_0%,_transparent_20%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_65%,_#15473315_0%,_transparent_25%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_90%,_#fade2906_0%,_transparent_30%)]" />
          </div>
          {/* Grain overlay */}
          <div className="fixed inset-0 pointer-events-none z-[9999] grain-overlay" />
          </NotificationProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
