"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { FolderOpen, MoreVertical, Lock, Eye, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

/**
 * Program item
 */
interface ProgramItem {
  id: string;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  isFree: boolean;
  sortOrder: number;
  publishedAt: string | null;
  createdAt: string;
  contentCount: number;
}

/**
 * ProgramListClient Props
 */
interface ProgramListClientProps {
  programs: ProgramItem[];
}

/**
 * ProgramCard Component
 */
function ProgramCard({
  program,
  onEdit,
  onDelete,
}: {
  program: ProgramItem;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="group relative flex gap-4 rounded-lg border border-border bg-card p-4 transition-colors hover:bg-muted/50">
      {/* Thumbnail */}
      <Link
        href={`/creator/programs/${program.id}/edit`}
        className="relative aspect-video w-32 shrink-0 overflow-hidden rounded-md bg-muted"
      >
        {program.thumbnailUrl ? (
          <Image
            src={program.thumbnailUrl}
            alt={program.title}
            fill
            className="object-cover"
            sizes="128px"
          />
        ) : (
          <div className="flex size-full items-center justify-center">
            <FolderOpen className="size-8 text-muted-foreground" />
          </div>
        )}
      </Link>

      {/* Info */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-2">
          <Link
            href={`/creator/programs/${program.id}/edit`}
            className="min-w-0 flex-1"
          >
            <h3 className="truncate font-medium hover:underline">
              {program.title}
            </h3>
          </Link>

          {/* Actions */}
          <DropdownMenu>
            <DropdownMenuTrigger
              className="shrink-0 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 rounded-lg p-1.5 hover:bg-muted"
              aria-label="Program actions"
            >
              <MoreVertical className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>Edit</DropdownMenuItem>
              <DropdownMenuItem
                onClick={onDelete}
                className="text-destructive focus:text-destructive"
              >
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {program.description && (
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
            {program.description}
          </p>
        )}

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            {program.contentCount}{" "}
            {program.contentCount === 1 ? "item" : "items"}
          </Badge>

          {program.isFree ? (
            <Badge variant="outline" className="text-xs">
              <Eye className="mr-1 size-3" />
              Free
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs">
              <Lock className="mr-1 size-3" />
              Paid
            </Badge>
          )}
        </div>

        <div className="mt-auto pt-2 text-xs text-muted-foreground">
          Created {new Date(program.createdAt).toLocaleDateString()}
        </div>
      </div>
    </div>
  );
}

/**
 * ProgramListClient Component
 */
export function ProgramListClient({
  programs: initialPrograms,
}: ProgramListClientProps) {
  const router = useRouter();
  const [programs, setPrograms] = useState(initialPrograms);

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [programToDelete, setProgramToDelete] = useState<ProgramItem | null>(
    null,
  );
  const [isDeleting, setIsDeleting] = useState(false);

  /**
   * Handle edit
   */
  const handleEdit = (id: string) => {
    router.push(`/creator/programs/${id}/edit`);
  };

  /**
   * Open delete dialog
   */
  const openDeleteDialog = (program: ProgramItem) => {
    setProgramToDelete(program);
    setDeleteDialogOpen(true);
  };

  /**
   * Handle delete confirmation
   */
  const handleDeleteConfirm = async () => {
    if (!programToDelete) return;

    setIsDeleting(true);

    try {
      const response = await fetch(
        `/api/creator/programs/${programToDelete.id}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) throw new Error("Failed to delete");

      // Remove from local state
      setPrograms((prev) => prev.filter((p) => p.id !== programToDelete.id));
      setDeleteDialogOpen(false);
      setProgramToDelete(null);
    } catch (error) {
      console.error("Error deleting program:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      {programs.map((program) => (
        <ProgramCard
          key={program.id}
          program={program}
          onEdit={() => handleEdit(program.id)}
          onDelete={() => openDeleteDialog(program)}
        />
      ))}

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete program?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &ldquo;{programToDelete?.title}
              &rdquo;?
              {programToDelete?.contentCount &&
                programToDelete.contentCount > 0 && (
                  <>
                    {" "}
                    The {programToDelete.contentCount}{" "}
                    {programToDelete.contentCount === 1 ? "item" : "items"} in
                    this program will be preserved but unlinked.
                  </>
                )}
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
