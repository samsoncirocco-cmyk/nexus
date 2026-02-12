"use client";

import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

// Generate mock data for charts
const generateTimeSeriesData = (days: number) => {
  const data = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    data.push({
      date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      impressions: Math.floor(Math.random() * 50000) + 20000,
      engagement: Math.floor(Math.random() * 5000) + 1000,
      followers: Math.floor(Math.random() * 500) + 100,
      reach: Math.floor(Math.random() * 30000) + 15000,
    });
  }
  return data;
};

const platformData = [
  { name: "Twitter/X", impressions: 890000, engagement: 52300, color: "#000000" },
  { name: "LinkedIn", impressions: 654000, engagement: 48700, color: "#0a66c2" },
  { name: "Instagram", impressions: 520000, engagement: 32100, color: "#e4405f" },
  { name: "TikTok", impressions: 336000, engagement: 23700, color: "#000000" },
];

const engagementTypeData = [
  { name: "Likes", value: 65, color: "#6366f1" },
  { name: "Comments", value: 15, color: "#a855f7" },
  { name: "Shares", value: 12, color: "#ec4899" },
  { name: "Saves", value: 8, color: "#64748b" },
];

// Overview Chart - Multi-line time series
export function OverviewChart() {
  const data = useMemo(() => generateTimeSeriesData(30), []);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="colorImpressions" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="colorEngagement" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
        <XAxis
          dataKey="date"
          stroke="#64748b"
          fontSize={12}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          stroke="#64748b"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "#1e293b",
            border: "1px solid #334155",
            borderRadius: "8px",
          }}
          labelStyle={{ color: "#f8fafc" }}
          formatter={(value: number) => [`${(value / 1000).toFixed(1)}K`, ""]}
        />
        <Legend />
        <Area
          type="monotone"
          dataKey="impressions"
          stroke="#6366f1"
          fillOpacity={1}
          fill="url(#colorImpressions)"
          strokeWidth={2}
        />
        <Area
          type="monotone"
          dataKey="engagement"
          stroke="#a855f7"
          fillOpacity={1}
          fill="url(#colorEngagement)"
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// Platform Breakdown Chart
export function PlatformBreakdownChart() {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={platformData} layout="vertical" margin={{ top: 10, right: 30, left: 40, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} horizontal={false} />
        <XAxis
          type="number"
          stroke="#64748b"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
        />
        <YAxis
          type="category"
          dataKey="name"
          stroke="#64748b"
          fontSize={12}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "#1e293b",
            border: "1px solid #334155",
            borderRadius: "8px",
          }}
          formatter={(value: number) => [`${(value / 1000).toFixed(1)}K`, ""]}
        />
        <Bar dataKey="engagement" radius={[0, 4, 4, 0]}>
          {platformData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// Engagement Chart - Pie chart
export function EngagementChart() {
  return (
    <ResponsiveContainer width="100%" height={250}>
      <PieChart>
        <Pie
          data={engagementTypeData}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={100}
          paddingAngle={5}
          dataKey="value"
        >
          {engagementTypeData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            backgroundColor: "#1e293b",
            border: "1px solid #334155",
            borderRadius: "8px",
          }}
          formatter={(value: number) => [`${value}%`, ""]}
        />
        <Legend
          verticalAlign="bottom"
          height={36}
          iconType="circle"
          wrapperStyle={{ paddingTop: "20px" }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

// Heatmap Chart - Activity pattern simulation
export function HeatmapChart() {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const hours = Array.from({ length: 12 }, (_, i) => `${i * 2}:00`);

  // Generate activity data
  const activityData = useMemo(() => {
    const data = [];
    for (let day = 0; day < 7; day++) {
      for (let hour = 0; hour < 12; hour++) {
        // Simulate higher activity during weekdays and business hours
        let baseActivity = Math.random() * 50;
        if (day < 5) baseActivity += 30; // Weekdays
        if (hour >= 4 && hour <= 8) baseActivity += 40; // Business hours
        data.push({
          day,
          hour,
          value: Math.min(100, baseActivity),
        });
      }
    }
    return data;
  }, []);

  const getColor = (value: number) => {
    if (value < 20) return "#1e293b";
    if (value < 40) return "#334155";
    if (value < 60) return "#6366f1";
    if (value < 80) return "#8b5cf6";
    return "#a855f7";
  };

  return (
    <div className="w-full overflow-x-auto">
      <div className="min-w-[600px]">
        <div className="flex">
          <div className="w-16 flex-shrink-0" />
          <div className="flex-1 flex">
            {hours.map((hour) => (
              <div key={hour} className="flex-1 text-center text-xs text-muted-foreground py-2">
                {hour}
              </div>
            ))}
          </div>
        </div>
        {days.map((day, dayIndex) => (
          <div key={day} className="flex items-center">
            <div className="w-16 text-sm text-muted-foreground text-right pr-4">
              {day}
            </div>
            <div className="flex-1 flex gap-1">
              {activityData
                .filter((d) => d.day === dayIndex)
                .map((d, hourIndex) => (
                  <div
                    key={hourIndex}
                    className="flex-1 h-8 rounded transition-all hover:scale-110"
                    style={{ backgroundColor: getColor(d.value) }}
                    title={`${day} ${hours[hourIndex]}: ${Math.round(d.value)}% activity`}
                  />
                ))}
            </div>
          </div>
        ))}
        <div className="flex items-center justify-end gap-2 mt-4 text-xs text-muted-foreground">
          <span>Low</span>
          {["#1e293b", "#334155", "#6366f1", "#8b5cf6", "#a855f7"].map((color) => (
            <div key={color} className="w-4 h-4 rounded" style={{ backgroundColor: color }} />
          ))}
          <span>High</span>
        </div>
      </div>
    </div>
  );
}

// Follower Growth Chart
export function FollowerGrowthChart() {
  const data = useMemo(() => generateTimeSeriesData(90), []);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="colorFollowers" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
        <XAxis
          dataKey="date"
          stroke="#64748b"
          fontSize={12}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          stroke="#64748b"
          fontSize={12}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "#1e293b",
            border: "1px solid #334155",
            borderRadius: "8px",
          }}
        />
        <Area
          type="monotone"
          dataKey="followers"
          stroke="#10b981"
          fillOpacity={1}
          fill="url(#colorFollowers)"
          strokeWidth={2}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

// Reach vs Impressions Chart
export function ReachImpressionsChart() {
  const data = useMemo(() => generateTimeSeriesData(30), []);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
        <XAxis
          dataKey="date"
          stroke="#64748b"
          fontSize={12}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          stroke="#64748b"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "#1e293b",
            border: "1px solid #334155",
            borderRadius: "8px",
          }}
          formatter={(value: number) => [`${(value / 1000).toFixed(1)}K`, ""]}
        />
        <Legend />
        <Line
          type="monotone"
          dataKey="impressions"
          stroke="#3b82f6"
          strokeWidth={2}
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="reach"
          stroke="#f59e0b"
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
