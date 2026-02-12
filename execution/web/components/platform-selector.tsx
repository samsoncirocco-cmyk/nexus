"use client";

import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface Platform {
  id: string;
  name: string;
  icon: string;
  connected: boolean;
  maxChars: number;
  followerCount?: string;
  accountName?: string;
}

interface PlatformSelectorProps {
  platforms: Platform[];
  selected: string[];
  onChange: (selected: string[]) => void;
  maxSelection?: number;
}

const platformColors: Record<string, string> = {
  twitter: "bg-black border-black",
  linkedin: "bg-[#0a66c2] border-[#0a66c2]",
  instagram: "bg-gradient-to-br from-[#f09433] via-[#e4405f] to-[#bc1888]",
  facebook: "bg-[#1877f2] border-[#1877f2]",
  tiktok: "bg-black border-black",
  youtube: "bg-[#ff0000] border-[#ff0000]",
  threads: "bg-black border-black",
  mastodon: "bg-[#6364ff] border-[#6364ff]",
};

const platformIcons: Record<string, string> = {
  twitter: "𝕏",
  linkedin: "in",
  instagram: "📷",
  facebook: "f",
  tiktok: "♪",
  youtube: "▶",
  threads: "@",
  mastodon: "🐘",
};

export function PlatformSelector({
  platforms,
  selected,
  onChange,
  maxSelection = 8,
}: PlatformSelectorProps) {
  const handleToggle = (platformId: string) => {
    if (selected.includes(platformId)) {
      onChange(selected.filter((id) => id !== platformId));
    } else {
      if (selected.length < maxSelection) {
        onChange([...selected, platformId]);
      }
    }
  };

  const handleSelectAll = () => {
    const connected = platforms.filter((p) => p.connected).map((p) => p.id);
    onChange(connected.slice(0, maxSelection));
  };

  const handleDeselectAll = () => {
    onChange([]);
  };

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Actions */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {selected.length} of {platforms.filter(p => p.connected).length} selected
          </span>
          <div className="flex gap-2">
            <button
              onClick={handleSelectAll}
              className="text-primary hover:underline"
            >
              Select All
            </button>
            <span className="text-muted-foreground">|</span>
            <button
              onClick={handleDeselectAll}
              className="text-muted-foreground hover:text-foreground"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Platform Grid */}
        <div className="grid grid-cols-2 gap-3">
          {platforms.map((platform) => {
            const isSelected = selected.includes(platform.id);
            const isDisabled = !platform.connected ||
              (!isSelected && selected.length >= maxSelection);

            return (
              <Tooltip key={platform.id}>
                <TooltipTrigger asChild>
                  <div
                    className={cn(
                      "relative flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all",
                      isSelected
                        ? "border-primary bg-primary/5"
                        : "border-transparent bg-muted/50 hover:bg-muted",
                      isDisabled && "opacity-50 cursor-not-allowed hover:bg-muted/50"
                    )}
                    onClick={() => !isDisabled && handleToggle(platform.id)}
                  >
                    {/* Platform Icon */}
                    <div
                      className={cn(
                        "flex items-center justify-center w-10 h-10 rounded-lg text-white font-bold text-lg shrink-0",
                        platformColors[platform.id] || "bg-muted border border-border"
                      )}
                    >
                      {platformIcons[platform.id] || platform.name[0]}
                    </div>

                    {/* Platform Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">
                          {platform.name}
                        </span>
                        {platform.connected && (
                          <div className="w-2 h-2 rounded-full bg-green-500" />
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {platform.connected ? (
                          platform.accountName || `${platform.followerCount || "0"} followers`
                        ) : (
                          "Not connected"
                        )}
                      </div>
                    </div>

                    {/* Checkbox */}
                    <Checkbox
                      checked={isSelected}
                      disabled={isDisabled}
                      className="pointer-events-none"
                    />

                    {/* Max Chars Badge */}
                    {isSelected && (
                      <Badge
                        variant="secondary"
                        className="absolute -top-2 -right-2 text-[10px]"
                      >
                        {platform.maxChars.toLocaleString()}
                      </Badge>
                    )}
                  </div>
                </TooltipTrigger>
                {!platform.connected && (
                  <TooltipContent>
                    <p>Connect this platform in settings</p>
                  </TooltipContent>
                )}
                {!isSelected && selected.length >= maxSelection && (
                  <TooltipContent>
                    <p>Maximum {maxSelection} platforms allowed</p>
                  </TooltipContent>
                )}
              </Tooltip>
            );
          })}
        </div>

        {/* Platform Tips */}
        {selected.length > 0 && (
          <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
            <p className="font-medium mb-1">💡 Tips:</p>
            <ul className="space-y-1 list-disc list-inside">
              {selected.length > 3 && (
                <li>Consider creating platform-specific variations for better engagement</li>
              )}
              {selected.includes("twitter") && selected.some(p => p !== "twitter" && platforms.find(pl => pl.id === p)?.maxChars && (platforms.find(pl => pl.id === p)?.maxChars || 0) > 280) && (
                <li>Content may be truncated on Twitter/X</li>
              )}
            </ul>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
