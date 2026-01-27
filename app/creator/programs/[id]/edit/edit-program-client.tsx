"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Loader2,
  Save,
  GripVertical,
  Plus,
  X,
  Video,
  Headphones,
  FileText,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import type { ContentType, ContentStatus } from "@/lib/validations/content";

/**
 * Content item in program
 */
interface ProgramContentItem {
  id: string;
  type: ContentType;
  title: string;
  thumbnailUrl: string | null;
  duration: number | null;
  isFree: boolean;
  status: ContentStatus;
  sortOrder: number | null;
}

/**
 * Available content item
 */
interface AvailableContentItem {
  id: string;
  type: ContentType;
  title: string;
  thumbnailUrl: string | null;
}

/**
 * Program data
 */
interface ProgramData {
  id: string;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  isFree: boolean;
  content: ProgramContentItem[];
}

/**
 * EditProgramClient Props
 */
interface EditProgramClientProps {
  program: ProgramData;
  availableContent: AvailableContentItem[];
}

/**
 * Get icon for content type
 */
function ContentTypeIcon({
  type,
  className,
}: {
  type: ContentType;
  className?: string;
}) {
  switch (type) {
    case "video":
      return <Video className={className} />;
    case "audio":
      return <Headphones className={className} />;
    case "text":
      return <FileText className={className} />;
  }
}

/**
 * EditProgramClient Component
 */
