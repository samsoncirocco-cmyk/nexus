# Nexus UI Components - Specification

## Overview
Complete component specification for Nexus content creation platform. Built with Next.js 16, React 19, Tailwind CSS v4, shadcn/ui, and Recharts.

---

## 1. ContentComposer

### Purpose
Primary content creation interface for "brain dump" style input.

### Props Interface
```typescript
interface ContentComposerProps {
  defaultValue?: string;
  onChange?: (value: string) => void;
  onSubmit?: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
  disabled?: boolean;
  autoFocus?: boolean;
}
```

### Features
- **Auto-expanding textarea**: Grows with content up to max-height
- **Character counter**: Shows remaining characters
- **Format toolbar**: Bold, italic, bullet points, numbered lists
- **Draft saving**: Auto-save to localStorage every 30 seconds
- **Voice input**: Microphone button for speech-to-text
- **Mood tags**: Quick-select tags (#excited, #thinking, #question)
- **File attachments**: Drag & drop images, up to 4 per post

### Design
- Clean, distraction-free interface
- Focus mode: hides sidebars when typing
- Dark/light mode support
- Mobile-responsive bottom sheet on small screens

---

## 2. PlatformCard

### Purpose
Display connection status and quick actions for each social platform.

### Props Interface
```typescript
interface PlatformCardProps {
  platform: {
    id: string;
    name: string;
    icon: string;
    connected: boolean;
    lastSync?: Date;
    followerCount?: number;
    postCount?: number;
    accountName?: string;
  };
  onConnect: () => void;
  onDisconnect: () => void;
  onSync: () => void;
  onSettings: () => void;
}
```

### Features
- **Connection status**: Visual indicator (online/offline/pending)
- **Quick stats**: Followers, posts, engagement rate
- **Platform-specific colors**: Brand colors for each platform
- **Actions menu**: Connect/disconnect, sync, settings
- **Last sync indicator**: Time since last data sync

### Supported Platforms
- Twitter/X
- LinkedIn
- Instagram
- Facebook
- TikTok
- YouTube
- Threads
- Mastodon

---

## 3. AdaptationPreview

### Purpose
Show side-by-side previews of how content will appear on each platform.

### Props Interface
```typescript
interface AdaptationPreviewProps {
  content: string;
  platforms: string[];
  adaptations: Record<string, PlatformAdaptation>;
  onEdit?: (platformId: string, content: string) => void;
  onApprove?: (platformId: string) => void;
}

interface PlatformAdaptation {
  content: string;
  hashtags?: string[];
  mentions?: string[];
  media?: MediaItem[];
  warnings?: string[];
  characterCount: number;
  maxCharacters: number;
}
```

### Features
- **Side-by-side view**: Compare all platforms at once
- **Platform-specific preview**: Accurate rendering per platform
- **Character limits**: Visual indicator of remaining space
- **Hashtag highlighting**: Shows auto-generated hashtags
- **Warning indicators**: Alerts for issues (too long, broken links)
- **Edit mode**: Modify adaptations individually
- **One-click approve**: Approve all or individual adaptations

### Platform Previews
- **Twitter/X**: Show thread preview if >280 chars
- **LinkedIn**: Professional formatting, link previews
- **Instagram**: Square image grid, caption format
- **Facebook**: Link card preview, reactions bar
- **TikTok**: Vertical video preview, music options

---

## 4. VoiceProfileForm

### Purpose
Create and manage brand voice profiles for consistent content tone.

### Props Interface
```typescript
interface VoiceProfileFormProps {
  profile?: VoiceProfile;
  onSave: (profile: VoiceProfile) => void;
  onCancel?: () => void;
  isLoading?: boolean;
}

interface VoiceProfile {
  id?: string;
  name: string;
  description: string;
  tone: string[]; // casual, professional, witty, etc.
  vocabulary: string[]; // words to use
  avoidWords: string[]; // words to avoid
  writingStyle: 'first' | 'second' | 'third';
  sentenceStyle: 'short' | 'medium' | 'long' | 'varied';
  emojiUsage: 'none' | 'minimal' | 'moderate' | 'heavy';
  hashtagStyle: 'none' | 'branded' | 'relevant' | 'trending';
  samplePost: string;
}
```

### Features
- **Voice analyzer**: Paste sample posts to auto-extract voice
- **Tone sliders**: Adjust formality, enthusiasm, humor levels
- **Vocabulary manager**: Add/remove preferred/avoided words
- **Sample generator**: Generate test post based on voice
- **A/B testing**: Compare two voice variations
- **Platform overrides**: Different voice per platform

### Voice Dimensions
- Formal ↔ Casual
- Serious ↔ Playful
- Technical ↔ Simple
- Reserved ↔ Enthusiastic
- Brief ↔ Detailed

---

## 5. AnalyticsDashboard

### Purpose
Display content performance metrics across all platforms.

### Props Interface
```typescript
interface AnalyticsDashboardProps {
  dateRange: { start: Date; end: Date };
  platforms: string[];
  metrics: MetricsData;
  onDateRangeChange: (range: DateRange) => void;
  onPlatformToggle: (platformId: string) => void;
}

interface MetricsData {
  overview: OverviewMetrics;
  timeSeries: TimeSeriesData[];
  topPosts: PostMetrics[];
  platformBreakdown: PlatformMetrics[];
  audience: AudienceMetrics;
}
```

### Features
- **Overview cards**: Total impressions, engagement, followers, reach
- **Time series charts**: Line/area charts for trends
- **Platform comparison**: Bar charts comparing performance
- **Top posts table**: Sortable list of best performers
- **Audience insights**: Demographics, active times, growth
- **Custom reports**: Save and export report configurations
- **Goal tracking**: Set and track KPI targets

### Charts (Recharts)
- **OverviewChart**: Multi-line time series for key metrics
- **PlatformBreakdown**: Horizontal bar chart for platform comparison
- **EngagementFunnel**: Funnel chart showing conversion stages
- **AudienceDemographics**: Pie/Donut charts for demographics
- **Heatmap**: Activity heatmap by day/hour

---

## 6. PublishingQueue

### Purpose
Manage scheduled and queued content for publishing.

### Props Interface
```typescript
interface PublishingQueueProps {
  posts: QueuedPost[];
  onEdit: (postId: string) => void;
  onDelete: (postId: string) => void;
  onPublishNow: (postId: string) => void;
  onReschedule: (postId: string, newDate: Date) => void;
  onReorder: (newOrder: string[]) => void;
}

interface QueuedPost {
  id: string;
  content: string;
  platforms: string[];
  scheduledFor: Date;
  status: 'pending' | 'approved' | 'scheduled' | 'publishing' | 'published' | 'failed';
  author: string;
  createdAt: Date;
  media?: MediaItem[];
}
```

### Features
- **Calendar view**: Monthly calendar with scheduled posts
- **List view**: Sortable table of upcoming posts
- **Drag & drop**: Reorder queue priority
- **Bulk actions**: Select multiple posts for reschedule/delete
- **Conflict detection**: Warning for overlapping posts
- **Status indicators**: Visual state for each post
- **Quick actions**: Edit, delete, publish now, reschedule
- **Auto-schedule**: AI-suggested optimal times

### Views
- **Calendar**: Visual monthly overview
- **Timeline**: Linear chronological view
- **Board**: Kanban-style by status
- **Compact**: Minimal list for quick scanning

---

## Shared Components

### 1. PlatformSelector

```typescript
interface PlatformSelectorProps {
  platforms: Platform[];
  selected: string[];
  onChange: (selected: string[]) => void;
  maxSelection?: number;
  disabled?: string[];
}
```

**Features:**
- Checkbox selection with platform icons
- Select all/none
- Platform status indicators
- Disabled state for disconnected platforms

### 2. AnalyticsCharts

Collection of chart components:
- `LineChart` - Time series data
- `BarChart` - Comparisons
- `PieChart` - Distributions
- `FunnelChart` - Conversion funnels
- `Heatmap` - Activity patterns

### 3. ContentComposer (Shared)

Reusable editor component with:
- Rich text formatting
- Media upload
- Platform-specific hints
- Character counting per platform
- Preview toggle

---

## Styling Guidelines

### Color Palette (Tailwind CSS)
```css
/* Primary Brand Colors */
--primary: #6366f1;        /* Indigo 500 */
--primary-dark: #4338ca;   /* Indigo 700 */
--primary-light: #818cf8;  /* Indigo 400 */

/* Platform Colors */
--twitter: #000000;
--linkedin: #0a66c2;
--instagram: #e4405f;
--facebook: #1877f2;
--tiktok: #000000;
--youtube: #ff0000;

/* Status Colors */
--success: #22c55e;
--warning: #f59e0b;
--error: #ef4444;
--info: #3b82f6;

/* Neutrals (Dark Mode) */
--bg-primary: #0f172a;      /* Slate 900 */
--bg-secondary: #1e293b;    /* Slate 800 */
--bg-tertiary: #334155;     /* Slate 700 */
--text-primary: #f8fafc;    /* Slate 50 */
--text-secondary: #94a3b8;  /* Slate 400 */
--text-muted: #64748b;      /* Slate 500 */
```

### Typography
- **Primary**: Inter (sans-serif)
- **Mono**: JetBrains Mono (for code/technical content)
- **Headings**: font-semibold
- **Body**: font-normal

### Spacing
- Base unit: 4px (Tailwind default)
- Component padding: 16px (p-4)
- Card padding: 24px (p-6)
- Section gaps: 32px (gap-8)

### Animations
- Transitions: 150ms ease-in-out
- Page transitions: 300ms ease-out
- Loading states: Skeleton pulse animation

---

## Icons

Using Lucide React icons:
- `@lucide/react` library
- Consistent 20px default size
- Icon mapping per platform

---

## Component Composition

All components follow compound component pattern:

```tsx
<Card>
  <Card.Header>
    <Card.Title>Title</Card.Title>
    <Card.Description>Description</Card.Description>
  </Card.Header>
  <Card.Content>Content</Card.Content>
  <Card.Footer>Footer actions</Card.Footer>
</Card>
```

---

## Accessibility

- WCAG 2.1 AA compliance
- Keyboard navigation support
- ARIA labels for all interactive elements
- Focus visible states
- Reduced motion support
- Screen reader optimized

---

## Responsive Breakpoints

- **Mobile**: < 640px (sm)
- **Tablet**: 640px - 1024px (md/lg)
- **Desktop**: > 1024px (xl/2xl)

Mobile-first approach with progressive enhancement.
