"use client";

import { useState, useEffect } from "react";
import { getStats, getRecentEvents, searchEvents, BQEvent } from "@/lib/datalake";
import { formatDistanceToNow } from "date-fns";

export default function MemoryPage() {
  const [query, setQuery] = useState("");
  const [events, setEvents] = useState<BQEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");
  const [stats, setStats] = useState<any[]>([]);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (query.length > 2) {
      handleSearch(query);
    } else if (query.length === 0) {
      loadInitialData();
    }
  }, [query]);

  async function loadInitialData() {
    setLoading(true);
    const [recent, statData] = await Promise.all([
      getRecentEvents(50),
      getStats()
    ]);
    setEvents(recent);
    setStats(statData);
    setLoading(false);
  }

  async function handleSearch(q: string) {
    setLoading(true);
    const results = await searchEvents(q);
    setEvents(results);
    setLoading(false);
  }

  const filters = ["All", "conversation", "decision", "insight", "daily_note", "vault_doc"];

  const filteredEvents = filter === "All" 
    ? events 
    : events.filter(e => e.type === filter);

  const getBadgeColor = (type: string) => {
    switch(type) {
      case 'conversation': return 'bg-blue-900 text-blue-200';
      case 'decision': return 'bg-red-900 text-red-200';
      case 'insight': return 'bg-purple-900 text-purple-200';
      case 'daily_note': return 'bg-green-900 text-green-200';
      default: return 'bg-gray-800 text-gray-300';
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0f0c] text-white p-6 font-sans">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-[#fade29] mb-2">Memory Explorer</h1>
          <p className="text-gray-400">Search across {stats.reduce((acc, curr) => acc + (parseInt(curr.count) || 0), 0)} events in the Data Lake.</p>
        </header>

        {/* Search & Filter */}
        <div className="sticky top-4 z-10 bg-[#0a0f0c]/95 backdrop-blur-sm py-4 border-b border-gray-800 mb-8">
          <input 
            type="text" 
            placeholder="Search memories..." 
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-lg focus:outline-none focus:border-[#fade29] mb-4"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          
          <div className="flex flex-wrap gap-2">
            {filters.map(f => (
              <button 
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  filter === f 
                    ? 'bg-[#fade29] text-black' 
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                {f.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Timeline */}
        <div className="space-y-6">
          {loading ? (
            <div className="text-center py-10 text-gray-500">Loading memories...</div>
          ) : filteredEvents.length === 0 ? (
            <div className="text-center py-10 text-gray-500">No events found.</div>
          ) : (
            filteredEvents.map((event, i) => (
              <div key={i} className="relative pl-8 border-l border-gray-800">
                <div className="absolute -left-1.5 top-1.5 w-3 h-3 rounded-full bg-[#fade29]"></div>
                <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-800 hover:border-gray-700 transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex gap-2 items-center">
                      <span className={`text-xs px-2 py-0.5 rounded uppercase tracking-wider ${getBadgeColor(event.type)}`}>
                        {event.type}
                      </span>
                      <span className="text-xs text-gray-500">{event.source}</span>
                    </div>
                    <span className="text-xs text-gray-400">
                      {event.timestamp ? formatDistanceToNow(new Date(Number(event.timestamp) * 1000), { addSuffix: true }) : 'Unknown'}
                    </span>
                  </div>
                  
                  <h3 className="text-lg font-semibold text-gray-200 mb-1">
                    {event.summary || "No summary"}
                  </h3>
                  
                  <p className="text-gray-400 text-sm line-clamp-3">
                    {event.content}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
