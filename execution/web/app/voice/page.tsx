"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Mic2,
  Plus,
  Save,
  Sparkles,
  Trash2,
  Copy,
  Check,
  RefreshCw,
  HelpCircle,
  Wand2,
  Play,
  MoreHorizontal
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface VoiceProfile {
  id: string;
  name: string;
  description: string;
  isDefault: boolean;
  writingStyle: string;
  sentenceStyle: string;
  emojiUsage: string;
  hashtagStyle: string;
  tone: {
    formal: number;
    enthusiastic: number;
    technical: number;
    reserved: number;
    detailed: number;
  };
  vocabulary: string[];
  avoidWords: string[];
  samplePost: string;
}

const sampleVoiceProfiles: VoiceProfile[] = [
  {
    id: "1",
    name: "Professional",
    description: "Formal, authoritative tone suitable for B2B content",
    isDefault: true,
    writingStyle: "third",
    sentenceStyle: "medium",
    emojiUsage: "minimal",
    hashtagStyle: "relevant",
    tone: {
      formal: 90,
      enthusiastic: 30,
      technical: 60,
      reserved: 70,
      detailed: 80,
    },
    vocabulary: ["innovate", "solution", "strategic", "partnership"],
    avoidWords: ["cool", "awesome", "super"],
    samplePost: "We're excited to announce our latest strategic partnership that will drive innovation in the industry.",
  },
  {
    id: "2",
    name: "Casual",
    description: "Relaxed, conversational style for everyday posts",
    isDefault: false,
    writingStyle: "first",
    sentenceStyle: "short",
    emojiUsage: "moderate",
    hashtagStyle: "branded",
    tone: {
      formal: 20,
      enthusiastic: 80,
      technical: 20,
      reserved: 30,
      detailed: 40,
    },
    vocabulary: ["happy", "excited", "you", "we"],
    avoidWords: ["utilize", "leverage", "synergy"],
    samplePost: "Hey everyone! We're so excited to share what we've been working on lately. Check it out! 🎉",
  },
  {
    id: "3",
    name: "Technical",
    description: "Detailed, precise language for technical audiences",
    isDefault: false,
    writingStyle: "third",
    sentenceStyle: "long",
    emojiUsage: "none",
    hashtagStyle: "none",
    tone: {
      formal: 95,
      enthusiastic: 20,
      technical: 95,
      reserved: 80,
      detailed: 95,
    },
    vocabulary: ["implementation", "architecture", "optimization", "scalability"],
    avoidWords: ["easy", "simple", "just"],
    samplePost: "Our latest release implements a distributed architecture with comprehensive optimization for horizontal scalability.",
  },
];

