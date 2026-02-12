"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  Calendar as CalendarIcon,
  Clock,
  Play,
  Pause,
  Edit3,
  Trash2,
  Filter,
  Grid3X3,
  List,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  MoreHorizontal,
  Plus
} from "lucide-react";
import Link from "next/link";

interface QueuedPost {
  id: string;
  content: string;
  platforms: string[];
  scheduledFor: Date;
  status: "pending" | "approved" | "scheduled" | "publishing" | "published" | "failed";
  author: string;
  createdAt: Date;
  media?: number;
}

const mockPosts: QueuedPost[] = [
  {
    id: "1",
    content: "Excited to share our latest product update! 🚀",
    platforms: ["twitter", "linkedin"],
    scheduledFor: new Date(Date.now() + 2 * 60 * 60 * 1000),
    status: "scheduled",
    author: "John Doe",
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
  },
  {
    id: "2",
    content: "Behind the scenes of our team hackathon... Check out what we built in 24 hours!",
    platforms: ["instagram", "tiktok"],
    scheduledFor: new Date(Date.now() + 6 * 60 * 60 * 1000),
    status: "approved",
    author: "Jane Smith",
    createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000),
    media: 3,
  },
  {
    id: "3",
    content: "5 tips for better social media management. Thread 👇",
    platforms: ["twitter", "linkedin", "threads"],
    scheduledFor: new Date(Date.now() + 24 * 60 * 60 * 1000),
    status: "pending",
    author: "John Doe",
    createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
  },
  {
    id: "4",
    content: "New blog post: The future of AI in content creation",
    platforms: ["twitter", "linkedin", "facebook"],
    scheduledFor: new Date(Date.now() - 2 * 60 * 60 * 1000),
    status: "published",
    author: "Jane Smith",
    createdAt: new Date(Date.now() - 72 * 60 * 60 * 1000),
  },
  {
    id: "5",
    content: "We're hiring! Join our amazing team 🎉",
    platforms: ["linkedin", "twitter"],
    scheduledFor: new Date(Date.now() + 48 * 60 * 60 * 1000),
    status: "scheduled",
    author: "John Doe",
    createdAt: new Date(Date.now() - 36 * 60 * 60 * 1000),
  },
];

const platformIcons: Record<string, string> = {
  twitter: "𝕏",
  linkedin: "in",
  instagram: "📷",
  facebook: "f",
  tiktok: "♪",
  threads: "@",
  youtube: "▶",
  mastodon: "🐘",
};

const platformColors: Record<string, string> = {
  twitter: "bg-black",
  linkedin: "bg-[#0a66c2]",
  instagram: "bg-gradient-to-br from-[#f09433] via-[#e4405f] to-[#bc1888]",
  facebook: "bg-[#1877f2]",
  tiktok: "bg-black",
  threads: "bg-black",
  youtube: "bg-[#ff0000]",
  mastodon: "bg-[#6364ff]",
};

const statusConfig = {
  pending: { label: "Pending", color: "bg-yellow-500", icon: Clock },
  approved: { label: "Approved", color: "bg-blue-500", icon: CheckCircle2 },
  scheduled: { label: "Scheduled", color: "bg-green-500", icon: CalendarIcon },
  publishing: { label: "Publishing", color: "bg-purple-500", icon: Play },
  published: { label: "Published", color: "bg-gray-500", icon: CheckCircle2 },
  failed: { label: "Failed", color: "bg-red-500", icon: AlertCircle },
};

