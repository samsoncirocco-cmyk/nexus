"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  Eye,
  MessageCircle,
  Heart,
  Share2,
  MoreHorizontal,
  Download,
  Calendar,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  Target
} from "lucide-react";
import { OverviewChart, PlatformBreakdownChart, EngagementChart, HeatmapChart } from "@/components/analytics-charts";

const metrics = [
  {
    title: "Total Impressions",
    value: "2.4M",
    change: "+18.2%",
    trend: "up",
    icon: Eye,
    description: "vs. last period"
  },
  {
    title: "Total Engagement",
    value: "156.8K",
    change: "+24.5%",
    trend: "up",
    icon: Heart,
    description: "Likes, comments, shares"
  },
  {
    title: "Follower Growth",
    value: "+12.4K",
    change: "+8.3%",
    trend: "up",
    icon: Users,
    description: "New followers this period"
  },
  {
    title: "Engagement Rate",
    value: "6.53%",
    change: "-0.4%",
    trend: "down",
    icon: Target,
    description: "Industry avg: 3.92%"
  }
];

const topPosts = [
  {
    id: 1,
    content: "Excited to share our latest product update! 🚀",
    platform: "twitter",
    impressions: "245K",
    engagement: "18.5K",
    engagementRate: "7.5%",
    likes: "12.4K",
    comments: "892",
    shares: "5.2K",
    date: "2 days ago"
  },
  {
    id: 2,
    content: "Behind the scenes of our team hackathon...",
    platform: "instagram",
    impressions: "189K",
    engagement: "15.2K",
    engagementRate: "8.0%",
    likes: "13.1K",
    comments: "1.2K",
    shares: "890",
    date: "3 days ago"
  },
  {
    id: 3,
    content: "5 tips for better social media management",
    platform: "linkedin",
    impressions: "156K",
    engagement: "8.9K",
    engagementRate: "5.7%",
    likes: "6.2K",
    comments: "1.8K",
    shares: "890",
    date: "5 days ago"
  },
  {
    id: 4,
    content: "New blog post: The future of AI in content",
    platform: "twitter",
    impressions: "134K",
    engagement: "7.2K",
    engagementRate: "5.4%",
    likes: "5.1K",
    comments: "623",
    shares: "1.5K",
    date: "1 week ago"
  },
  {
    id: 5,
    content: "Our CEO on the importance of data privacy",
    platform: "linkedin",
    impressions: "112K",
    engagement: "6.8K",
    engagementRate: "6.1%",
    likes: "4.9K",
    comments: "1.1K",
    shares: "780",
    date: "1 week ago"
  }
];

const platformBreakdown = [
  { name: "Twitter/X", impressions: "890K", engagement: "52.3K", rate: "5.9%", color: "bg-black" },
  { name: "LinkedIn", impressions: "654K", engagement: "48.7K", rate: "7.4%", color: "bg-[#0a66c2]" },
  { name: "Instagram", impressions: "520K", engagement: "32.1K", rate: "6.2%", color: "bg-[#e4405f]" },
  { name: "TikTok", impressions: "336K", engagement: "23.7K", rate: "7.1%", color: "bg-black" },
];

const audienceDemographics = [
  { label: "18-24", value: 25, color: "#6366f1" },
  { label: "25-34", value: 42, color: "#a855f7" },
  { label: "35-44", value: 21, color: "#ec4899" },
  { label: "45-54", value: 8, color: "#f43f5e" },
  { label: "55+", value: 4, color: "#64748b" },
];

