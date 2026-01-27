"use client";

import { useCallback, useState } from "react";
import { CreatorCategory } from "@prisma/client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

/**
 * Category display configuration
 */
const CATEGORIES: { value: CreatorCategory | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "Breathwork", label: "Breathwork" },
  { value: "Yoga", label: "Yoga" },
  { value: "Meditation", label: "Meditation" },
  { value: "Mindfulness", label: "Mindfulness" },
  { value: "Somatic", label: "Somatic" },
  { value: "SoundHealing", label: "Sound Healing" },
  { value: "Movement", label: "Movement" },
  { value: "Coaching", label: "Coaching" },
  { value: "Sleep", label: "Sleep" },
  { value: "StressRelief", label: "Stress Relief" },
];

export interface CategoryFilterProps {
  /** Currently selected category */
  selected?: CreatorCategory | "all";
  /** Callback when category changes */
  onSelect?: (category: CreatorCategory | "all") => void;
  /** Custom className for container */
  className?: string;
}

/**
 * CategoryFilter - Pills for filtering creators by category
 *
 * Used on the explore page to filter the creator grid.
 * Supports both controlled and uncontrolled modes.
 */
export function CategoryFilter({
  selected: controlledSelected,
  onSelect,
  className,
}: CategoryFilterProps) {
  const [internalSelected, setInternalSelected] = useState<
    CreatorCategory | "all"
  >("all");

  // Use controlled value if provided, otherwise use internal state
  const selected = controlledSelected ?? internalSelected;

  const handleSelect = useCallback(
    (category: CreatorCategory | "all") => {
      if (controlledSelected === undefined) {
        setInternalSelected(category);
      }
      onSelect?.(category);
    },
    [controlledSelected, onSelect],
  );

  return (
    <div
      className={cn("flex flex-wrap gap-2", className)}
      role="group"
      aria-label="Filter by category"
    >
      {CATEGORIES.map(({ value, label }) => (
        <Button
          key={value}
          variant={selected === value ? "default" : "outline"}
          size="sm"
          onClick={() => handleSelect(value)}
          className={cn(
            "min-h-[44px] px-4 transition-all",
            selected === value && "shadow-sm",
          )}
          aria-pressed={selected === value}
        >
          {label}
        </Button>
      ))}
    </div>
  );
}
