"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save, Eye, Archive, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { VideoUploader } from "@/components/content/video-uploader";
import { AudioUploader } from "@/components/content/audio-uploader";
import { ThumbnailUploader } from "@/components/content/thumbnail-uploader";
import { RichTextEditor } from "@/components/content/rich-text-editor";
import {
  getContentStatusVariant,
  canPublishContent,
} from "@/lib/validations/content";
import type { ContentType, ContentStatus } from "@/lib/validations/content";

/**
 * Program option
 */
interface ProgramOption {
  id: string;
  title: string;
}

/**
 * Content data
 */
interface ContentData {
  id: string;
  type: ContentType;
  title: string;
  description: string | null;
  mediaUrl: string | null;
  thumbnailUrl: string | null;
  duration: number | null;
  isFree: boolean;
  status: ContentStatus;
  programId: string | null;
  publishedAt: string | null;
}

/**
 * EditContentClient Props
 */
interface EditContentClientProps {
  content: ContentData;
  programs: ProgramOption[];
}

/**
 * EditContentClient Component
 *
 * Client component for editing content with media upload support.
 */
export function EditContentClient({
  content,
  programs,
}: EditContentClientProps) {
  const router = useRouter();

  // Form state
  const [title, setTitle] = useState(content.title);
  const [description, setDescription] = useState(content.description || "");
  const [mediaUrl, setMediaUrl] = useState(content.mediaUrl || "");
  const [thumbnailUrl, setThumbnailUrl] = useState(content.thumbnailUrl || "");
  const [duration, setDuration] = useState<number | null>(content.duration);
  const [isFree, setIsFree] = useState(content.isFree);
  const [programId, setProgramId] = useState<string | null>(content.programId);
  const [status, setStatus] = useState<ContentStatus>(content.status);

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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
    setSuccessMessage("Video uploaded successfully");
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  /**
   * Handle audio upload complete
   */
  const handleAudioUploadComplete = (r2Key: string, audioDuration?: number) => {
    setMediaUrl(r2Key);
    if (audioDuration) {
      setDuration(audioDuration);
    }
    setSuccessMessage("Audio uploaded successfully");
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  /**
   * Handle thumbnail upload complete
   */
  const handleThumbnailUploadComplete = (r2Key: string) => {
    setThumbnailUrl(r2Key);
  };

  /**
   * Save changes
   */
  const handleSave = async (newStatus?: ContentStatus) => {
    if (!title.trim()) {
      setError("Title is required");
      return;
    }

    const targetStatus = newStatus || status;

    // Validate for publishing
    if (targetStatus === "published" && content.status !== "published") {
      const { canPublish, errors } = canPublishContent({
        type: content.type,
        title,
        mediaUrl,
        duration,
      });

      if (!canPublish) {
        setError(errors.join(". "));
        return;
      }
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/creator/content/${content.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description || null,
          mediaUrl: mediaUrl || null,
          thumbnailUrl: thumbnailUrl || null,
          duration: duration || null,
          isFree,
          programId: programId || null,
          status: targetStatus,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save changes");
      }

      setStatus(targetStatus);
      setSuccessMessage(
        targetStatus === "published"
          ? "Content published successfully"
          : "Changes saved successfully",
      );
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to save changes";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Delete content
   */
  const handleDelete = async () => {
    setIsDeleting(true);

    try {
      const response = await fetch(`/api/creator/content/${content.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete content");
      }

      router.push("/creator/content");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete";
      setError(message);
    } finally {
      setIsDeleting(false);
    }
  };

  const statusVariant = getContentStatusVariant(status);
  const isMediaContent = content.type === "video" || content.type === "audio";

  return (
    <div className="space-y-8">
      {/* Status bar */}
      <div className="flex items-center justify-between rounded-lg border border-border bg-card p-4">
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">Status:</span>
          <Badge variant={statusVariant}>{status}</Badge>
        </div>
        {content.publishedAt && status === "published" && (
          <span className="text-sm text-muted-foreground">
            Published {new Date(content.publishedAt).toLocaleDateString()}
          </span>
        )}
      </div>

      {/* Success message */}
      {successMessage && (
        <div className="rounded-lg border border-primary/50 bg-primary/10 p-4 text-sm text-primary">
          {successMessage}
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Media Upload (for video/audio) */}
      {isMediaContent && (
        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-medium">
              {content.type === "video" ? "Video" : "Audio"} file
            </h2>
            <p className="text-sm text-muted-foreground">
              {mediaUrl
                ? `Your ${content.type} is uploaded. Upload a new file to replace it.`
                : `Upload your ${content.type} file.`}
            </p>
          </div>

          {content.type === "video" ? (
            <VideoUploader
              contentId={content.id}
              onUploadComplete={handleVideoUploadComplete}
              onError={(err) => setError(err)}
              disabled={isSubmitting}
            />
          ) : (
            <AudioUploader
              contentId={content.id}
              onUploadComplete={handleAudioUploadComplete}
              onError={(err) => setError(err)}
              disabled={isSubmitting}
            />
          )}

          {mediaUrl && (
            <p className="text-sm text-muted-foreground">
              Current file: {mediaUrl.substring(0, 20)}...
            </p>
          )}
        </section>
      )}

      {/* Content Details */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-medium">Content details</h2>
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
          {content.type === "text" ? (
            <div className="space-y-2">
              <Label>Content</Label>
              <RichTextEditor
                value={description}
                onChange={setDescription}
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
          {isMediaContent && (
            <div className="space-y-2">
              <Label>Thumbnail</Label>
              <ThumbnailUploader
                contentId={content.id}
                purpose="thumbnail"
                currentUrl={thumbnailUrl || undefined}
                onUploadComplete={handleThumbnailUploadComplete}
                onRemove={() => setThumbnailUrl("")}
                onError={(err) => setError(err)}
                disabled={isSubmitting}
              />
            </div>
          )}

          {/* Duration (for audio - manual input) */}
          {content.type === "audio" && (
            <div className="space-y-2">
              <Label htmlFor="duration">Duration (seconds)</Label>
              <Input
                id="duration"
                type="number"
                value={duration || ""}
                onChange={(e) =>
                  setDuration(e.target.value ? parseInt(e.target.value) : null)
                }
                placeholder="e.g., 300 for 5 minutes"
                disabled={isSubmitting}
                min={0}
              />
            </div>
          )}
        </div>
      </section>

      {/* Settings */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-medium">Settings</h2>
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
              <Label htmlFor="program">Program</Label>
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
      <section className="flex flex-col gap-4 border-t border-border pt-6">
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleSave()}
            disabled={isSubmitting || !title.trim()}
          >
            {isSubmitting ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <Save className="mr-2 size-4" />
            )}
            Save changes
          </Button>

          {status === "draft" && (
            <Button
              type="button"
              onClick={() => handleSave("published")}
              disabled={isSubmitting || !title.trim()}
            >
              {isSubmitting ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Eye className="mr-2 size-4" />
              )}
              Publish
            </Button>
          )}

          {status === "published" && (
            <Button
              type="button"
              variant="outline"
              onClick={() => handleSave("archived")}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Archive className="mr-2 size-4" />
              )}
              Archive
            </Button>
          )}
        </div>

        {/* Delete button */}
        <div className="flex justify-start">
          <AlertDialog>
            <AlertDialogTrigger className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 h-9 px-4 py-2 text-destructive hover:bg-accent hover:text-destructive">
              <Trash2 className="mr-2 size-4" />
              Delete content
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete content?</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete &ldquo;{title}&rdquo;? This
                  action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isDeleting}>
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    "Delete"
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </section>
    </div>
  );
}
