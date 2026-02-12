"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Link2,
  Unlink,
  RefreshCw,
  ExternalLink,
  Settings,
  TrendingUp,
  Users,
  FileText,
  MoreHorizontal,
  AlertCircle,
  CheckCircle2,
  Clock,
  Plus
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Platform {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  connected: boolean;
  accountName?: string;
  accountHandle?: string;
  followerCount: number;
  postCount: number;
  engagementRate: number;
  lastSync?: Date;
  status: "connected" | "disconnected" | "pending" | "error";
  features: string[];
}

const platforms: Platform[] = [
  {
    id: "twitter",
    name: "Twitter/X",
    description: "Share updates, engage in conversations, and build your community",
    icon: "𝕏",
    color: "bg-black",
    connected: true,
    accountName: "Acme Inc",
    accountHandle: "@acme",
    followerCount: 45200,
    postCount: 1234,
    engagementRate: 5.2,
    lastSync: new Date(),
    status: "connected",
    features: ["Text posts", "Media", "Threads", "Polls"],
  },
  {
    id: "linkedin",
    name: "LinkedIn",
    description: "Professional networking and B2B content sharing",
    icon: "in",
    color: "bg-[#0a66c2]",
    connected: true,
    accountName: "Acme Inc",
    accountHandle: "company/acme",
    followerCount: 12800,
    postCount: 567,
    engagementRate: 8.1,
    lastSync: new Date(),
    status: "connected",
    features: ["Articles", "Posts", "Documents", "Events"],
  },
  {
    id: "instagram",
    name: "Instagram",
    description: "Visual storytelling and community engagement",
    icon: "📷",
    color: "bg-gradient-to-br from-[#f09433] via-[#e4405f] to-[#bc1888]",
    connected: true,
    accountName: "acme.inc",
    accountHandle: "@acme.inc",
    followerCount: 89500,
    postCount: 892,
    engagementRate: 4.3,
    lastSync: new Date(),
    status: "connected",
    features: ["Feed", "Stories", "Reels", "IGTV"],
  },
  {
    id: "facebook",
    name: "Facebook",
    description: "Connect with your community and share updates",
    icon: "f",
    color: "bg-[#1877f2]",
    connected: false,
    followerCount: 0,
    postCount: 0,
    engagementRate: 0,
    status: "disconnected",
    features: ["Posts", "Stories", "Events", "Groups"],
  },
  {
    id: "tiktok",
    name: "TikTok",
    description: "Short-form video content and viral trends",
    icon: "♪",
    color: "bg-black",
    connected: true,
    accountName: "Acme Inc",
    accountHandle: "@acme.inc",
    followerCount: 156000,
    postCount: 234,
    engagementRate: 12.4,
    lastSync: new Date(),
    status: "connected",
    features: ["Videos", "Live", "Sounds", "Effects"],
  },
  {
    id: "youtube",
    name: "YouTube",
    description: "Long-form video content and tutorials",
    icon: "▶",
    color: "bg-[#ff0000]",
    connected: false,
    followerCount: 0,
    postCount: 0,
    engagementRate: 0,
    status: "disconnected",
    features: ["Videos", "Shorts", "Live", "Community"],
  },
  {
    id: "threads",
    name: "Threads",
    description: "Text-based conversations and real-time updates",
    icon: "@",
    color: "bg-black",
    connected: false,
    followerCount: 0,
    postCount: 0,
    engagementRate: 0,
    status: "disconnected",
    features: ["Text posts", "Replies", "Reposts"],
  },
  {
    id: "mastodon",
    name: "Mastodon",
    description: "Decentralized social networking",
    icon: "🐘",
    color: "bg-[#6364ff]",
    connected: false,
    followerCount: 0,
    postCount: 0,
    engagementRate: 0,
    status: "disconnected",
    features: ["Toots", "Replies", "Boosts", "Favorites"],
  },
];

