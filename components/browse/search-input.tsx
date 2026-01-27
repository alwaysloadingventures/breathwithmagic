"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export interface SearchInputProps {
  /** Current search value (controlled) */
  value?: string;
  /** Callback when search value changes (after debounce) */
  onSearch?: (query: string) => void;
  /** Callback for immediate changes (before debounce) */
  onChange?: (query: string) => void;
  /** Debounce delay in milliseconds */
  debounceMs?: number;
  /** Placeholder text */
  placeholder?: string;
  /** Custom className */
  className?: string;
  /** Auto focus on mount */
  autoFocus?: boolean;
}

/**
 * SearchInput - Debounced search input component
 *
 * Used on the explore page and search results.
 * Debounces input to avoid excessive API calls.
 *
 * This is an uncontrolled component that accepts an initial value
 * and reports changes through callbacks.
 */
export function SearchInput({
  value: initialValue = "",
  onSearch,
  onChange,
  debounceMs = 300,
  placeholder = "Search creators...",
  className,
  autoFocus = false,
}: SearchInputProps) {
  const [inputValue, setInputValue] = useState(initialValue);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto focus on mount
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setInputValue(newValue);
      onChange?.(newValue);

      // Clear existing debounce timer
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      // Set new debounce timer
      debounceRef.current = setTimeout(() => {
        onSearch?.(newValue);
      }, debounceMs);
    },
    [debounceMs, onChange, onSearch],
  );

  const handleClear = useCallback(() => {
    setInputValue("");
    onChange?.("");
    onSearch?.("");
    inputRef.current?.focus();
  }, [onChange, onSearch]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Escape") {
        handleClear();
      } else if (e.key === "Enter") {
        // Immediate search on Enter
        if (debounceRef.current) {
          clearTimeout(debounceRef.current);
        }
        onSearch?.(inputValue);
      }
    },
    [handleClear, inputValue, onSearch],
  );

  return (
    <div className={cn("relative", className)}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
      <Input
        ref={inputRef}
        type="search"
        value={inputValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="pl-10 pr-10 h-11 min-h-[44px]"
        aria-label="Search"
      />
      {inputValue && (
        <Button
          variant="ghost"
          size="icon-sm"
          className="absolute right-1 top-1/2 -translate-y-1/2"
          onClick={handleClear}
          aria-label="Clear search"
        >
          <X className="size-4" />
        </Button>
      )}
    </div>
  );
}
