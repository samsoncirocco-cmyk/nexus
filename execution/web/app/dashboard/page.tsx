"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart3,
  Calendar,
  MessageSquare,
  Plus,
  TrendingUp,
  Users,
  Zap,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import Link from "next/link";
import { OverviewChart } from "@/components/analytics-charts";

// Mock data
const stats = [
  {
    title: "Total Posts",
    value: "2,847",
    change: "+12.5%",
    trend: "up",
    icon: MessageSquare,
    description: "From last month"
  },
  {
    title: "Total Reach",
    value: "1.2M",
    change: "+23.1%",
    trend: "up",
    icon: Users,
    description: "Across all platforms"
  },
  {
    title: "Engagement Rate",
    value: "4.8%",
    change: "+0.8%",
    trend: "up",
    icon: TrendingUp,
    description: "Average across platforms"
  },
  {
    title: "Scheduled",
    value: "18",
    change: "+5",
    trend: "neutral",
    icon: Calendar,
    description: "In publishing queue"
  }
];

const recentPosts = [
  { id: 1, content: "Excited to share our latest product update! 🚀", platforms: ["twitter", "linkedin"], status: "published", engagement: "2.4K", time: "2h ago" },
  { id: 2, content: "Behind the scenes of our team hackathon...", platforms: ["instagram", "tiktok"], status: "scheduled", engagement: "—", time: "Tomorrow at 9:00 AM" },
  { id: 3, content: "5 tips for better social media management", platforms: ["linkedin", "twitter", "threads"], status: "published", engagement: "1.8K", time: "Yesterday" },
  { id: 4, content: "New blog post: The future of AI in content", platforms: ["twitter", "linkedin", "facebook"], status: "draft", engagement: "—", time: "Draft" }
];

const platformStats = [
  { name: "Twitter/X", followers: "45.2K", growth: "+2.1%", engagement: "5.2%", color: "bg-black" },
  { name: "LinkedIn", followers: "12.8K", growth: "+15.3%", engagement: "8.1%", color: "bg-[#0a66c2]" },
  { name: "Instagram", followers: "89.5K", growth: "+5.7%", engagement: "4.3%", color: "bg-[#e4405f]" },
  { name: "TikTok", followers: "156K", growth: "+32.1%", engagement: "12.4%", color: "bg-black" }
];

const quickActions = [
  { name: "Create Post", description: "Start writing new content", icon: Plus, href: "/composer", color: "bg-primary" },
  { name: "View Analytics", description: "See performance metrics", icon: BarChart3, href: "/analytics", color: "bg-purple-500" },
  { name: "Manage Platforms", description: "Connect social accounts", icon: Zap, href: "/platforms", color: "bg-orange-500" },
  { name: "Publishing Queue", description: "18 posts scheduled", icon: Clock, href: "/queue", color: "bg-green-500" }
];

export default function DashboardPage() {
  const [dateRange, setDateRange] = useState("7d");

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back! Here's what's happening with your content.</p>
        </div>
        <div className="flex items-center gap-3">
          <Tabs value={dateRange} onValueChange={setDateRange}>
            <TabsList>
              <TabsTrigger value="24h">24H</TabsTrigger>
              <TabsTrigger value="7d">7D</TabsTrigger>
              <TabsTrigger value="30d">30D</TabsTrigger>
              <TabsTrigger value="90d">90D</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button asChild>
            <Link href="/composer">
              <Plus className="mr-2 h-4 w-4" />
              Create Post
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <span className={stat.trend === "up" ? "text-green-500" : stat.trend === "down" ? "text-red-500" : "text-muted-foreground"}>
                  {stat.change}
                </span>
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-7">
        {/* Chart */}
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Performance Overview</CardTitle>
            <CardDescription>Engagement and reach over time</CardDescription>
          </CardHeader>
          <CardContent>
            <OverviewChart />
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks and shortcuts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {quickActions.map((action) => (
              <Link key={action.name} href={action.href}>
                <div className="flex items-center gap-4 rounded-lg border p-4 transition-colors hover:bg-muted/50">
                  <div className={`${action.color} rounded-lg p-2`}>
                    <action.icon className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{action.name}</p>
                    <p className="text-sm text-muted-foreground">{action.description}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Posts */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Posts</CardTitle>
              <CardDescription>Your latest content activity</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/analytics">View All</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentPosts.map((post) => (
                <div key={post.id} className="flex items-start gap-4 rounded-lg border p-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{post.content.substring(0, 60)}...</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex gap-1">
                        {post.platforms.map((platform) => (
                          <div
                            key={platform}
                            className="w-5 h-5 rounded-full bg-muted flex items-center justify-center"
                          >
                            <span className="text-[10px] font-bold uppercase">{platform[0]}</span>
                          </div>
                        ))}
                      </div>
                      <span className="text-xs text-muted-foreground">•</span>
                      <span className="text-xs text-muted-foreground">{post.time}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {post.status === "published" && (
                      <Badge variant="default" className="bg-green-500/20 text-green-400 hover:bg-green-500/30">
                        <CheckCircle2 className="mr-1 h-3 w-3" />
                        {post.engagement}
                      </Badge>
                    )}
                    {post.status === "scheduled" && (
                      <Badge variant="outline" className="text-orange-400 border-orange-400/30">
                        <Clock className="mr-1 h-3 w-3" />
                        Scheduled
                      </Badge>
                    )}
                    {post.status === "draft" && (
                      <Badge variant="secondary">
                        <AlertCircle className="mr-1 h-3 w-3" />
                        Draft
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Platform Stats */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Platform Performance</CardTitle>
              <CardDescription>Followers and engagement by platform</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/platforms">Manage</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {platformStats.map((platform) => (
                <div key={platform.name} className="flex items-center gap-4">
                  <div className={`w-3 h-3 rounded-full ${platform.color}`} />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{platform.name}</span>
                      <span className="text-sm font-medium">{platform.followers}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span className="text-green-500">{platform.growth}</span>
                      <span>{platform.engagement} engagement</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