function PlatformCard({ platform }: { platform: Platform }) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [disconnectDialogOpen, setDisconnectDialogOpen] = useState(false);

  const handleConnect = () => {
    setIsConnecting(true);
    // Simulate OAuth flow
    setTimeout(() => {
      setIsConnecting(false);
      // Would redirect to OAuth in real app
    }, 1000);
  };

  const handleDisconnect = () => {
    setDisconnectDialogOpen(true);
  };

  const confirmDisconnect = () => {
    // Disconnect logic
    setDisconnectDialogOpen(false);
  };

  const handleSync = () => {
    // Sync logic
    console.log("Syncing", platform.id);
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
    if (num >= 1000) return (num / 1000).toFixed(1) + "K";
    return num.toString();
  };

  return (
    <>
      <Card className={cn(platform.connected && "border-primary/20")}>
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div
                className={cn(
                  "w-14 h-14 rounded-xl flex items-center justify-center text-white text-2xl font-bold shadow-lg",
                  platform.color
                )}
              >
                {platform.icon}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-lg">{platform.name}</h3>
                  {platform.connected ? (
                    <Badge variant="default" className="bg-green-500/20 text-green-400 hover:bg-green-500/30">
                      <CheckCircle2 className="mr-1 h-3 w-3" />
                      Connected
                    </Badge>
                  ) : (
                    <Badge variant="secondary">
                      <AlertCircle className="mr-1 h-3 w-3" />
                      Not Connected
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {platform.description}
                </p>
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {platform.connected ? (
                  <>
                    <DropdownMenuItem onClick={handleSync}>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Sync Now
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Settings className="mr-2 h-4 w-4" />
                      Settings
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleDisconnect}>
                      <Unlink className="mr-2 h-4 w-4" />
                      Disconnect
                    </DropdownMenuItem>
                  </>
                ) : (
                  <DropdownMenuItem onClick={handleConnect}>
                    <Link2 className="mr-2 h-4 w-4" />
                    Connect
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {platform.connected ? (
            <div className="mt-6 grid grid-cols-3 gap-4">
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center justify-center gap-1 text-muted-foreground text-sm mb-1">
                  <Users className="h-4 w-4" />
                  Followers
                </div>
                <p className="text-xl font-bold">{formatNumber(platform.followerCount)}</p>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center justify-center gap-1 text-muted-foreground text-sm mb-1">
                  <FileText className="h-4 w-4" />
                  Posts
                </div>
                <p className="text-xl font-bold">{formatNumber(platform.postCount)}</p>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center justify-center gap-1 text-muted-foreground text-sm mb-1">
                  <TrendingUp className="h-4 w-4" />
                  Engagement
                </div>
                <p className="text-xl font-bold">{platform.engagementRate}%</p>
              </div>
            </div>
          ) : (
            <div className="mt-6">
              <div className="flex flex-wrap gap-2 mb-4">
                {platform.features.map((feature) => (
                  <Badge key={feature} variant="outline" className="text-xs">
                    {feature}
                  </Badge>
                ))}
              </div>
              <Button
                className="w-full"
                onClick={handleConnect}
                disabled={isConnecting}
              >
                {isConnecting ? (
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Link2 className="mr-2 h-4 w-4" />
                )}
                Connect {platform.name}
              </Button>
            </div>
          )}

          {platform.connected && platform.accountName && (
            <div className="mt-4 pt-4 border-t flex items-center justify-between text-sm">
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs">
                    {platform.accountName.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{platform.accountName}</p>
                  <p className="text-muted-foreground">{platform.accountHandle}</p>
                </div>
              </div>
              <div className="flex items-center gap-1 text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span className="text-xs">
                  Synced {platform.lastSync?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Disconnect Confirmation Dialog */}
      <Dialog open={disconnectDialogOpen} onOpenChange={setDisconnectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disconnect {platform.name}?</DialogTitle>
            <DialogDescription>
              This will remove the connection to your {platform.name} account. You can reconnect at any time.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDisconnectDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDisconnect}>
              <Unlink className="mr-2 h-4 w-4" />
              Disconnect
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function cn(...classes: (string | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

export default function PlatformsPage() {
  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Platform Connections</h1>
          <p className="text-muted-foreground">
            Manage your connected social media accounts and publishing permissions
          </p>
        </div>
        <Button variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          Sync All
        </Button>
      </div>

      {/* Connected Platforms */}
      <div>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-green-500" />
          Connected ({platforms.filter((p) => p.connected).length})
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          {platforms
            .filter((p) => p.connected)
            .map((platform) => (
              <PlatformCard key={platform.id} platform={platform} />
            ))}
        </div>
      </div>

      {/* Available Platforms */}
      <div>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Plus className="h-5 w-5" />
          Available ({platforms.filter((p) => !p.connected).length})
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          {platforms
            .filter((p) => !p.connected)
            .map((platform) => (
              <PlatformCard key={platform.id} platform={platform} />
            ))}
        </div>
      </div>
    </div>
  );
}
