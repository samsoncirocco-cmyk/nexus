'use client';
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = SearchPage;
var react_1 = require("react");
var navigation_1 = require("next/navigation");
var searchMock_1 = require("@/lib/searchMock");
var SOURCE_FILTERS = [
    { key: 'all', label: 'All', emoji: '🔍' },
    { key: 'note', label: 'Notes', emoji: '📝' },
    { key: 'email', label: 'Email', emoji: '📧' },
    { key: 'task', label: 'Tasks', emoji: '✅' },
    { key: 'agent', label: 'Agents', emoji: '🤖' },
];
function getSourceBadge(source) {
    switch (source) {
        case 'note':
            return {
                label: 'NOTE',
                bgColor: 'bg-emerald-500/15',
                textColor: 'text-emerald-400',
                borderColor: 'border-emerald-500/30',
            };
        case 'email':
            return {
                label: 'EMAIL',
                bgColor: 'bg-blue-500/15',
                textColor: 'text-blue-400',
                borderColor: 'border-blue-500/30',
            };
        case 'task':
            return {
                label: 'TASK',
                bgColor: 'bg-primary/15',
                textColor: 'text-primary',
                borderColor: 'border-primary/30',
            };
        case 'agent':
            return {
                label: 'AGENT',
                bgColor: 'bg-purple-500/15',
                textColor: 'text-purple-400',
                borderColor: 'border-purple-500/30',
            };
    }
}
function highlightText(text, query) {
    if (!query.trim())
        return text;
    var parts = text.split(new RegExp("(".concat(query, ")"), 'gi'));
    return parts.map(function (part, i) {
        return part.toLowerCase() === query.toLowerCase() ? (<mark key={i} className="bg-primary/30 text-primary font-semibold">
        {part}
      </mark>) : (part);
    });
}
function ResultSkeleton() {
    return (<div className="rounded-xl border border-white/10 bg-bg-dark p-4 animate-pulse">
      <div className="flex items-center gap-2 mb-3">
        <div className="h-5 w-16 bg-white/10 rounded-full"/>
        <div className="h-3 w-12 bg-white/5 rounded"/>
      </div>
      <div className="h-5 bg-white/10 rounded w-3/4 mb-2"/>
      <div className="h-4 bg-white/5 rounded w-full mb-1"/>
      <div className="h-4 bg-white/5 rounded w-5/6"/>
      <div className="flex items-center gap-3 mt-3">
        <div className="h-3 w-20 bg-white/5 rounded"/>
        <div className="h-1 flex-1 bg-white/5 rounded"/>
      </div>
    </div>);
}
function SearchPage() {
    var _this = this;
    var router = (0, navigation_1.useRouter)();
    var inputRef = (0, react_1.useRef)(null);
    var _a = (0, react_1.useState)(''), query = _a[0], setQuery = _a[1];
    var _b = (0, react_1.useState)(''), debouncedQuery = _b[0], setDebouncedQuery = _b[1];
    var _c = (0, react_1.useState)([]), selectedSources = _c[0], setSelectedSources = _c[1];
    var _d = (0, react_1.useState)([]), results = _d[0], setResults = _d[1];
    var _e = (0, react_1.useState)(false), loading = _e[0], setLoading = _e[1];
    var _f = (0, react_1.useState)(false), isSearchActive = _f[0], setIsSearchActive = _f[1];
    // Debounce search query (300ms)
    (0, react_1.useEffect)(function () {
        var timer = setTimeout(function () {
            setDebouncedQuery(query);
        }, 300);
        return function () { return clearTimeout(timer); };
    }, [query]);
    // Perform search when debounced query changes
    (0, react_1.useEffect)(function () {
        if (!debouncedQuery.trim() && selectedSources.length === 0) {
            setResults([]);
            setIsSearchActive(false);
            return;
        }
        setLoading(true);
        setIsSearchActive(true);
        // Simulate API call with setTimeout
        var searchTimer = setTimeout(function () { return __awaiter(_this, void 0, void 0, function () {
            var params, response, data, mockResults, error_1, mockResults;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 5, 6, 7]);
                        params = new URLSearchParams();
                        if (debouncedQuery)
                            params.set('q', debouncedQuery);
                        if (selectedSources.length > 0)
                            params.set('sources', selectedSources.join(','));
                        return [4 /*yield*/, fetch("/api/search?".concat(params.toString()))];
                    case 1:
                        response = _a.sent();
                        if (!response.ok) return [3 /*break*/, 3];
                        return [4 /*yield*/, response.json()];
                    case 2:
                        data = _a.sent();
                        setResults(data.results || []);
                        return [3 /*break*/, 4];
                    case 3:
                        mockResults = (0, searchMock_1.filterMockResults)(debouncedQuery, selectedSources);
                        setResults(mockResults);
                        _a.label = 4;
                    case 4: return [3 /*break*/, 7];
                    case 5:
                        error_1 = _a.sent();
                        mockResults = (0, searchMock_1.filterMockResults)(debouncedQuery, selectedSources);
                        setResults(mockResults);
                        return [3 /*break*/, 7];
                    case 6:
                        setLoading(false);
                        return [7 /*endfinally*/];
                    case 7: return [2 /*return*/];
                }
            });
        }); }, 200);
        return function () { return clearTimeout(searchTimer); };
    }, [debouncedQuery, selectedSources]);
    // Auto-focus input on mount
    (0, react_1.useEffect)(function () {
        var _a;
        (_a = inputRef.current) === null || _a === void 0 ? void 0 : _a.focus();
    }, []);
    // Global keyboard shortcut (Cmd+K / Ctrl+K)
    (0, react_1.useEffect)(function () {
        var handleKeyDown = function (e) {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                router.push('/search');
                // Small delay to ensure component is mounted
                setTimeout(function () { var _a; return (_a = inputRef.current) === null || _a === void 0 ? void 0 : _a.focus(); }, 100);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return function () { return window.removeEventListener('keydown', handleKeyDown); };
    }, [router]);
    var toggleSource = (0, react_1.useCallback)(function (source) {
        setSelectedSources(function (prev) {
            return prev.includes(source) ? prev.filter(function (s) { return s !== source; }) : __spreadArray(__spreadArray([], prev, true), [source], false);
        });
    }, []);
    var clearFilters = (0, react_1.useCallback)(function () {
        setSelectedSources([]);
        setQuery('');
        setResults([]);
        setIsSearchActive(false);
    }, []);
    return (<div className="min-h-screen pb-20">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-bg-dark/80 backdrop-blur-md px-4 md:px-6 pt-6 pb-4 border-b border-primary/10">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-primary rounded-lg p-1.5">
              <span className="material-symbols-outlined text-bg-dark font-bold" style={{ fontSize: 22 }}>
                search
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-[0.2em] text-primary font-bold">
                Universal Search
              </span>
              <h1 className="text-xl font-bold tracking-tight">
                {results.length > 0
            ? "".concat(results.length, " ").concat(results.length === 1 ? 'Result' : 'Results')
            : 'Search Everything'}
              </h1>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative mb-4">
            <input ref={inputRef} type="text" value={query} onChange={function (e) { return setQuery(e.target.value); }} placeholder="Search notes, emails, tasks, agents..." className="w-full bg-card-dark border border-white/10 rounded-xl px-4 py-3.5 pl-12 text-foreground placeholder:text-foreground-muted focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all" aria-label="Search input"/>
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-primary" style={{ fontSize: 20 }}>
              search
            </span>
            {query && (<button onClick={function () {
                var _a;
                setQuery('');
                (_a = inputRef.current) === null || _a === void 0 ? void 0 : _a.focus();
            }} className="absolute right-4 top-1/2 -translate-y-1/2 text-foreground-muted hover:text-foreground transition-colors" aria-label="Clear search">
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                  close
                </span>
              </button>)}
          </div>

          {/* Source Filter Pills */}
          <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-2">
            {SOURCE_FILTERS.map(function (_a) {
            var key = _a.key, label = _a.label, emoji = _a.emoji;
            var isActive = key === 'all' ? selectedSources.length === 0 : selectedSources.includes(key);
            return (<button key={key} onClick={function () {
                    if (key === 'all') {
                        setSelectedSources([]);
                    }
                    else {
                        toggleSource(key);
                    }
                }} className={"flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ".concat(isActive
                    ? 'bg-primary text-bg-dark'
                    : 'bg-white/5 text-foreground-muted hover:bg-white/10')} aria-pressed={isActive}>
                  <span>{emoji}</span>
                  <span>{label}</span>
                </button>);
        })}
            {selectedSources.length > 0 && (<button onClick={clearFilters} className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all">
                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                  close
                </span>
                <span>Clear</span>
              </button>)}
          </div>

          {/* Keyboard Hint */}
          <div className="mt-3 flex items-center gap-2 text-[10px] text-foreground-muted">
            <kbd className="px-2 py-0.5 rounded bg-white/5 border border-white/10 font-mono">⌘K</kbd>
            <span>to search from anywhere</span>
          </div>
        </div>
      </header>

      {/* Results */}
      <main className="px-4 md:px-6 py-6 max-w-3xl mx-auto">
        {/* Empty State - No Search */}
        {!isSearchActive && (<div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="size-20 rounded-full bg-secondary-dark/40 border border-primary/10 flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-primary" style={{ fontSize: 32 }}>
                travel_explore
              </span>
            </div>
            <h3 className="text-lg font-bold mb-2">Start typing to search</h3>
            <p className="text-foreground-muted text-sm max-w-sm">
              Search across all your notes, emails, tasks, and agent activity. Use filters to narrow down
              results.
            </p>
          </div>)}

        {/* Loading Skeleton */}
        {loading && isSearchActive && (<div className="space-y-4 animate-fade-in">
            <ResultSkeleton />
            <ResultSkeleton />
            <ResultSkeleton />
          </div>)}

        {/* Empty State - No Results */}
        {!loading && isSearchActive && results.length === 0 && (<div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="size-20 rounded-full bg-secondary-dark/40 border border-primary/10 flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-foreground-muted" style={{ fontSize: 32 }}>
                search_off
              </span>
            </div>
            <h3 className="text-lg font-bold mb-2">No results found</h3>
            <p className="text-foreground-muted text-sm max-w-sm mb-4">
              Try adjusting your search query or filters
            </p>
            <button onClick={clearFilters} className="px-4 py-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors font-semibold text-sm">
              Clear filters
            </button>
          </div>)}

        {/* Results List */}
        {!loading && results.length > 0 && (<div className="space-y-4 animate-fade-in">
            {results.map(function (result) {
                var badge = getSourceBadge(result.source);
                return (<a key={result.id} href={result.url || '#'} className="block rounded-xl border border-white/10 bg-bg-dark hover:border-primary/40 transition-all p-4 group">
                  {/* Header: Badge + Score + Timestamp */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className={"".concat(badge.bgColor, " ").concat(badge.textColor, " ").concat(badge.borderColor, " px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider border")}>
                        {badge.label}
                      </span>
                      {result.tags && result.tags.length > 0 && (<div className="flex gap-1">
                          {result.tags.slice(0, 2).map(function (tag) { return (<span key={tag} className="text-[9px] px-2 py-0.5 rounded-full bg-white/5 text-foreground-muted">
                              #{tag}
                            </span>); })}
                        </div>)}
                    </div>
                    <span className="text-xs text-foreground-muted" suppressHydrationWarning>
                      {new Date(result.timestamp).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                    })}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="font-bold text-foreground group-hover:text-primary transition-colors mb-2 leading-snug">
                    {highlightText(result.title, query)}
                  </h3>

                  {/* Preview Snippet */}
                  <p className="text-sm text-foreground-muted line-clamp-2 leading-relaxed mb-3">
                    {highlightText(result.preview, query)}
                  </p>

                  {/* Footer: Score Bar */}
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-foreground-muted font-medium uppercase tracking-wider">
                      Relevance
                    </span>
                    <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-primary to-primary-muted rounded-full transition-all" style={{ width: "".concat(result.score * 100, "%") }}/>
                    </div>
                    <span className="text-xs text-primary font-bold">{Math.round(result.score * 100)}%</span>
                  </div>
                </a>);
            })}
          </div>)}
      </main>
    </div>);
}
