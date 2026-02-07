import type { Metadata, Viewport } from "next";
import "./globals.css";
import NavShell from "@/components/NavShell";

export const metadata: Metadata = {
  title: "Second Brain",
  description: "Your personal knowledge base — Oregon Ducks × Space Theme",
  manifest: "/manifest.json",
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
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className="antialiased overflow-x-hidden font-[--font-display]">
        <NavShell>{children}</NavShell>

        {/* Background ambient glow effects (from designs) */}
        <div className="fixed inset-0 pointer-events-none -z-10 opacity-40">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_35%,_#fade290a_0%,_transparent_20%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_65%,_#15473315_0%,_transparent_25%)]" />
        </div>
      </body>
    </html>
  );
}