export default function QueuePage() {
  const [viewMode, setViewMode] = useState<"list" | "calendar" | "grid">("list");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [selectedPosts, setSelectedPosts] = useState<string[]>([]);

  const filteredPosts = mockPosts.filter((post) => {
    if (filterStatus === "all") return true;
    return post.status === filterStatus;
  });

  const togglePostSelection = (id: string) => {
    setSelectedPosts((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const isSameDay = (date1: Date, date2: Date) => {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  };

  const getPostsForDate = (date: Date) => {
    return mockPosts.filter((post) => isSameDay(post.scheduledFor, date));
  };

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Publishing Queue</h1>
          <p className="text-muted-foreground">Manage your scheduled and queued content</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-muted rounded-lg p-1">
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "calendar" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("calendar")}
            >
              <CalendarIcon className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("grid")}
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
          </div>
          <Button asChild>
            <Link href="/composer">
              <Plus className="mr-2 h-4 w-4" />
              New Post
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: "Scheduled", value: "12", color: "bg-blue-500" },
          { label: "Pending Approval", value: "3", color: "bg-yellow-500" },
          { label: "Published Today", value: "8", color: "bg-green-500" },
          { label: "Failed", value: "1", color: "bg-red-500" },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="flex items-center gap-4 p-4">
              <div className={`w-3 h-3 rounded-full ${stat.color}`} />
              <div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {viewMode === "calendar" ? (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Calendar View</CardTitle>
              <CardDescription>Select a date to see scheduled posts</CardDescription>
            </CardHeader>
            <CardContent>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                className="rounded-md border"
                modifiers={{
                  booked: mockPosts.map((p) => p.scheduledFor),
                }}
                modifiersStyles={{
                  booked: { 
                    fontWeight: "bold",
                    backgroundColor: "rgb(99, 102, 241)",
                    color: "white",
                  },
                }}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                {selectedDate ? selectedDate.toLocaleDateString("en-US", { 
                  weekday: "long", 
                  month: "long", 
                  day: "numeric" 
                }) : "Select a date"}
              </CardTitle>
              <CardDescription>
                {selectedDate ? `${getPostsForDate(selectedDate).length} posts scheduled` : "Click on the calendar"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px]">
                <div className="space-y-3">
                  {selectedDate && getPostsForDate(selectedDate).map((post) => {
                    const status = statusConfig[post.status];
                    const StatusIcon = status.icon;
                    return (
                      <div
                        key={post.id}
                        className="p-3 bg-muted/50 rounded-lg"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium text-sm line-clamp-2">{post.content}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant="outline" className="text-xs">
                                <StatusIcon className="mr-1 h-3 w-3" />
                                {status.label}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {formatTime(post.scheduledFor)}
                              </span>
                            </div>
                          </div>
                          <div className="flex gap-1">
                            {post.platforms.slice(0, 2).map((platform) => (
                              <div
                                key={platform}
                                className={`w-5 h-5 rounded-full ${platformColors[platform]} flex items-center justify-center text-white text-[10px]`}
                              >
                                {platformIcons[platform]}
                              </div>
                            ))}
                            {post.platforms.length > 2 && (
                              <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[10px]">
                                +{post.platforms.length - 2}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {selectedDate && getPostsForDate(selectedDate).length === 0 && (
                    <p className="text-center text-muted-foreground py-8">
                      No posts scheduled for this date
                    </p>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Queued Content</CardTitle>
              <CardDescription>{filteredPosts.length} posts in queue</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <select
                className="bg-background border rounded-md px-3 py-1 text-sm"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="scheduled">Scheduled</option>
                <option value="published">Published</option>
              </select>
              {selectedPosts.length > 0 && (
                <>
                  <Button variant="outline" size="sm">
                    Reschedule
                  </Button>
                  <Button variant="destructive" size="sm">
                    Delete ({selectedPosts.length})
                  </Button>
                </>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {filteredPosts.map((post) => {
                const status = statusConfig[post.status];
                const StatusIcon = status.icon;

                return (
                  <div
                    key={post.id}
                    className="flex items-start gap-4 p-4 rounded-lg border hover:bg-muted/50 transition-colors group"
                  >
                    <Checkbox
                      checked={selectedPosts.includes(post.id)}
                      onCheckedChange={() => togglePostSelection(post.id)}
                      className="mt-1"
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <p className="font-medium line-clamp-2">{post.content}</p>
                        <div className="flex items-center gap-2 ml-4">
                          <Badge
                            variant="outline"
                            className="shrink-0"
                            style={{ borderColor: status.color, color: status.color }}
                          >
                            <StatusIcon className="mr-1 h-3 w-3" />
                            {status.label}
                          </Badge>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatTime(post.scheduledFor)}
                        </div>
                        <span>•</span>
                        <div className="flex items-center gap-1">
                          {post.platforms.map((platform) => (
                            <div
                              key={platform}
                              className={`w-5 h-5 rounded-full ${platformColors[platform]} flex items-center justify-center text-white text-[10px]`}
                              title={platform}
                            >
                              {platformIcons[platform]}
                            </div>
                          ))}
                        </div>
                        {post.media && (
                          <>
                            <span>•</span>
                            <span>{post.media} media files</span>
                          </>
                        )}
                        <span>•</span>
                        <span>By {post.author}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Play className="h-4 w-4" />
                      </Button>
                      {post.status === "scheduled" && (
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Pause className="h-4 w-4" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