export default function AnalyticsPage() {
  const [dateRange, setDateRange] = useState({ from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), to: new Date() });
  const [selectedMetric, setSelectedMetric] = useState("engagement");

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground">Track performance across all your platforms</p>
        </div>
        <div className="flex items-center gap-3">
          <DatePickerWithRange date={dateRange} setDate={setDateRange} />
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric) => (
          <Card key={metric.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {metric.title}
              </CardTitle>
              <metric.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metric.value}</div>
              <div className="flex items-center gap-1 text-xs">
                {metric.trend === "up" ? (
                  <ArrowUpRight className="h-3 w-3 text-green-500" />
                ) : (
                  <ArrowDownRight className="h-3 w-3 text-red-500" />
                )}
                <span className={metric.trend === "up" ? "text-green-500" : "text-red-500"}>
                  {metric.change}
                </span>
                <span className="text-muted-foreground">{metric.description}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4 lg:w-fit">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="platforms">Platforms</TabsTrigger>
          <TabsTrigger value="audience">Audience</TabsTrigger>
          <TabsTrigger value="content">Content</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6 space-y-6">
          <div className="grid gap-6 lg:grid-cols-7">
            {/* Main Chart */}
            <Card className="lg:col-span-5">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Performance Over Time</CardTitle>
                  <CardDescription>Impressions and engagement trends</CardDescription>
                </div>
                <Select value={selectedMetric} onValueChange={setSelectedMetric}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="engagement">Engagement</SelectItem>
                    <SelectItem value="impressions">Impressions</SelectItem>
                    <SelectItem value="followers">Followers</SelectItem>
                    <SelectItem value="reach">Reach</SelectItem>
                  </SelectContent>
                </Select>
              </CardHeader>
              <CardContent>
                <div className="h-[350px]">
                  <OverviewChart />
                </div>
              </CardContent>
            </Card>

            {/* Engagement Stats */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Engagement Breakdown</CardTitle>
                <CardDescription>By interaction type</CardDescription>
              </CardHeader>
              <CardContent>
                <EngagementChart />
              </CardContent>
            </Card>
          </div>

          {/* Top Posts Section */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Top Performing Content</CardTitle>
                <CardDescription>Your best posts from this period</CardDescription>
              </div>
              <Button variant="outline" size="sm">
                <Filter className="mr-2 h-4 w-4" />
                Filter
              </Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b text-sm text-muted-foreground">
                      <th className="text-left font-medium py-3">Content</th>
                      <th className="text-left font-medium py-3">Platform</th>
                      <th className="text-right font-medium py-3">Impressions</th>
                      <th className="text-right font-medium py-3">Engagement</th>
                      <th className="text-right font-medium py-3">Rate</th>
                      <th className="text-right font-medium py-3">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topPosts.map((post) => (
                      <tr key={post.id} className="border-b last:border-0 hover:bg-muted/50">
                        <td className="py-4 pr-4">
                          <div className="max-w-[300px] truncate text-sm">{post.content}</div>
                        </td>
                        <td className="py-4">
                          <Badge variant="outline" className="capitalize">
                            {post.platform}
                          </Badge>
                        </td>
                        <td className="py-4 text-right font-mono text-sm">{post.impressions}</td>
                        <td className="py-4 text-right font-mono text-sm">{post.engagement}</td>
                        <td className="py-4 text-right">
                          <span className="text-green-500 text-sm font-medium">{post.engagementRate}</span>
                        </td>
                        <td className="py-4 text-right text-sm text-muted-foreground">{post.date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="platforms" className="mt-6 space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Platform Performance</CardTitle>
                <CardDescription>Comparison across all platforms</CardDescription>
              </CardHeader>
              <CardContent>
                <PlatformBreakdownChart />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Platform Details</CardTitle>
                <CardDescription>Breakdown by platform</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {platformBreakdown.map((platform) => (
                    <div key={platform.name} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${platform.color}`} />
                        <span className="font-medium">{platform.name}</span>
                      </div>
                      <div className="flex items-center gap-6 text-sm">
                        <div className="text-right">
                          <p className="font-medium">{platform.impressions}</p>
                          <p className="text-xs text-muted-foreground">Impressions</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{platform.engagement}</p>
                          <p className="text-xs text-muted-foreground">Engagement</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-green-500">{platform.rate}</p>
                          <p className="text-xs text-muted-foreground">Rate</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="audience" className="mt-6 space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Age Distribution</CardTitle>
                <CardDescription>Audience demographics by age</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {audienceDemographics.map((demo) => (
                    <div key={demo.label} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>{demo.label}</span>
                        <span className="font-medium">{demo.value}%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="h-2 rounded-full transition-all"
                          style={{ width: `${demo.value}%`, backgroundColor: demo.color }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Activity Heatmap</CardTitle>
                <CardDescription>When your audience is most active</CardDescription>
              </CardHeader>
              <CardContent>
                <HeatmapChart />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="content" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Content Performance</CardTitle>
              <CardDescription>Analytics by content type</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-3">
                <div className="p-6 bg-muted/50 rounded-lg text-center">
                  <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-primary/20 flex items-center justify-center">
                    <MessageCircle className="h-6 w-6 text-primary" />
                  </div>
                  <p className="text-2xl font-bold">Text Posts</p>
                  <p className="text-sm text-muted-foreground mt-1">Avg. 6.8% engagement</p>
                </div>
                <div className="p-6 bg-muted/50 rounded-lg text-center">
                  <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-purple-500/20 flex items-center justify-center">
                    <Heart className="h-6 w-6 text-purple-500" />
                  </div>
                  <p className="text-2xl font-bold">Images</p>
                  <p className="text-sm text-muted-foreground mt-1">Avg. 8.2% engagement</p>
                </div>
                <div className="p-6 bg-muted/50 rounded-lg text-center">
                  <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-pink-500/20 flex items-center justify-center">
                    <Share2 className="h-6 w-6 text-pink-500" />
                  </div>
                  <p className="text-2xl font-bold">Videos</p>
                  <p className="text-sm text-muted-foreground mt-1">Avg. 12.4% engagement</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
