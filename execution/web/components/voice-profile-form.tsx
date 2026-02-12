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
  Trash2,
  Wand2,
  RefreshCw,
  Check,
  Copy
} from "lucide-react";

export interface VoiceProfile {
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

interface VoiceProfileFormProps {
  profile?: VoiceProfile;
  onSave?: (profile: VoiceProfile) => void;
  onCancel?: () => void;
  isLoading?: boolean;
}

export function VoiceProfileForm({
  profile,
  onSave,
  onCancel,
  isLoading = false,
}: VoiceProfileFormProps) {
  const [formData, setFormData] = useState<VoiceProfile>(
    profile || {
      id: Date.now().toString(),
      name: "",
      description: "",
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
    }
  );

  const [newWord, setNewWord] = useState("");
  const [newAvoidWord, setNewAvoidWord] = useState("");
  const [copied, setCopied] = useState(false);

  const handleSave = () => {
    onSave?.(formData);
  };

  const addVocabulary = () => {
    if (newWord.trim() && !formData.vocabulary.includes(newWord.trim())) {
      setFormData({
        ...formData,
        vocabulary: [...formData.vocabulary, newWord.trim()],
      });
      setNewWord("");
    }
  };

  const removeVocabulary = (index: number) => {
    setFormData({
      ...formData,
      vocabulary: formData.vocabulary.filter((_, i) => i !== index),
    });
  };

  const addAvoidWord = () => {
    if (newAvoidWord.trim() && !formData.avoidWords.includes(newAvoidWord.trim())) {
      setFormData({
        ...formData,
        avoidWords: [...formData.avoidWords, newAvoidWord.trim()],
      });
      setNewAvoidWord("");
    }
  };

  const removeAvoidWord = (index: number) => {
    setFormData({
      ...formData,
      avoidWords: formData.avoidWords.filter((_, i) => i !== index),
    });
  };

  const generateSample = () => {
    const topics = ["product launch", "company milestone", "industry insight", "team update"];
    const topic = topics[Math.floor(Math.random() * topics.length)];
    setFormData({
      ...formData,
      samplePost: `Sample post about ${topic} in ${formData.name || "this"} voice style...`,
    });
  };

  const copySample = () => {
    navigator.clipboard.writeText(formData.samplePost);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const updateTone = (key: keyof VoiceProfile["tone"], value: number) => {
    setFormData({
      ...formData,
      tone: { ...formData.tone, [key]: value },
    });
  };

  const toneLabels: Record<string, [string, string]> = {
    formal: ["Casual", "Formal"],
    enthusiastic: ["Reserved", "Enthusiastic"],
    technical: ["Simple", "Technical"],
    reserved: ["Open", "Reserved"],
    detailed: ["Brief", "Detailed"],
  };

  return (
    <div className="space-y-6">
      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
          <CardDescription>Name and describe your voice profile</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Profile Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Professional, Casual, Witty"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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
              checked={formData.isDefault}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, isDefault: checked })
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Writing Style */}
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
                value={formData.writingStyle}
                onValueChange={(value) =>
                  setFormData({ ...formData, writingStyle: value })
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
                value={formData.sentenceStyle}
                onValueChange={(value) =>
                  setFormData({ ...formData, sentenceStyle: value })
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
                value={formData.emojiUsage}
                onValueChange={(value) =>
                  setFormData({ ...formData, emojiUsage: value })
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
                value={formData.hashtagStyle}
                onValueChange={(value) =>
                  setFormData({ ...formData, hashtagStyle: value })
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

      {/* Tone Dimensions */}
      <Card>
        <CardHeader>
          <CardTitle>Tone Dimensions</CardTitle>
          <CardDescription>Adjust the balance of your voice characteristics</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {Object.entries(formData.tone).map(([key, value]) => (
            <div key={key} className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{toneLabels[key][0]}</span>
                <span className="font-medium capitalize">{key}</span>
                <span>{toneLabels[key][1]}</span>
              </div>
              <Slider
                value={[value]}
                onValueChange={([newValue]) => updateTone(key as keyof VoiceProfile["tone"], newValue)}
                max={100}
                step={1}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Vocabulary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Preferred Words</CardTitle>
            <CardDescription>Words and phrases to use</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2 mb-4">
              {formData.vocabulary.map((word, i) => (
                <Badge
                  key={i}
                  variant="secondary"
                  className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                  onClick={() => removeVocabulary(i)}
                >
                  {word} ×
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Add a word..."
                value={newWord}
                onChange={(e) => setNewWord(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addVocabulary()}
              />
              <Button variant="outline" size="icon" onClick={addVocabulary}>
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
              {formData.avoidWords.map((word, i) => (
                <Badge
                  key={i}
                  variant="destructive"
                  className="cursor-pointer"
                  onClick={() => removeAvoidWord(i)}
                >
                  {word} ×
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Add a word..."
                value={newAvoidWord}
                onChange={(e) => setNewAvoidWord(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addAvoidWord()}
              />
              <Button variant="outline" size="icon" onClick={addAvoidWord}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sample Post */}
      <Card>
        <CardHeader>
          <CardTitle>Sample Post</CardTitle>
          <CardDescription>See how your voice profile sounds</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={formData.samplePost}
            onChange={(e) => setFormData({ ...formData, samplePost: e.target.value })}
            placeholder="Enter a sample post or use AI to generate one..."
            className="min-h-[150px]"
          />
          <div className="flex gap-2">
            <Button variant="outline" onClick={generateSample}>
              <Wand2 className="mr-2 h-4 w-4" />
              Generate Sample
            </Button>
            <Button variant="outline" onClick={copySample}>
              {copied ? (
                <Check className="mr-2 h-4 w-4" />
              ) : (
                <Copy className="mr-2 h-4 w-4" />
              )}
              {copied ? "Copied!" : "Copy"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-4">
        {onCancel && (
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button onClick={handleSave} disabled={isLoading || !formData.name}>
          <Save className="mr-2 h-4 w-4" />
          {isLoading ? "Saving..." : "Save Profile"}
        </Button>
      </div>
    </div>
  );
}
