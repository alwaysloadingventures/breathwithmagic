"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

/**
 * ProgramFormClient Props
 */
interface ProgramFormClientProps {
  mode: "create" | "edit";
  programId?: string;
  initialData?: {
    title: string;
    description?: string | null;
    thumbnailUrl?: string | null;
    isFree: boolean;
  };
}

/**
 * ProgramFormClient Component
 *
 * Shared form for creating and editing programs.
 */
export function ProgramFormClient({
  mode,
  programId,
  initialData,
}: ProgramFormClientProps) {
  const router = useRouter();

  // Form state
  const [title, setTitle] = useState(initialData?.title || "");
  const [description, setDescription] = useState(
    initialData?.description || "",
  );
  const [isFree, setIsFree] = useState(initialData?.isFree ?? false);

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Handle submit
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      setError("Title is required");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const url =
        mode === "create"
          ? "/api/creator/programs"
          : `/api/creator/programs/${programId}`;
      const method = mode === "create" ? "POST" : "PATCH";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          isFree,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save program");
      }

      const data = await response.json();

      if (mode === "create") {
        // Redirect to edit page to add content
        router.push(`/creator/programs/${data.program.id}/edit`);
      } else {
        router.push("/creator/programs");
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to save program";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Error display */}
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="title">Title *</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g., 7-Day Breathwork Challenge"
          disabled={isSubmitting}
          maxLength={200}
        />
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe what this program includes..."
          disabled={isSubmitting}
          rows={4}
          maxLength={2000}
        />
      </div>

      {/* Free/Paid toggle */}
      <div className="flex items-center justify-between rounded-lg border border-border p-4">
        <div>
          <Label htmlFor="is-free" className="text-base">
            Free program
          </Label>
          <p className="text-sm text-muted-foreground">
            Make this program available to everyone, not just subscribers
          </p>
        </div>
        <Switch
          id="is-free"
          checked={isFree}
          onCheckedChange={setIsFree}
          disabled={isSubmitting}
        />
      </div>

      {/* Actions */}
      <div className="flex flex-col-reverse gap-3 border-t border-border pt-6 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/creator/programs")}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting || !title.trim()}>
          {isSubmitting ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <Save className="mr-2 size-4" />
          )}
          {mode === "create" ? "Create program" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
