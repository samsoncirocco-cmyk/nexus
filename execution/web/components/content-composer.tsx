"use client";

import { useState, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Link as LinkIcon,
  AtSign,
  Hash,
  Smile,
  Mic,
  Paperclip,
  Sparkles
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ContentComposerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  maxLength?: number;
  disabled?: boolean;
}

export function ContentComposer({
  value,
  onChange,
  placeholder = "What's on your mind?",
  className,
  maxLength = 5000,
  disabled = false,
}: ContentComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isRecording, setIsRecording] = useState(false);
  const characterCount = value.length;
  const isOverLimit = characterCount > maxLength;

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
  }, [onChange]);

  const insertAtCursor = useCallback((text: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newValue = value.substring(0, start) + text + value.substring(end);
    onChange(newValue);

    // Restore cursor position after state update
    setTimeout(() => {
      textarea.selectionStart = textarea.selectionEnd = start + text.length;
      textarea.focus();
    }, 0);
  }, [value, onChange]);

  const handleFormat = useCallback((format: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);

    let formattedText = selectedText;
    switch (format) {
      case "bold":
        formattedText = `**${selectedText || "bold text"}**`;
        break;
      case "italic":
        formattedText = `_${selectedText || "italic text"}_`;
        break;
      case "bullet":
        formattedText = `\n• ${selectedText || "item"}`;
        break;
      case "number":
        formattedText = `\n1. ${selectedText || "item"}`;
        break;
      case "link":
        formattedText = `[${selectedText || "link text"}](url)`;
        break;
      case "mention":
        formattedText = `@`;
        break;
      case "hashtag":
        formattedText = `#`;
        break;
    }

    const newValue = value.substring(0, start) + formattedText + value.substring(end);
    onChange(newValue);

    setTimeout(() => {
      const newCursorPos = start + formattedText.length;
      textarea.selectionStart = textarea.selectionEnd = newCursorPos;
      textarea.focus();
    }, 0);
  }, [value, onChange]);

  const handleVoiceInput = useCallback(() => {
    setIsRecording(!isRecording);
    // Voice input logic would go here
    console.log("Voice input toggled:", !isRecording);
  }, [isRecording]);

  const getProgressColor = () => {
    const percentage = (characterCount / maxLength) * 100;
    if (percentage > 100) return "text-red-500";
    if (percentage > 90) return "text-yellow-500";
    return "text-muted-foreground";
  };

  const moodTags = [
    { tag: "#excited", emoji: "🎉" },
    { tag: "#thinking", emoji: "🤔" },
    { tag: "#question", emoji: "❓" },
    { tag: "#update", emoji: "📢" },
    { tag: "#milestone", emoji: "🏆" },
    { tag: "#behindTheScenes", emoji: "🎬" },
  ];

  return (
    <TooltipProvider>
      <div className={cn("space-y-3", className)}>
        {/* Format Toolbar */}
        <div className="flex items-center gap-1 p-2 rounded-lg bg-muted/50 border">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => handleFormat("bold")}
                disabled={disabled}
              >
                <Bold className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Bold</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => handleFormat("italic")}
                disabled={disabled}
              >
                <Italic className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Italic</TooltipContent>
          </Tooltip>

          <div className="w-px h-4 bg-border mx-1" />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => handleFormat("bullet")}
                disabled={disabled}
              >
                <List className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Bullet List</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => handleFormat("number")}
                disabled={disabled}
              >
                <ListOrdered className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Numbered List</TooltipContent>
          </Tooltip>

          <div className="w-px h-4 bg-border mx-1" />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => handleFormat("link")}
                disabled={disabled}
              >
                <LinkIcon className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Add Link</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => handleFormat("mention")}
                disabled={disabled}
              >
                <AtSign className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Mention</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => handleFormat("hashtag")}
                disabled={disabled}
              >
                <Hash className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Hashtag</TooltipContent>
          </Tooltip>

          <div className="flex-1" />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn("h-8 w-8", isRecording && "text-red-500 animate-pulse")}
                onClick={handleVoiceInput}
                disabled={disabled}
              >
                <Mic className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Voice Input</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                disabled={disabled}
              >
                <Sparkles className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>AI Assist</TooltipContent>
          </Tooltip>
        </div>

        {/* Text Area */}
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            "min-h-[200px] resize-none text-base leading-relaxed",
            isOverLimit && "border-red-500 focus-visible:ring-red-500"
          )}
        />

        {/* Mood Tags */}
        {value.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <span className="text-xs text-muted-foreground py-1">Quick tags:</span>
            {moodTags.map(({ tag, emoji }) => (
              <button
                key={tag}
                onClick={() => insertAtCursor(` ${tag}`)}
                className="text-xs px-2 py-1 rounded-full bg-muted hover:bg-muted/80 transition-colors"
                disabled={disabled}
              >
                {emoji} {tag}
              </button>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 gap-1" disabled={disabled}>
                  <Paperclip className="h-4 w-4" />
                  <span className="hidden sm:inline">Attach</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Attach media (max 4 files)</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 gap-1" disabled={disabled}>
                  <Smile className="h-4 w-4" />
                  <span className="hidden sm:inline">Emoji</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Add emoji</TooltipContent>
            </Tooltip>
          </div>

          <div className={cn("flex items-center gap-2", getProgressColor())}>
            {isOverLimit && (
              <span className="text-xs font-medium">
                {characterCount - maxLength} over limit
              </span>
            )}
            <span className="text-xs font-mono">
              {characterCount}/{maxLength}
            </span>
            {/* Circular Progress */}
            <svg className="w-4 h-4" viewBox="0 0 20 20">
              <circle
                cx="10"
                cy="10"
                r="8"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                opacity="0.2"
              />
              <circle
                cx="10"
                cy="10"
                r="8"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeDasharray={`${Math.min((characterCount / maxLength) * 50, 50)} 50`}
                transform="rotate(-90 10 10)"
                className={cn(
                  "transition-all duration-300",
                  isOverLimit ? "stroke-red-500" : characterCount > maxLength * 0.9 ? "stroke-yellow-500" : "stroke-primary"
                )}
              />
            </svg>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
