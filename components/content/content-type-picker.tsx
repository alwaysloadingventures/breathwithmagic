"use client";

import { Video, Headphones, FileText, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ContentType } from "@/lib/validations/content";

/**
 * Content type option configuration
 */
const contentTypeOptions: Array<{
  value: ContentType;
  label: string;
  description: string;
  icon: typeof Video;
}> = [
  {
    value: "video",
    label: "Video",
    description: "Upload a video session",
    icon: Video,
  },
  {
    value: "audio",
    label: "Audio",
    description: "Upload an audio session",
    icon: Headphones,
  },
  {
    value: "text",
    label: "Text",
    description: "Write a text post",
    icon: FileText,
  },
];

/**
 * ContentTypePicker Props
 */
interface ContentTypePickerProps {
  value: ContentType | null;
  onChange: (type: ContentType) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * ContentTypePicker Component
 *
 * Allows users to select the type of content they want to create.
 * Displays as a row of selectable cards.
 */
export function ContentTypePicker({
  value,
  onChange,
  disabled = false,
  className,
}: ContentTypePickerProps) {
  return (
    <div className={cn("grid gap-4 sm:grid-cols-3", className)}>
      {contentTypeOptions.map((option) => {
        const isSelected = value === option.value;
        const Icon = option.icon;

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            disabled={disabled}
            className={cn(
              "relative flex flex-col items-center gap-3 rounded-lg border-2 p-6 transition-all",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              isSelected
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50 hover:bg-primary/5",
              disabled && "cursor-not-allowed opacity-50",
            )}
            aria-pressed={isSelected}
          >
            {/* Selected indicator */}
            {isSelected && (
              <div className="absolute right-2 top-2 flex size-5 items-center justify-center rounded-full bg-primary">
                <Check className="size-3 text-primary-foreground" />
              </div>
            )}

            {/* Icon */}
            <div
              className={cn(
                "flex size-12 items-center justify-center rounded-full",
                isSelected ? "bg-primary/10" : "bg-muted",
              )}
            >
              <Icon
                className={cn(
                  "size-6",
                  isSelected ? "text-primary" : "text-muted-foreground",
                )}
              />
            </div>

            {/* Label and description */}
            <div className="text-center">
              <div
                className={cn(
                  "font-medium",
                  isSelected ? "text-primary" : "text-foreground",
                )}
              >
                {option.label}
              </div>
              <div className="mt-1 text-sm text-muted-foreground">
                {option.description}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
