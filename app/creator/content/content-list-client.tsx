"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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
} from "@/components/ui/alert-dialog";
import { ContentCard, ContentCardSkeleton } from "@/components/content";
import type { ContentType, ContentStatus } from "@/lib/validations/content";

/**
 * Content item from API
 */
interface ContentItem {
  id: string;
  type: ContentType;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  duration: number | null;
  isFree: boolean;
  status: ContentStatus;
  program: { id: string; title: string } | null;
  publishedAt: string | null;
  createdAt: string;
}

/**
 * Program option
 */
interface ProgramOption {
  id: string;
  title: string;
}

/**
 * ContentListClient Props
 */
interface ContentListClientProps {
  initialContent: ContentItem[];
  programs: ProgramOption[];
  hasMore: boolean;
}

/**
 * ContentListClient Component
 *
 * Client component for content list with filtering, pagination, and actions.
 */
export function ContentListClient({
  initialContent,
  programs,
  hasMore: initialHasMore,
}: ContentListClientProps) {
  const router = useRouter();

  // Content state
  const [content, setContent] = useState<ContentItem[]>(initialContent);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [isLoading, setIsLoading] = useState(false);
  const [cursor, setCursor] = useState<string | null>(
    initialContent.length > 0
      ? initialContent[initialContent.length - 1].id
      : null,
  );

  // Filter state
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [programFilter, setProgramFilter] = useState<string>("all");

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [contentToDelete, setContentToDelete] = useState<ContentItem | null>(
    null,
  );
  const [isDeleting, setIsDeleting] = useState(false);

  /**
   * Fetch content with filters
   */
  const fetchContent = useCallback(
    async (append = false) => {
      setIsLoading(true);

      try {
        const params = new URLSearchParams();
        if (statusFilter !== "all") params.set("status", statusFilter);
        if (typeFilter !== "all") params.set("type", typeFilter);
        if (programFilter !== "all") params.set("programId", programFilter);
        if (append && cursor) params.set("cursor", cursor);

        const response = await fetch(`/api/creator/content?${params}`);
        if (!response.ok) throw new Error("Failed to fetch content");

        const data = await response.json();

        if (append) {
          setContent((prev) => [...prev, ...data.items]);
        } else {
          setContent(data.items);
        }

        setHasMore(!!data.nextCursor);
        setCursor(data.nextCursor);
      } catch (error) {
        console.error("Error fetching content:", error);
      } finally {
        setIsLoading(false);
      }
    },
    [statusFilter, typeFilter, programFilter, cursor],
  );

  /**
   * Handle filter change
   */
  const handleFilterChange = useCallback(
    (filterType: "status" | "type" | "program", value: string) => {
      setCursor(null);
      setHasMore(false);

      if (filterType === "status") setStatusFilter(value);
      else if (filterType === "type") setTypeFilter(value);
      else if (filterType === "program") setProgramFilter(value);

      // Reset and refetch
      setTimeout(() => fetchContent(false), 0);
    },
    [fetchContent],
  );

  /**
   * Load more content
   */
  const handleLoadMore = () => {
    if (!isLoading && hasMore) {
      fetchContent(true);
    }
  };

  /**
   * Handle edit
   */
  const handleEdit = (id: string) => {
    router.push(`/creator/content/${id}/edit`);
  };

  /**
   * Handle publish
   */
  const handlePublish = async (id: string) => {
    try {
      const response = await fetch(`/api/creator/content/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "published" }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to publish");
      }

      // Update local state
      setContent((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                status: "published" as ContentStatus,
                publishedAt: new Date().toISOString(),
              }
            : item,
        ),
      );
    } catch (error) {
      console.error("Error publishing content:", error);
      alert(error instanceof Error ? error.message : "Failed to publish");
    }
  };

  /**
   * Handle archive
   */
  const handleArchive = async (id: string) => {
    try {
      const response = await fetch(`/api/creator/content/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "archived" }),
      });

      if (!response.ok) throw new Error("Failed to archive");

      // Update local state
      setContent((prev) =>
        prev.map((item) =>
          item.id === id
            ? { ...item, status: "archived" as ContentStatus }
            : item,
        ),
      );
    } catch (error) {
      console.error("Error archiving content:", error);
    }
  };

  /**
   * Open delete dialog
   */
  const openDeleteDialog = (item: ContentItem) => {
    setContentToDelete(item);
    setDeleteDialogOpen(true);
  };

  /**
   * Handle delete confirmation
   */
  const handleDeleteConfirm = async () => {
    if (!contentToDelete) return;

    setIsDeleting(true);

    try {
      const response = await fetch(
        `/api/creator/content/${contentToDelete.id}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) throw new Error("Failed to delete");

      // Remove from local state
      setContent((prev) =>
        prev.filter((item) => item.id !== contentToDelete.id),
      );
      setDeleteDialogOpen(false);
      setContentToDelete(null);
    } catch (error) {
      console.error("Error deleting content:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select
          value={statusFilter}
          onValueChange={(v) => handleFilterChange("status", v ?? "all")}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={typeFilter}
          onValueChange={(v) => handleFilterChange("type", v ?? "all")}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="video">Video</SelectItem>
            <SelectItem value="audio">Audio</SelectItem>
            <SelectItem value="text">Text</SelectItem>
          </SelectContent>
        </Select>

        {programs.length > 0 && (
          <Select
            value={programFilter}
            onValueChange={(v) => handleFilterChange("program", v ?? "all")}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Program" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All programs</SelectItem>
              {programs.map((program) => (
                <SelectItem key={program.id} value={program.id}>
                  {program.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Content list */}
      <div className="space-y-3">
        {content.length === 0 ? (
          <div className="rounded-lg border border-border bg-card p-12 text-center">
            <p className="text-muted-foreground">
              {statusFilter !== "all" ||
              typeFilter !== "all" ||
              programFilter !== "all"
                ? "No content matches your filters"
                : "No content yet. Create your first piece of content to get started."}
            </p>
          </div>
        ) : (
          content.map((item) => (
            <ContentCard
              key={item.id}
              id={item.id}
              type={item.type}
              title={item.title}
              description={item.description}
              thumbnailUrl={item.thumbnailUrl}
              duration={item.duration}
              isFree={item.isFree}
              status={item.status}
              program={item.program}
              publishedAt={item.publishedAt}
              createdAt={item.createdAt}
              onEdit={() => handleEdit(item.id)}
              onPublish={
                item.status === "draft"
                  ? () => handlePublish(item.id)
                  : undefined
              }
              onArchive={
                item.status === "published"
                  ? () => handleArchive(item.id)
                  : undefined
              }
              onDelete={() => openDeleteDialog(item)}
            />
          ))
        )}

        {/* Loading skeletons */}
        {isLoading &&
          Array.from({ length: 3 }).map((_, i) => (
            <ContentCardSkeleton key={i} />
          ))}
      </div>

      {/* Load more */}
      {hasMore && !isLoading && (
        <div className="flex justify-center pt-4">
          <Button variant="outline" onClick={handleLoadMore}>
            Load more
          </Button>
        </div>
      )}

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete content?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &ldquo;{contentToDelete?.title}
              &rdquo;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
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
  );
}
