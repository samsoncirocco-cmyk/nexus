"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  CheckCircle2,
  AlertCircle,
  Edit3,
  RotateCcw,
  Maximize2,
  Minimize2,
  Sparkles,
  Copy,
  Eye,
  EyeOff
} from "lucide-react";

interface Platform {
  id: string;
  name: string;
  icon: string;
  maxChars: number;
  color: string;
}

interface AdaptationPreviewProps {
  content: string;
  platforms: Platform[];
}

interface PlatformAdaptation {
  content: string;
  hashtags: string[];
  mentions: string[];
  isEdited: boolean;
  warnings: string[];
  characterCount: number;
}

export function AdaptationPreview({ content, platforms }: AdaptationPreviewProps) {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [expandedPlatform, setExpandedPlatform] = useState<string | null>(null);
  const [editingPlatform, setEditingPlatform] = useState<string | null>(null);
  const [adaptations, setAdaptations] = useState<Record<string, PlatformAdaptation>>(() => {
    // Generate mock adaptations for each platform
    const initial: Record<string, PlatformAdaptation> = {};
    platforms.forEach((platform) => {
      initial[platform.id] = generateMockAdaptation(content, platform);
    });
    return initial;
  });

  const handleEdit = (platformId: string) => {
    setEditingPlatform(platformId);
  };

  const handleSaveEdit = (platformId: string, newContent: string) => {
    setAdaptations((prev) => ({
      ...prev,
      [platformId]: {
        ...prev[platformId],
        content: newContent,
        isEdited: true,
        characterCount: newContent.length,
      },
    }));
    setEditingPlatform(null);
  };

  const handleRegenerate = (platformId: string) => {
    // In real implementation, call AI service
    console.log("Regenerating adaptation for", platformId);
  };

  const handleApprove = (platformId: string) => {
    // Mark as approved
    console.log("Approved adaptation for", platformId);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  if (platforms.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="rounded-full bg-muted p-4 mb-4">
            <AlertCircle className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="font-medium mb-1">No platforms selected</h3>
          <p className="text-sm text-muted-foreground">
            Select platforms to see adapted previews
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* View Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === "grid" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("grid")}
          >
            Grid
          </Button>
          <Button
            variant={viewMode === "list" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("list")}
          >
            List
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Sparkles className="mr-1 h-4 w-4" />
            Optimize All
          </Button>
          <Button variant="outline" size="sm">
            <CheckCircle2 className="mr-1 h-4 w-4" />
            Approve All
          </Button>
        </div>
      </div>

      {/* Previews */}
      <div className={cn(
        "grid gap-4",
        viewMode === "grid" ? "md:grid-cols-2 lg:grid-cols-3" : "grid-cols-1"
      )}>
        {platforms.map((platform) => {
          const adaptation = adaptations[platform.id];
          const characterPercentage = (adaptation.characterCount / platform.maxChars) * 100;
          const isOverLimit = adaptation.characterCount > platform.maxChars;
          const isExpanded = expandedPlatform === platform.id;
          const isEditing = editingPlatform === platform.id;

          return (
            <Card
              key={platform.id}
              className={cn(
                "transition-all duration-200",
                isExpanded && viewMode === "grid" && "md:col-span-2 lg:col-span-3",
                isOverLimit && "border-red-500/50"
              )}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold",
                        platform.color
                      )}
                    >
                      {platform.name[0]}
                    </div>
                    <div>
                      <CardTitle className="text-base">{platform.name}</CardTitle>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className={cn(
                          "font-mono",
                          isOverLimit ? "text-red-500 font-bold" :
                          characterPercentage > 90 ? "text-yellow-500" : ""
                        )}>
                          {adaptation.characterCount}/{platform.maxChars}
                        </span>
                        {adaptation.isEdited && (
                          <Badge variant="secondary" className="text-[10px]">Edited</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleEdit(platform.id)}
                    >
                      <Edit3 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setExpandedPlatform(isExpanded ? null : platform.id)}
                    >
                      {isExpanded ? (
                        <Minimize2 className="h-4 w-4" />
                      ) : (
                        <Maximize2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* Character Progress Bar */}
                <div className="mt-3">
                  <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full transition-all duration-300",
                        isOverLimit ? "bg-red-500" :
                        characterPercentage > 90 ? "bg-yellow-500" : "bg-green-500"
                      )}
                      style={{ width: `${Math.min(characterPercentage, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Warnings */}
                {(isOverLimit || adaptation.warnings.length > 0) && (
                  <div className="mt-3 space-y-1">
                    {isOverLimit && (
                      <div className="flex items-center gap-1 text-xs text-red-500">
                        <AlertCircle className="h-3 w-3" />
                        {adaptation.characterCount - platform.maxChars} characters over limit
                      </div>
                    )}
                    {adaptation.warnings.map((warning, i) => (
                      <div key={i} className="flex items-center gap-1 text-xs text-yellow-500">
                        <AlertCircle className="h-3 w-3" />
                        {warning}
                      </div>
                    ))}
                  </div>
                )}
              </CardHeader>

              <CardContent>
                {isEditing ? (
                  <div className="space-y-3">
                    <Textarea
                      defaultValue={adaptation.content}
                      className="min-h-[120px]"
                      autoFocus
                      onBlur={(e) => handleSaveEdit(platform.id, e.target.value)}
                    />
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingPlatform(null)}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={(e) => {
                          const textarea = e.currentTarget.parentElement?.previousElementSibling as HTMLTextAreaElement;
                          if (textarea) handleSaveEdit(platform.id, textarea.value);
                        }}
                      >
                        Save
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="relative group">
                    <div className={cn(
                      "whitespace-pre-wrap text-sm",
                      !isExpanded && "line-clamp-4"
                    )}>
                      {adaptation.content}
                    </div>

                    {/* Hashtags */}
                    {adaptation.hashtags.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1">
                        {adaptation.hashtags.map((tag) => (
                          <span
                            key={tag}
                            className="text-xs text-primary hover:underline cursor-pointer"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Hover Actions */}
                    <div className="absolute top-0 right-0 hidden group-hover:flex gap-1 bg-card p-1 rounded shadow-lg border">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleCopy(adaptation.content)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleRegenerate(platform.id)}
                      >
                        <RotateCcw className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRegenerate(platform.id)}
                    >
                      <RotateCcw className="mr-1 h-3 w-3" />
                      Regenerate
                    </Button>
                  </div>
                  <Button size="sm" onClick={() => handleApprove(platform.id)}>
                    <CheckCircle2 className="mr-1 h-3 w-3" />
                    Approve
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function generateMockAdaptation(content: string, platform: Platform): PlatformAdaptation {
  // Mock adaptation logic - in real app, this would call an AI service
  let adaptedContent = content;
  const hashtags: string[] = [];
  const warnings: string[] = [];

  if (platform.id === "twitter") {
    // Twitter-specific adaptations
    if (content.length > 280) {
      adaptedContent = content.substring(0, 277) + "...";
      warnings.push("Content may be truncated");
    }
    hashtags.push("#thread", "#twitter");
  } else if (platform.id === "linkedin") {
    hashtags.push("#linkedin", "#professional", "#networking");
  } else if (platform.id === "instagram") {
    hashtags.push("#instagood", "#instagram", "#instadaily", "#photooftheday");
  } else if (platform.id === "tiktok") {
    hashtags.push("#fyp", "#viral", "#tiktok");
  }

  return {
    content: adaptedContent,
    hashtags,
    mentions: [],
    isEdited: false,
    warnings,
    characterCount: adaptedContent.length,
  };
}