export function EditProgramClient({
  program,
  availableContent: initialAvailableContent,
}: EditProgramClientProps) {
  const router = useRouter();

  // Form state
  const [title, setTitle] = useState(program.title);
  const [description, setDescription] = useState(program.description || "");
  const [isFree, setIsFree] = useState(program.isFree);
  const [content, setContent] = useState<ProgramContentItem[]>(program.content);
  const [availableContent, setAvailableContent] = useState(
    initialAvailableContent,
  );

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [addContentOpen, setAddContentOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Drag and drop state
  const [draggedItem, setDraggedItem] = useState<string | null>(null);

  /**
   * Save program changes
   */
  const handleSave = async () => {
    if (!title.trim()) {
      setError("Title is required");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/creator/programs/${program.id}`, {
        method: "PATCH",
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

      setSuccessMessage("Changes saved successfully");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Add content to program
   */
  const handleAddContent = async (contentId: string) => {
    try {
      const response = await fetch(`/api/creator/content/${contentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          programId: program.id,
          sortOrder: content.length,
        }),
      });

      if (!response.ok) throw new Error("Failed to add content");

      const data = await response.json();

      // Update local state
      setContent((prev) => [
        ...prev,
        {
          id: data.content.id,
          type: data.content.type,
          title: data.content.title,
          thumbnailUrl: data.content.thumbnailUrl,
          duration: data.content.duration,
          isFree: data.content.isFree,
          status: data.content.status,
          sortOrder: prev.length,
        },
      ]);

      setAvailableContent((prev) => prev.filter((c) => c.id !== contentId));
      setAddContentOpen(false);
    } catch (error) {
      console.error("Error adding content:", error);
    }
  };

  /**
   * Remove content from program
   */
  const handleRemoveContent = async (contentId: string) => {
    try {
      const response = await fetch(`/api/creator/content/${contentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          programId: null,
          sortOrder: null,
        }),
      });

      if (!response.ok) throw new Error("Failed to remove content");

      // Move to available content
      const removedContent = content.find((c) => c.id === contentId);
      if (removedContent) {
        setAvailableContent((prev) => [
          ...prev,
          {
            id: removedContent.id,
            type: removedContent.type,
            title: removedContent.title,
            thumbnailUrl: removedContent.thumbnailUrl,
          },
        ]);
      }

      setContent((prev) => prev.filter((c) => c.id !== contentId));
    } catch (error) {
      console.error("Error removing content:", error);
    }
  };

  /**
   * Reorder content
   */
  const handleReorder = async (contentIds: string[]) => {
    try {
      const response = await fetch(`/api/creator/programs/${program.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentIds }),
      });

      if (!response.ok) throw new Error("Failed to reorder");
    } catch (error) {
      console.error("Error reordering:", error);
    }
  };

  /**
   * Handle drag start
   */
  const handleDragStart = (contentId: string) => {
    setDraggedItem(contentId);
  };

  /**
   * Handle drag over
   */
  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedItem || draggedItem === targetId) return;

    const draggedIndex = content.findIndex((c) => c.id === draggedItem);
    const targetIndex = content.findIndex((c) => c.id === targetId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    const newContent = [...content];
    const [draggedContent] = newContent.splice(draggedIndex, 1);
    newContent.splice(targetIndex, 0, draggedContent);

    setContent(newContent);
  };

  /**
   * Handle drag end
   */
  const handleDragEnd = () => {
    if (draggedItem) {
      handleReorder(content.map((c) => c.id));
    }
    setDraggedItem(null);
  };

  /**
   * Delete program
   */
  const handleDelete = async () => {
    setIsDeleting(true);

    try {
      const response = await fetch(`/api/creator/programs/${program.id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete");

      router.push("/creator/programs");
    } catch (error) {
      console.error("Error deleting:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Edit program</h1>
          <p className="mt-1 text-muted-foreground">
            Update program details and manage content
          </p>
        </div>
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

      {/* Program details */}
      <section className="space-y-4">
        <h2 className="text-lg font-medium">Program details</h2>

        <div className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
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
              disabled={isSubmitting}
              rows={3}
              maxLength={2000}
            />
          </div>

          {/* Free toggle */}
          <div className="flex items-center justify-between rounded-lg border border-border p-4">
            <div>
              <Label htmlFor="is-free" className="text-base">
                Free program
              </Label>
              <p className="text-sm text-muted-foreground">
                Available to everyone
              </p>
            </div>
            <Switch
              id="is-free"
              checked={isFree}
              onCheckedChange={setIsFree}
              disabled={isSubmitting}
            />
          </div>

          {/* Save button */}
          <Button onClick={handleSave} disabled={isSubmitting || !title.trim()}>
            {isSubmitting ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <Save className="mr-2 size-4" />
            )}
            Save changes
          </Button>
        </div>
      </section>

      {/* Program content */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">
            Content ({content.length} {content.length === 1 ? "item" : "items"})
          </h2>

          <Dialog open={addContentOpen} onOpenChange={setAddContentOpen}>
            <DialogTrigger className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-8 px-3">
              <Plus className="mr-2 size-4" />
              Add content
            </DialogTrigger>
            <DialogContent className="max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add content to program</DialogTitle>
                <DialogDescription>
                  Select content to add to this program
                </DialogDescription>
              </DialogHeader>

              <div className="mt-4 space-y-2">
                {availableContent.length === 0 ? (
                  <p className="py-8 text-center text-muted-foreground">
                    No available content. All your content is already in a
                    program.
                  </p>
                ) : (
                  availableContent.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleAddContent(item.id)}
                      className="flex w-full items-center gap-3 rounded-lg border border-border p-3 text-left transition-colors hover:bg-muted"
                    >
                      <div className="flex size-10 shrink-0 items-center justify-center rounded bg-muted">
                        <ContentTypeIcon
                          type={item.type}
                          className="size-5 text-muted-foreground"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{item.title}</p>
                        <p className="text-sm capitalize text-muted-foreground">
                          {item.type}
                        </p>
                      </div>
                      <Plus className="size-5 text-muted-foreground" />
                    </button>
                  ))
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Content list with drag and drop */}
        {content.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-8 text-center">
            <p className="text-muted-foreground">
              No content in this program yet. Add some content to get started.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {content.map((item, index) => (
              <div
                key={item.id}
                draggable
                onDragStart={() => handleDragStart(item.id)}
                onDragOver={(e) => handleDragOver(e, item.id)}
                onDragEnd={handleDragEnd}
                className={cn(
                  "flex items-center gap-3 rounded-lg border border-border bg-card p-3 transition-colors",
                  draggedItem === item.id && "opacity-50",
                )}
              >
                {/* Drag handle */}
                <button
                  className="cursor-grab text-muted-foreground hover:text-foreground active:cursor-grabbing"
                  aria-label="Drag to reorder"
                >
                  <GripVertical className="size-5" />
                </button>

                {/* Order number */}
                <span className="flex size-6 shrink-0 items-center justify-center rounded bg-muted text-xs font-medium">
                  {index + 1}
                </span>

                {/* Thumbnail */}
                <div className="relative size-12 shrink-0 overflow-hidden rounded bg-muted">
                  {item.thumbnailUrl ? (
                    <Image
                      src={item.thumbnailUrl}
                      alt=""
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex size-full items-center justify-center">
                      <ContentTypeIcon
                        type={item.type}
                        className="size-5 text-muted-foreground"
                      />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{item.title}</p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="capitalize">{item.type}</span>
                    <Badge variant="outline" className="text-xs">
                      {item.status}
                    </Badge>
                  </div>
                </div>

                {/* Remove button */}
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => handleRemoveContent(item.id)}
                  aria-label="Remove from program"
                >
                  <X className="size-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        <p className="text-sm text-muted-foreground">
          Drag items to reorder. Changes are saved automatically.
        </p>
      </section>

      {/* Danger zone */}
      <section className="space-y-4 border-t border-border pt-6">
        <h2 className="text-lg font-medium text-destructive">Danger zone</h2>

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <Button
            variant="outline"
            className="text-destructive hover:text-destructive"
            onClick={() => setDeleteDialogOpen(true)}
          >
            <Trash2 className="mr-2 size-4" />
            Delete program
          </Button>

          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete program?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete &ldquo;{title}&rdquo;?
                {content.length > 0 && (
                  <>
                    {" "}
                    The {content.length}{" "}
                    {content.length === 1 ? "item" : "items"} in this program
                    will be preserved but unlinked.
                  </>
                )}
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
      </section>
    </div>
  );
}
