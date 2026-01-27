"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
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
import { ContentTypePicker } from "./content-type-picker";
import { VideoUploader } from "./video-uploader";
import { AudioUploader } from "./audio-uploader";
import { ThumbnailUploader } from "./thumbnail-uploader";
import { RichTextEditor } from "./rich-text-editor";
import type { ContentType, ContentStatus } from "@/lib/validations/content";

/**
 * Program option for select
 */
interface ProgramOption {
  id: string;
  title: string;
}

/**
 * ContentForm Props
 */
interface ContentFormProps {
  mode: "create" | "edit";
  contentId?: string;
  initialData?: {
    type: ContentType;
    title: string;
    description?: string | null;
    mediaUrl?: string | null;
    thumbnailUrl?: string | null;
    duration?: number | null;
    isFree: boolean;
    status: ContentStatus;
    programId?: string | null;
  };
  programs?: ProgramOption[];
  onSuccess?: (contentId: string) => void;
  className?: string;
}

/**
 * ContentForm Component
 *
 * Unified form for creating and editing content.
 * Handles video, audio, and text content types.
 */
export function ContentForm({
  mode,
  contentId,
  initialData,
  programs = [],
  onSuccess,
  className,
}: ContentFormProps) {
  const router = useRouter();

  // Form state
  const [type, setType] = useState<ContentType | null>(
    initialData?.type || null,
  );
  const [title, setTitle] = useState(initialData?.title || "");
  const [description, setDescription] = useState(
    initialData?.description || "",
  );
  const [textContent, setTextContent] = useState(""); // For text posts
  const [mediaUrl, setMediaUrl] = useState(initialData?.mediaUrl || "");
  const [thumbnailUrl, setThumbnailUrl] = useState(
    initialData?.thumbnailUrl || "",
  );
  const [duration, setDuration] = useState<number | null>(
    initialData?.duration || null,
  );
  const [isFree, setIsFree] = useState(initialData?.isFree ?? false);
  const [programId, setProgramId] = useState<string | null>(
    initialData?.programId || null,
  );

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // In edit mode, type is locked
  const typeIsLocked = mode === "edit" && !!initialData?.type;

  /**
   * Handle video upload complete
   */
  const handleVideoUploadComplete = (
    videoUid: string,
    videoDuration?: number,
  ) => {
    setMediaUrl(videoUid);
    if (videoDuration) {
      setDuration(videoDuration);
    }
  };

  /**
   * Handle audio upload complete
   */
  const handleAudioUploadComplete = (r2Key: string, audioDuration?: number) => {
    setMediaUrl(r2Key);
    if (audioDuration) {
      setDuration(audioDuration);
    }
  };

  /**
   * Handle thumbnail upload complete
   */
  const handleThumbnailUploadComplete = (r2Key: string) => {
    setThumbnailUrl(r2Key);
  };

  /**
   * Save as draft
   */
  const handleSaveDraft = async () => {
    await submitContent("draft");
  };

  /**
   * Publish content
   */
  const handlePublish = async () => {
    await submitContent("published");
  };

  /**
   * Submit content
   */
  const submitContent = async (status: ContentStatus) => {
    if (!type) {
      setError("Please select a content type");
      return;
    }

    if (!title.trim()) {
      setError("Title is required");
      return;
    }

    // For video/audio, media is required to publish
    if (status === "published" && (type === "video" || type === "audio")) {
      if (!mediaUrl) {
        setError(`Please upload a ${type} file before publishing`);
        return;
      }
    }

    // For text posts, content is required
    if (type === "text" && !textContent.trim() && !description.trim()) {
      setError("Please add some content to your post");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const contentData = {
        type,
        title: title.trim(),
        description: type === "text" ? textContent : description,
        mediaUrl: mediaUrl || null,
        thumbnailUrl: thumbnailUrl || null,
        duration: duration || null,
        isFree,
        status,
        programId: programId || null,
      };

      const url =
        mode === "create"
          ? "/api/creator/content"
          : `/api/creator/content/${contentId}`;
      const method = mode === "create" ? "POST" : "PATCH";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(contentData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save content");
      }

      const data = await response.json();
      const savedContentId = data.content?.id || contentId;

      if (onSuccess) {
        onSuccess(savedContentId);
      } else {
        router.push("/creator/content");
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to save content";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Check if form is valid for publishing
   */
  const canPublish = () => {
    if (!type || !title.trim()) return false;

    if (type === "video" || type === "audio") {
      return !!mediaUrl;
    }

    if (type === "text") {
      return !!textContent.trim() || !!description.trim();
    }

    return true;
  };

  return (
    <div className={cn("space-y-8", className)}>
      {/* Error display */}
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Step 1: Content Type (only for create mode) */}
      {!typeIsLocked && (
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
      )}

      {/* Only show rest of form when type is selected */}
      {type && (
        <>
          {/* Step 2: Upload Media (for video/audio) */}
          {(type === "video" || type === "audio") && (
            <section className="space-y-4">
              <div>
                <h2 className="text-lg font-medium">Upload your {type}</h2>
                <p className="text-sm text-muted-foreground">
                  {type === "video"
                    ? "Upload your video file. We support MP4, WebM, MOV, and AVI."
                    : "Upload your audio file. We support MP3, WAV, OGG, AAC, and M4A."}
                </p>
              </div>

              {/* Show uploader only if content is created (has ID) */}
              {mode === "create" && !contentId ? (
                <div className="rounded-lg border border-border bg-muted/50 p-6 text-center">
                  <p className="text-muted-foreground">
                    Complete the form below and save as draft to enable {type}{" "}
                    upload
                  </p>
                </div>
              ) : type === "video" ? (
                <VideoUploader
                  contentId={contentId!}
                  onUploadComplete={handleVideoUploadComplete}
                  onError={(err) => setError(err)}
                  disabled={isSubmitting}
                />
              ) : (
                <AudioUploader
                  contentId={contentId!}
                  onUploadComplete={handleAudioUploadComplete}
                  onError={(err) => setError(err)}
                  disabled={isSubmitting}
                />
              )}
            </section>
          )}

          {/* Step 3: Content Details */}
          <section className="space-y-4">
            <div>
              <h2 className="text-lg font-medium">Content details</h2>
              <p className="text-sm text-muted-foreground">
                Add information about your content
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

              {/* Description (for video/audio) or Content (for text) */}
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
                  <Label htmlFor="description">Description</Label>
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

              {/* Thumbnail (for video/audio) */}
              {(type === "video" || type === "audio") && contentId && (
                <div className="space-y-2">
                  <Label>Thumbnail</Label>
                  <p className="text-xs text-muted-foreground">
                    Add a thumbnail to make your content stand out
                  </p>
                  <ThumbnailUploader
                    contentId={contentId}
                    purpose="thumbnail"
                    currentUrl={thumbnailUrl || undefined}
                    onUploadComplete={handleThumbnailUploadComplete}
                    onRemove={() => setThumbnailUrl("")}
                    onError={(err) => setError(err)}
                    disabled={isSubmitting}
                  />
                </div>
              )}

              {/* Duration (manual input for audio) */}
              {type === "audio" && (
                <div className="space-y-2">
                  <Label htmlFor="duration">Duration (seconds)</Label>
                  <Input
                    id="duration"
                    type="number"
                    value={duration || ""}
                    onChange={(e) =>
                      setDuration(
                        e.target.value ? parseInt(e.target.value) : null,
                      )
                    }
                    placeholder="e.g., 300 for 5 minutes"
                    disabled={isSubmitting}
                    min={0}
                  />
                  <p className="text-xs text-muted-foreground">
                    Duration is usually detected automatically
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* Step 4: Settings */}
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
                    Make this content available to everyone, not just
                    subscribers
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
              onClick={handleSaveDraft}
              disabled={isSubmitting || !title.trim()}
            >
              {isSubmitting ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Save className="mr-2 size-4" />
              )}
              Save as draft
            </Button>

            <Button
              type="button"
              onClick={handlePublish}
              disabled={isSubmitting || !canPublish()}
            >
              {isSubmitting ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Eye className="mr-2 size-4" />
              )}
              Publish
            </Button>
          </section>
        </>
      )}
    </div>
  );
}
