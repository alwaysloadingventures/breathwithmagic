"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ContentTypePicker } from "@/components/content/content-type-picker";
import { RichTextEditor } from "@/components/content/rich-text-editor";
import type { ContentType } from "@/lib/validations/content";

/**
 * Program option
 */
interface ProgramOption {
  id: string;
  title: string;
}

/**
 * CreateContentClient Props
 */
interface CreateContentClientProps {
  programs: ProgramOption[];
}

/**
 * CreateContentClient Component
 *
 * Client component for the create content wizard.
 * Step 1: Select content type
 * Step 2: Enter details
 * Step 3: Save as draft (then can upload media and publish)
 */
export function CreateContentClient({ programs }: CreateContentClientProps) {
  const router = useRouter();

  // Form state
  const [type, setType] = useState<ContentType | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [textContent, setTextContent] = useState("");
  const [isFree, setIsFree] = useState(false);
  const [programId, setProgramId] = useState<string | null>(null);

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Create content as draft
   */
  const handleCreateDraft = async () => {
    if (!type) {
      setError("Please select a content type");
      return;
    }

    if (!title.trim()) {
      setError("Title is required");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/creator/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          title: title.trim(),
          description: type === "text" ? textContent : description,
          isFree,
          status: "draft",
          programId: programId || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create content");
      }

      const data = await response.json();

      // Redirect to edit page for media upload
      if (type === "video" || type === "audio") {
        router.push(`/creator/content/${data.content.id}/edit`);
      } else {
        // For text posts, go to content list
        router.push("/creator/content");
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to create content";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Publish text content directly
   */
  const handlePublish = async () => {
    if (type !== "text") return;

    if (!title.trim()) {
      setError("Title is required");
      return;
    }

    if (!textContent.trim()) {
      setError("Content is required");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/creator/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "text",
          title: title.trim(),
          description: textContent,
          isFree,
          status: "published",
          programId: programId || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to publish content");
      }

      router.push("/creator/content");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to publish content";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Error display */}
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Step 1: Content Type */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-medium">What type of content?</h2>
          <p className="text-sm text-muted-foreground">
            Choose the type of content you want to create
          </p>
        </div>
        <ContentTypePicker
          value={type}
          onChange={setType}
          disabled={isSubmitting}
        />
      </section>

      {/* Step 2: Content Details (only show when type is selected) */}
      {type && (
        <>
          <section className="space-y-4">
            <div>
              <h2 className="text-lg font-medium">Content details</h2>
              <p className="text-sm text-muted-foreground">
                {type === "text"
                  ? "Write your post content"
                  : "Add basic information. You'll upload media after saving."}
              </p>
            </div>

            <div className="space-y-4">
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Give your content a title"
                  disabled={isSubmitting}
                  maxLength={200}
                />
              </div>

              {/* Description or Content */}
              {type === "text" ? (
                <div className="space-y-2">
                  <Label>Content *</Label>
                  <RichTextEditor
                    value={textContent}
                    onChange={setTextContent}
                    placeholder="Write your post..."
                    disabled={isSubmitting}
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="description">Description (optional)</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe your content..."
                    disabled={isSubmitting}
                    rows={4}
                    maxLength={5000}
                  />
                </div>
              )}
            </div>
          </section>

          {/* Step 3: Settings */}
          <section className="space-y-4">
            <div>
              <h2 className="text-lg font-medium">Settings</h2>
              <p className="text-sm text-muted-foreground">
                Configure access and organization
              </p>
            </div>

            <div className="space-y-4">
              {/* Free/Paid toggle */}
              <div className="flex items-center justify-between rounded-lg border border-border p-4">
                <div>
                  <Label htmlFor="is-free" className="text-base">
                    Free content
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Make this content available to everyone
                  </p>
                </div>
                <Switch
                  id="is-free"
                  checked={isFree}
                  onCheckedChange={setIsFree}
                  disabled={isSubmitting}
                />
              </div>

              {/* Program selection */}
              {programs.length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="program">Add to program (optional)</Label>
                  <Select
                    value={programId || "none"}
                    onValueChange={(value) =>
                      setProgramId(value === "none" ? null : value)
                    }
                    disabled={isSubmitting}
                  >
                    <SelectTrigger id="program">
                      <SelectValue placeholder="Select a program" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No program</SelectItem>
                      {programs.map((program) => (
                        <SelectItem key={program.id} value={program.id}>
                          {program.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </section>

          {/* Actions */}
          <section className="flex flex-col-reverse gap-3 border-t border-border pt-6 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/creator/content")}
              disabled={isSubmitting}
            >
              Cancel
            </Button>

            {type === "text" ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCreateDraft}
                  disabled={isSubmitting || !title.trim()}
                >
                  {isSubmitting ? (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  ) : null}
                  Save as draft
                </Button>
                <Button
                  type="button"
                  onClick={handlePublish}
                  disabled={
                    isSubmitting || !title.trim() || !textContent.trim()
                  }
                >
                  {isSubmitting ? (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  ) : null}
                  Publish
                </Button>
              </>
            ) : (
              <Button
                type="button"
                onClick={handleCreateDraft}
                disabled={isSubmitting || !title.trim()}
              >
                {isSubmitting ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : null}
                Continue to upload
              </Button>
            )}
          </section>

          {/* Info note for video/audio */}
          {(type === "video" || type === "audio") && (
            <p className="text-center text-sm text-muted-foreground">
              After saving, you&apos;ll be able to upload your {type} file
            </p>
          )}
        </>
      )}
    </div>
  );
}