export default function VoicePage() {
  const [profiles, setProfiles] = useState<VoiceProfile[]>(sampleVoiceProfiles);
  const [activeProfile, setActiveProfile] = useState<VoiceProfile>(sampleVoiceProfiles[0]);
  const [isCreating, setIsCreating] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleSave = (profile: VoiceProfile) => {
    const updated = profiles.map((p) => (p.id === profile.id ? profile : p));
    setProfiles(updated);
  };

  const handleDelete = (id: string) => {
    setProfiles(profiles.filter((p) => p.id !== id));
    if (activeProfile.id === id && profiles.length > 1) {
      setActiveProfile(profiles.find((p) => p.id !== id) || profiles[0]);
    }
  };

  const handleDuplicate = (profile: VoiceProfile) => {
    const newProfile = {
      ...profile,
      id: Date.now().toString(),
      name: `${profile.name} (Copy)`,
      isDefault: false,
    };
    setProfiles([...profiles, newProfile]);
  };

  const handleCreate = () => {
    const newProfile: VoiceProfile = {
      id: Date.now().toString(),
      name: "New Voice",
      description: "Describe your voice tone and style",
      isDefault: false,
      writingStyle: "first",
      sentenceStyle: "medium",
      emojiUsage: "minimal",
      hashtagStyle: "relevant",
      tone: {
        formal: 50,
        enthusiastic: 50,
        technical: 50,
        reserved: 50,
        detailed: 50,
      },
      vocabulary: [],
      avoidWords: [],
      samplePost: "",
    };
    setProfiles([...profiles, newProfile]);
    setActiveProfile(newProfile);
    setIsCreating(true);
  };

  const copySample = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const generateSample = () => {
    // In real app, this would call AI service
    const topics = ["product launch", "company milestone", "industry insight", "team update"];
    const topic = topics[Math.floor(Math.random() * topics.length)];
    return `Sample post about ${topic} in ${activeProfile.name} voice style...`;
  };

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Voice Profiles</h1>
          <p className="text-muted-foreground">
            Create and manage brand voice profiles for consistent content tone
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          New Voice Profile
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Profile List */}
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle className="text-base">Your Voice Profiles</CardTitle>
            <CardDescription>{profiles.length} profiles created</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {profiles.map((profile) => (
                <div
                  key={profile.id}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${
                    activeProfile.id === profile.id
                      ? "bg-primary/10 border border-primary/20"
                      : "hover:bg-muted"
                  }`}
                  onClick={() => {
                    setActiveProfile(profile);
                    setIsCreating(false);
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                        <Mic2 className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium flex items-center gap-2">
                          {profile.name}
                          {profile.isDefault && (
                            <Badge variant="secondary" className="text-[10px]">Default</Badge>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground truncate max-w-[180px]">
                          {profile.description}
                        </p>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreHorizontal className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleDuplicate(profile)}>
                          <Copy className="mr-2 h-4 w-4" />
                          Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => handleDelete(profile.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Profile Editor */}
        <div className="lg:col-span-8 space-y-6">
          <Tabs defaultValue="settings" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="settings">Settings</TabsTrigger>
              <TabsTrigger value="tone">Tone & Style</TabsTrigger>
              <TabsTrigger value="preview">Preview</TabsTrigger>
            </TabsList>

            <TabsContent value="settings" className="mt-6 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Profile Details</CardTitle>
                  <CardDescription>Name and describe your voice profile</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Profile Name</Label>
                    <Input
                      id="name"
                      value={activeProfile.name}
                      onChange={(e) =>
                        setActiveProfile({ ...activeProfile, name: e.target.value })
                      }
                      placeholder="e.g., Professional, Casual, Witty"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={activeProfile.description}
                      onChange={(e) =>
                        setActiveProfile({ ...activeProfile, description: e.target.value })
                      }
                      placeholder="Describe when and how to use this voice..."
                    />
                  </div>

                  <div className="flex items-center justify-between pt-4">
                    <div className="space-y-0.5">
                      <Label>Set as Default</Label>
                      <p className="text-sm text-muted-foreground">
                        Use this voice profile by default for new content
                      </p>
                    </div>
                    <Switch
                      checked={activeProfile.isDefault}
                      onCheckedChange={(checked) => {
                        const updated = profiles.map((p) => ({
                          ...p,
                          isDefault: p.id === activeProfile.id ? checked : false,
                        }));
                        setProfiles(updated);
                        setActiveProfile({ ...activeProfile, isDefault: checked });
                      }}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Writing Style</CardTitle>
                  <CardDescription>Configure writing preferences</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Writing Perspective</Label>
                      <Select
                        value={activeProfile.writingStyle}
                        onValueChange={(value) =>
                          setActiveProfile({ ...activeProfile, writingStyle: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="first">First person (I, we)</SelectItem>
                          <SelectItem value="second">Second person (you)</SelectItem>
                          <SelectItem value="third">Third person (they, the company)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Sentence Length</Label>
                      <Select
                        value={activeProfile.sentenceStyle}
                        onValueChange={(value) =>
                          setActiveProfile({ ...activeProfile, sentenceStyle: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="short">Short & punchy</SelectItem>
                          <SelectItem value="medium">Medium length</SelectItem>
                          <SelectItem value="long">Long & flowing</SelectItem>
                          <SelectItem value="varied">Varied lengths</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Emoji Usage</Label>
                      <Select
                        value={activeProfile.emojiUsage}
                        onValueChange={(value) =>
                          setActiveProfile({ ...activeProfile, emojiUsage: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No emojis</SelectItem>
                          <SelectItem value="minimal">Minimal</SelectItem>
                          <SelectItem value="moderate">Moderate</SelectItem>
                          <SelectItem value="heavy">Heavy use</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Hashtag Style</Label>
                      <Select
                        value={activeProfile.hashtagStyle}
                        onValueChange={(value) =>
                          setActiveProfile({ ...activeProfile, hashtagStyle: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No hashtags</SelectItem>
                          <SelectItem value="branded">Branded only</SelectItem>
                          <SelectItem value="relevant">Relevant tags</SelectItem>
                          <SelectItem value="trending">Trending tags</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="tone" className="mt-6 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Tone Dimensions</CardTitle>
                  <CardDescription>Adjust the balance of your voice characteristics</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {Object.entries(activeProfile.tone).map(([key, value]) => {
                    const labels: Record<string, [string, string]> = {
                      formal: ["Casual", "Formal"],
                      enthusiastic: ["Reserved", "Enthusiastic"],
                      technical: ["Simple", "Technical"],
                      reserved: ["Open", "Reserved"],
                      detailed: ["Brief", "Detailed"],
                    };

                    return (
                      <div key={key} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>{labels[key][0]}</span>
                          <span className="font-medium capitalize">{key}</span>
                          <span>{labels[key][1]}</span>
                        </div>
                        <Slider
                          value={[value]}
                          onValueChange={([newValue]) =>
                            setActiveProfile({
                              ...activeProfile,
                              tone: { ...activeProfile.tone, [key]: newValue },
                            })
                          }
                          max={100}
                          step={1}
                        />
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              <div className="grid grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Preferred Words</CardTitle>
                    <CardDescription>Words and phrases to use</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {activeProfile.vocabulary.map((word, i) => (
                        <Badge
                          key={i}
                          variant="secondary"
                          className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                          onClick={() =>
                            setActiveProfile({
                              ...activeProfile,
                              vocabulary: activeProfile.vocabulary.filter((_, idx) => idx !== i),
                            })
                          }
                        >
                          {word} ×
                        </Badge>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Add a word..."
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            const value = (e.target as HTMLInputElement).value.trim();
                            if (value && !activeProfile.vocabulary.includes(value)) {
                              setActiveProfile({
                                ...activeProfile,
                                vocabulary: [...activeProfile.vocabulary, value],
                              });
                              (e.target as HTMLInputElement).value = "";
                            }
                          }
                        }}
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={(e) => {
                          const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                          const value = input.value.trim();
                          if (value && !activeProfile.vocabulary.includes(value)) {
                            setActiveProfile({
                              ...activeProfile,
                              vocabulary: [...activeProfile.vocabulary, value],
                            });
                            input.value = "";
                          }
                        }}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Words to Avoid</CardTitle>
                    <CardDescription>Words and phrases to exclude</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {activeProfile.avoidWords.map((word, i) => (
                        <Badge
                          key={i}
                          variant="destructive"
                          className="cursor-pointer"
                          onClick={() =>
                            setActiveProfile({
                              ...activeProfile,
                              avoidWords: activeProfile.avoidWords.filter((_, idx) => idx !== i),
                            })
                          }
                        >
                          {word} ×
                        </Badge>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Add a word..."
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            const value = (e.target as HTMLInputElement).value.trim();
                            if (value && !activeProfile.avoidWords.includes(value)) {
                              setActiveProfile({
                                ...activeProfile,
                                avoidWords: [...activeProfile.avoidWords, value],
                              });
                              (e.target as HTMLInputElement).value = "";
                            }
                          }
                        }}
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={(e) => {
                          const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                          const value = input.value.trim();
                          if (value && !activeProfile.avoidWords.includes(value)) {
                            setActiveProfile({
                              ...activeProfile,
                              avoidWords: [...activeProfile.avoidWords, value],
                            });
                            input.value = "";
                          }
                        }}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="preview" className="mt-6 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Sample Post</CardTitle>
                  <CardDescription>See how your voice profile sounds</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Textarea
                    value={activeProfile.samplePost}
                    onChange={(e) =>
                      setActiveProfile({ ...activeProfile, samplePost: e.target.value })
                    }
                    placeholder="Enter a sample post or use AI to generate one..."
                    className="min-h-[150px]"
                  />
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setActiveProfile({ ...activeProfile, samplePost: generateSample() })}>
                      <Wand2 className="mr-2 h-4 w-4" />
                      Generate Sample
                    </Button>
                    <Button variant="outline" onClick={() => copySample(activeProfile.samplePost)}>
                      {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                      {copied ? "Copied!" : "Copy"}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                      <Sparkles className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">AI Voice Analysis</h4>
                      <p className="text-sm text-muted-foreground mb-4">
                        Let AI analyze your sample posts to automatically create a voice profile.
                      </p>
                      <Button variant="secondary">
                        <Mic2 className="mr-2 h-4 w-4" />
                        Analyze My Voice
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Save Button */}
          <div className="flex justify-end gap-4">
            <Button
              variant="outline"
              onClick={() => setActiveProfile(sampleVoiceProfiles.find(p => p.id === activeProfile.id) || activeProfile)}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Reset Changes
            </Button>
            <Button onClick={() => handleSave(activeProfile)}>
              <Save className="mr-2 h-4 w-4" />
              Save Profile
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
