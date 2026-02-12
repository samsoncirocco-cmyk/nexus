"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Sparkles,
  Clock,
  Send,
  Save,
  Wand2,
  ChevronRight,
  ChevronLeft,
  Zap,
  FileText,
  Video,
  Image,
  LayoutTemplate
} from "lucide-react";
import { ContentComposer } from "@/components/content-composer";
import { PlatformSelector } from "@/components/platform-selector";
import { AdaptationPreview } from "@/components/adaptation-preview";
import { VoiceSelector } from "@/components/voice-selector";

interface Platform {
  id: string;
  name: string;
  icon: string;
  connected: boolean;
  maxChars: number;
}

const platforms: Platform[] = [
  { id: "twitter", name: "Twitter/X", icon: "twitter", connected: true, maxChars: 280 },
  { id: "linkedin", name: "LinkedIn", icon: "linkedin", connected: true, maxChars: 3000 },
  { id: "instagram", name: "Instagram", icon: "instagram", connected: true, maxChars: 2200 },
  { id: "facebook", name: "Facebook", icon: "facebook", connected: true, maxChars: 63206 },
  { id: "tiktok", name: "TikTok", icon: "tiktok", connected: true, maxChars: 2200 },
  { id: "threads", name: "Threads", icon: "threads", connected: false, maxChars: 500 },
  { id: "mastodon", name: "Mastodon", icon: "mastodon", connected: false, maxChars: 500 },
];

const voiceProfiles = [
  { id: "1", name: "Professional", description: "Formal, authoritative tone" },
  { id: "2", name: "Casual", description: "Relaxed, conversational style" },
  { id: "3", name: "Witty", description: "Humorous, clever approach" },
  { id: "4", name: "Inspirational", description: "Motivational, uplifting tone" },
];

