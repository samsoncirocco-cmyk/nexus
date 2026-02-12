"use client";

import { useState } from "react";
import { Check, ChevronDown, Plus, Mic2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface VoiceProfile {
  id: string;
  name: string;
  description: string;
}

interface VoiceSelectorProps {
  voices: VoiceProfile[];
  selected: string;
  onChange: (voiceId: string) => void;
}

export function VoiceSelector({ voices, selected, onChange }: VoiceSelectorProps) {
  const [open, setOpen] = useState(false);
  const selectedVoice = voices.find((v) => v.id === selected);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[200px] justify-between"
        >
          <div className="flex items-center gap-2">
            <Mic2 className="h-4 w-4 text-muted-foreground" />
            <span className="truncate">
              {selectedVoice?.name || "Select voice..."}
            </span>
          </div>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0">
        <Command>
          <CommandInput placeholder="Search voices..." />
          <CommandList>
            <CommandEmpty>No voice profile found.</CommandEmpty>
            <CommandGroup>
              {voices.map((voice) => (
                <CommandItem
                  key={voice.id}
                  value={voice.id}
                  onSelect={(currentValue) => {
                    onChange(currentValue === selected ? "" : currentValue);
                    setOpen(false);
                  }}
                >
                  <div className="flex flex-col flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{voice.name}</span>
                      <Check
                        className={cn(
                          "ml-2 h-4 w-4",
                          selected === voice.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {voice.description}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
        <div className="border-t p-2">
          <Button variant="ghost" className="w-full justify-start gap-2" asChild>
            <a href="/voice">
              <Plus className="h-4 w-4" />
              Create new voice profile
            </a>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
