"use client";

import { useState, useRef, useMemo, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { handleSchema } from "@/lib/validations/creator";

interface StepHandleProps {
  value: string;
  onChange: (value: string) => void;
  onNext: () => void;
  isLoading?: boolean;
}

type HandleStatus = "idle" | "checking" | "available" | "taken" | "invalid";

interface HandleCheckResult {
  available: boolean;
  suggestions?: string[];
  message?: string;
}

/**
 * Step 1: Handle Selection
 *
 * Allows the user to choose their unique creator handle.
 * Provides real-time availability checking with debounce.
 */
export function StepHandle({
  value,
  onChange,
  onNext,
  isLoading = false,
}: StepHandleProps) {
  const [status, setStatus] = useState<HandleStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [lastCheckedValue, setLastCheckedValue] = useState("");
  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Compute display status based on validation and API check
  const displayStatus = useMemo(() => {
    // For short handles, show idle
    if (!value || value.length < 3) {
      return "idle";
    }
    // Check format validation
    const validation = handleSchema.safeParse(value);
    if (!validation.success) {
      return "invalid";
    }
    // If we're still checking or haven't checked this value yet
    if (value !== lastCheckedValue) {
      return "checking";
    }
    // Otherwise use the API result status
    return status;
  }, [value, lastCheckedValue, status]);

  // Compute display error
  const displayError = useMemo(() => {
    if (!value || value.length < 3) {
      return null;
    }
    const validation = handleSchema.safeParse(value);
    if (!validation.success) {
      return validation.error.issues[0].message;
    }
    if (value === lastCheckedValue) {
      return error;
    }
    return null;
  }, [value, lastCheckedValue, error]);

  // Cleanup refs on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Check handle availability
  const checkHandle = async (handle: string) => {
    // Abort previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch("/api/creator/check-handle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handle }),
        signal: abortControllerRef.current.signal,
      });

      const data: HandleCheckResult = await response.json();

      if (data.available) {
        setStatus("available");
        setError(null);
        setSuggestions([]);
      } else {
        setStatus("taken");
        setError(data.message || "This handle is already taken");
        setSuggestions(data.suggestions || []);
      }
      setLastCheckedValue(handle);
    } catch (err) {
      // Ignore abort errors
      if (err instanceof Error && err.name === "AbortError") {
        return;
      }
      setStatus("invalid");
      setError("Unable to check availability. Please try again.");
      setLastCheckedValue(handle);
    }
  };

  // Handle input change - normalize to lowercase and trigger debounced check
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "");
    onChange(newValue);

    // Clear previous timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Skip API check for short or invalid handles
    if (!newValue || newValue.length < 3) {
      setStatus("idle");
      setError(null);
      setSuggestions([]);
      setLastCheckedValue("");
      return;
    }

    const validation = handleSchema.safeParse(newValue);
    if (!validation.success) {
      setStatus("invalid");
      setError(validation.error.issues[0].message);
      setSuggestions([]);
      setLastCheckedValue(newValue);
      return;
    }

    // Debounce the API call
    debounceTimerRef.current = setTimeout(() => {
      checkHandle(newValue);
    }, 500);
  };

  // Select a suggested handle
  const handleSuggestionClick = (suggestion: string) => {
    onChange(suggestion);

    // Clear previous timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Immediately check the suggestion
    checkHandle(suggestion);
  };

  const canProceed = displayStatus === "available" && value.length >= 3;

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h2 className="text-2xl font-semibold tracking-tight">
          Choose your handle
        </h2>
        <p className="text-muted-foreground">
          This will be your unique URL for sharing your practice.
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="handle">Your handle</Label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted-foreground">
              <span className="text-sm">breathwithmagic.com/</span>
            </div>
            <Input
              id="handle"
              type="text"
              value={value}
              onChange={handleInputChange}
              placeholder="your_handle"
              className={cn(
                "h-12 pl-[10.5rem] pr-10 text-base",
                displayStatus === "available" &&
                  "border-green-500 focus-visible:border-green-500",
                (displayStatus === "taken" || displayStatus === "invalid") &&
                  "border-destructive focus-visible:border-destructive",
              )}
              maxLength={30}
              autoComplete="off"
              autoCapitalize="off"
              spellCheck="false"
              aria-describedby="handle-description handle-error"
            />
            <div className="absolute inset-y-0 right-3 flex items-center">
              {displayStatus === "checking" && (
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
              )}
              {displayStatus === "available" && (
                <CheckCircle2
                  className="size-5 text-green-500"
                  aria-label="Available"
                />
              )}
              {(displayStatus === "taken" || displayStatus === "invalid") && (
                <XCircle
                  className="size-5 text-destructive"
                  aria-label="Not available"
                />
              )}
            </div>
          </div>

          <p id="handle-description" className="text-sm text-muted-foreground">
            3-30 characters. Letters, numbers, and underscores only.
          </p>

          {displayError && (
            <p
              id="handle-error"
              className="text-sm text-destructive"
              role="alert"
            >
              {displayError}
            </p>
          )}

          {displayStatus === "available" && (
            <p className="text-sm text-green-600" role="status">
              This handle is available
            </p>
          )}
        </div>

        {/* Handle suggestions */}
        {suggestions.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Try one of these instead:
            </p>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm transition-colors hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <Button
        onClick={onNext}
        disabled={!canProceed || isLoading}
        className="h-12 w-full text-base"
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" />
            Please wait...
          </>
        ) : (
          "Continue"
        )}
      </Button>
    </div>
  );
}