export default function ComposerPage() {
  const [content, setContent] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(["twitter", "linkedin"]);
  const [activeTab, setActiveTab] = useState("write");
  const [selectedVoice, setSelectedVoice] = useState("1");
  const [draftSaved, setDraftSaved] = useState(false);

  const handleSaveDraft = () => {
    // Save to localStorage
    localStorage.setItem("composer-draft", content);
    setDraftSaved(true);
    setTimeout(() => setDraftSaved(false), 2000);
  };

  const handleAIAssist = () => {
    // Trigger AI assistance
    console.log("AI assist triggered");
  };

  const connectedPlatforms = platforms.filter(p => p.connected);

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Content Composer</h1>
          <p className="text-muted-foreground">Create once, adapt everywhere.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={handleSaveDraft}>
            <Save className="mr-2 h-4 w-4" />
            {draftSaved ? "Saved!" : "Save Draft"}
          </Button>
          <Button variant="outline" asChild>
            <div className="flex items-center">
              <Clock className="mr-2 h-4 w-4" />
              Schedule
            </div>
          </Button>
          <Button>
            <Send className="mr-2 h-4 w-4" />
            Publish Now
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Main Composer */}
        <div className="lg:col-span-7 space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="write" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">Write</span>
              </TabsTrigger>
              <TabsTrigger value="media" className="flex items-center gap-2">
                <Image className="h-4 w-4" />
                <span className="hidden sm:inline">Media</span>
              </TabsTrigger>
              <TabsTrigger value="templates" className="flex items-center gap-2">
                <LayoutTemplate className="h-4 w-4" />
                <span className="hidden sm:inline">Templates</span>
              </TabsTrigger>
              <TabsTrigger value="ai" className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                <span className="hidden sm:inline">AI</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="write" className="mt-6">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Brain Dump</CardTitle>
                      <CardDescription>Write freely. We'll adapt it for each platform.</CardDescription>
                    </div>
                    <VoiceSelector
                      voices={voiceProfiles}
                      selected={selectedVoice}
                      onChange={setSelectedVoice}
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  <ContentComposer
                    value={content}
                    onChange={setContent}
                    placeholder="What's on your mind? Start typing or paste your content here..."
                    className="min-h-[300px]"
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="media" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Media Attachments</CardTitle>
                  <CardDescription>Add images, videos, or links to your post</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-12 text-center">
                    <div className="flex justify-center gap-4 mb-4">
                      <div className="p-3 bg-muted rounded-lg">
                        <Image className="h-6 w-6" />
                      </div>
                      <div className="p-3 bg-muted rounded-lg">
                        <Video className="h-6 w-6" />
                      </div>
                    </div>
                    <p className="text-muted-foreground mb-2">
                      Drag & drop files here, or click to browse
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Supports: JPG, PNG, GIF, MP4, MOV (Max 100MB)
                    </p>
                    <Button variant="outline" className="mt-4">
                      Browse Files
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="templates" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Choose a Template</CardTitle>
                  <CardDescription>Start with a pre-made template</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {[
                      { name: "Product Launch", description: "Announce a new product or feature" },
                      { name: "Behind the Scenes", description: "Show your process or team" },
                      { name: "Tips & Tricks", description: "Share valuable insights" },
                      { name: "Customer Story", description: "Showcase user success" },
                      { name: "Industry News", description: "Comment on trending topics" },
                      { name: "Question Post", description: "Engage your audience" },
                    ].map((template) => (
                      <div
                        key={template.name}
                        className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => {
                          setContent(`${template.name}:\n\n[Your content here...]`);
                          setActiveTab("write");
                        }}
                      >
                        <p className="font-medium">{template.name}</p>
                        <p className="text-sm text-muted-foreground">{template.description}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="ai" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>AI Assistance</CardTitle>
                  <CardDescription>Let AI help improve your content</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Button variant="outline" className="h-auto py-4 justify-start">
                        <div>
                          <p className="font-medium">✨ Rewrite for clarity</p>
                          <p className="text-xs text-muted-foreground">Simplify and improve readability</p>
                        </div>
                      </Button>
                      <Button variant="outline" className="h-auto py-4 justify-start">
                        <div>
                          <p className="font-medium">🎯 Make it punchier</p>
                          <p className="text-xs text-muted-foreground">Add impact and energy</p>
                        </div>
                      </Button>
                      <Button variant="outline" className="h-auto py-4 justify-start">
                        <div>
                          <p className="font-medium">💡 Add examples</p>
                          <p className="text-xs text-muted-foreground">Include relevant examples</p>
                        </div>
                      </Button>
                      <Button variant="outline" className="h-auto py-4 justify-start">
                        <div>
                          <p className="font-medium">#️⃣ Suggest hashtags</p>
                          <p className="text-xs text-muted-foreground">Find trending hashtags</p>
                        </div>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Side Panel */}
        <div className="lg:col-span-5 space-y-6">
          {/* Platform Selector */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Target Platforms</CardTitle>
              <CardDescription>Choose where to publish</CardDescription>
            </CardHeader>
            <CardContent>
              <PlatformSelector
                platforms={connectedPlatforms}
                selected={selectedPlatforms}
                onChange={setSelectedPlatforms}
              />
            </CardContent>
          </Card>

          {/* AI Quick Actions */}
          {content && (
            <Card className="border-primary/20">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <CardTitle className="text-base">Quick Enhance</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-2">
                <Button variant="secondary" size="sm">
                  <Wand2 className="mr-1 h-3 w-3" />
                  Fix Grammar
                </Button>
                <Button variant="secondary" size="sm">
                  <Zap className="mr-1 h-3 w-3" />
                  Optimize
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Preview Section */}
      {content && selectedPlatforms.length > 0 && (
        <div className="animate-fade-in">
          <Separator className="my-6" />
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Platform Previews</h2>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <ChevronLeft className="mr-1 h-4 w-4" />
                Previous
              </Button>
              <Button variant="outline" size="sm">
                Next
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>
          <AdaptationPreview
            content={content}
            platforms={connectedPlatforms.filter(p => selectedPlatforms.includes(p.id))}
          />
        </div>
      )}
    </div>
  );
}
